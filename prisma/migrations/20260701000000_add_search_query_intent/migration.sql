-- CreateTable
CREATE TABLE "SearchQueryIntent" (
    "id" SERIAL NOT NULL,
    "queryKey" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "intent" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQueryIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchQueryIntent_lastUsedAt_idx" ON "SearchQueryIntent"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SearchQueryIntent_queryKey_promptVersion_key" ON "SearchQueryIntent"("queryKey", "promptVersion");

