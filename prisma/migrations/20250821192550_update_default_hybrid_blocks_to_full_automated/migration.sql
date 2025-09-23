-- AlterTable
ALTER TABLE "Campaign" ALTER COLUMN "hybridBlockPrompts" SET DEFAULT '[{"id": "full_automated", "type": "full_automated", "value": ""}]',
ALTER COLUMN "hybridAvailableBlocks" SET DEFAULT ARRAY['full_automated', 'introduction', 'research', 'action', 'text']::"HybridBlock"[];
