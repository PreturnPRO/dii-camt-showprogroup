-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "sessionId" TEXT;

-- CreateTable
CREATE TABLE "CourseGradingCriteria" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercentage" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGradingCriteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseGradeCutoff" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseGradeCutoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentScore" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseGradingCriteria_courseId_idx" ON "CourseGradingCriteria"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseGradeCutoff_courseId_grade_key" ON "CourseGradeCutoff"("courseId", "grade");

-- CreateIndex
CREATE INDEX "EnrollmentScore_enrollmentId_idx" ON "EnrollmentScore"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentScore_enrollmentId_criteriaId_key" ON "EnrollmentScore"("enrollmentId", "criteriaId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_token_key" ON "AttendanceSession"("token");

-- AddForeignKey
ALTER TABLE "CourseGradingCriteria" ADD CONSTRAINT "CourseGradingCriteria_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseGradeCutoff" ADD CONSTRAINT "CourseGradeCutoff_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentScore" ADD CONSTRAINT "EnrollmentScore_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentScore" ADD CONSTRAINT "EnrollmentScore_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "CourseGradingCriteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
