import prisma from '@/lib/prisma';

/**
 * Ownership checks for resources referenced by id in request payloads.
 *
 * The contact corpus mixes GLOBAL curated rows (userId null, shared by all
 * users) with user-imported private rows, so campaign/email references may be
 * global-or-owned. UserContactLists are always user-owned, so references must
 * be strictly owned. Each check is a single count query over deduped ids.
 */

export const allContactsGlobalOrOwned = async (
	ids: number[],
	userId: string
): Promise<boolean> => {
	if (!ids.length) return true;
	const uniqueIds = [...new Set(ids)];
	const count = await prisma.contact.count({
		where: { id: { in: uniqueIds }, OR: [{ userId: null }, { userId }] },
	});
	return count === uniqueIds.length;
};

export const allContactListsGlobalOrOwned = async (
	ids: number[],
	userId: string
): Promise<boolean> => {
	if (!ids.length) return true;
	const uniqueIds = [...new Set(ids)];
	const count = await prisma.contactList.count({
		where: { id: { in: uniqueIds }, OR: [{ userId: null }, { userId }] },
	});
	return count === uniqueIds.length;
};

export const allUserContactListsOwned = async (
	ids: number[],
	userId: string
): Promise<boolean> => {
	if (!ids.length) return true;
	const uniqueIds = [...new Set(ids)];
	const count = await prisma.userContactList.count({
		where: { id: { in: uniqueIds }, userId },
	});
	return count === uniqueIds.length;
};
