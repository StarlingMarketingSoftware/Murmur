import { Contact, UserContactList } from '@prisma/client';

// Contact type with computed name field
export type ContactWithName = Contact & {
	name: string | null;
};

// For use in components that need the computed name field
export type ContactForDisplay = ContactWithName;

export type ContactPartialWithRequiredEmail = Partial<Contact> & {
	email: string;
};

export type UserContactListWithContacts = UserContactList & {
	contacts: Contact[];
};
