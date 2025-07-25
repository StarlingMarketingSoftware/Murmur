import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { EmailVerificationStatus } from '@prisma/client';

export const GET = async function GET() {
	try {
		console.log('setting contacts to valid');
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Find all contacts with emailValidationStatus 'unknown' and createdAt after July 20, 2025
		const contacts = await prisma.contact.findMany({
			where: {
				emailValidationStatus: EmailVerificationStatus.unknown,
				createdAt: {
					gt: new Date('2025-07-20T00:00:00.000Z'),
				},
			},
		});

		let updatedCount = 0;
		for (const contact of contacts) {
			await prisma.contact.update({
				where: { id: contact.id },
				data: {
					emailValidationStatus: EmailVerificationStatus.valid,
					emailValidatedAt: new Date(),
				},
			});
			updatedCount++;
			console.log('updated contact', contact.email, updatedCount);
		}

		return apiResponse(updatedCount);
	} catch (error) {
		return handleApiError(error);
	}
};
