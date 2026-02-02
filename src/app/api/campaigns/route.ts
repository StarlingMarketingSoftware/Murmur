import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { AiModel, Prisma, Status } from '@prisma/client';
import {
	apiBadRequest,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { z } from 'zod';

const getCampaignContactsCount = async (campaignId: number) => {
	return prisma.contact.count({
		where: {
			OR: [
				{ campaigns: { some: { id: campaignId } } },
				{ userContactLists: { some: { campaigns: { some: { id: campaignId } } } } },
				{ contactList: { campaigns: { some: { id: campaignId } } } },
			],
		},
	});
};

const safeInsertCampaignContactEvent = async (args: {
	campaignId: number;
	createdAt: Date;
	addedCount: number;
	totalContacts: number;
	source: string;
}) => {
	try {
		await prisma.$executeRaw(Prisma.sql`
			INSERT INTO "CampaignContactEvent" (
				"campaignId",
				"createdAt",
				"addedCount",
				"totalContacts",
				"source"
			)
			VALUES (
				${args.campaignId},
				${args.createdAt},
				${args.addedCount},
				${args.totalContacts},
				${args.source}
			)
		`);
	} catch {
		// Best-effort only (e.g., migration not applied yet).
	}
};

function escapeRegExp(input: string) {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCampaignName(input: string) {
	return input.trim().replace(/\s+/g, ' ');
}

async function getUniqueCampaignName({
	userId,
	desiredName,
}: {
	userId: string;
	desiredName: string;
}) {
	const baseName = normalizeCampaignName(desiredName);
	if (!baseName) return desiredName;

	// Only consider non-deleted campaigns so users can reuse names after deleting.
	const existingNames = await prisma.campaign.findMany({
		where: {
			userId,
			status: { not: Status.deleted },
			name: { startsWith: baseName, mode: 'insensitive' },
		},
		select: { name: true },
	});

	const basePattern = new RegExp(`^${escapeRegExp(baseName)}(?:\\s+(\\d+))?$`, 'i');

	let baseExists = false;
	const usedSuffixes = new Set<number>();

	for (const row of existingNames) {
		const existing = normalizeCampaignName(row.name);
		const match = basePattern.exec(existing);
		if (!match) continue;

		const suffix = match[1];
		if (!suffix) {
			baseExists = true;
			continue;
		}

		const n = Number(suffix);
		if (Number.isInteger(n) && n > 0) {
			usedSuffixes.add(n);
		}
	}

	if (!baseExists) return baseName;

	let next = 1;
	while (usedSuffixes.has(next)) next += 1;
	return `${baseName} ${next}`;
}

const postCampaignSchema = z.object({
	name: z.string().min(1),
	status: z.nativeEnum(Status).optional(),
	subject: z.string().optional(),
	message: z.string().optional(),
	aiModel: z.nativeEnum(AiModel).optional(),
	testMessage: z.string().optional(),
	testSubject: z.string().optional(),
	senderEmail: z.string().email().optional(),
	senderName: z.string().optional(),
	contacts: z.array(z.number()).optional(),
	contactLists: z.array(z.number()).optional(),
	userContactLists: z.array(z.number()).optional(),
});
export type PostCampaignData = z.infer<typeof postCampaignSchema>;

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await req.json();
		const validatedData = postCampaignSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}
		const { contacts, contactLists, userContactLists, name } = validatedData.data;
		const uniqueName = await getUniqueCampaignName({ userId, desiredName: name });

		const campaign = await prisma.campaign.create({
			data: {
				...validatedData.data,
				name: uniqueName,
				userId,
				contacts: {
					connect: contacts?.map((id) => ({ id })),
				},
				contactLists: {
					connect: contactLists?.map((id) => ({ id })),
				},
				userContactLists: {
					connect: userContactLists?.map((id) => ({ id })),
				},
			},
			include: {
				contacts: true,
			},
		});

		// Log initial contacts as a "batch" event for the bottom-view history.
		// Best-effort: do not fail campaign creation if the event table isn't ready.
		try {
			const totalContacts = await getCampaignContactsCount(campaign.id);
			if (totalContacts > 0) {
				await safeInsertCampaignContactEvent({
					campaignId: campaign.id,
					createdAt: campaign.createdAt,
					addedCount: totalContacts,
					totalContacts,
					source: 'campaign.create',
				});
			}
		} catch {
			// ignore
		}

		return apiCreated(campaign);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const campaigns = await prisma.campaign.findMany({
			where: {
				userId: userId,
				status: Status.active,
			},
			include: {
				_count: {
					select: {
						emails: true,
					},
				},
				emails: {
					select: {
						status: true,
					},
				},
				userContactLists: {
					include: {
						contacts: {
							select: {
								email: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		// Transform the data to include draft and sent counts
		const campaignsWithCounts = campaigns.map((campaign) => {
			const draftCount = campaign.emails.filter(
				(email) => email.status === 'draft'
			).length;
			const sentCount = campaign.emails.filter((email) => email.status === 'sent').length;

			// Extract contact emails from userContactLists for inbox filtering
			// Flatten all contacts from all userContactLists connected to this campaign
			const contactEmails = campaign.userContactLists
				.flatMap((list) => list.contacts.map((c) => c.email))
				.filter((email): email is string => Boolean(email));

			// Remove the emails and userContactLists arrays from the response, keep only counts and contactEmails

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { emails, userContactLists, ...campaignWithoutEmails } = campaign;

			return {
				...campaignWithoutEmails,
				draftCount,
				sentCount,
				contactEmails,
			};
		});

		return apiResponse(campaignsWithCounts);
	} catch (error) {
		return handleApiError(error);
	}
}
