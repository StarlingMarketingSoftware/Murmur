// One-time backfill: publish every venue that already meets the completion gate
// (a non-empty name + coordinates) into its public Contact projection so it
// appears on the map and in search. Idempotent — safe to re-run.
// Run with: npx tsx --tsconfig tsconfig.json scripts/publish-existing-venues.ts
// Requires local Postgres + Elasticsearch (docker-compose up -d).
import prisma from '@/lib/prisma';
import { syncVenueToContact } from '@/app/api/_utils/venueContactSync';

async function main() {
	const venues = await prisma.venue.findMany({
		where: {
			venueName: { not: '' },
			latitude: { not: null },
			longitude: { not: null },
		},
	});

	console.log(`Found ${venues.length} venue(s) meeting the publish gate.`);

	let published = 0;
	for (const venue of venues) {
		try {
			await syncVenueToContact(venue, { awaitIndex: true });
			published += 1;
			console.log(`  ✓ #${venue.id} ${venue.venueName}`);
		} catch (error) {
			console.error(`  ✗ #${venue.id} ${venue.venueName}`, error);
		}
	}

	console.log(`Done: ${published}/${venues.length} published.`);
}

main()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
