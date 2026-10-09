-- DropIndex
DROP INDEX "Course_code_key";

-- CreateIndex
CREATE INDEX "Course_code_idx" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_semester_academicYear_key" ON "Course"("code", "semester", "academicYear");

