-- AlterTable
ALTER TABLE "Message" ADD COLUMN "applicationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Message_applicationId_key" ON "Message"("applicationId");
