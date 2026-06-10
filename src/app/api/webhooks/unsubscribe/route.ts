import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiBadRequest, apiResponse, handleApiError } from '@/app/api/_utils';
import { verifyUnsubscribeToken } from '@/app/api/_utils/unsubscribe';

/**
 * RFC 8058 one-click unsubscribe endpoint (List-Unsubscribe / List-Unsubscribe-Post
 * headers on cold-outreach emails). Public: /api/webhooks/* is excluded from Clerk
 * middleware. The signed token is the only credential; the upsert is idempotent.
 */
export async function POST(request: NextRequest) {
	try {
		const token = request.nextUrl.searchParams.get('token');
		const payload = token ? verifyUnsubscribeToken(token) : null;
		if (!payload) {
			return apiBadRequest('Invalid unsubscribe token');
		}

		await prisma.emailSuppression.upsert({
			where: { email_userId: { email: payload.email, userId: payload.userId } },
			create: { email: payload.email, userId: payload.userId, reason: 'one_click' },
			update: {},
		});

		return apiResponse({ success: true });
	} catch (error) {
		return handleApiError(error);
	}
}

// Mail clients and link scanners sometimes GET the header URL — show the page.
export async function GET(request: NextRequest) {
	const token = request.nextUrl.searchParams.get('token') ?? '';
	return NextResponse.redirect(
		new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url)
	);
}
