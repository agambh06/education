import { createHash, randomUUID } from "node:crypto";
import { type Prisma, PrismaClient, type UserRole } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { createApp } from "../../src/app.js";
import {
  createParentLinksService,
  PARENT_LINK_CONSENT_VERSION,
  ParentLinkError,
} from "../../src/modules/parent-links/parent-links.service.js";

const prisma = new PrismaClient({ datasourceUrl: inject("testDatabaseUrl") });
let at: Date;
const service = createParentLinksService(prisma, () => new Date(at));
let parentId: string;
let otherParentId: string;
let studentUserId: string;
let otherStudentUserId: string;
let reviewerId: string;
let studentId: string;
let otherStudentId: string;
let userIds: string[];
let studentIds: string[];

async function user(role: UserRole) {
  return prisma.user.create({
    data: {
      email: `${randomUUID()}@parent-links.example.test`,
      firstName: "Synthetic",
      lastName: role,
      role,
      accountVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    },
  });
}

beforeAll(async () => {
  const [parent, otherParent, studentUser, otherStudentUser, reviewer] = await Promise.all([
    user("PARENT"),
    user("PARENT"),
    user("STUDENT"),
    user("STUDENT"),
    user("ADMIN"),
  ]);
  parentId = parent.id;
  otherParentId = otherParent.id;
  studentUserId = studentUser.id;
  otherStudentUserId = otherStudentUser.id;
  reviewerId = reviewer.id;
  userIds = [parentId, otherParentId, studentUserId, otherStudentUserId, reviewerId];
  const students = await Promise.all(
    [studentUserId, otherStudentUserId].map((userId) =>
      prisma.student.create({
        data: { firstName: "Independent", lastName: "Student", userId, parentLinkConsentRequirement: "SELF_CONSENT" },
      }),
    ),
  );
  const [student, otherStudent] = students;
  if (!student || !otherStudent) throw new Error("Independent student fixtures were not created");
  studentId = student.id;
  otherStudentId = otherStudent.id;
  studentIds = [studentId, otherStudentId];
});

beforeEach(async () => {
  at = new Date("2026-11-12T10:00:00.000Z");
  await Promise.all([
    prisma.parentStudent.deleteMany({ where: { studentId: { in: studentIds } } }),
    prisma.parentLinkInvitation.deleteMany({ where: { studentId: { in: studentIds } } }),
    prisma.parentLinkGuardianVerification.deleteMany({ where: { studentId: { in: studentIds } } }),
    prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { parentLinkConsentRequirement: "SELF_CONSENT" },
    }),
    prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { accountVerifiedAt: new Date("2026-01-01T00:00:00Z") },
    }),
  ]);
});

afterAll(async () => {
  try {
    // Only remove this suite's synthetic records; the schema also hosts other integration suites.
    if (studentIds) await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    if (userIds) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  } finally {
    await prisma.$disconnect();
  }
});

async function pendingLink() {
  const invitation = await service.createInvitation(studentUserId);
  return service.requestLink(parentId, invitation.token);
}

async function guardianProof(overrides: Partial<Prisma.ParentLinkGuardianVerificationUncheckedCreateInput> = {}) {
  return prisma.parentLinkGuardianVerification.create({
    data: {
      parentId,
      studentId,
      verifiedById: reviewerId,
      evidenceReference: "synthetic-consent-review",
      verifiedAt: at,
      expiresAt: new Date(at.getTime() + 60 * 60 * 1000),
      ...overrides,
    },
  });
}

