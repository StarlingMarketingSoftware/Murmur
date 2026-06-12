import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import prisma from '@/lib/prisma';
import { AiModel, Prisma, Status } from '@prisma/client';
import {
	apiBadRequest,
	apiConflict,
	apiCreated,
	apiResponse,
	apiUnauthorized,
	handleApiError,
	allContactsGlobalOrOwned,
	allContactListsGlobalOrOwned,
	allUserContactListsOwned,
} from '@/app/api/_utils';
import { z } from 'zod';
import {
	summarizeCampaignDataTypes,
	type CampaignDataTypeContactSource,
} from '@/utils/campaignDataTypes';
import { resolveUniqueCampaignName } from '@/utils/campaignNames';

const ACTIVE_CAMPAIGN_CAP = 5;
const CAMPAIGN_CAP_REACHED_ERROR = 'CAMPAIGN_CAP_REACHED';

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

// Namespace for pg_advisory_xact_lock(int4, int4); hashtext maps the Clerk
// user id onto int4. Serializes name resolution + create per user so two
// concurrent creates cannot both claim the same name (there is no unique
// constraint on (userId, name)). Auto-releases at commit/rollback.
const CAMPAIGN_NAME_LOCK_NAMESPACE = 20260612;

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
	contacts: z.array(z.number()).max(100000).optional(),
	contactLists: z.array(z.number()).max(1000).optional(),
	userContactLists: z.array(z.number()).max(1000).optional(),
});
export type PostCampaignData = z.infer<typeof postCampaignSchema>;

const campaignDataTypeContactSelect = {
	id: true,
	email: true,
	title: true,
	headline: true,
	state: true,
} satisfies Prisma.ContactSelect;

export async function POST(req: NextRequest) {
	try {
		const limited = await withRateLimit(req, 'mutation', 'campaigns');
		if (limited) return limited;

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

		// Referenced resources must be global or the caller's own — otherwise any
		// user could attach (and later read) other users' private contacts/lists.
		if (
			!(await allContactsGlobalOrOwned(contacts ?? [], userId)) ||
			!(await allContactListsGlobalOrOwned(contactLists ?? [], userId)) ||
			!(await allUserContactListsOwned(userContactLists ?? [], userId))
		) {
			return apiBadRequest('One or more contacts or contact lists are invalid');
		}

		const activeCount = await prisma.campaign.count({
			where: { userId, status: Status.active },
		});
		if (activeCount >= ACTIVE_CAMPAIGN_CAP) {
			return apiConflict({
				error: CAMPAIGN_CAP_REACHED_ERROR,
				message: `You have reached the maximum of ${ACTIVE_CAMPAIGN_CAP} active campaigns. Delete one to create a new one.`,
				cap: ACTIVE_CAMPAIGN_CAP,
				activeCount,
			});
		}

		const campaign = await prisma.$transaction(async (tx) => {
			await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CAMPAIGN_NAME_LOCK_NAMESPACE}::int, hashtext(${userId}))`;

			// Only non-deleted campaigns block a name so users can reuse names
			// after deleting; archived campaigns still block (they can return).
			const existing = await tx.campaign.findMany({
				where: { userId, status: { not: Status.deleted } },
				select: { name: true },
			});
			const uniqueName = resolveUniqueCampaignName(
				name,
				existing.map((c) => c.name)
			);

			return tx.campaign.create({
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
		},
		// The create may connect large contact sets (schema allows up to 100k
		// ids), which can outlive the default 5s interactive-tx timeout.
		{ timeout: 30_000 });

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

export async function GET(req: NextRequest) {
	try {
		const limited = await withRateLimit(req, 'search-heavy', 'campaigns');
		if (limited) return limited;

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
				contacts: {
					select: campaignDataTypeContactSelect,
				},
				contactLists: {
					select: {
						name: true,
						title: true,
						contacts: {
							select: campaignDataTypeContactSelect,
						},
					},
				},
				emails: {
					select: {
						status: true,
					},
				},
				userContactLists: {
					select: {
						id: true,
						name: true,
						contacts: {
							select: campaignDataTypeContactSelect,
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
			const campaignContactsById = new Map<number, CampaignDataTypeContactSource>();
			const addCampaignContacts = (
				contacts: Array<
					CampaignDataTypeContactSource & {
						id: number;
					}
				>
			) => {
				for (const contact of contacts) {
					if (campaignContactsById.has(contact.id)) continue;
					campaignContactsById.set(contact.id, contact);
				}
			};

			addCampaignContacts(campaign.contacts);
			for (const list of campaign.userContactLists) {
				addCampaignContacts(list.contacts);
			}
			for (const list of campaign.contactLists) {
				addCampaignContacts(list.contacts);
			}

			const campaignDataTypes = summarizeCampaignDataTypes({
				contacts: Array.from(campaignContactsById.values()),
				extraTexts: [
					campaign.name,
					...campaign.userContactLists.map((list) => list.name),
					...campaign.contactLists.flatMap((list) => [list.name, list.title]),
				],
			});
			const userContactListIds = campaign.userContactLists
				.map((list) => list.id)
				.filter((id): id is number => typeof id === 'number');

			// Remove the emails and userContactLists arrays from the response, keep only counts and contactEmails

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { emails, userContactLists, contacts, contactLists, ...campaignWithoutEmails } =
				campaign;

			return {
				...campaignWithoutEmails,
				draftCount,
				sentCount,
				contactEmails,
				campaignDataTypes,
				userContactListIds,
			};
		});

		return apiResponse(campaignsWithCounts);
	} catch (error) {
		return handleApiError(error);
	}
}
