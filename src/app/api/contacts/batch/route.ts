import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiForbidden,
	apiServerError,
	apiUnauthorized,
	getIsAdmin,
	handleApiError,
	processZeroBounceResults,
	verifyEmailsWithZeroBounce,
	waitForZeroBounceCompletion,
} from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { Contact, EmailVerificationStatus, UserRole } from '@prisma/client';
import { ContactPartialWithRequiredEmail } from '@/types/contact';

const batchCreateContactSchema = z.object({
	isPrivate: z.boolean().optional().default(false),
	contacts: z
		.array(
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
		)
		.min(1)
		.max(5000),
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
		const limited = await withRateLimit(req, 'paid-external', 'contacts-batch');
		if (limited) return limited;

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

		// Only admins may create GLOBAL (non-private) contacts — the curated DB is
		// admin-managed. The upload dialog already sends isPrivate for non-admins;
		// this closes the direct-API path.
		if (!isPrivate && !(await getIsAdmin(userId))) {
			return apiForbidden('Only admins can create global contacts');
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
			// Server-side enforcement of the verification-credit gate the client applies
			// (useContactTSVUploadDialog) — a direct API call would otherwise bypass it and
			// spend ZeroBounce verifications without limit.
			const importingUser = await prisma.user.findUnique({
				where: { clerkId: userId },
				select: { role: true, verificationCredits: true },
			});
			const isAdmin = importingUser?.role === UserRole.admin;
			if (!isAdmin && uniqueContacts.length > (importingUser?.verificationCredits ?? 0)) {
				return apiForbidden(
					'Insufficient verification credits for this import. Please upgrade your plan.'
				);
			}

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
