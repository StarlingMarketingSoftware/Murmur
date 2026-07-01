-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('approved', 'flagged');

-- CreateTable
CREATE TABLE "EmailModerationVerdict" (
    "id" SERIAL NOT NULL,
    "emailId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "contactId" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "verdict" "ModerationVerdict" NOT NULL,
    "categories" JSONB,
    "reason" TEXT,
    "confidence" DOUBLE PRECISION,
    "model" TEXT NOT NULL,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailModerationVerdict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailModerationVerdict_userId_createdAt_idx" ON "EmailModerationVerdict"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailModerationVerdict_campaignId_verdict_idx" ON "EmailModerationVerdict"("campaignId", "verdict");

-- CreateIndex
CREATE UNIQUE INDEX "EmailModerationVerdict_emailId_contentHash_promptVersion_key" ON "EmailModerationVerdict"("emailId", "contentHash", "promptVersion");

