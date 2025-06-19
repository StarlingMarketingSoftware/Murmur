import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { EmailVerificationStatus } from '@prisma/client';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';

export async function PATCH() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (user?.role !== 'admin') {
			return apiUnauthorized();
		}

		// Update all contacts to have valid email status
		const updateResult = await prisma.contact.updateMany({
			data: {
				emailValidationStatus: EmailVerificationStatus.valid,
				emailValidatedAt: new Date(),
			},
		});

		return apiResponse({
			message: 'Successfully updated all contacts',
			updatedCount: updateResult.count,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
