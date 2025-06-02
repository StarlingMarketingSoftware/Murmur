/*
  Warnings:

  - A unique constraint covering the columns `[murmurEmail]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "murmurEmail" TEXT;

-- Update existing users with murmurEmail
UPDATE "User" 
SET "murmurEmail" = LOWER(COALESCE("firstName", '') || COALESCE("lastName", '') || '@' || "id" || '.murmurmailbox.com')
WHERE "murmurEmail" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_murmurEmail_key" ON "User"("murmurEmail");
