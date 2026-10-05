-- CreateTable
CREATE TABLE "CompanyTrackWatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "careerTrackId" TEXT NOT NULL,
    "desiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyTrackWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTrackWatch_companyId_careerTrackId_key" ON "CompanyTrackWatch"("companyId", "careerTrackId");

-- AddForeignKey
ALTER TABLE "CompanyTrackWatch" ADD CONSTRAINT "CompanyTrackWatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTrackWatch" ADD CONSTRAINT "CompanyTrackWatch_careerTrackId_fkey" FOREIGN KEY ("careerTrackId") REFERENCES "CareerTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
