-- CreateEnum
CREATE TYPE "MediaSource" AS ENUM ('upload', 'youtube');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "embedUrl" TEXT,
ADD COLUMN     "sourceType" "MediaSource" NOT NULL DEFAULT 'upload';
