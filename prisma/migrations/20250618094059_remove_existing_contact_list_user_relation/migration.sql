/*
  Warnings:

  - You are about to drop the `_ContactListToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ContactListToUser" DROP CONSTRAINT "_ContactListToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContactListToUser" DROP CONSTRAINT "_ContactListToUser_B_fkey";

-- DropTable
DROP TABLE "_ContactListToUser";
