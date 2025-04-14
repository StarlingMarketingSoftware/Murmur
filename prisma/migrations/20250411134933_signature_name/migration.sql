/*
  Warnings:

  - Added the required column `name` to the `Signature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Signature" ADD COLUMN     "name" TEXT NOT NULL;
