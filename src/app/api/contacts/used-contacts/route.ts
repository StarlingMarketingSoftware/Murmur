import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';

export async function GET() {
	try {
		const { userId } = await auth();

		if (!userId) {
			return apiUnauthorized();
		}

		const userContactLists = await prisma.userContactList.findMany({
			where: {
				userId,
			},
			include: {
				contacts: true,
			},
		});

		const contactIds: number[] = userContactLists.flatMap((list) =>
			list.contacts.map((contact) => contact.id)
		);

		return apiResponse(contactIds);
	} catch (error) {
		return handleApiError(error);
	}
}
