import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";
import { learningReminderDefaults } from "../../src/modules/notifications/learning-reminders.policy.js";
import { LearningReminderPreferencesService } from "../../src/modules/notifications/learning-reminders.service.js";
import { createLearningReminderPreferenceStore } from "../../src/modules/notifications/learning-reminders.store.js";
import { createParentLinksService } from "../../src/modules/parent-links/parent-links.service.js";

const prisma = new PrismaClient({ datasourceUrl: inject("testDatabaseUrl") });
let at: Date;
let parentId: string;
let studentUserId: string;
let studentId: string;
const links = createParentLinksService(prisma, () => new Date(at));
const store = createLearningReminderPreferenceStore(prisma, () => new Date(at));
const preferences = new LearningReminderPreferencesService(store);
const optedIn = { upcomingExams: true, lowActivity: true, timeZone: "Asia/Jerusalem" };

beforeAll(async () => {
  const parent = await prisma.user.create({
    data: {
      email: `${randomUUID()}@reminders.example.test`,
      firstName: "Reminder",
      lastName: "Parent",
      role: "PARENT",
    },
  });
  parentId = parent.id;
  const studentUser = await prisma.user.create({
    data: {
      email: `${randomUUID()}@reminders.example.test`,
      firstName: "Reminder",
      lastName: "Student",
      role: "STUDENT",
    },
  });
  studentUserId = studentUser.id;
  const student = await prisma.student.create({
    data: { firstName: "Reminder", lastName: "Student", userId: studentUserId },
  });
  studentId = student.id;
});

beforeEach(async () => {
  at = new Date("2026-11-12T10:00:00.000Z");
  await prisma.parentStudent.deleteMany({ where: { parentId, studentId } });
  await prisma.parentLinkInvitation.deleteMany({ where: { studentId } });
  await prisma.parentLinkGuardianVerification.deleteMany({ where: { parentId, studentId } });
  await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "SELF_CONSENT" } });
  await prisma.user.update({
    where: { id: parentId },
    data: { role: "PARENT", accountVerifiedAt: new Date("2026-01-01") },
  });
  await prisma.user.update({
    where: { id: studentUserId },
    data: { role: "STUDENT", accountVerifiedAt: new Date("2026-01-01") },
  });
});

afterAll(async () => {
  try {
    if (studentId) await prisma.student.delete({ where: { id: studentId } });
    if (parentId) await prisma.user.delete({ where: { id: parentId } });
    if (studentUserId) await prisma.user.delete({ where: { id: studentUserId } });
  } finally {
    await prisma.$disconnect();
  }
});

async function verifiedLink(guardian = false) {
  const invitation = await links.createInvitation(studentUserId);
  const pending = await links.requestLink(parentId, invitation.token);
  let proofId: string | undefined;
  if (guardian) {
    await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "GUARDIAN" } });
    const proof = await prisma.parentLinkGuardianVerification.create({
      data: {
        parentId,
        studentId,
        verifiedById: "synthetic-trusted-reviewer",
        evidenceReference: "synthetic-reminder-consent",
        verifiedAt: at,
        expiresAt: new Date(at.getTime() + 60_000),
      },
    });
    proofId = proof.id;
  }
  const link = await links.approve(studentUserId, pending.id, true);
  await prisma.parentStudent.update({ where: { id: link.id }, data: { examsShared: true, activityShared: true } });
  if (!link.verifiedAt) throw new Error("Fixture must have a verified link");
  return { ...link, verifiedAt: link.verifiedAt, proofId };
}

