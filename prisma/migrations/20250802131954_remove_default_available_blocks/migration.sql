-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "draftingMode" SET DEFAULT 'hybrid',
ALTER COLUMN "hybridAvailableBlocks" SET DEFAULT ARRAY['text']::"HybridBlock"[];
