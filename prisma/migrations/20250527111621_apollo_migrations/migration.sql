/*
  Warnings:

  - You are about to drop the column `name` on the `Contact` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[apolloPersonId]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EmailVerificationStatus" AS ENUM ('valid', 'invalid', 'catch_all', 'spamtrap', 'abuse', 'do_not_mail', 'unknown');

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "name",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "apolloPersonId" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "emailValidatedAt" TIMESTAMP(3),
ADD COLUMN     "emailValidationScore" INTEGER,
ADD COLUMN     "emailValidationStatus" "EmailVerificationStatus" NOT NULL DEFAULT 'unknown',
ADD COLUMN     "emailValidationSubStatus" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "linkedInUrl" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_apolloPersonId_key" ON "Contact"("apolloPersonId");
