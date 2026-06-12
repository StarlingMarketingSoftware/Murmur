import type { Contact, Venue } from '@prisma/client';
import prisma from '@/lib/prisma';
import { mapBusinessTypeToCategory } from '@/constants/contactCategories';
import { deleteContactFromVectorDb, upsertContactToVectorDb } from './vectorDb';

// A "published" venue is projected into a public Contact row (+ its Elasticsearch
// document) so it rides the existing map overlay and search/ranking machinery:
// the public map is a Postgres bbox query over Contact, and search reads the ES
// `contacts` index. The projection is keyed by Contact.venueId (unique), which
// makes publish/update idempotent and unpublish reversible.
//
// CRITICAL: the projected Contact has userId = null. A non-null userId marks a
// contact private (excluded from ES indexing) and counts it against that user's
// own contacts. The owner link lives in venueId, not userId.

// Venue-derived fields that flow into the ES document. If none of these change
// between debounced autosaves we skip re-indexing — and the embedding API call
// that upsertContactToVectorDb makes — so typing in one field doesn't re-embed.
const ES_RELEVANT_FIELDS = [
	'title',
	'company',
	'email',
	'headline',
	'address',
	'city',
	'state',
	'country',
	'website',
	'metadata',
	'latitude',
	'longitude',
] as const;

const buildMetadata = (venue: Venue): string | null => {
	const parts = [
		venue.businessType?.trim() || null,
		venue.genres.length ? `Genres: ${venue.genres.join(', ')}` : null,
		venue.sound?.trim() ? `Sound: ${venue.sound.trim()}` : null,
	].filter(Boolean);
	return parts.length ? parts.join(' • ') : null;
};

const esRelevantFieldsChanged = (
	existing: Contact,
	next: Pick<Contact, (typeof ES_RELEVANT_FIELDS)[number]>
): boolean => ES_RELEVANT_FIELDS.some((field) => existing[field] !== next[field]);

/** Remove a venue's public Contact projection (+ its ES document) if present. */
export const unpublishVenueContact = async (venueId: number): Promise<void> => {
	const existing = await prisma.contact.findUnique({
		where: { venueId },
		select: { id: true },
	});
	if (!existing) return;

	await prisma.contact.delete({ where: { venueId } });
	void deleteContactFromVectorDb(String(existing.id)).catch((error) =>
		console.error('[venueContactSync] ES delete failed', {
			venueId,
			contactId: existing.id,
			error,
		})
	);
};

/**
 * Publish (or refresh) a venue's public Contact projection when it meets the
 * completion gate (a name + coordinates); otherwise ensure it is unpublished.
 * Safe to call on every venue PATCH — the upsert keyed on venueId is idempotent.
 */
export const syncVenueToContact = async (
	venue: Venue,
	{ awaitIndex = false }: { awaitIndex?: boolean } = {}
): Promise<void> => {
	if (!venue.venueName || venue.latitude == null || venue.longitude == null) {
		await unpublishVenueContact(venue.id);
		return;
	}

	const category = mapBusinessTypeToCategory(venue.businessType);
	// A canonical "<Category> <State>" title earns the top ranking tier in both
	// free-text and curated search and matches the booking map overlay filter.
	// No category (blank/unmappable businessType) → a normal, uncategorized contact.
	const title = category ? (venue.state ? `${category} ${venue.state}` : category) : null;

	const owner = await prisma.user.findUnique({
		where: { clerkId: venue.userId },
		select: { email: true },
	});

	const data = {
		venueId: venue.id,
		userId: null,
		contactListId: null,
		company: venue.venueName,
		firstName: null,
		lastName: null,
		title,
		// Required NOT-NULL column. Outreach (how artists actually contact venues)
		// is a separate, deferred concern; this just satisfies the schema.
		email: owner?.email ?? `venue-${venue.id}@noreply.invalid`,
		address: venue.address ?? null,
		city: venue.city ?? null,
		state: venue.state ?? null,
		country: 'United States',
		latitude: venue.latitude,
		longitude: venue.longitude,
		website: venue.website ?? null,
		headline: venue.description?.trim().slice(0, 200) || null,
		metadata: buildMetadata(venue),
		photoUrl: null,
	};

	const existing = await prisma.contact.findUnique({ where: { venueId: venue.id } });
	const contact = await prisma.contact.upsert({
		where: { venueId: venue.id },
		create: data,
		update: data,
	});

	// Re-index only when something the ES document/embedding depends on changed
	// (or the doc was never created), so the debounced autosave stays cheap.
	if (!existing || !existing.hasVectorEmbedding || esRelevantFieldsChanged(existing, data)) {
		// Off the request path during normal autosave (fire-and-forget); the
		// one-time backfill passes awaitIndex so indexing completes before exit.
		const indexing = upsertContactToVectorDb(contact).catch((error) =>
			console.error('[venueContactSync] ES upsert failed', { venueId: venue.id, error })
		);
		if (awaitIndex) await indexing;
	}
};
