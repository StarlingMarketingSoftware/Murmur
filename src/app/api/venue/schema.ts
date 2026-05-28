import { z } from 'zod';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHoursSchema = z.array(
	z.object({
		open: z.string().regex(HHMM, 'Expected HH:mm'),
		close: z.string().regex(HHMM, 'Expected HH:mm'),
	})
);

const weeklyHoursSchema = z.object({
	mon: dayHoursSchema.optional(),
	tue: dayHoursSchema.optional(),
	wed: dayHoursSchema.optional(),
	thu: dayHoursSchema.optional(),
	fri: dayHoursSchema.optional(),
	sat: dayHoursSchema.optional(),
	sun: dayHoursSchema.optional(),
});

// Partial upsert payload: every field optional so callers can patch incrementally.
// `venueName` is required only when creating (enforced in the handler, not the schema).
export const upsertVenueSchema = z
	.object({
		venueName: z.string().min(1).optional(),
		address: z.string().nullable().optional(),
		latitude: z.number().min(-90).max(90).nullable().optional(),
		longitude: z.number().min(-180).max(180).nullable().optional(),
		businessType: z.string().nullable().optional(),
		hours: weeklyHoursSchema.nullable().optional(),
		capacityMin: z.number().int().nonnegative().nullable().optional(),
		capacityMax: z.number().int().nonnegative().nullable().optional(),
		genres: z.array(z.string()).optional(),
		payRange: z.string().nullable().optional(),
		payMin: z.number().int().nonnegative().nullable().optional(),
		payMax: z.number().int().nonnegative().nullable().optional(),
		sound: z.string().nullable().optional(),
		description: z.string().nullable().optional(),
		website: z.string().nullable().optional(),
	})
	.refine(
		(v) =>
			v.capacityMin == null || v.capacityMax == null || v.capacityMin <= v.capacityMax,
		{ path: ['capacityMin'], message: 'capacityMin must be <= capacityMax' }
	)
	.refine((v) => v.payMin == null || v.payMax == null || v.payMin <= v.payMax, {
		path: ['payMin'],
		message: 'payMin must be <= payMax',
	})
	// Coordinates are a pair: a venue with one axis but not the other is an
	// illegal state. Reject it at the boundary rather than storing a half-point.
	.refine((v) => (v.latitude == null) === (v.longitude == null), {
		path: ['latitude'],
		message: 'latitude and longitude must be provided together',
	});

export type PatchVenueData = z.infer<typeof upsertVenueSchema>;
export type WeeklyHours = z.infer<typeof weeklyHoursSchema>;
