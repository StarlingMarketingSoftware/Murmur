-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "contactListId" TEXT;

-- CreateTable
CREATE TABLE "ContactList" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactList_category_key" ON "ContactList"("category");
