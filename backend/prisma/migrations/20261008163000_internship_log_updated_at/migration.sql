-- the version a reviewer saw, so an approval never lands on text they did not read
ALTER TABLE "InternshipLog" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
