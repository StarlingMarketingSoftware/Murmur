-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "contentVector" vector(1536);

CREATE INDEX ON "Contact" USING hnsw ("contentVector" vector_cosine_ops);