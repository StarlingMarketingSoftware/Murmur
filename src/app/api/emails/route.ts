import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	apiUnauthorizedResource,
	handleApiError,
} from '@/app/api/_utils';
import { EmailStatus } from '@prisma/client';
import { getValidatedParamsFromUrl } from '@/utils';

const postSingleEmailSchema = z.object({
	subject: z.string().min(1),
	message: z.string().min(1),
	campaignId: z.number().int().positive(),
	status: z.nativeEnum(EmailStatus).default(EmailStatus.draft),
	sentAt: z.string().datetime().nullable().optional(),
	contactId: z.number().int().positive(),
});

const postEmailSchema = z.union([postSingleEmailSchema, z.array(postSingleEmailSchema)]);

const emailFilterSchema = z.object({
	campaignId: z.coerce.number().int().positive().optional(),
	status: z.nativeEnum(EmailStatus).optional(),
});
export type PostEmailData = z.infer<typeof postEmailSchema>;

export type EmailFilterData = z.infer<typeof emailFilterSchema>;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const validatedFilters = getValidatedParamsFromUrl(req.url, emailFilterSchema);

		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}
		const { campaignId, status } = validatedFilters.data;

		const emails = await prisma.email.findMany({
			where: {
				userId,
				...(campaignId ? { campaignId } : {}),
				...(status && { status }),
			},
			include: {
				contact: true,
			},
			orderBy: {
				createdAt: 'desc' as const,
			},
		});

		return apiResponse(emails);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();

		const validatedData = postEmailSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		// Normalize to array format for consistent processing
		const rawEmailsArray = Array.isArray(validatedData.data)
			? validatedData.data
			: [validatedData.data];

		if (rawEmailsArray.length === 0) {
			return apiBadRequest('At least one email is required.');
		}

		// Ensure all emails in the request belong to the same campaign.
		const campaignId = rawEmailsArray[0].campaignId;
		const hasMixedCampaignIds = rawEmailsArray.some((e) => e.campaignId !== campaignId);
		if (hasMixedCampaignIds) {
			return apiBadRequest('All emails must have the same campaignId.');
		}

		// If the client accidentally sends duplicate draft payloads for the same contact,
		// dedupe them here to avoid creating multiple draft rows.
		const nonDraftEmails: typeof rawEmailsArray = [];
		const draftByContactId = new Map<number, (typeof rawEmailsArray)[number]>();
		let dedupedDrafts = 0;
		for (const e of rawEmailsArray) {
			if (e.status === EmailStatus.draft) {
				if (draftByContactId.has(e.contactId)) {
					dedupedDrafts++;
				}
				// "Last write wins" for duplicate draft payloads.
				draftByContactId.set(e.contactId, e);
				continue;
			}
			nonDraftEmails.push(e);
		}
		const emailsArray = [...nonDraftEmails, ...draftByContactId.values()];

		const campaign = await prisma.campaign.findUnique({
			where: { id: campaignId },
		});

		if (!campaign) {
			return apiNotFound();
		}

		if (campaign.userId !== userId) {
			return apiUnauthorizedResource();
		}

		const normalizeSentAt = (sentAt: string | null | undefined) => {
			if (sentAt === undefined) return undefined;
			if (sentAt === null) return null;
			return new Date(sentAt);
		};

		// Preserve legacy behavior for single-email creates: return the created/updated Email record.
		if (rawEmailsArray.length === 1) {
			const e = emailsArray[0];

			const email = await prisma.$transaction(async (tx) => {
				if (e.status === EmailStatus.draft) {
					const existingDrafts = await tx.email.findMany({
						where: {
							userId,
							campaignId,
							status: EmailStatus.draft,
							contactId: e.contactId,
						},
						orderBy: { createdAt: 'desc' as const },
						select: { id: true },
					});

					if (existingDrafts.length > 0) {
						const [keep, ...dupes] = existingDrafts;
						if (dupes.length > 0) {
							await tx.email.deleteMany({
								where: {
									userId,
									id: { in: dupes.map((d) => d.id) },
								},
							});
						}

						return tx.email.update({
							where: { id: keep.id },
							data: {
								subject: e.subject,
								message: e.message,
								status: e.status,
								...(e.sentAt !== undefined ? { sentAt: normalizeSentAt(e.sentAt) } : {}),
								reviewStatus: null,
							},
						});
					}
				}

				return tx.email.create({
					data: {
						...e,
						userId,
						...(e.sentAt !== undefined ? { sentAt: normalizeSentAt(e.sentAt) } : {}),
					},
				});
			});

			return apiCreated(email);
		}

		// Upsert draft emails by (userId, campaignId, contactId) so a stalled/restarted batch
		// can't create duplicates.
		const draftContactIds = Array.from(draftByContactId.keys());

		const result = await prisma.$transaction(async (tx) => {
			let updatedCount = 0;
			let createdCount = 0;
			let deletedDuplicateDraftsCount = 0;

			// Find any existing drafts for these contacts (including any pre-existing duplicates).
			const existingDrafts =
				draftContactIds.length > 0
					? await tx.email.findMany({
							where: {
								userId,
								campaignId,
								status: EmailStatus.draft,
								contactId: { in: draftContactIds },
							},
							orderBy: { createdAt: 'desc' as const },
							select: { id: true, contactId: true },
					  })
					: [];

			const keepDraftIdByContactId = new Map<number, number>();
			const duplicateDraftIdsToDelete: number[] = [];
			for (const d of existingDrafts) {
				if (!keepDraftIdByContactId.has(d.contactId)) {
					keepDraftIdByContactId.set(d.contactId, d.id);
				} else {
					duplicateDraftIdsToDelete.push(d.id);
				}
			}

			if (duplicateDraftIdsToDelete.length > 0) {
				const deleted = await tx.email.deleteMany({
					where: {
						userId,
						id: { in: duplicateDraftIdsToDelete },
					},
				});
				deletedDuplicateDraftsCount = deleted.count;
			}

			// Process each email payload (drafts are updated if present; non-drafts are created).
			for (const e of emailsArray) {
				if (e.status === EmailStatus.draft) {
					const existingId = keepDraftIdByContactId.get(e.contactId);
					if (existingId) {
						await tx.email.update({
							where: { id: existingId },
							data: {
								subject: e.subject,
								message: e.message,
								status: e.status,
								...(e.sentAt !== undefined ? { sentAt: normalizeSentAt(e.sentAt) } : {}),
								// New content hasn't been reviewed yet.
								reviewStatus: null,
							},
						});
						updatedCount++;
						continue;
					}
				}

				await tx.email.create({
					data: {
						...e,
						userId,
						...(e.sentAt !== undefined ? { sentAt: normalizeSentAt(e.sentAt) } : {}),
					},
				});
				createdCount++;
			}

			return { createdCount, updatedCount, dedupedDrafts, deletedDuplicateDraftsCount };
		});

		return apiCreated({
			...result,
			message: `Emails processed. created=${result.createdCount} updated=${result.updatedCount} dedupedDrafts=${result.dedupedDrafts} deletedDuplicateDrafts=${result.deletedDuplicateDraftsCount}`,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
