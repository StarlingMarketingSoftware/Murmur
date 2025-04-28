-- Rename the 'category' column to 'name'
ALTER TABLE "ContactList" RENAME COLUMN "category" TO "name";

-- Remove the old index (if it exists)
DROP INDEX IF EXISTS "ContactList_category_idx";

-- Remove the old unique constraint
ALTER TABLE "ContactList" DROP CONSTRAINT IF EXISTS "ContactList_category_key";

-- Add the new unique constraint
ALTER TABLE "ContactList" ADD CONSTRAINT "ContactList_name_key" UNIQUE ("name");