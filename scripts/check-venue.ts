// DB-backed smoke test for the venue backend foundation.
// Run with: npx tsx --tsconfig tsconfig.json scripts/check-venue.ts
// Requires local Postgres (docker-compose up -d). Creates and cleans up its own user.
import assert from 'node:assert/strict';
import prisma from '@/lib/prisma';
import { upsertVenueSchema } from '@/app/api/venue/schema';

async function main() {
	const clerkId = `venue-smoke-${Date.now()}`;
	const email = `${clerkId}@example.com`;

	try {
		// 1) A venue account, exactly as the Clerk webhook would create it.
		const user = await prisma.user.create({
			data: { clerkId, email, accountType: 'venue' },
		});
		assert.equal(user.accountType, 'venue', 'user.accountType should be venue');

		// 2) A realistic payload: structured weekly hours (incl. an overnight Saturday),
		//    a capacity range, and a pay range alongside free-text pay terms.
		const payload = {
			venueName: 'The Smoke Room',
			businessType: 'live music venue',
			hours: {
				fri: [{ open: '19:00', close: '23:00' }],
				sat: [{ open: '19:00', close: '02:00' }], // crosses midnight
			},
			capacityMin: 200,
			capacityMax: 500,
			payRange: '$300 guarantee + 70% of door',
			payMin: 300,
			payMax: 800,
			genres: ['jazz', 'funk'],
			sound: 'In-house PA + monitors, engineer provided',
			website: 'https://thesmokeroom.example',
		};
		assert.ok(upsertVenueSchema.safeParse(payload).success, 'valid payload should parse');

		// 3) Upsert twice — must stay a single row (idempotency on userId @unique).
		const writeOnce = () =>
			prisma.venue.upsert({
				where: { userId: clerkId },
				update: { ...payload },
				create: { userId: clerkId, ...payload },
			});
		const first = await writeOnce();
		const second = await writeOnce();
		assert.equal(first.id, second.id, 'second upsert must update, not duplicate');
		assert.equal(
			await prisma.venue.count({ where: { userId: clerkId } }),
			1,
			'exactly one venue row per user'
		);

		// 4) Field round-trip, including the structured hours JSON and both ranges.
		const venue = await prisma.venue.findUniqueOrThrow({ where: { userId: clerkId } });
		assert.equal(venue.venueName, 'The Smoke Room');
		assert.equal(venue.capacityMin, 200);
		assert.equal(venue.capacityMax, 500);
		assert.equal(venue.payMin, 300);
		assert.equal(venue.payMax, 800);
		assert.deepEqual(venue.genres, ['jazz', 'funk']);
		assert.deepEqual(venue.hours, payload.hours, 'hours JSON round-trips intact');

		// 5) Validation guards: inverted numeric ranges and malformed times are rejected.
		assert.ok(
			!upsertVenueSchema.safeParse({
				venueName: 'X',
				capacityMin: 500,
				capacityMax: 200,
			}).success,
			'inverted capacity range rejected'
		);
		assert.ok(
			!upsertVenueSchema.safeParse({ venueName: 'X', payMin: 800, payMax: 300 }).success,
			'inverted pay range rejected'
		);
		assert.ok(
			!upsertVenueSchema.safeParse({
				venueName: 'X',
				hours: { mon: [{ open: '25:00', close: '26:00' }] },
			}).success,
			'malformed HH:mm rejected'
		);

		console.log('✓ check-venue: all assertions passed');
	} finally {
		// Venue cascades on user delete.
		await prisma.user.deleteMany({ where: { clerkId } });
		await prisma.$disconnect();
	}
}

main().catch(async (err) => {
	console.error(err);
	await prisma.$disconnect();
	process.exit(1);
});
