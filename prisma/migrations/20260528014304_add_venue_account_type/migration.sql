-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('standard', 'venue');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'standard';
