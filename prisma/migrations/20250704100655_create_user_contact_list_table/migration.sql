-- CreateTable
CREATE TABLE "UserContactList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContactToUserContactList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ContactToUserContactList_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CampaignToUserContactList" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CampaignToUserContactList_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "UserContactList_userId_idx" ON "UserContactList"("userId");

-- CreateIndex
CREATE INDEX "_ContactToUserContactList_B_index" ON "_ContactToUserContactList"("B");

-- CreateIndex
CREATE INDEX "_CampaignToUserContactList_B_index" ON "_CampaignToUserContactList"("B");

-- AddForeignKey
ALTER TABLE "UserContactList" ADD CONSTRAINT "UserContactList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToUserContactList" ADD CONSTRAINT "_ContactToUserContactList_A_fkey" FOREIGN KEY ("A") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactToUserContactList" ADD CONSTRAINT "_ContactToUserContactList_B_fkey" FOREIGN KEY ("B") REFERENCES "UserContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToUserContactList" ADD CONSTRAINT "_CampaignToUserContactList_A_fkey" FOREIGN KEY ("A") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CampaignToUserContactList" ADD CONSTRAINT "_CampaignToUserContactList_B_fkey" FOREIGN KEY ("B") REFERENCES "UserContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
