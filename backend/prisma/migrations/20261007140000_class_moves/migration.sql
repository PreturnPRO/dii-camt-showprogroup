-- CreateTable
CREATE TABLE "ClassMove" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "originalDate" TIMESTAMP(3) NOT NULL,
    "originalStart" TEXT NOT NULL,
    "originalEnd" TEXT NOT NULL,
    "newDate" TIMESTAMP(3) NOT NULL,
    "newStart" TEXT NOT NULL,
    "newEnd" TEXT NOT NULL,
    "facilityId" TEXT,
    "room" TEXT,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClassMove_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClassMove_sectionId_originalDate_idx" ON "ClassMove"("sectionId", "originalDate");
CREATE INDEX "ClassMove_newDate_idx" ON "ClassMove"("newDate");
ALTER TABLE "ClassMove" ADD CONSTRAINT "ClassMove_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClassMove" ADD CONSTRAINT "ClassMove_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
