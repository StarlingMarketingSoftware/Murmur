-- Update firstName with name where firstName is null
UPDATE "Contact"
SET "firstName" = "name"
WHERE "firstName" IS NULL AND "name" IS NOT NULL;

-- Drop the name column
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "name";
