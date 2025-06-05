/*
  Warnings:

  - Added the required column `estimatedTimeOfCompletion` to the `ContactVerificationRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ContactVerificationRequest" ADD COLUMN     "estimatedTimeOfCompletion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "limit" INTEGER,
ADD COLUMN     "notVerifiedSince" TIMESTAMP(3),
ADD COLUMN     "onlyUnverified" BOOLEAN,
ADD COLUMN     "query" TEXT,
ADD COLUMN     "status" "ContactVerificationRequestStatus" NOT NULL DEFAULT 'processing';
