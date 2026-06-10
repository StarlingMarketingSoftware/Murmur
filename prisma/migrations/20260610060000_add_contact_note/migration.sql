-- CreateTable
CREATE TABLE "ContactNote" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "contactId" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactNote_contactId_idx" ON "ContactNote"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactNote_userId_contactId_key" ON "ContactNote"("userId", "contactId");

