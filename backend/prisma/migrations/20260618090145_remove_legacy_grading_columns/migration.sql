/*
  Warnings:

  - You are about to drop the column `assignments` on the `Enrollment` table. All the data in the column will be lost.
  - You are about to drop the column `final` on the `Enrollment` table. All the data in the column will be lost.
  - You are about to drop the column `midterm` on the `Enrollment` table. All the data in the column will be lost.
  - You are about to drop the column `participation` on the `Enrollment` table. All the data in the column will be lost.
  - You are about to drop the column `project` on the `Enrollment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Enrollment" DROP COLUMN "assignments",
DROP COLUMN "final",
DROP COLUMN "midterm",
DROP COLUMN "participation",
DROP COLUMN "project";
