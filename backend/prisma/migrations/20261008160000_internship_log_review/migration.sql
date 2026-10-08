ALTER TABLE "InternshipLog"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewComment" TEXT,
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
