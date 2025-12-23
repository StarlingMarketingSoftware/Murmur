import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';
import { Prisma } from '@prisma/client';
import { StripeSubscriptionStatus } from '@/types';

export const maxDuration = 60;

const mapOverlaySchema = z.object({
	mode: z.enum(['booking', 'promotion']).optional().default('booking'),
	south: z.coerce.number(),
	west: z.coerce.number(),
	north: z.coerce.number(),
	east: z.coerce.number(),
	limit: z.coerce.number().optional(),
});

const BOOKING_TITLE_PREFIXES = [
	'Music Venues',
	'Restaurants',
	'Coffee Shops',
	'Music Festivals',
	'Breweries',
	'Distilleries',
	'Wineries',
	'Cideries',
	'Wedding Planners',
	'Wedding Venues',
] as const;

const PROMOTION_TITLE_PREFIXES = [
	'Radio Stations',
	'College Radio',
] as const;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const DEFAULT_LIMIT = 1200;
const MAX_LIMIT = 2000;

// Guard rails: prevent accidentally querying an entire region at once.
// Booking overlays are denser than promotion overlays, but we still want pins to be visible
// a couple zoom levels earlier (especially on wide screens). Keep this conservative.
const MAX_LAT_SPAN_DEG_BOOKING = 24;
const MAX_LNG_SPAN_DEG_BOOKING = 24;
// Promotion overlays are small (state-level list pins) and should work at wide zoom levels.
const MAX_LAT_SPAN_DEG_PROMOTION = 180;
const MAX_LNG_SPAN_DEG_PROMOTION = 360;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Match /api/contacts search gating: require an active subscription or trial.
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
				'An active subscription or free trial is required to search for contacts'
			);
		}

		const validated = getValidatedParamsFromUrl(req.url, mapOverlaySchema);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}

		const { mode, south, west, north, east, limit } = validated.data;
		if (![south, west, north, east].every((n) => Number.isFinite(n))) {
			return apiBadRequest('Invalid bounds');
		}

		// Normalize bounds and clamp to valid ranges.
		const minLat = clamp(Math.min(south, north), -90, 90);
		const maxLat = clamp(Math.max(south, north), -90, 90);
		const minLng = clamp(Math.min(west, east), -180, 180);
		const maxLng = clamp(Math.max(west, east), -180, 180);

		// We currently do not support antimeridian-crossing viewports.
		if (maxLng < minLng) {
			return apiBadRequest('Invalid bounds');
		}

		const latSpan = maxLat - minLat;
		const lngSpan = maxLng - minLng;
		const maxLatSpan = mode === 'promotion' ? MAX_LAT_SPAN_DEG_PROMOTION : MAX_LAT_SPAN_DEG_BOOKING;
		const maxLngSpan = mode === 'promotion' ? MAX_LNG_SPAN_DEG_PROMOTION : MAX_LNG_SPAN_DEG_BOOKING;
		if (latSpan > maxLatSpan || lngSpan > maxLngSpan) {
			return apiBadRequest('Viewport too large; zoom in to load overlay markers');
		}

		const take = Math.max(1, Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT));

		const bboxWhere: Prisma.ContactWhereInput = {
			latitude: { gte: minLat, lte: maxLat },
			longitude: { gte: minLng, lte: maxLng },
		};

		let where: Prisma.ContactWhereInput = bboxWhere;
		if (mode === 'booking') {
			where = {
				AND: [
					bboxWhere,
					{ title: { not: null } },
					{
						OR: BOOKING_TITLE_PREFIXES.map((p) => ({
							title: { mode: 'insensitive', startsWith: p },
						})),
					},
				],
			};
		} else if (mode === 'promotion') {
			where = {
				AND: [
					bboxWhere,
					{ title: { not: null } },
					{
						OR: PROMOTION_TITLE_PREFIXES.map((p) => ({
							title: { mode: 'insensitive', startsWith: p },
						})),
					},
				],
			};
		}

		const contacts = await prisma.contact.findMany({
			where,
			take,
			orderBy: [{ id: 'asc' }],
		});

		return apiResponse(contacts);
	} catch (error) {
		return handleApiError(error);
	}
}

