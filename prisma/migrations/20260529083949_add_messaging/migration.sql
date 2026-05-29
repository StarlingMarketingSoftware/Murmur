-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('standard', 'venue');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "standardUserId" TEXT NOT NULL,
    "venueId" INTEGER NOT NULL,
    "standardLastReadAt" TIMESTAMP(3),
    "venueLastReadAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "senderClerkId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isHtml" BOOLEAN NOT NULL DEFAULT false,
    "emailId" INTEGER,
    "campaignId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_standardUserId_lastMessageAt_idx" ON "Conversation"("standardUserId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_venueId_lastMessageAt_idx" ON "Conversation"("venueId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_standardUserId_venueId_key" ON "Conversation"("standardUserId", "venueId");

-- CreateIndex
CREATE INDEX "Message_conversationId_id_idx" ON "Message"("conversationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Message_emailId_key" ON "Message"("emailId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

