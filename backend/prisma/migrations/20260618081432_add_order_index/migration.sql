-- DropForeignKey
ALTER TABLE "EnrollmentScore" DROP CONSTRAINT "EnrollmentScore_criteriaId_fkey";

-- AlterTable
ALTER TABLE "CourseGradingCriteria" ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "EnrollmentScore" ADD CONSTRAINT "EnrollmentScore_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "CourseGradingCriteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
