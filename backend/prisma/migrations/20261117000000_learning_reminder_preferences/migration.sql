-- Reminder scopes are separate from verified parent progress access and default off.
ALTER TABLE "ParentStudent"
    ADD COLUMN "examsShared" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "activityShared" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "LearningReminderPreference" (
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "linkVerifiedAt" TIMESTAMP(3) NOT NULL,
    "upcomingExams" BOOLEAN NOT NULL DEFAULT false,
    "lowActivity" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningReminderPreference_pkey" PRIMARY KEY ("parentId", "studentId")
);

ALTER TABLE "LearningReminderPreference"
    ADD CONSTRAINT "LearningReminderPreference_parentId_studentId_fkey"
    FOREIGN KEY ("parentId", "studentId") REFERENCES "ParentStudent"("parentId", "studentId")
    ON DELETE CASCADE ON UPDATE CASCADE;
