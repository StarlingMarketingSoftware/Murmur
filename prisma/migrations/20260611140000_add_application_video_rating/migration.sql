-- CreateTable
CREATE TABLE "ApplicationVideoRating" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" INTEGER NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "standardUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationVideoRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationVideoRating_userId_applicationId_idx" ON "ApplicationVideoRating"("userId", "applicationId");

-- CreateIndex
CREATE INDEX "ApplicationVideoRating_userId_standardUserId_idx" ON "ApplicationVideoRating"("userId", "standardUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationVideoRating_userId_videoId_key" ON "ApplicationVideoRating"("userId", "videoId");
