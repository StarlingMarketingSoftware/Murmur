-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_identityId_fkey";

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_signatureId_fkey";

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "Signature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
