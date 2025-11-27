-- CreateTable
CREATE TABLE "InboundEmail" (
    "id" SERIAL NOT NULL,
    "sender" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "to" TEXT,
    "from" TEXT,
    "subject" TEXT,
    "date" TEXT,
    "mimeVersion" TEXT,
    "inReplyTo" TEXT,
    "userAgent" TEXT,
    "references" TEXT,
    "contentType" TEXT,
    "messageHeaders" JSONB,
    "received" TEXT,
    "messageId" TEXT NOT NULL,
    "bodyPlain" TEXT,
    "bodyHtml" TEXT,
    "strippedText" TEXT,
    "strippedHtml" TEXT,
    "strippedSignature" TEXT,
    "attachments" JSONB,
    "attachmentCount" INTEGER,
    "contentIdMap" JSONB,
    "mailgunVariables" JSONB,
    "token" TEXT,
    "timestamp" INTEGER,
    "signature" TEXT,
    "userId" TEXT,
    "contactId" INTEGER,
    "originalEmailId" INTEGER,
    "campaignId" INTEGER,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboundEmail_messageId_key" ON "InboundEmail"("messageId");

-- CreateIndex
CREATE INDEX "InboundEmail_userId_idx" ON "InboundEmail"("userId");

-- CreateIndex
CREATE INDEX "InboundEmail_recipient_idx" ON "InboundEmail"("recipient");

-- CreateIndex
CREATE INDEX "InboundEmail_sender_idx" ON "InboundEmail"("sender");

-- CreateIndex
CREATE INDEX "InboundEmail_contactId_idx" ON "InboundEmail"("contactId");

-- CreateIndex
CREATE INDEX "InboundEmail_campaignId_idx" ON "InboundEmail"("campaignId");

-- CreateIndex
CREATE INDEX "InboundEmail_receivedAt_idx" ON "InboundEmail"("receivedAt");

-- CreateIndex
CREATE INDEX "InboundEmail_messageId_idx" ON "InboundEmail"("messageId");

-- CreateIndex
CREATE INDEX "InboundEmail_inReplyTo_idx" ON "InboundEmail"("inReplyTo");

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_originalEmailId_fkey" FOREIGN KEY ("originalEmailId") REFERENCES "Email"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundEmail" ADD CONSTRAINT "InboundEmail_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
