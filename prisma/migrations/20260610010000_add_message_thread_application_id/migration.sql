-- AlterTable
ALTER TABLE "Message" ADD COLUMN "threadApplicationId" INTEGER;

-- CreateTable
CREATE TABLE "ApplicationReadState" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "venueLastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationReadState_applicationId_key" ON "ApplicationReadState"("applicationId");

-- CreateIndex
CREATE INDEX "Message_conversationId_threadApplicationId_id_idx" ON "Message"("conversationId", "threadApplicationId", "id");
