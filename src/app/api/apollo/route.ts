import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
	processZeroBounceResults,
	verifyEmailsWithZeroBounce,
	waitForZeroBounceCompletion,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';
import {
	enrichApolloContacts,
	fetchApolloContacts,
	transformApolloContact,
} from '@/app/api/_utils';

import { ApolloPerson } from '@/types/apollo';
import { Contact, EmailVerificationStatus } from '@prisma/client';

const getApolloContactsSchema = z.object({
	query: z.string(),
	limit: z.coerce.number().default(20),
});
export type GetApolloContactsData = z.infer<typeof getApolloContactsSchema>;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, getApolloContactsSchema);

		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}

		const { query, limit } = validatedFilters.data;
		const searchTerms: string[] = query
			.toLowerCase()
			.split(/\s+/)
			.filter((term) => term.length > 0);

		const caseInsensitiveMode = 'insensitive' as const;
		const whereConditions =
			searchTerms.length > 0
				? {
						AND: [
							// Each search term must match at least one field
							...searchTerms.map((term) => ({
								OR: [
									{ firstName: { contains: term, mode: caseInsensitiveMode } },
									{ lastName: { contains: term, mode: caseInsensitiveMode } },
									{ email: { contains: term, mode: caseInsensitiveMode } },
									{ company: { contains: term, mode: caseInsensitiveMode } },
									{ state: { contains: term, mode: caseInsensitiveMode } },
									{ country: { contains: term, mode: caseInsensitiveMode } },
									{ website: { contains: term, mode: caseInsensitiveMode } },
									{ phone: { contains: term, mode: caseInsensitiveMode } },
								],
							})),
							// AND email validation status must be valid
							{ emailValidationStatus: { equals: EmailVerificationStatus.valid } },
						],
				  }
				: {};

		const localContacts: Contact[] = await prisma.contact.findMany({
			where: whereConditions,
			take: limit,
			orderBy: {
				company: 'asc',
			},
		});

		if (localContacts.length < limit) {
			const apolloContacts: ApolloPerson[] = await fetchApolloContacts(
				query,
				Number(limit)
			);

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

			for (const existingContact of existingContacts) {
				const contactExistsInLocalSearch = localContacts.find(
					(contact) => contact.apolloPersonId === existingContact.apolloPersonId
				);
				if (!contactExistsInLocalSearch) {
					localContacts.push(existingContact);
				}
			}

			const enrichedPeople = await enrichApolloContacts(filteredApolloContacts);
			const transformedContacts = enrichedPeople.map(transformApolloContact);
			const zeroBounceFileId = await verifyEmailsWithZeroBounce(transformedContacts);
			let finalContacts = transformedContacts;

			if (!zeroBounceFileId) {
				return apiResponse(localContacts);
			}

			const validationCompleted = await waitForZeroBounceCompletion(zeroBounceFileId, 1); // 1 minute may be too short for larger datasets

			if (validationCompleted) {
				finalContacts = await processZeroBounceResults(
					zeroBounceFileId,
					transformedContacts
				);
			} else {
				return apiResponse(localContacts);
			}

			const createdContacts: Contact[] = await prisma.contact.createManyAndReturn({
				data: finalContacts,
			});
			const validCreatedContacts = createdContacts.filter(
				(contact) => contact.emailValidationStatus === EmailVerificationStatus.valid
			);
			const combinedResults = [...localContacts, ...validCreatedContacts];

			return apiResponse(
				combinedResults.filter(
					(contact) => contact.emailValidationStatus === EmailVerificationStatus.valid
				)
			);
		}
		return apiResponse(localContacts);
	} catch (error) {
		return handleApiError(error);
	}
}
