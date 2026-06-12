-- CreateTable
CREATE TABLE "ApplicationMatchScore" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "eventId" INTEGER NOT NULL,
    "venueUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "scorerVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationMatchScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMatchScore_applicationId_key" ON "ApplicationMatchScore"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationMatchScore_eventId_idx" ON "ApplicationMatchScore"("eventId");

