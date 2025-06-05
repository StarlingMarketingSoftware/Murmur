-- CreateEnum
CREATE TYPE "ContactVerificationRequestStatus" AS ENUM ('processing', 'completed', 'failed');

-- CreateTable
CREATE TABLE "ContactVerificationRequest" (
    "id" SERIAL NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "ContactVerificationRequest_pkey" PRIMARY KEY ("id")
);
