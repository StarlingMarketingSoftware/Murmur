import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiServerError,
	apiUnauthorized,
	handleApiError,
	processZeroBounceResults,
	verifyEmailsWithZeroBounce,
	waitForZeroBounceCompletion,
} from '@/app/api/_utils';
import { Contact, EmailVerificationStatus } from '@prisma/client';
import { ContactPartialWithRequiredEmail } from '@/types/contact';

const batchCreateContactSchema = z.object({
	isPrivate: z.boolean().optional().default(false),
	contacts: z.array(
		z.object({
			firstName: z.string().optional(),
			lastName: z.string().optional(),
			company: z.string().optional(),
			email: z.string(),
			address: z.string().optional(),
			city: z.string().optional(),
			state: z.string().optional(),
			country: z.string().optional(),
			website: z.string().optional(),
			phone: z.string().optional(),
			title: z.string().optional(),
			headline: z.string().optional(),
			linkedInUrl: z.string().optional(),
			photoUrl: z.string().optional(),
			metadata: z.string().optional(),
		})
	),
});
export type PostBatchContactData = z.infer<typeof batchCreateContactSchema>;
export type PostBatchContactDataResponse = {
	contacts: Contact[];
	created: number;
	skipped: number;
	duplicatesRemoved: number;
	skippedEmails: string[];
};

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = batchCreateContactSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { contacts, isPrivate } = validatedData.data;

		// Remove duplicate email addresses, keeping only the first occurrence of each email
		const uniqueContacts = contacts.filter((contact, index, arr) => {
			return (
				arr.findIndex((c) => c.email.toLowerCase() === contact.email.toLowerCase()) ===
				index
			);
		});
		console.log('🚀 ~ uniqueContacts ~ uniqueContacts:', uniqueContacts);

		const duplicatesRemoved = contacts.length - uniqueContacts.length;

		if (isPrivate) {
			const existingContacts = await prisma.contact.findMany({
				where: {
					email: {
						in: uniqueContacts.map((c) => c.email),
					},
				},
			});

			const existingEmails = new Set(existingContacts.map((c) => c.email));

			const contactsWithValidationStatus: ContactPartialWithRequiredEmail[] =
				uniqueContacts.map((importedContact) => {
					const existingContact = existingContacts.find(
						(existingContact) => existingContact.email === importedContact.email
					);
					if (existingContact) {
						return {
							...importedContact,
							emailValidationStatus: existingContact.emailValidationStatus,
							emailValidatedAt: existingContact.emailValidatedAt,
							isPrivate: true,
							userId,
						};
					}
					return {
						...importedContact,
						emailValidationStatus: EmailVerificationStatus.unknown,
						isPrivate: true,
						userId,
					};
				});

			const alreadyValidatedContacts: ContactPartialWithRequiredEmail[] =
				contactsWithValidationStatus.filter(
					(contact) => contact.emailValidationStatus !== EmailVerificationStatus.unknown
				);
			console.log('🚀 ~ POST ~ alreadyValidatedContacts:', alreadyValidatedContacts);

			const contactsToVerify: ContactPartialWithRequiredEmail[] =
				contactsWithValidationStatus.filter(
					(contact) => contact.emailValidationStatus === EmailVerificationStatus.unknown
				);

			console.log('🚀 ~ POST ~ contactsToVerify:', contactsToVerify);
			// TODO the number of contacts they can verify should be limited to their usage limit

			let validatedContacts: ContactPartialWithRequiredEmail[] = [];

			if (contactsToVerify.length > 0) {
				const zeroBounceFileId = await verifyEmailsWithZeroBounce(contactsToVerify);

				if (!zeroBounceFileId) {
					return apiServerError('ZeroBounce validation initial request failed.');
				}

				const validationCompleted = await waitForZeroBounceCompletion(
					zeroBounceFileId,
					10
				); // 1 minute may be too short for larger datasets

				if (validationCompleted) {
					validatedContacts = await processZeroBounceResults(
						zeroBounceFileId,
						contactsToVerify
					);
				}
			}
			// if any emails are not valid, still create them and show them to the user. We want to track which emails are not valid. We also want the user to know what happened. These invalid emails will remain in the ContactList, but will not be drafted or sent to.

			const results = await prisma.contact.createMany({
				data: [...validatedContacts, ...alreadyValidatedContacts],
			});

			const createdContacts = await prisma.contact.findMany({
				where: {
					email: {
						in: [...validatedContacts, ...alreadyValidatedContacts].map((c) => c.email),
					},
					userId,
				},
			});

			return apiCreated({
				contacts: createdContacts,
				created: results.count,
				skipped: uniqueContacts.length - results.count,
				duplicatesRemoved,
				skippedEmails: uniqueContacts
					.filter((contact) => existingEmails.has(contact.email))
					.map((contact) => contact.email),
			});
		} else {
			const result = await prisma.$transaction(async (prisma) => {
				const existingContacts = await prisma.contact.findMany({
					where: {
						email: {
							in: uniqueContacts.map((c) => c.email),
						},
					},
				});

				// TODO contacts must be indexed in vector database

				const existingEmails = new Set(existingContacts.map((c) => c.email));
				const newContacts = uniqueContacts.filter(
					(contact) => !existingEmails.has(contact.email)
				);
				const results = await prisma.contact.createMany({
					data: newContacts.map((contact) => ({
						...contact,
					})),
				});
				return {
					created: results.count,
					skipped: uniqueContacts.length - results.count,
					duplicatesRemoved,
					skippedEmails: uniqueContacts
						.filter((contact) => existingEmails.has(contact.email))
						.map((contact) => contact.email),
				};
			});

			return apiCreated(result);
		}
	} catch (error) {
		return handleApiError(error);
	}
}
