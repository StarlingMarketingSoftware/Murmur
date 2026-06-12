-- CreateEnum
CREATE TYPE "BookingRequestStatus" AS ENUM ('pending', 'confirmed', 'canceled');

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "threadApplicationId" INTEGER,
    "eventId" INTEGER,
    "venueUserId" TEXT NOT NULL,
    "standardUserId" TEXT NOT NULL,
    "venueId" INTEGER NOT NULL,
    "status" "BookingRequestStatus" NOT NULL DEFAULT 'pending',
    "date" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingRequest_conversationId_threadApplicationId_status_idx" ON "BookingRequest"("conversationId", "threadApplicationId", "status");

-- CreateIndex
CREATE INDEX "BookingRequest_eventId_status_idx" ON "BookingRequest"("eventId", "status");

-- CreateIndex
CREATE INDEX "BookingRequest_standardUserId_status_idx" ON "BookingRequest"("standardUserId", "status");

-- CreateIndex
CREATE INDEX "BookingRequest_venueUserId_status_idx" ON "BookingRequest"("venueUserId", "status");

-- AlterTable (additive only)
ALTER TABLE "Message" ADD COLUMN "bookingRequestId" INTEGER;

-- AlterTable (additive only)
ALTER TABLE "CalendarEntry" ADD COLUMN "bookingRequestId" INTEGER;
