import { z } from 'zod';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Create payload for a venue-published event. `size` and `genres` are intentionally free
// text (no enum). `startsAt`/`endsAt` are ISO timestamps derived client-side from the picked
// date + the raw HH:mm times, which are also stored verbatim for fidelity.
export const createEventSchema = z
	.object({
		name: z.string().min(1, 'Event name is required'),
		address: z.string().nullable().optional(),
		placeId: z.string().nullable().optional(),
		latitude: z.number().min(-90).max(90).nullable().optional(),
		longitude: z.number().min(-180).max(180).nullable().optional(),
		size: z.string().nullable().optional(),
		genres: z.array(z.string()).optional(),
		whenLabel: z.string().nullable().optional(),
		startTime: z.string().regex(HHMM, 'Expected HH:mm').nullable().optional(),
		endTime: z.string().regex(HHMM, 'Expected HH:mm').nullable().optional(),
		startsAt: z.string().datetime().nullable().optional(),
		endsAt: z.string().datetime().nullable().optional(),
		pay: z.string().nullable().optional(),
		details: z.string().nullable().optional(),
	})
	// Coordinates are a pair: reject a half-point at the boundary (mirrors venue/schema.ts).
	.refine((v) => (v.latitude == null) === (v.longitude == null), {
		path: ['latitude'],
		message: 'latitude and longitude must be provided together',
	})
	.refine((v) => v.startsAt == null || v.endsAt == null || v.endsAt > v.startsAt, {
		path: ['endsAt'],
		message: 'endsAt must be after startsAt',
	});

export type PostEventData = z.infer<typeof createEventSchema>;
