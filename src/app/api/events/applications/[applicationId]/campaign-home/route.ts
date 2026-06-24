import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Status } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { resolveUniqueCampaignName } from '@/utils/campaignNames';

export type EnsureApplicationCampaignHomeResponse = {
	campaignId: number;
	createdCampaign: boolean;
	attachedContact: boolean;
};

const CAMPAIGN_NAME_LOCK_NAMESPACE = 20260612;
const OPPORTUNITY_CAMPAIGN_NAME = 'Opportunities';
type CampaignHomeTx = Pick<typeof prisma, 'campaign' | 'identity' | 'message' | 'user'>;

const getLatestDivertCampaignId = async (
	tx: CampaignHomeTx,
	conversationId: number | null
) => {
	if (conversationId == null) return null;
	const divertedMessage = await tx.message.findFirst({
		where: { conversationId, emailId: { not: null }, campaignId: { not: null } },
		orderBy: { id: 'desc' },
		select: { campaignId: true },
	});
	return divertedMessage?.campaignId ?? null;
};

const findExistingCampaignHome = async (
	tx: CampaignHomeTx,
	userId: string,
	venueEmail: string
) => {
	return tx.campaign.findFirst({
		where: {
			userId,
			status: { not: Status.deleted },
			OR: [
				{ contacts: { some: { email: { equals: venueEmail, mode: 'insensitive' } } } },
				{
					userContactLists: {
						some: {
							contacts: {
								some: { email: { equals: venueEmail, mode: 'insensitive' } },
							},
						},
					},
				},
				{
					contactLists: {
						some: {
							contacts: {
								some: { email: { equals: venueEmail, mode: 'insensitive' } },
							},
						},
					},
				},
			],
		},
		orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
		select: { id: true },
	});
};

const resolveIdentityId = async (tx: CampaignHomeTx, userId: string) => {
	const existingIdentity = await tx.identity.findFirst({
		where: { userId },
		orderBy: { updatedAt: 'desc' },
		select: { id: true },
	});
	if (existingIdentity) return existingIdentity.id;

	const user = await tx.user.findUnique({
		where: { clerkId: userId },
		select: {
			email: true,
			replyToEmail: true,
			firstName: true,
			lastName: true,
		},
	});
	const email = user?.replyToEmail ?? user?.email;
	if (!email) return null;

	const displayName =
		[user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
		user?.email ||
		'New Profile';
	const createdIdentity = await tx.identity.create({
		data: {
			userId,
			name: displayName,
			email,
		},
		select: { id: true },
	});
	return createdIdentity.id;
};

/**
 * POST /api/events/applications/:applicationId/campaign-home
 *
 * Ensures an artist application can be opened inside a campaign inbox. Application
 * chats are scoped in the campaign inbox by the venue projection contact's email,
 * so a dashboard opportunity with no existing home needs that venue contact added
 * to an active campaign before the deep link can resolve.
 */
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ applicationId: string }> }
) {
	try {
		const limited = await withRateLimit(req, 'mutation', 'application-campaign-home');
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { applicationId: rawApplicationId } = await params;
		const applicationId = Number(rawApplicationId);
		if (!Number.isInteger(applicationId) || applicationId <= 0) {
			return apiBadRequest('Invalid application id');
		}

		const result = await prisma.$transaction(async (tx) => {
			const application = await tx.eventApplication.findFirst({
				where: { id: applicationId, standardUserId: userId },
				select: { id: true, venueUserId: true },
			});
			if (!application) {
				return { status: 'application-not-found' as const };
			}

			const venue = await tx.venue.findFirst({
				where: { userId: application.venueUserId },
				select: { id: true },
			});
			if (!venue) {
				return { status: 'venue-not-found' as const };
			}

			const venueContact = await tx.contact.findUnique({
				where: { venueId: venue.id },
				select: { id: true, email: true },
			});
			if (!venueContact?.email) {
				return { status: 'venue-contact-not-found' as const };
			}

			const conversation = await tx.conversation.findUnique({
				where: { standardUserId_venueId: { standardUserId: userId, venueId: venue.id } },
				select: { id: true },
			});
			const divertCampaignId = await getLatestDivertCampaignId(
				tx,
				conversation?.id ?? null
			);
			if (divertCampaignId != null) {
				return {
					status: 'ok' as const,
					campaignId: divertCampaignId,
					createdCampaign: false,
					attachedContact: false,
				};
			}

			const existingHome = await findExistingCampaignHome(
				tx,
				userId,
				venueContact.email
			);
			if (existingHome) {
				return {
					status: 'ok' as const,
					campaignId: existingHome.id,
					createdCampaign: false,
					attachedContact: false,
				};
			}

			const targetCampaign = await tx.campaign.findFirst({
				where: { userId, status: Status.active },
				orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
				select: { id: true },
			});

			if (targetCampaign) {
				await tx.campaign.update({
					where: { id: targetCampaign.id, userId },
					data: { contacts: { connect: { id: venueContact.id } } },
					select: { id: true },
				});
				return {
					status: 'ok' as const,
					campaignId: targetCampaign.id,
					createdCampaign: false,
					attachedContact: true,
				};
			}

			await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CAMPAIGN_NAME_LOCK_NAMESPACE}::int, hashtext(${userId}))`;
			const lockedExistingHome = await findExistingCampaignHome(
				tx,
				userId,
				venueContact.email
			);
			if (lockedExistingHome) {
				return {
					status: 'ok' as const,
					campaignId: lockedExistingHome.id,
					createdCampaign: false,
					attachedContact: false,
				};
			}
			const lockedTargetCampaign = await tx.campaign.findFirst({
				where: { userId, status: Status.active },
				orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
				select: { id: true },
			});
			if (lockedTargetCampaign) {
				await tx.campaign.update({
					where: { id: lockedTargetCampaign.id, userId },
					data: { contacts: { connect: { id: venueContact.id } } },
					select: { id: true },
				});
				return {
					status: 'ok' as const,
					campaignId: lockedTargetCampaign.id,
					createdCampaign: false,
					attachedContact: true,
				};
			}

			const existingNames = await tx.campaign.findMany({
				where: { userId, status: { not: Status.deleted } },
				select: { name: true },
			});
			const name = resolveUniqueCampaignName(
				OPPORTUNITY_CAMPAIGN_NAME,
				existingNames.map((campaign) => campaign.name)
			);
			const identityId = await resolveIdentityId(tx, userId);
			const createdCampaign = await tx.campaign.create({
				data: {
					name,
					userId,
					identityId,
					contacts: { connect: { id: venueContact.id } },
				},
				select: { id: true },
			});
			return {
				status: 'ok' as const,
				campaignId: createdCampaign.id,
				createdCampaign: true,
				attachedContact: true,
			};
		});

		if (result.status === 'application-not-found') {
			return apiNotFound('Application not found');
		}
		if (result.status === 'venue-not-found') {
			return apiNotFound('Venue not found');
		}
		if (result.status === 'venue-contact-not-found') {
			return apiNotFound('Venue contact not found');
		}

		return apiResponse<EnsureApplicationCampaignHomeResponse>({
			campaignId: result.campaignId,
			createdCampaign: result.createdCampaign,
			attachedContact: result.attachedContact,
		});
	} catch (error) {
		return handleApiError(error);
	}
}