describe("reminder preferences use the verified parent link access boundary", () => {
  it("persists separate explicit choices and reloads them through a fresh database adapter", async () => {
    const link = await verifiedLink();
    const session = { userId: parentId, role: "PARENT" as const };
    expect(await preferences.getPreferences(session, studentId)).toEqual(learningReminderDefaults);
    await preferences.savePreferences(session, studentId, optedIn);
    const reloaded = new LearningReminderPreferencesService(createLearningReminderPreferenceStore(prisma, () => at));
    expect(await reloaded.getPreferences(session, studentId)).toEqual(optedIn);
    expect(
      await prisma.learningReminderPreference.findUniqueOrThrow({
        where: { parentId_studentId: { parentId, studentId } },
      }),
    ).toMatchObject({ linkId: link.id, linkVerifiedAt: link.verifiedAt, ...optedIn });
    await preferences.savePreferences(session, studentId, { ...optedIn, upcomingExams: false });
    expect(await reloaded.getPreferences(session, studentId)).toEqual({ ...optedIn, upcomingExams: false });
  });

  it.each(["PENDING", "REVOKED"] as const)("rejects %s status despite a historical verifiedAt", async (status) => {
    const link = await verifiedLink();
    await prisma.parentStudent.update({ where: { id: link.id }, data: { status } });
    expect(await store.read(parentId, studentId)).toEqual({ link: null, preferences: null });
    expect(await store.saveForVerifiedLink(parentId, studentId, link.id, link.verifiedAt.toISOString(), optedIn)).toBe(
      false,
    );
    expect(await prisma.learningReminderPreference.count({ where: { parentId, studentId } })).toBe(0);
  });

  it.each([
    "parent-account",
    "student-account",
    "student-role",
    "consent-version",
    "student-consent",
    "verifier",
  ] as const)("rechecks %s proof for reads and writes", async (invalidProof) => {
    const link = await verifiedLink();
    if (invalidProof === "parent-account")
      await prisma.user.update({ where: { id: parentId }, data: { accountVerifiedAt: null } });
    if (invalidProof === "student-account")
      await prisma.user.update({ where: { id: studentUserId }, data: { accountVerifiedAt: null } });
    if (invalidProof === "student-role")
      await prisma.user.update({ where: { id: parentId }, data: { role: "STUDENT" } });
    if (invalidProof === "consent-version")
      await prisma.parentStudent.update({ where: { id: link.id }, data: { consentVersion: "obsolete" } });
    if (invalidProof === "student-consent")
      await prisma.student.update({ where: { id: studentId }, data: { parentLinkConsentRequirement: "UNKNOWN" } });
    if (invalidProof === "verifier")
      await prisma.parentStudent.update({ where: { id: link.id }, data: { verifiedById: parentId } });
    expect(await store.read(parentId, studentId)).toEqual({ link: null, preferences: null });
    expect(await store.saveForVerifiedLink(parentId, studentId, link.id, link.verifiedAt.toISOString(), optedIn)).toBe(
      false,
    );
  });

  it.each(["revoked", "expired"] as const)("rechecks %s guardian evidence after consent was saved", async (state) => {
    const link = await verifiedLink(true);
    if (!link.proofId) throw new Error("Guardian fixture requires a proof");
    expect(await store.saveForVerifiedLink(parentId, studentId, link.id, link.verifiedAt.toISOString(), optedIn)).toBe(
      true,
    );
    if (state === "revoked") {
      await prisma.parentLinkGuardianVerification.update({ where: { id: link.proofId }, data: { revokedAt: at } });
    } else {
      at = new Date(at.getTime() + 60_000);
    }
    expect(await store.read(parentId, studentId)).toEqual({ link: null, preferences: null });
    expect(await store.saveForVerifiedLink(parentId, studentId, link.id, link.verifiedAt.toISOString(), optedIn)).toBe(
      false,
    );
  });

  it("a replacement request with the same verification timestamp requires fresh scopes and opt-in", async () => {
    const first = await verifiedLink();
    const session = { userId: parentId, role: "PARENT" as const };
    await preferences.savePreferences(session, studentId, optedIn);
    await links.revoke(parentId, first.id);
    const invitation = await links.createInvitation(studentUserId);
    const pending = await links.requestLink(parentId, invitation.token);
    const replacement = await links.approve(studentUserId, pending.id, true);
    expect(replacement.id).not.toBe(first.id);
    expect(replacement.verifiedAt).toEqual(first.verifiedAt);
    expect(await prisma.parentStudent.findUniqueOrThrow({ where: { id: replacement.id } })).toMatchObject({
      examsShared: false,
      activityShared: false,
    });
    expect(await preferences.getPreferences(session, studentId)).toEqual(learningReminderDefaults);
    await prisma.parentStudent.update({
      where: { id: replacement.id },
      data: { examsShared: true, activityShared: true },
    });
    expect(
      await store.saveForVerifiedLink(parentId, studentId, first.id, first.verifiedAt.toISOString(), optedIn),
    ).toBe(false);
    expect(await preferences.getPreferences(session, studentId)).toEqual(learningReminderDefaults);
    await preferences.savePreferences(session, studentId, optedIn);
    expect(await preferences.getPreferences(session, studentId)).toEqual(optedIn);
    await prisma.parentStudent.delete({ where: { id: replacement.id } });
    expect(await prisma.learningReminderPreference.count({ where: { parentId, studentId } })).toBe(0);
  });

  it("revocation between context read and save prevents a consent write", async () => {
    const link = await verifiedLink();
    expect((await store.read(parentId, studentId)).link?.id).toBe(link.id);
    await links.revoke(studentUserId, link.id);
    expect(await store.saveForVerifiedLink(parentId, studentId, link.id, link.verifiedAt.toISOString(), optedIn)).toBe(
      false,
    );
    expect(await prisma.learningReminderPreference.count({ where: { parentId, studentId } })).toBe(0);
  });
});
