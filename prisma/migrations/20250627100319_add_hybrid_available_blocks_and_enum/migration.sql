-- CreateEnum
CREATE TYPE "HybridBlock" AS ENUM ('introduction', 'research', 'action', 'text');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "hybridAvailableBlocks" "HybridBlock"[] DEFAULT ARRAY['introduction', 'research', 'action', 'text']::"HybridBlock"[];
