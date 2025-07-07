import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
	processZeroBounceResults,
	verifyEmailsWithZeroBounce,
	waitForZeroBounceCompletion,
} from '@/app/api/_utils';
import {
	enrichApolloContacts,
	fetchApolloContacts,
	transformApolloContact,
} from '@/app/api/_utils';

import { ApolloPerson } from '@/types/apollo';
import { Contact, EmailVerificationStatus } from '@prisma/client';
import { upsertContactToVectorDb } from '../_utils/vectorDb';

const postApolloContactsSchema = z.object({
	query: z.string(),
	limit: z.coerce.number().default(20),
});
export type PostApolloContactsData = z.infer<typeof postApolloContactsSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = postApolloContactsSchema.safeParse(data);

		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { query } = validatedData.data;

		const apolloContacts: ApolloPerson[] = await fetchApolloContacts(query);

		const existingContacts: Contact[] = await prisma.contact.findMany({
			where: {
				apolloPersonId: {
					in: apolloContacts.map((person: ApolloPerson) => person.id),
				},
			},
		});

		const filteredApolloContacts = apolloContacts.filter(
			(contact: ApolloPerson) =>
				!existingContacts.some(
					(existingContact) => existingContact.apolloPersonId === contact.id
				)
		);

		const enrichedPeople = await enrichApolloContacts(filteredApolloContacts);
		const transformedContacts = enrichedPeople.map(transformApolloContact);

		let validatedContacts = transformedContacts;

		const isTestingEnvironment = process.env.NODE_ENV !== 'production';
		console.log('🚀 ~ POST ~ isTestingEnvironment:', isTestingEnvironment);

		if (isTestingEnvironment) {
			// In testing environment, mark all contacts as valid
			validatedContacts = transformedContacts.map((contact) => ({
				...contact,
				emailValidationStatus: EmailVerificationStatus.valid,
				emailValidatedAt: new Date(),
			}));
		} else {
			// In production, use ZeroBounce validation
			const zeroBounceFileId = await verifyEmailsWithZeroBounce(transformedContacts);

			if (!zeroBounceFileId) {
				return apiServerError('ZeroBounce validation initial request failed.');
			}

			const validationCompleted = await waitForZeroBounceCompletion(zeroBounceFileId, 1); // 1 minute may be too short for larger datasets

			if (validationCompleted) {
				validatedContacts = await processZeroBounceResults(
					zeroBounceFileId,
					transformedContacts
				);
			} else {
				return apiServerError('ZeroBounce validation failed or timed out.');
			}
		}

		console.log('🚀 ~ POST ~ validatedContacts:', validatedContacts);
		const createdContacts: Contact[] = await prisma.contact.createManyAndReturn({
			data: validatedContacts,
		});

		void Promise.all(createdContacts.map((contact) => upsertContactToVectorDb(contact)));

		const validCreatedContacts = createdContacts.filter(
			(contact) => contact.emailValidationStatus === EmailVerificationStatus.valid
		);

		return apiResponse(validCreatedContacts);
	} catch (error) {
		return handleApiError(error);
	}
}
