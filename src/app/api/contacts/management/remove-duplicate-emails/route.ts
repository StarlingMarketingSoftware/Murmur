import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';

export const GET = async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (user?.role !== 'admin') {
			return apiUnauthorized('Only admins can access this route');
		}

		// 1. Find all emails with more than one contact
		const duplicates = await prisma.contact.groupBy({
			by: ['email'],
			_count: { email: true },
			having: {
				email: {
					_count: { gt: 1 },
				},
			},
		});
		console.log('Duplicates:', duplicates);

		// return apiResponse({
		// 	message: `Found ${duplicates.length} duplicate emails`,
		// 	duplicates,
		// });

		let totalDeleted = 0;
		const deletedContacts: { email: string; deletedIds: number[] }[] = [];

		for (const dup of duplicates) {
			// 2. Get all contacts for this email, ordered by id
			const contacts = await prisma.contact.findMany({
				where: { email: dup.email },
				orderBy: { id: 'asc' },
			});

			// 3. Keep the first, delete the rest
			const toDelete = contacts.slice(1); // all except the first
			const deletedIds: number[] = [];

			for (const contact of toDelete) {
				console.log('Deleting:', contact.email);
				await prisma.contact.delete({ where: { id: contact.id } });
				deletedIds.push(contact.id);
				totalDeleted++;
			}

			if (deletedIds.length > 0) {
				deletedContacts.push({ email: dup.email, deletedIds });
			}
		}

		return apiResponse({
			message: `Deleted ${totalDeleted} duplicate contacts.`,
			details: deletedContacts,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
