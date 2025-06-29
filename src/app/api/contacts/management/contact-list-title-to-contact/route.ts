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

		const result = await prisma.contact.findMany({
			include: {
				contactList: true,
			},
		});

		// Update each contact list individually to set title = name
		const updatePromises = result.map((contact) => {
			return prisma.contact.update({
				where: { id: contact.id },
				data: {
					// Set title to contactList.name if it exists, otherwise null
					title: contact.contactList?.name ?? null,
				},
			});
		});

		const updateRes = await Promise.all(updatePromises);

		return apiResponse({
			message: `Updated ${updateRes.length} contacts`,
			data: updateRes,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
