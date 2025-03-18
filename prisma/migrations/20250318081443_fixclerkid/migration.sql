-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userClerkId_fkey";

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userClerkId_fkey" FOREIGN KEY ("userClerkId") REFERENCES "User"("clerkId") ON DELETE CASCADE ON UPDATE CASCADE;
