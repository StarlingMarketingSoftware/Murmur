-- CreateTable
CREATE TABLE "_CampaignToContactList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CampaignToContactList_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CampaignToContactList_B_index" ON "_CampaignToContactList"("B");

-- AddForeignKey
ALTER TABLE "_CampaignToContactList" ADD CONSTRAINT "_CampaignToContactList_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToContactList" ADD CONSTRAINT "_CampaignToContactList_B_fkey" FOREIGN KEY ("B") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
