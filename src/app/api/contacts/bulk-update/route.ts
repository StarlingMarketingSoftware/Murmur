import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
	apiResponse,
	apiUnauthorized,
	handleApiError,
	apiBadRequest,
} from '@/app/api/_utils';
import { upsertContactToVectorDb } from '../../_utils/vectorDb';
import { EmailVerificationStatus } from '@prisma/client';

const updateContactSchema = z.object({
	firstName: z.string().optional().nullable(),
	lastName: z.string().optional().nullable(),
	company: z.string().optional().nullable(),
	email: z.string().email().optional(),
	address: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	state: z.string().optional().nullable(),
	country: z.string().optional().nullable(),
	website: z.string().optional().nullable(),
	phone: z.string().optional().nullable(),
	title: z.string().optional().nullable(),
	headline: z.string().optional().nullable(),
	linkedInUrl: z.string().optional().nullable(),
	photoUrl: z.string().optional().nullable(),
	metadata: z.string().optional().nullable(),
	isPrivate: z.boolean().optional(),
	userId: z.string().optional().nullable(),
	emailValidationStatus: z.nativeEnum(EmailVerificationStatus).optional(),
	emailValidatedAt: z.date().optional(),
	manualDeselections: z.number().optional(),
});

const bulkUpdateSchema = z.object({
	updates: z.array(
		z.object({
			id: z.number(),
			data: updateContactSchema,
		})
	),
});

export type PostBulkUpdateContactData = z.infer<typeof bulkUpdateSchema>;

export async function PATCH(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = bulkUpdateSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { updates } = validatedData.data;

		// Process updates in batches for better performance
		const updatedContacts = [];
		const failedUpdates = [];

		for (const update of updates) {
			try {
				const updatedContact = await prisma.contact.update({
					where: { id: update.id },
					data: update.data,
				});

				// Update vector database if contact was successfully updated
				await upsertContactToVectorDb(updatedContact);
				updatedContacts.push(updatedContact);
			} catch (error) {
				failedUpdates.push({
					id: update.id,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}

		return apiResponse({
			message: 'Bulk update completed',
			updatedCount: updatedContacts.length,
			failedCount: failedUpdates.length,
			updatedContacts,
			failedUpdates,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
