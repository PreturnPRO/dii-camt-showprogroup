/*
  Warnings:

  - You are about to drop the `Quest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestEnrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestTask` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "QuestEnrollment" DROP CONSTRAINT "QuestEnrollment_questId_fkey";

-- DropForeignKey
ALTER TABLE "QuestEnrollment" DROP CONSTRAINT "QuestEnrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "QuestTask" DROP CONSTRAINT "QuestTask_questId_fkey";

-- DropTable
DROP TABLE "Quest";

-- DropTable
DROP TABLE "QuestEnrollment";

-- DropTable
DROP TABLE "QuestTask";
