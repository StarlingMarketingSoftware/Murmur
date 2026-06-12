// DB-backed smoke test for the venue → public Contact projection.
// Run with: npx tsx --tsconfig tsconfig.json scripts/check-venue-contact-sync.ts
// Requires local Postgres (docker-compose up -d). Creates and cleans up its own data.
import assert from 'node:assert/strict';
import prisma from '@/lib/prisma';
import {
	syncVenueToContact,
	unpublishVenueContact,
} from '@/app/api/_utils/venueContactSync';
import { deleteContactFromVectorDb } from '@/app/api/_utils/vectorDb';

async function main() {
	const clerkId = `venue-sync-smoke-${Date.now()}`;
	const email = `${clerkId}@example.com`;
	let contactId: number | null = null;

	try {
		await prisma.user.create({ data: { clerkId, email, accountType: 'venue' } });

		// 1) A venue without coordinates must NOT publish.
		const incomplete = await prisma.venue.create({
			data: { userId: clerkId, venueName: 'Smoke Sync Venue' },
		});
		await syncVenueToContact(incomplete);
		assert.equal(
			await prisma.contact.count({ where: { venueId: incomplete.id } }),
			0,
			'venue without coordinates must not publish'
		);

		// 2) Completing the gate publishes a public, categorized contact.
		const venue = await prisma.venue.update({
			where: { userId: clerkId },
			data: {
				businessType: 'Music Venue',
				city: 'Los Angeles',
				state: 'CA',
				latitude: 34.0522,
				longitude: -118.2437,
			},
		});
		await syncVenueToContact(venue, { awaitIndex: true });

		const contact = await prisma.contact.findUniqueOrThrow({ where: { venueId: venue.id } });
		contactId = contact.id;
		assert.equal(contact.userId, null, 'projected contact must be public (userId null)');
		assert.equal(contact.company, 'Smoke Sync Venue', 'company = venueName');
		assert.equal(contact.title, 'Music Venues CA', 'canonical "<Category> <State>" title');
		assert.equal(contact.email, email, 'email backfilled from owner account');
		assert.ok(
			Math.abs((contact.latitude ?? 0) - 34.0522) < 1e-9 &&
				Math.abs((contact.longitude ?? 0) - -118.2437) < 1e-9,
			'coordinates copied from venue'
		);

		// 3) Idempotent — a second sync updates the same row, never duplicates.
		await syncVenueToContact(venue, { awaitIndex: true });
		assert.equal(
			await prisma.contact.count({ where: { venueId: venue.id } }),
			1,
			'sync is idempotent (one contact per venue)'
		);

		// 4) Clearing coordinates unpublishes the contact.
		const cleared = await prisma.venue.update({
			where: { userId: clerkId },
			data: { latitude: null, longitude: null },
		});
		await syncVenueToContact(cleared);
		assert.equal(
			await prisma.contact.count({ where: { venueId: venue.id } }),
			0,
			'clearing coordinates unpublishes the contact'
		);

		console.log('✓ check-venue-contact-sync: all assertions passed');
	} finally {
		const v = await prisma.venue.findUnique({
			where: { userId: clerkId },
			select: { id: true },
		});
		if (v) await unpublishVenueContact(v.id);
		// Guarantee no stray ES doc lingers if an assertion failed mid-way.
		if (contactId != null) {
			await deleteContactFromVectorDb(String(contactId)).catch(() => {});
		}
		await prisma.user.deleteMany({ where: { clerkId } });
		await prisma.$disconnect();
	}
}

main().catch(async (err) => {
	console.error(err);
	await prisma.$disconnect();
	process.exit(1);
});
