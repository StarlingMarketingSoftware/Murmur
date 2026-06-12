import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AccountType } from '@/constants/prismaEnums';
import { apiConflict, apiForbidden } from './api';

// Venue-only guard shared by the venue routes. Returns null when the caller is a valid
// venue account, otherwise a NextResponse explaining why (still provisioning, or not a venue).
export async function assertVenueAccount(userId: string): Promise<NextResponse | null> {
	const user = await prisma.user.findUnique({
		where: { clerkId: userId },
		select: { accountType: true },
	});
	if (!user) {
		// Right after sign-up the User row can lag the Clerk session — retryable.
		return apiConflict('Account is still being provisioned, please retry');
	}
	if (user.accountType !== AccountType.venue) {
		return apiForbidden('This endpoint is only available to venue accounts');
	}
	return null;
}
