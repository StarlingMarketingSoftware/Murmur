-- CreateTable
CREATE TABLE "CampaignContactEvent" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedCount" INTEGER NOT NULL,
    "totalContacts" INTEGER NOT NULL,
    "source" TEXT,
    "metadata" JSONB,

    CONSTRAINT "CampaignContactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignContactEvent_campaignId_idx" ON "CampaignContactEvent"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignContactEvent_createdAt_idx" ON "CampaignContactEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "CampaignContactEvent" ADD CONSTRAINT "CampaignContactEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

