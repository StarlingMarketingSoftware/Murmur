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

		const result = await prisma.contactList.findMany({});

		// Update each contact list individually to set title = name
		const updatePromises = result.map((contactList) => {
			return prisma.contactList.update({
				where: { id: contactList.id },
				data: {
					title: contactList.name,
				},
			});
		});

		const updateRes = await Promise.all(updatePromises);

		return apiResponse(updateRes);
	} catch (error) {
		return handleApiError(error);
	}
};
