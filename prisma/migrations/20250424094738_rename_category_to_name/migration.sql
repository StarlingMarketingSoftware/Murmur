/*
  Warnings:

  - You are about to drop the column `identifier` on the `ContactList` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "ContactList_identifier_key";

-- AlterTable
ALTER TABLE "ContactList" DROP COLUMN "identifier",
ALTER COLUMN "count" DROP NOT NULL,
ALTER COLUMN "count" SET DEFAULT 0;
