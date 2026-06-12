import { cookies } from 'next/headers';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
	apiConflict,
	apiForbidden,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { AccountType } from '@/constants/prismaEnums';
import { VENUE_SIGNUP_INTENT_COOKIE } from '@/constants/venueSignup';

function clearVenueSignupIntent(response: NextResponse): NextResponse {
	response.cookies.set(VENUE_SIGNUP_INTENT_COOKIE, '', {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 0,
	});
	return response;
}

export async function POST() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const cookieStore = await cookies();
		if (cookieStore.get(VENUE_SIGNUP_INTENT_COOKIE)?.value !== '1') {
			return apiForbidden('Venue signup intent was not found for this session');
		}

		const existingUser = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { accountType: true },
		});

		if (!existingUser) {
			return apiConflict('Account is still being provisioned, please retry');
		}

		if (existingUser.accountType !== AccountType.venue) {
			const clerk = await clerkClient();
			const clerkUser = await clerk.users.getUser(userId);
			await clerk.users.updateUserMetadata(userId, {
				unsafeMetadata: {
					...clerkUser.unsafeMetadata,
					accountType: AccountType.venue,
				},
			});

			const updatedUser = await prisma.user.update({
				where: { clerkId: userId },
				data: { accountType: AccountType.venue },
			});
			return clearVenueSignupIntent(apiResponse(updatedUser));
		}

		return clearVenueSignupIntent(apiResponse({ accountType: AccountType.venue }));
	} catch (error) {
		return handleApiError(error);
	}
}
