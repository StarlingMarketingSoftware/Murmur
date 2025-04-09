-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'deleted', 'archived');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'active';
