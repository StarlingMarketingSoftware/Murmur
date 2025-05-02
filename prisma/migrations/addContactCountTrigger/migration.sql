CREATE OR REPLACE FUNCTION update_contact_list_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE "ContactList"
        SET count = count + 1
        WHERE id = NEW."contactListId";
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE "ContactList"
        SET count = count - 1
        WHERE id = OLD."contactListId";
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_list_count_trigger
AFTER INSERT OR DELETE ON "Contact"
FOR EACH ROW
EXECUTE FUNCTION update_contact_list_count();