/*
  Warnings:

  - A unique constraint covering the columns `[identifier]` on the table `ContactList` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identifier` to the `ContactList` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContactList" ADD COLUMN     "identifier" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ContactList_identifier_key" ON "ContactList"("identifier");