describe("persisted verified parent links", () => {
  it("keeps students independent of a school and parent, and stores only a random invitation's hash", async () => {
    expect(await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).toMatchObject({ classId: null });
    expect(await service.list(studentUserId)).toEqual([]);
    const invitation = await service.createInvitation(studentUserId);
    expect(invitation.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(invitation.expiresAt).toEqual(new Date(at.getTime() + 15 * 60 * 1000));
    const stored = await prisma.parentLinkInvitation.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(invitation.token).digest("hex") },
    });
    expect(stored).toMatchObject({ studentId, consumedAt: null, revokedAt: null });
    expect(JSON.stringify(stored)).not.toContain(invitation.token);
    expect(await service.list(studentUserId)).toEqual([]);
  });

  it("requires separate student consent before granting access and records who verified it", async () => {
    const link = await pendingLink();
    expect(link).toMatchObject({ parentId, studentId, status: "PENDING", verifiedAt: null, revokedAt: null });
    expect(link.expiresAt).toEqual(new Date(at.getTime() + 24 * 60 * 60 * 1000));
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.approve(studentUserId, link.id, false)).rejects.toMatchObject({ status: 400 });
    await expect(service.approve(parentId, link.id, true)).rejects.toMatchObject({ status: 403 });
    await expect(service.approve(otherStudentUserId, link.id, true)).rejects.toMatchObject({ status: 404 });

    const verified = await service.approve(studentUserId, link.id, true);
    expect(verified).toMatchObject({ id: link.id, status: "VERIFIED", verifiedAt: at });
    expect(verified.expiresAt).toBeNull();
    expect(await prisma.parentStudent.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({
      verifiedById: studentUserId,
      consentVersion: PARENT_LINK_CONSENT_VERSION,
    });
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
    expect(await service.approve(studentUserId, link.id, true)).toEqual(verified);
    const visible = { ...verified, parent: { firstName: "Synthetic", lastName: "PARENT" } };
    expect(await service.list(studentUserId)).toEqual([visible]);
    expect(await service.list(parentId)).toEqual([visible]);
  });

  it("denies unrelated accounts without exposing another family's link", async () => {
    const link = await pendingLink();
    await service.approve(studentUserId, link.id, true);
    expect(await service.list(otherParentId)).toEqual([]);
    expect(await service.list(otherStudentUserId)).toEqual([]);
    await expect(service.requireAccess(otherParentId, studentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.requireAccess(parentId, otherStudentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.revoke(otherParentId, link.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.revoke(otherStudentUserId, link.id)).rejects.toMatchObject({ status: 404 });
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
  });

  it("rejects arbitrary student IDs, emails and forged secrets without creating relationships", async () => {
    for (const token of [studentId, `${studentUserId}@example.test`, "A".repeat(43)]) {
      await expect(service.requestLink(parentId, token)).rejects.toMatchObject({ status: 404 });
    }
    expect(await service.list(parentId)).toEqual([]);
    await expect(service.approve(studentUserId, randomUUID(), true)).rejects.toMatchObject({ status: 404 });
  });

  it("invalidates a previous invitation when the student generates a replacement", async () => {
    const oldInvitation = await service.createInvitation(studentUserId);
    const replacement = await service.createInvitation(studentUserId);
    expect(replacement.token).not.toBe(oldInvitation.token);
    await expect(service.requestLink(parentId, oldInvitation.token)).rejects.toMatchObject({ status: 410 });
    expect(await service.requestLink(parentId, replacement.token)).toMatchObject({ status: "PENDING" });
  });

  it("handles consumed tokens and duplicate pairs without consuming a fresh invitation", async () => {
    const invitation = await service.createInvitation(studentUserId);
    const link = await service.requestLink(parentId, invitation.token);
    await expect(service.requestLink(parentId, invitation.token)).rejects.toMatchObject({ status: 409 });
    await expect(service.requestLink(otherParentId, invitation.token)).rejects.toMatchObject({ status: 409 });
    const fresh = await service.createInvitation(studentUserId);
    await expect(service.requestLink(parentId, fresh.token)).rejects.toMatchObject({ status: 409 });
    expect(await service.list(parentId)).toEqual([{ ...link, parent: { firstName: "Synthetic", lastName: "PARENT" } }]);
    expect(await service.requestLink(otherParentId, fresh.token)).toMatchObject({
      parentId: otherParentId,
      status: "PENDING",
    });

    await service.approve(studentUserId, link.id, true);
    const afterVerification = await service.createInvitation(studentUserId);
    await expect(service.requestLink(parentId, afterVerification.token)).rejects.toMatchObject({ status: 409 });
    expect(
      await prisma.parentLinkInvitation.findUniqueOrThrow({
        where: { tokenHash: createHash("sha256").update(afterVerification.token).digest("hex") },
      }),
    ).toMatchObject({ consumedAt: null });
  });

  it("expires invitations at the exact boundary without creating a pending link", async () => {
    const invitation = await service.createInvitation(studentUserId);
    at = invitation.expiresAt;
    await expect(service.requestLink(parentId, invitation.token)).rejects.toMatchObject({ status: 410 });
    expect(await service.list(parentId)).toEqual([]);
  });

  it("expires pending requests and requires a new invitation and request generation", async () => {
    const link = await pendingLink();
    if (!link.expiresAt) throw new Error("Pending request requires an expiry");
    at = new Date(link.expiresAt);
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 410 });
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    const replacement = await pendingLink();
    expect(replacement.id).not.toBe(link.id);
    expect(replacement).toMatchObject({ status: "PENDING", requestedAt: at, verifiedAt: null });
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 404 });
    await service.approve(studentUserId, replacement.id, true);
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
  });

  it("fails closed when consent eligibility is unknown, including after activation", async () => {
    const link = await pendingLink();
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "UNKNOWN" } });
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 403 });
    expect(await prisma.parentStudent.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({
      status: "PENDING",
    });
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "SELF_CONSENT" } });
    await service.approve(studentUserId, link.id, true);
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "UNKNOWN" } });
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
  });

  it("enforces an explicit persisted expiry on an active link at the exact deadline", async () => {
    const link = await pendingLink();
    await service.approve(studentUserId, link.id, true);
    await prisma.parentStudent.update({ where: { id: link.id }, data: { expiresAt: at } });
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 410 });
  });

  it.each(["missing", "other-parent", "other-student", "expired", "revoked", "future", "older-request"] as const)(
    "denies guardian-dependent consent when trusted evidence is %s",
    async (invalidProof) => {
      const link = await pendingLink();
      await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "GUARDIAN" } });
      if (invalidProof !== "missing") {
        const overrides: Partial<Prisma.ParentLinkGuardianVerificationUncheckedCreateInput> = {};
        if (invalidProof === "other-parent") overrides.parentId = otherParentId;
        if (invalidProof === "other-student") overrides.studentId = otherStudentId;
        if (invalidProof === "expired") overrides.expiresAt = at;
        if (invalidProof === "revoked") overrides.revokedAt = at;
        if (invalidProof === "future") overrides.verifiedAt = new Date(at.getTime() + 1);
        if (invalidProof === "older-request") overrides.verifiedAt = new Date(at.getTime() - 1);
        await guardianProof(overrides);
      }
      await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 403 });
      await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    },
  );

  it("requires the same current guardian proof on subsequent reads and never substitutes a newer proof", async () => {
    const link = await pendingLink();
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "GUARDIAN" } });
    const proof = await guardianProof();
    await service.approve(studentUserId, link.id, true);
    expect(await prisma.parentStudent.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({
      guardianVerificationId: proof.id,
    });
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
    at = new Date(proof.expiresAt);
    await guardianProof();
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 403 });
  });

  it.each(["parent", "student"] as const)(
    "allows the %s to revoke and immediately stops access and replay",
    async (revoker) => {
      const invitation = await service.createInvitation(studentUserId);
      const link = await service.requestLink(parentId, invitation.token);
      await service.approve(studentUserId, link.id, true);
      const outstanding = await service.createInvitation(studentUserId);
      const actorId = revoker === "parent" ? parentId : studentUserId;
      at = new Date(at.getTime() + 1000);
      const revoked = await service.revoke(actorId, link.id);
      expect(revoked).toMatchObject({ status: "REVOKED", revokedAt: at });
      expect(await service.revoke(actorId, link.id)).toEqual(revoked);
      expect(await prisma.parentStudent.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({
        revokedById: actorId,
      });
      await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
      await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 410 });
      await expect(service.requestLink(parentId, invitation.token)).rejects.toMatchObject({ status: 410 });
      await expect(service.requestLink(otherParentId, outstanding.token)).rejects.toMatchObject({ status: 410 });
      const replacement = await pendingLink();
      expect(replacement.id).not.toBe(link.id);
      await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
      await service.approve(studentUserId, replacement.id, true);
      await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
    },
  );

  it("requires fresh guardian verification after revocation, bound to the new request generation", async () => {
    const link = await pendingLink();
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "GUARDIAN" } });
    const proof = await guardianProof();
    await service.approve(studentUserId, link.id, true);
    await service.revoke(parentId, link.id);
    expect(await prisma.parentLinkGuardianVerification.findUniqueOrThrow({ where: { id: proof.id } })).toMatchObject({
      revokedAt: at,
    });
    at = new Date(at.getTime() + 1000);
    const replacement = await pendingLink();
    await expect(service.approve(studentUserId, replacement.id, true)).rejects.toMatchObject({ status: 403 });
    // Even restoring an old proof cannot authorize this newer request.
    await prisma.parentLinkGuardianVerification.update({ where: { id: proof.id }, data: { revokedAt: null } });
    await expect(service.approve(studentUserId, replacement.id, true)).rejects.toMatchObject({ status: 403 });
    await guardianProof();
    await service.approve(studentUserId, replacement.id, true);
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
  });

  it("rejects unverified accounts and rechecks account verification before activation and reads", async () => {
    await prisma.user.update({ where: { id: studentUserId }, data: { accountVerifiedAt: null } });
    await expect(service.createInvitation(studentUserId)).rejects.toMatchObject({ status: 403 });
    await prisma.user.update({ where: { id: studentUserId }, data: { accountVerifiedAt: at } });
    const invitation = await service.createInvitation(studentUserId);
    await prisma.user.update({ where: { id: parentId }, data: { accountVerifiedAt: null } });
    await expect(service.requestLink(parentId, invitation.token)).rejects.toMatchObject({ status: 403 });
    await prisma.user.update({ where: { id: parentId }, data: { accountVerifiedAt: at } });
    const link = await service.requestLink(parentId, invitation.token);
    await prisma.user.update({ where: { id: parentId }, data: { accountVerifiedAt: null } });
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 403 });
    await prisma.user.update({ where: { id: parentId }, data: { accountVerifiedAt: at } });
    await service.approve(studentUserId, link.id, true);
    await prisma.user.update({ where: { id: studentUserId }, data: { accountVerifiedAt: null } });
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.list(studentUserId)).rejects.toMatchObject({ status: 403 });
  });

  it("grants no access to legacy bare relations lacking verified lifecycle evidence", async () => {
    const link = await prisma.parentStudent.create({ data: { parentId, studentId } });
    expect(link.status).toBe("PENDING");
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    await expect(service.approve(studentUserId, link.id, true)).rejects.toMatchObject({ status: 410 });
  });

  it("invalidates prior consent when the student profile moves to another authenticated account", async () => {
    const link = await pendingLink();
    await service.approve(studentUserId, link.id, true);
    const replacementAccount = await user("STUDENT");
    userIds.push(replacementAccount.id);
    try {
      await prisma.student.update({ where: { id: studentId }, data: { userId: replacementAccount.id } });
      await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    } finally {
      await prisma.student.update({ where: { id: studentId }, data: { userId: studentUserId } });
    }
  });

  it("immediately blocks an active guardian-dependent link when its proof is revoked", async () => {
    const link = await pendingLink();
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "GUARDIAN" } });
    const proof = await guardianProof();
    await service.approve(studentUserId, link.id, true);
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
    await prisma.parentLinkGuardianVerification.update({ where: { id: proof.id }, data: { revokedAt: at } });
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
  });

  it("allows only one parent to consume an invitation when requests race", async () => {
    const invitation = await service.createInvitation(studentUserId);
    const results = await Promise.allSettled([
      service.requestLink(parentId, invitation.token),
      service.requestLink(otherParentId, invitation.token),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(ParentLinkError);
    expect(rejected?.status === "rejected" && rejected.reason).toMatchObject({ status: 409 });
    expect(await prisma.parentStudent.count({ where: { studentId } })).toBe(1);
    const stored = await prisma.parentLinkInvitation.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(invitation.token).digest("hex") },
    });
    const links = await prisma.parentStudent.findMany({ where: { studentId } });
    expect(stored.consumedById).toBe(links[0]?.parentId);
  });

  it("leaves access revoked when approval and revocation race", async () => {
    const link = await pendingLink();
    const [approval, revocation] = await Promise.allSettled([
      service.approve(studentUserId, link.id, true),
      service.revoke(parentId, link.id),
    ]);
    expect(revocation.status).toBe("fulfilled");
    if (approval.status === "rejected") expect(approval.reason).toMatchObject({ status: 410 });
    expect(await prisma.parentStudent.findUniqueOrThrow({ where: { id: link.id } })).toMatchObject({
      status: "REVOKED",
    });
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
  });
});

