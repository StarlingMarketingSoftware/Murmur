import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { ContactList } from '@prisma/client';

export const getContactLists = async (): Promise<ContactList[]> => {
	// gets all contact lists
	const { userId } = await auth();

	if (!userId) {
		return [];
	}

	try {
		const result = await prisma.contactList.findMany({});
		return result;
	} catch (error) {
		console.error(error);
		return [];
	}
};
