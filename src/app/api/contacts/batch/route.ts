import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiNotFound,
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
			companyLinkedInUrl: z.string().optional(),
			companyFoundedYear: z.string().optional(),
			companyType: z.string().optional(),
			companyTechStack: z.array(z.string()).optional(),
			companyPostalCode: z.string().optional(),
			companyKeywords: z.array(z.string()).optional(),
			companyIndustry: z.string().optional(),
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
	const startTime = Date.now();

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

		const user = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});

		if (!user) {
			return apiNotFound('User not found.');
		}

		const { contacts, isPrivate } = validatedData.data;

		if (contacts.length > user.verificationCredits) {
			return apiBadRequest(
				'You do not have enough verification credits to create this many contacts.'
			);
		}

		// Remove duplicate email addresses, keeping only the first occurrence of each email
		const uniqueContacts = contacts.filter((contact, index, arr) => {
			return (
				arr.findIndex((c) => c.email.toLowerCase() === contact.email.toLowerCase()) ===
				index
			);
		});
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
			const contactsToVerify: ContactPartialWithRequiredEmail[] =
				contactsWithValidationStatus.filter(
					(contact) => contact.emailValidationStatus === EmailVerificationStatus.unknown
				);

			let validatedContacts: ContactPartialWithRequiredEmail[] = [];

			const isProduction = process.env.NODE_ENV === 'production';

			if (contactsToVerify.length > 0) {
				if (isProduction) {
					console.log('Verifying emails with ZeroBounce');
					const zeroBounceFileId = await verifyEmailsWithZeroBounce(contactsToVerify);

					if (!zeroBounceFileId) {
						return apiServerError('ZeroBounce validation initial request failed.');
					}

					const validationCompleted = await waitForZeroBounceCompletion(
						zeroBounceFileId,
						10
					);

					if (validationCompleted) {
						validatedContacts = await processZeroBounceResults(
							zeroBounceFileId,
							contactsToVerify
						);
					}
				} else {
					console.log('Simulating ZeroBounce validation');
					await new Promise((resolve) => setTimeout(resolve, 500 * 100));
					// await new Promise((resolve) => setTimeout(resolve, 500 * contactsToVerify.length));
					validatedContacts = contactsToVerify.map(
						(contact: ContactPartialWithRequiredEmail) => ({
							...contact,
							emailValidationStatus: EmailVerificationStatus.valid,
							emailValidatedAt: new Date(),
						})
					);
				}
			}

			await prisma.user.update({
				where: {
					clerkId: userId,
				},
				data: {
					verificationCredits: {
						decrement: contactsToVerify.length,
					},
				},
			});

			const createdContacts = await prisma.contact.createManyAndReturn({
				data: [...validatedContacts, ...alreadyValidatedContacts],
			});

			const elapsedTime = Date.now() - startTime;
			console.log(
				`[Batch Contact Creation] Private contacts created: ${
					createdContacts.length
				}, skipped: ${
					uniqueContacts.length - createdContacts.length
				}, duplicates removed: ${duplicatesRemoved}, elapsed time: ${elapsedTime}ms`
			);

			return apiCreated({
				contacts: createdContacts,
				created: createdContacts.length,
				skipped: uniqueContacts.length - createdContacts.length,
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

			const elapsedTime = Date.now() - startTime;
			console.log(
				`[Batch Contact Creation] Public contacts created: ${result.created}, skipped: ${result.skipped}, duplicates removed: ${result.duplicatesRemoved}, elapsed time: ${elapsedTime}ms`
			);

			return apiCreated(result);
		}
	} catch (error) {
		const elapsedTime = Date.now() - startTime;
		console.error(
			`[Batch Contact Creation] Error occurred after ${elapsedTime}ms:`,
			error
		);
		return handleApiError(error);
	}
}
