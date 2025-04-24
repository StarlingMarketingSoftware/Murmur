-- CreateTable
CREATE TABLE "_ContactListToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ContactListToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ContactListToUser_B_index" ON "_ContactListToUser"("B");

-- AddForeignKey
ALTER TABLE "_ContactListToUser" ADD CONSTRAINT "_ContactListToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactListToUser" ADD CONSTRAINT "_ContactListToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
