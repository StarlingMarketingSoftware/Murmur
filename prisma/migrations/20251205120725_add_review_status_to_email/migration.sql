-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('approved', 'rejected');

-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "reviewStatus" "ReviewStatus";
