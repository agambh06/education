import { createHash, randomBytes, randomUUID } from "node:crypto";
import { type ParentStudent, Prisma, type PrismaClient } from "@prisma/client";

export const PARENT_LINK_CONSENT_VERSION = "parent-progress-v1";
const INVITATION_LIFETIME_MS = 15 * 60 * 1000;
const REQUEST_LIFETIME_MS = 24 * 60 * 60 * 1000;

export class ParentLinkError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function publicLink(link: ParentStudent) {
  return {
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    status: link.status,
    requestedAt: link.requestedAt,
    expiresAt: link.expiresAt,
    verifiedAt: link.verifiedAt,
    revokedAt: link.revokedAt,
  };
}

async function verifiedUser(tx: Prisma.TransactionClient, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, include: { studentProfile: true } });
  if (!user?.accountVerifiedAt) throw new ParentLinkError(403, "A verified account is required");
  return user;
}

async function verifiedStudent(tx: Prisma.TransactionClient, userId: string) {
  const user = await verifiedUser(tx, userId);
  if (user.role !== "STUDENT" || !user.studentProfile) {
    throw new ParentLinkError(403, "A student account is required");
  }
  return user.studentProfile;
}

// Every mutation rechecks its predicates in a serializable transaction. Retrying
// conflicts also makes concurrent invitation redemption deterministic.
export function createParentLinksService(prisma: PrismaClient, now: () => Date = () => new Date()) {
  async function transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 3) continue;
        throw error;
      }
    }
  }

  async function consentProof(tx: Prisma.TransactionClient, link: ParentStudent, at: Date) {
    const student = await tx.student.findUnique({ where: { id: link.studentId } });
    if (student?.parentLinkConsentRequirement === "SELF_CONSENT") return null;
    if (student?.parentLinkConsentRequirement === "GUARDIAN") {
      const proof = await tx.parentLinkGuardianVerification.findFirst({
        where: {
          parentId: link.parentId,
          studentId: link.studentId,
          verifiedAt: { gte: link.requestedAt, lte: at },
          expiresAt: { gt: at },
          revokedAt: null,
          ...(link.status === "VERIFIED" ? { id: link.guardianVerificationId ?? "" } : {}),
        },
        orderBy: { verifiedAt: "desc" },
      });
      if (proof) return proof.id;
    }
    throw new ParentLinkError(403, "Trusted consent eligibility or guardian verification is required");
  }

  return {
    async createInvitation(actorId: string) {
      return transaction(async (tx) => {
        const student = await verifiedStudent(tx, actorId);
        const at = now();
        const token = randomBytes(32).toString("base64url");
        const expiresAt = new Date(at.getTime() + INVITATION_LIFETIME_MS);
        // Only one live invitation per student; regenerating invalidates old secrets.
        await tx.parentLinkInvitation.updateMany({
          where: { studentId: student.id, consumedAt: null, revokedAt: null },
          data: { revokedAt: at },
        });
        await tx.parentLinkInvitation.create({
          data: { studentId: student.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt },
        });
        return { token, expiresAt };
      });
    },

    async requestLink(actorId: string, token: string) {
      return transaction(async (tx) => {
        const parent = await verifiedUser(tx, actorId);
        if (parent.role !== "PARENT") throw new ParentLinkError(403, "A parent account is required");
        const at = now();
        const invitation = await tx.parentLinkInvitation.findUnique({
          where: { tokenHash: createHash("sha256").update(token).digest("hex") },
        });
        if (!invitation) throw new ParentLinkError(404, "Invitation not found");
        if (invitation.revokedAt || invitation.expiresAt <= at) {
          throw new ParentLinkError(410, "Invitation is expired or revoked");
        }
        if (invitation.consumedAt) throw new ParentLinkError(409, "Invitation has already been used");
        const student = await tx.student.findUnique({ where: { id: invitation.studentId } });
        if (!student?.userId) throw new ParentLinkError(403, "A verified student account is required");
        await verifiedStudent(tx, student.userId);
        const pair = { parentId: parent.id, studentId: student.id };
        const existing = await tx.parentStudent.findUnique({ where: { parentId_studentId: pair } });
        if (
          existing?.status === "VERIFIED" ||
          (existing?.status === "PENDING" && existing.expiresAt && existing.expiresAt > at)
        ) {
          throw new ParentLinkError(409, "A link or pending request already exists");
        }
        const data = {
          id: randomUUID(),
          status: "PENDING" as const,
          requestedAt: at,
          expiresAt: new Date(at.getTime() + REQUEST_LIFETIME_MS),
          verifiedAt: null,
          verifiedById: null,
          consentVersion: null,
          guardianVerificationId: null,
          revokedAt: null,
          revokedById: null,
        };
        const link = await tx.parentStudent.upsert({
          where: { parentId_studentId: pair },
          create: { ...pair, ...data },
          update: data,
        });
        await tx.parentLinkInvitation.update({
          where: { id: invitation.id },
          data: { consumedAt: at, consumedById: parent.id },
        });
        return publicLink(link);
      });
    },

    async list(actorId: string) {
      return transaction(async (tx) => {
        const user = await verifiedUser(tx, actorId);
        if (user.role !== "PARENT" && (user.role !== "STUDENT" || !user.studentProfile)) {
          throw new ParentLinkError(403, "A parent or student account is required");
        }
        const links = await tx.parentStudent.findMany({
          where: user.role === "PARENT" ? { parentId: user.id } : { studentId: user.studentProfile?.id },
          include: { parent: { select: { firstName: true, lastName: true } } },
          orderBy: { requestedAt: "desc" },
        });
        return links.map((link) => ({ ...publicLink(link), parent: link.parent }));
      });
    },

    async approve(actorId: string, linkId: string, consent: boolean) {
      return transaction(async (tx) => {
        const student = await verifiedStudent(tx, actorId);
        const link = await tx.parentStudent.findUnique({ where: { id: linkId } });
        if (!link || link.studentId !== student.id) throw new ParentLinkError(404, "Link request not found");
        const at = now();
        if (link.status === "REVOKED") throw new ParentLinkError(410, "Link has been revoked");
        if ((link.expiresAt && link.expiresAt <= at) || (link.status === "PENDING" && !link.expiresAt)) {
          throw new ParentLinkError(410, "Link request has expired");
        }
        if (!consent) throw new ParentLinkError(400, "Explicit student consent is required");
        const parent = await verifiedUser(tx, link.parentId);
        if (parent.role !== "PARENT") throw new ParentLinkError(403, "A parent account is required");
        const guardianVerificationId = await consentProof(tx, link, at);
        if (link.status === "VERIFIED") return publicLink(link);
        return publicLink(
          await tx.parentStudent.update({
            where: { id: link.id },
            data: {
              status: "VERIFIED",
              expiresAt: null,
              verifiedAt: at,
              verifiedById: actorId,
              consentVersion: PARENT_LINK_CONSENT_VERSION,
              guardianVerificationId,
            },
          }),
        );
      });
    },

    async revoke(actorId: string, linkId: string) {
      return transaction(async (tx) => {
        const user = await verifiedUser(tx, actorId);
        const link = await tx.parentStudent.findUnique({ where: { id: linkId } });
        const ownsLink =
          link &&
          ((user.role === "PARENT" && link.parentId === user.id) ||
            (user.role === "STUDENT" && link.studentId === user.studentProfile?.id));
        if (!link || !ownsLink) throw new ParentLinkError(404, "Link request not found");
        if (link.status === "REVOKED") return publicLink(link);
        const at = now();
        await tx.parentLinkInvitation.updateMany({
          where: { studentId: link.studentId, revokedAt: null },
          data: { revokedAt: at },
        });
        // A fresh request must obtain fresh guardian verification as well.
        await tx.parentLinkGuardianVerification.updateMany({
          where: { parentId: link.parentId, studentId: link.studentId, revokedAt: null },
          data: { revokedAt: at },
        });
        return publicLink(
          await tx.parentStudent.update({
            where: { id: link.id },
            data: { status: "REVOKED", revokedAt: at, revokedById: actorId },
          }),
        );
      });
    },

    // Call for EVERY protected parent read; never cache this authorization result
    // in a session/JWT. It grants only the separately defined progress contract.
    async requireAccess(parentId: string, studentId: string) {
      await transaction(async (tx) => {
        const parent = await verifiedUser(tx, parentId);
        if (parent.role !== "PARENT") throw new ParentLinkError(403, "Student access denied");
        const at = now();
        const link = await tx.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } } });
        if (
          link?.status !== "VERIFIED" ||
          link.revokedAt ||
          !link.verifiedAt ||
          !link.verifiedById ||
          (link.expiresAt && link.expiresAt <= at) ||
          link.consentVersion !== PARENT_LINK_CONSENT_VERSION
        )
          throw new ParentLinkError(403, "Student access denied");
        const student = await tx.student.findUnique({ where: { id: studentId } });
        if (!student?.userId || student.userId !== link.verifiedById) {
          throw new ParentLinkError(403, "Student access denied");
        }
        await verifiedStudent(tx, student.userId);
        await consentProof(tx, link, at);
      });
    },
  };
}

export type ParentLinksService = ReturnType<typeof createParentLinksService>;
