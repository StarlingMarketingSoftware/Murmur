import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiBadRequest, apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { StripeSubscriptionStatus } from '@/types';
import { normalizeWebsiteUrl } from '@/utils/websiteUrl';
import { probeWebsite } from './classifyWebsite';

// The SSRF guard uses node:dns / node:net / undici; force the Node runtime (the default
// for route handlers, but be explicit since the guard depends on it).
export const runtime = 'nodejs';
// Never cache — framability is a property of a live remote host.
export const dynamic = 'force-dynamic';

// Consumed by WebsitePreviewOverlay (reads framable + finalUrl). The granular probe data
// stays server-side; the client only ever sees framable + finalUrl from this route.
export type WebsiteFramableResult = {
	framable: boolean;
	finalUrl: string;
};

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		// Match contact-research gating: an active subscription/trial is required so
		// this outbound-fetch endpoint is never an anonymous SSRF probe.
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
				'An active subscription or free trial is required to preview websites'
			);
		}

		// This route makes attacker-influenced OUTBOUND fetches, so it gets a tighter
		// budget than the shared 'paid-external' default (sized for the Mailgun send loop)
		// plus a per-IP circuit-breaker the tier otherwise lacks.
		const limited = await withRateLimit(req, 'paid-external', 'website-framable', {
			user: [
				{ tokens: 20, window: '60 s' },
				{ tokens: 200, window: '3600 s' },
			],
			ip: [{ tokens: 60, window: '60 s' }],
		});
		if (limited) return limited;

		const rawUrl = req.nextUrl.searchParams.get('url');
		const normalized = normalizeWebsiteUrl(rawUrl);
		if (!normalized) return apiBadRequest('Invalid or unsupported url');

		// probeWebsite never throws and collapses blocked-target vs unreachable to the same
		// shape (framable:false, finalUrl: the normalized input), so this endpoint is not a
		// host-reachability / framing-header oracle.
		const result = await probeWebsite(normalized);
		return apiResponse({ framable: result.framable, finalUrl: result.finalUrl });
	} catch (error) {
		return handleApiError(error);
	}
}
