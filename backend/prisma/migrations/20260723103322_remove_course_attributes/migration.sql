/*
  Warnings:

  - You are about to drop the column `maxStudents` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `minStudents` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `room` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `schedule` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "maxStudents",
DROP COLUMN "minStudents",
DROP COLUMN "room",
DROP COLUMN "schedule";

-- AlterTable
ALTER TABLE "Section" ADD COLUMN     "minStudents" INTEGER NOT NULL DEFAULT 1;
