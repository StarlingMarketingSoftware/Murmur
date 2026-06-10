import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams, StripeSubscriptionStatus } from '@/types';

// Research-detail fields rendered by ContactResearchPanel/ContactResearchDescriptionBox.
// Map-overlay responses omit these on slim rows (see api/contacts/map-overlay); the
// dashboard backfills them per-contact through this route when a slim row is hovered.
const CONTACT_RESEARCH_SELECT = {
	id: true,
	metadata: true,
	website: true,
	address: true,
	companyType: true,
	companyFoundedYear: true,
	companyKeywords: true,
} as const;

export type GetContactResearchData = {
	id: number;
	metadata: string | null;
	website: string | null;
	address: string | null;
	companyType: string | null;
	companyFoundedYear: string | null;
	companyKeywords: string[];
};

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Match /api/contacts/map-overlay gating: require an active subscription or trial.
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { stripeSubscriptionStatus: true },
		});
		if (
			!user ||
			(user.stripeSubscriptionStatus !== StripeSubscriptionStatus.ACTIVE &&
				user.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING)
		) {
			return apiBadRequest(
				'An active subscription or free trial is required to view contact research'
			);
		}

		const { id } = await params;
		const contactId = Number(id);
		if (!Number.isInteger(contactId)) {
			return apiBadRequest('Invalid contact id');
		}

		const contact = await prisma.contact.findUnique({
			where: { id: contactId },
			select: CONTACT_RESEARCH_SELECT,
		});
		if (!contact) {
			return apiNotFound();
		}

		return apiResponse(contact satisfies GetContactResearchData);
	} catch (error) {
		return handleApiError(error);
	}
}
