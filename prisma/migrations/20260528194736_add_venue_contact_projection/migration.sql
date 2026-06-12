-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "venueId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_venueId_key" ON "Contact"("venueId");

