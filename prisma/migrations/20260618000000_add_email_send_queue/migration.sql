-- CreateEnum
CREATE TYPE "SendQueueStatus" AS ENUM ('pending', 'processing', 'sent', 'failed', 'canceled');

-- CreateTable
CREATE TABLE "EmailSendQueue" (
    "id" SERIAL NOT NULL,
    "emailId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "contactId" INTEGER NOT NULL,
    "status" "SendQueueStatus" NOT NULL DEFAULT 'pending',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "capDay" TEXT NOT NULL,
    "recipientTz" TEXT NOT NULL DEFAULT 'America/New_York',
    "dispatchedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "capRescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "creditRescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "creditBlockedAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockToken" TEXT,
    "failureReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSendQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailSendQueue_emailId_key" ON "EmailSendQueue"("emailId");

-- CreateIndex
CREATE INDEX "EmailSendQueue_status_scheduledFor_idx" ON "EmailSendQueue"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "EmailSendQueue_userId_capDay_status_idx" ON "EmailSendQueue"("userId", "capDay", "status");

-- CreateIndex
CREATE INDEX "EmailSendQueue_campaignId_status_idx" ON "EmailSendQueue"("campaignId", "status");

-- CreateIndex
CREATE INDEX "EmailSendQueue_status_lockedAt_idx" ON "EmailSendQueue"("status", "lockedAt");
