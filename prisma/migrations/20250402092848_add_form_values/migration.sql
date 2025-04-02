-- CreateEnum
CREATE TYPE "AiModel" AS ENUM ('sonar', 'sonar-pro');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "aiModel" "AiModel",
ADD COLUMN     "message" TEXT,
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "Contact" ALTER COLUMN "name" DROP NOT NULL;