describe("parent link HTTP integration", () => {
  function authenticatedApp() {
    // This fake session registry belongs only to the test app. Production has no
    // header-based identity fallback and must install its own trusted resolver.
    const sessions = new Map([
      ["Bearer student-session", studentUserId],
      ["Bearer parent-session", parentId],
      ["Bearer unrelated-session", otherParentId],
    ]);
    return createApp({
      prisma,
      resolveUserId: async (incoming) => sessions.get(incoming.get("Authorization") ?? "") ?? null,
    });
  }

  it("fails closed without a trusted authentication adapter, including forged headers and body identities", async () => {
    const app = createApp();
    for (const [method, path] of [
      ["get", "/"],
      ["post", "/invitations"],
      ["post", "/requests"],
      ["post", "/forged/approve"],
      ["delete", "/forged"],
    ] as const) {
      const call = request(app)
        [method](`/api/parent-links${path}`)
        .set("X-User-Id", studentUserId)
        .set("X-Role", "STUDENT")
        .set("Authorization", `Bearer ${studentUserId}`);
      if (method === "post") call.send({ actorId: studentUserId, studentId, parentId, consent: true });
      await call.expect(401).expect("Cache-Control", "no-store");
    }
    expect(await prisma.parentStudent.count({ where: { studentId } })).toBe(0);
  });

  it("persists the request, approval and revocation HTTP flow through the real service", async () => {
    const app = authenticatedApp();
    const invitation = await request(app)
      .post("/api/parent-links/invitations")
      .set("Authorization", "Bearer student-session")
      .send({})
      .expect(201)
      .expect("Cache-Control", "no-store");
    const pending = await request(app)
      .post("/api/parent-links/requests")
      .set("Authorization", "Bearer parent-session")
      .send({ token: invitation.body.token })
      .expect(201);
    expect(pending.body).toMatchObject({ studentId, parentId, status: "PENDING", verifiedAt: null });
    expect(pending.body).not.toHaveProperty("tokenHash");
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
    await request(app)
      .post(`/api/parent-links/${pending.body.id}/approve`)
      .set("Authorization", "Bearer parent-session")
      .send({ consent: true })
      .expect(403);
    await request(app)
      .post(`/api/parent-links/${pending.body.id}/approve`)
      .set("Authorization", "Bearer student-session")
      .send({ consent: true })
      .expect(200);
    await expect(service.requireAccess(parentId, studentId)).resolves.toBeUndefined();
    const unrelated = await request(app)
      .get("/api/parent-links")
      .set("Authorization", "Bearer unrelated-session")
      .expect(200);
    expect(unrelated.body).toEqual([]);
    await request(app)
      .delete(`/api/parent-links/${pending.body.id}`)
      .set("Authorization", "Bearer unrelated-session")
      .expect(404);
    const revoked = await request(app)
      .delete(`/api/parent-links/${pending.body.id}`)
      .set("Authorization", "Bearer parent-session")
      .expect(200);
    expect(revoked.body.status).toBe("REVOKED");
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects caller-supplied ownership, consent eligibility and guardian evidence fields", async () => {
    const app = authenticatedApp();
    await request(app)
      .post("/api/parent-links/invitations")
      .set("Authorization", "Bearer student-session")
      .send({ studentId, eligible: true, parentLinkConsentRequirement: "SELF_CONSENT" })
      .expect(400);
    const invitation = await request(app)
      .post("/api/parent-links/invitations")
      .set("Authorization", "Bearer student-session")
      .send({})
      .expect(201);
    await request(app)
      .post("/api/parent-links/requests")
      .set("Authorization", "Bearer parent-session")
      .send({ token: invitation.body.token, parentId: otherParentId })
      .expect(400);
    const pending = await request(app)
      .post("/api/parent-links/requests")
      .set("Authorization", "Bearer parent-session")
      .send({ token: invitation.body.token })
      .expect(201);
    await request(app)
      .post(`/api/parent-links/${pending.body.id}/approve`)
      .set("Authorization", "Bearer student-session")
      .send({ consent: true, guardianVerificationId: "forged", verifiedById: reviewerId })
      .expect(400);
    await expect(service.requireAccess(parentId, studentId)).rejects.toMatchObject({ status: 403 });
  });
});
