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
import type { CalendarEntry } from '@prisma/client';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const patchCalendarEntrySchema = z.object({
	date: z.string().regex(ISO_DATE_REGEX),
	personName: z.string().max(500).optional(),
	company: z.string().max(500).optional(),
	startTime: z.string().max(50).optional(),
	endTime: z.string().max(50).optional(),
	notes: z.string().max(20000).optional(),
	address: z.string().max(1000).optional(),
	placeId: z.string().max(500).nullable().optional(),
	latitude: z.number().finite().nullable().optional(),
	longitude: z.number().finite().nullable().optional(),
	drivingDuration: z.string().max(100).nullable().optional(),
	campaignId: z.number().int().nullable().optional(),
	contactId: z.number().int().nullable().optional(),
});
export type PatchCalendarEntryData = z.infer<typeof patchCalendarEntrySchema>;

export type GetCalendarEntryData = {
	id: number;
	date: string; // 'YYYY-MM-DD' local-date key
	personName: string;
	company: string;
	startTime: string; // display label, e.g. '9 am'
	endTime: string; // display label, e.g. '1 pm'
	notes: string;
	address: string;
	placeId: string | null;
	latitude: number | null;
	longitude: number | null;
	drivingDuration: string | null;
	campaignId: number | null;
	contactId: number | null;
	updatedAt: string;
};
export type GetCalendarEntriesData = { entries: GetCalendarEntryData[] };
export type DeleteCalendarEntryData = { date: string };

const serializeCalendarEntry = (entry: CalendarEntry): GetCalendarEntryData => ({
	id: entry.id,
	date: entry.date,
	personName: entry.personName,
	company: entry.company,
	startTime: entry.startTime,
	endTime: entry.endTime,
	notes: entry.notes,
	address: entry.address,
	placeId: entry.placeId,
	latitude: entry.latitude,
	longitude: entry.longitude,
	drivingDuration: entry.drivingDuration,
	campaignId: entry.campaignId,
	contactId: entry.contactId,
	updatedAt: entry.updatedAt.toISOString(),
});

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// date is TEXT 'YYYY-MM-DD', so lexicographic order is chronological.
		const entries = await prisma.calendarEntry.findMany({
			where: { userId, isActive: true },
			orderBy: { date: 'asc' },
		});

		return apiResponse<GetCalendarEntriesData>({
			entries: entries.map(serializeCalendarEntry),
		});
	} catch (error) {
		return handleApiError(error);
	}
}

export async function PATCH(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = patchCalendarEntrySchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { date, campaignId, contactId, ...rest } = validatedData.data;
		// Content fields use replace semantics (omitted -> default) so a revived
		// soft-deleted row can't leak stale text. Provenance fields use merge
		// semantics (undefined -> keep existing; explicit null -> clear) so a
		// dashboard edit of an inbox-created booking keeps its conversation link.
		const content = {
			personName: rest.personName ?? '',
			company: rest.company ?? '',
			startTime: rest.startTime ?? '',
			endTime: rest.endTime ?? '',
			notes: rest.notes ?? '',
			address: rest.address ?? '',
			placeId: rest.placeId ?? null,
			latitude: rest.latitude ?? null,
			longitude: rest.longitude ?? null,
			drivingDuration: rest.drivingDuration ?? null,
		};

		// A soft-deleted row's booking claim is dead; release it before the revive
		// below can resurrect it (confirmBookingRequest treats bookingRequestId on
		// an active row as a live foreign claim, which would make this date
		// permanently unconfirmable). Active rows keep their claim.
		await prisma.calendarEntry.updateMany({
			where: { userId, date, isActive: false, bookingRequestId: { not: null } },
			data: { bookingRequestId: null },
		});

		const entry = await prisma.calendarEntry.upsert({
			where: { userId_date: { userId, date } },
			create: {
				userId,
				date,
				...content,
				campaignId: campaignId ?? null,
				contactId: contactId ?? null,
			},
			// isActive: true revives a soft-deleted row on the same date — the
			// unique(userId, date) constraint spans soft-deleted rows, so a bare
			// create would throw P2002.
			update: { ...content, campaignId, contactId, isActive: true },
		});

		return apiResponse<GetCalendarEntryData>(serializeCalendarEntry(entry));
	} catch (error) {
		return handleApiError(error);
	}
}

export async function DELETE(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const date = req.nextUrl.searchParams.get('date');
		if (!date || !ISO_DATE_REGEX.test(date)) {
			return apiBadRequest('Invalid date');
		}

		// updateMany (not update) keeps this idempotent: deleting a date with no
		// live entry is a 200 no-op, which the debounced calendar sync relies on.
		await prisma.calendarEntry.updateMany({
			where: { userId, date, isActive: true },
			data: { isActive: false },
		});

		return apiResponse<DeleteCalendarEntryData>({ date });
	} catch (error) {
		return handleApiError(error);
	}
}
