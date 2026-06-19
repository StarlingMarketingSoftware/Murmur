import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { apiBadRequest, apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { StripeSubscriptionStatus } from '@/types';
import { classifyUrls, type WebsiteClassification } from '../website-framable/classifyWebsite';

// SSRF guard depends on node:dns / node:net / undici; force the Node runtime.
export const runtime = 'nodejs';
// Reachability/framability is a property of live remote hosts — never cache the route.
export const dynamic = 'force-dynamic';

// Hard cap on URLs per request: keeps the bounded-parallel outbound fan-out small and the
// rate-limit accounting honest (one request, regardless of batch size, is one cost unit).
const MAX_URLS = 30;

export type WebsitePreviewableEntry = {
	classification: WebsiteClassification;
	finalUrl: string;
};

// Keyed by the NORMALIZED url so the client can look results up by the same key it queries with.
export type WebsitePreviewableResult = {
	results: Record<string, WebsitePreviewableEntry>;
};

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) return apiUnauthorized();

		// Same gate as /api/website-framable: an active subscription/trial is required so this
		// outbound-fetch endpoint is never an anonymous SSRF probe.
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

		// One batch request covers up to MAX_URLS sites, so we can afford a slightly higher
		// request budget than the single-URL framable route while still bounding the outbound
		// fan-out. A 429 here is harmless: the client treats it as `unknown` (button shown).
		const limited = await withRateLimit(req, 'paid-external', 'website-previewable', {
			user: [
				{ tokens: 30, window: '60 s' },
				{ tokens: 300, window: '3600 s' },
			],
			ip: [{ tokens: 90, window: '60 s' }],
		});
		if (limited) return limited;

		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return apiBadRequest('Invalid JSON body');
		}

		const rawUrls = (body as { urls?: unknown } | null)?.urls;
		if (!Array.isArray(rawUrls)) {
			return apiBadRequest('Expected { urls: string[] }');
		}

		const urls = rawUrls.filter((u): u is string => typeof u === 'string').slice(0, MAX_URLS);

		// classifyUrls normalizes + dedupes internally and never throws. Invalid URLs are simply
		// absent from the result (the client treats a missing entry as `unknown` → button shown).
		const results = await classifyUrls(urls);
		return apiResponse<WebsitePreviewableResult>({ results });
	} catch (error) {
		return handleApiError(error);
	}
}
