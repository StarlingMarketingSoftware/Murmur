/*
  Warnings:

  - You are about to drop the column `userId` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `userClerkId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropIndex
DROP INDEX "Subscription_userId_idx";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "userId",
ADD COLUMN     "userClerkId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Subscription_userClerkId_idx" ON "Subscription"("userClerkId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userClerkId_fkey" FOREIGN KEY ("userClerkId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
