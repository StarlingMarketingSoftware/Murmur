import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { urls } from '@/constants/urls';
import { VENUE_SIGNUP_INTENT_COOKIE } from '@/constants/venueSignup';

export const dynamic = 'force-dynamic';

const VENUE_SIGNUP_INTENT_MAX_AGE_SECONDS = 60 * 60;

export async function GET(request: NextRequest) {
	const { userId } = await auth();
	const redirectPath = userId ? urls.venuePortal.index : urls.signUp.venue;
	const redirectUrl = new URL(redirectPath, request.url);
	const response = NextResponse.redirect(redirectUrl);

	response.cookies.set(VENUE_SIGNUP_INTENT_COOKIE, '1', {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: VENUE_SIGNUP_INTENT_MAX_AGE_SECONDS,
	});

	return response;
}
