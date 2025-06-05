/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `ContactVerificationRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ContactVerificationRequest_fileId_key" ON "ContactVerificationRequest"("fileId");
