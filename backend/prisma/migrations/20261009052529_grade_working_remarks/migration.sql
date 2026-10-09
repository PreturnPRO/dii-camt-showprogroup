-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "workingRemarks" TEXT;

-- the sheet starts from the remarks students already see
UPDATE "Enrollment" SET "workingRemarks" = "remarks";
