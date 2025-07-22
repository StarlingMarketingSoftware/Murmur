import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { updateWithNewFields } from '../../_utils/vectorDb';
import { UserRole } from '@prisma/client';

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Check if the user is an admin
		const user = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});
		if (user?.role !== UserRole.admin) {
			return apiUnauthorized();
		}

		const res = await updateWithNewFields();

		return apiResponse({
			message: 'Updated with new fields',
			data: res,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
