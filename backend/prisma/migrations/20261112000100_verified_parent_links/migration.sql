-- Extend the existing school schema without deleting school records.
ALTER TYPE "UserRole" ADD VALUE 'STUDENT';

CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'VERIFIED', 'REVOKED');
CREATE TYPE "ParentLinkConsentRequirement" AS ENUM ('UNKNOWN', 'SELF_CONSENT', 'GUARDIAN');

ALTER TABLE "User" ADD COLUMN "accountVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Student"
    ADD COLUMN "userId" TEXT,
    ADD COLUMN "parentLinkConsentRequirement" "ParentLinkConsentRequirement" NOT NULL DEFAULT 'UNKNOWN',
    ALTER COLUMN "classId" DROP NOT NULL;

ALTER TABLE "ParentStudent"
    ADD COLUMN "id" TEXT,
    ADD COLUMN "status" "ParentLinkStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "expiresAt" TIMESTAMP(3),
    ADD COLUMN "verifiedAt" TIMESTAMP(3),
    ADD COLUMN "verifiedById" TEXT,
    ADD COLUMN "consentVersion" TEXT,
    ADD COLUMN "guardianVerificationId" TEXT,
    ADD COLUMN "revokedAt" TIMESTAMP(3),
    ADD COLUMN "revokedById" TEXT;

-- Legacy associations are not proof of consent or guardianship. Retain their
-- history, but require a new verified linking flow before granting access.
-- The length prefix keeps legacy IDs unique for every original composite key.
UPDATE "ParentStudent"
SET "id" = 'legacy_' || length("parentId") || '_' || "parentId" || '_' || "studentId",
    "status" = 'REVOKED',
    "revokedAt" = CURRENT_TIMESTAMP,
    "revokedById" = 'migration:20261112000100_verified_parent_links';

ALTER TABLE "ParentStudent" ALTER COLUMN "id" SET NOT NULL;

CREATE TABLE "ParentLinkInvitation" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "consumedById" TEXT,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "ParentLinkInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParentLinkGuardianVerification" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "verifiedById" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "ParentLinkGuardianVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");
CREATE UNIQUE INDEX "ParentStudent_id_key" ON "ParentStudent"("id");
CREATE INDEX "ParentStudent_studentId_status_idx" ON "ParentStudent"("studentId", "status");
CREATE UNIQUE INDEX "ParentLinkInvitation_tokenHash_key" ON "ParentLinkInvitation"("tokenHash");
CREATE INDEX "ParentLinkInvitation_studentId_expiresAt_idx" ON "ParentLinkInvitation"("studentId", "expiresAt");
CREATE INDEX "ParentLinkGuardianVerification_parentId_studentId_expiresAt_idx"
    ON "ParentLinkGuardianVerification"("parentId", "studentId", "expiresAt");

ALTER TABLE "Student" DROP CONSTRAINT "Student_classId_fkey";
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentLinkInvitation" ADD CONSTRAINT "ParentLinkInvitation_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentLinkGuardianVerification" ADD CONSTRAINT "ParentLinkGuardianVerification_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentLinkGuardianVerification" ADD CONSTRAINT "ParentLinkGuardianVerification_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
