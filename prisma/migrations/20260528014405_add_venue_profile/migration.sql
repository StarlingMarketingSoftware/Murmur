-- CreateTable
CREATE TABLE "Venue" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT,
    "businessType" TEXT,
    "hours" JSONB,
    "capacityMin" INTEGER,
    "capacityMax" INTEGER,
    "genres" TEXT[],
    "payRange" TEXT,
    "payMin" INTEGER,
    "payMax" INTEGER,
    "sound" TEXT,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venue_userId_key" ON "Venue"("userId");

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;
