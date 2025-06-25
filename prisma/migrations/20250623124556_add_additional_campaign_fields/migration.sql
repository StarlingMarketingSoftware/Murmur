-- CreateEnum
CREATE TYPE "DraftingMode" AS ENUM ('ai', 'hybrid', 'handwritten');

-- CreateEnum
CREATE TYPE "DraftingTone" AS ENUM ('normal', 'explanatory', 'formal', 'concise', 'casual');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "draftingMode" "DraftingMode" NOT NULL DEFAULT 'ai',
ADD COLUMN     "draftingTone" "DraftingTone" NOT NULL DEFAULT 'normal',
ADD COLUMN     "handwrittenPrompt" TEXT,
ADD COLUMN     "hybridPrompt" TEXT,
ADD COLUMN     "isAiSubject" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paragraphs" INTEGER DEFAULT 3;
