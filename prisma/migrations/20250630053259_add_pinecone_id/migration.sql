/*
  Warnings:

  - A unique constraint covering the columns `[pineconeId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "pineconeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_pineconeId_key" ON "Contact"("pineconeId");
