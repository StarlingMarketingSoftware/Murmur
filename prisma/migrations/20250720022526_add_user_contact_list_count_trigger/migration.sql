-- CreateMigration: Add user contact list count trigger

-- First, update existing counts to ensure they're accurate
UPDATE "Contact" c 
SET "userContactListCount" = (
    SELECT COUNT(*)
    FROM "_ContactToUserContactList"
    WHERE "B" = c.id
);

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_contact_user_contact_list_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE "Contact"
        SET "userContactListCount" = "userContactListCount" + 1
        WHERE id = NEW."B";
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE "Contact"
        SET "userContactListCount" = "userContactListCount" - 1
        WHERE id = OLD."B";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER contact_user_contact_list_count_trigger
AFTER INSERT OR DELETE ON "_ContactToUserContactList"
FOR EACH ROW
EXECUTE FUNCTION update_contact_user_contact_list_count();