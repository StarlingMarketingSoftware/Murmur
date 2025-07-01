/*
  Warnings:

  - You are about to drop the column `pineconeId` on the `Contact` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[vectorId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contact_pineconeId_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "pineconeId",
ADD COLUMN     "vectorId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_vectorId_key" ON "Contact"("vectorId");
