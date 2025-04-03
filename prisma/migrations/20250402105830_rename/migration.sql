/*
  Warnings:

  - You are about to drop the column `testEmailMessage` on the `Campaign` table. All the data in the column will be lost.
  - You are about to drop the column `testEmailSubject` on the `Campaign` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "testEmailMessage",
DROP COLUMN "testEmailSubject",
ADD COLUMN     "testMessage" TEXT,
ADD COLUMN     "testSubject" TEXT;
