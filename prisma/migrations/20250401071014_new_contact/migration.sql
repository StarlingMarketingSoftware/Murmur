/*
  Warnings:

  - You are about to drop the column `category` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the `_CampaignToContactList` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email,contactListId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_CampaignToContactList" DROP CONSTRAINT "_CampaignToContactList_A_fkey";

-- DropForeignKey
ALTER TABLE "_CampaignToContactList" DROP CONSTRAINT "_CampaignToContactList_B_fkey";

-- DropIndex
DROP INDEX "Contact_email_category_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "category";

-- DropTable
DROP TABLE "_CampaignToContactList";

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_contactListId_key" ON "Contact"("email", "contactListId");
