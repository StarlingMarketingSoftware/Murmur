-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('submitted', 'withdrawn');

-- CreateTable
CREATE TABLE "EventApplication" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "standardUserId" TEXT NOT NULL,
    "venueUserId" TEXT NOT NULL,
    "genre" TEXT,
    "area" TEXT,
    "performingName" TEXT,
    "bio" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationVideo" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "sourceMediaAssetId" INTEGER,
    "kind" "MediaKind" NOT NULL,
    "sourceType" "MediaSource" NOT NULL,
    "key" TEXT,
    "posterKey" TEXT,
    "embedUrl" TEXT,
    "filename" TEXT,
    "contentType" TEXT,
    "durationSec" DOUBLE PRECISION,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventApplication_eventId_createdAt_idx" ON "EventApplication"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "EventApplication_standardUserId_createdAt_idx" ON "EventApplication"("standardUserId", "createdAt");

-- CreateIndex
CREATE INDEX "EventApplication_venueUserId_createdAt_idx" ON "EventApplication"("venueUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventApplication_eventId_standardUserId_key" ON "EventApplication"("eventId", "standardUserId");

-- CreateIndex
CREATE INDEX "ApplicationVideo_applicationId_idx" ON "ApplicationVideo"("applicationId");

-- AddForeignKey
ALTER TABLE "ApplicationVideo" ADD CONSTRAINT "ApplicationVideo_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "EventApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
