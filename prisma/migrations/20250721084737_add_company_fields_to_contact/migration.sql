-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "companyFoundedYear" TEXT,
ADD COLUMN     "companyIndustry" TEXT,
ADD COLUMN     "companyKeywords" TEXT[],
ADD COLUMN     "companyLinkedInUrl" TEXT,
ADD COLUMN     "companyPostalCode" TEXT,
ADD COLUMN     "companyTechStack" TEXT[],
ADD COLUMN     "companyType" TEXT;
