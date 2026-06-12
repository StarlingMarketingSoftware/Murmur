-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('video', 'audio', 'image');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('uploading', 'ready', 'failed');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "context" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "posterKey" TEXT,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "status" "MediaStatus" NOT NULL DEFAULT 'uploading',
    "position" INTEGER NOT NULL DEFAULT 0,
    "shareId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_shareId_key" ON "MediaAsset"("shareId");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_context_idx" ON "MediaAsset"("userId", "context");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;
