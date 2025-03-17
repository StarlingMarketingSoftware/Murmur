/*
  Warnings:

  - You are about to drop the column `priceId` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `stripePriceId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_productId_fkey";

-- DropIndex
DROP INDEX "Subscription_productId_idx";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "priceId",
ADD COLUMN     "stripePriceId" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
