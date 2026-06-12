-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "placeId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "size" TEXT,
    "genres" TEXT[],
    "whenLabel" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "pay" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "Event_startsAt_idx" ON "Event"("startsAt");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;
