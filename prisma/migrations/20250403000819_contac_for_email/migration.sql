/*
  Warnings:

  - Made the column `contactId` on table `Email` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Email" DROP CONSTRAINT "Email_contactId_fkey";

-- AlterTable
ALTER TABLE "Email" ALTER COLUMN "contactId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
