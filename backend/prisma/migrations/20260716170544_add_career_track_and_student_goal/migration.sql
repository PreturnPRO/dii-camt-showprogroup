-- CreateTable
CREATE TABLE "CareerTrack" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameThai" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCareerGoal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "careerTrackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentCareerGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CareerTrack_key_key" ON "CareerTrack"("key");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCareerGoal_studentId_key" ON "StudentCareerGoal"("studentId");

-- AddForeignKey
ALTER TABLE "StudentCareerGoal" ADD CONSTRAINT "StudentCareerGoal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCareerGoal" ADD CONSTRAINT "StudentCareerGoal_careerTrackId_fkey" FOREIGN KEY ("careerTrackId") REFERENCES "CareerTrack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
