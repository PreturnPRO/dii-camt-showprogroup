-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "gradesPublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "workingLetterGrade" TEXT,
ADD COLUMN     "workingTotal" DOUBLE PRECISION;

-- Backfill: grades already in the table were visible to students, so they stay visible —
-- the sheet starts from them, and every course that already has a grade counts as published.
UPDATE "Enrollment" SET "workingTotal" = "total", "workingLetterGrade" = "letterGrade";
UPDATE "Course" SET "gradesPublishedAt" = NOW()
WHERE EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."courseId" = "Course"."id" AND e."letterGrade" IS NOT NULL);
