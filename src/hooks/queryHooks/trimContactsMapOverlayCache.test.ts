// Run: npx tsx src/hooks/queryHooks/trimContactsMapOverlayCache.test.ts
//
// The map-overlay LRU can't be exercised by short browser sessions (its 2-min
// age floor deliberately protects everything a live session just fetched), so
// the eviction contract is pinned here: per-group cap, recency ordering,
// observer/in-flight/age protection, and seed-store lockstep.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import {
	getContactsMapOverlayBaseKey,
	trimContactsMapOverlayCache,
	trimContactsListCache,
	trimContactResearchCache,
	type ContactsMapOverlayFilters,
} from './useContacts';
import {
	hasContactResearchSeed,
	setContactResearchSeed,
} from './contactResearchSeeds';

const OLD_MS = 1000 * 60 * 30; // older than the 2-min age floor

const bookingFilters = (i: number): ContactsMapOverlayFilters => ({
	mode: 'booking',
	south: 30 + i,
	west: -100 + i,
	north: 31 + i,
	east: -99 + i,
	limit: 1200,
});

const seedEntry = (
	queryClient: QueryClient,
	filters: ContactsMapOverlayFilters,
	rows: { id: number }[],
	ageMs: number
) => {
	const key = [...getContactsMapOverlayBaseKey(), filters];
	queryClient.setQueryData(key, rows);
	const query = queryClient.getQueryCache().find({ queryKey: key });
	assert.ok(query, 'seeded query must exist');
	// Backdate the entry past the age floor (setQueryData stamps "now").
	query.setState({ dataUpdatedAt: Date.now() - ageMs });
	return query;
};

describe('trimContactsMapOverlayCache', () => {
	it('caps each overlay group at 24 entries, evicting oldest-first', () => {
		const queryClient = new QueryClient();
		for (let i = 0; i < 30; i++) {
			// Stagger ages so entries 0..5 are the oldest.
			seedEntry(queryClient, bookingFilters(i), [{ id: i }], OLD_MS + (30 - i) * 1000);
		}

		trimContactsMapOverlayCache(queryClient);

		const remaining = queryClient
			.getQueryCache()
			.findAll({ queryKey: getContactsMapOverlayBaseKey() });
		assert.equal(remaining.length, 24);
		// The six oldest (i = 0..5) are gone; the rest survive.
		for (let i = 0; i < 30; i++) {
			const exists = remaining.some(
				(q) =>
					(q.queryKey[q.queryKey.length - 1] as ContactsMapOverlayFilters).south ===
					30 + i
			);
			assert.equal(exists, i >= 6, `entry ${i} ${i >= 6 ? 'kept' : 'evicted'}`);
		}
	});

	it('never evicts entries younger than the age floor', () => {
		const queryClient = new QueryClient();
		for (let i = 0; i < 30; i++) {
			// All fresh (setQueryData stamps now) — over cap but under the floor.
			const key = [...getContactsMapOverlayBaseKey(), bookingFilters(i)];
			queryClient.setQueryData(key, [{ id: i }]);
		}
		trimContactsMapOverlayCache(queryClient);
		assert.equal(
			queryClient.getQueryCache().findAll({ queryKey: getContactsMapOverlayBaseKey() })
				.length,
			30
		);
	});

	it('groups are independent (a group under its cap is untouched)', () => {
		const queryClient = new QueryClient();
		for (let i = 0; i < 30; i++) {
			seedEntry(queryClient, bookingFilters(i), [{ id: i }], OLD_MS + i * 1000);
		}
		for (let i = 0; i < 5; i++) {
			seedEntry(
				queryClient,
				{ ...bookingFilters(i), mode: 'promotion' },
				[{ id: 1000 + i }],
				OLD_MS + i * 1000
			);
		}
		trimContactsMapOverlayCache(queryClient);
		const remaining = queryClient
			.getQueryCache()
			.findAll({ queryKey: getContactsMapOverlayBaseKey() });
		const promo = remaining.filter(
			(q) =>
				(q.queryKey[q.queryKey.length - 1] as ContactsMapOverlayFilters).mode ===
				'promotion'
		);
		assert.equal(promo.length, 5);
		assert.equal(remaining.length - promo.length, 24);
	});

	it('prunes research seeds in lockstep with evicted windows', () => {
		const queryClient = new QueryClient();
		const researchFor = (id: number) => ({
			id,
			metadata: 'm',
			website: null,
			address: null,
			companyType: null,
			companyFoundedYear: null,
			companyKeywords: [] as string[],
		});
		for (let i = 0; i < 30; i++) {
			seedEntry(queryClient, bookingFilters(i), [{ id: i }], OLD_MS + (30 - i) * 1000);
			setContactResearchSeed(i, researchFor(i));
		}
		trimContactsMapOverlayCache(queryClient);
		// Entries 0..5 were evicted → their seeds must be gone; the rest survive.
		for (let i = 0; i < 30; i++) {
			assert.equal(hasContactResearchSeed(i), i >= 6, `seed ${i}`);
		}
	});
});

describe('trimContactsListCache', () => {
	it('keeps the 6 most recent inactive list entries, ignores other families', () => {
		const queryClient = new QueryClient();
		// 10 list entries (['contacts','list', filters]), oldest first.
		for (let i = 0; i < 10; i++) {
			const key = ['contacts', 'list', { q: `search-${i}` }];
			queryClient.setQueryData(key, [{ id: i }]);
			const query = queryClient.getQueryCache().find({ queryKey: key });
			assert.ok(query);
			query.setState({ dataUpdatedAt: Date.now() - OLD_MS - (10 - i) * 1000 });
		}
		// Same-length string-keyed sibling + an overlay window: both untouchable.
		queryClient.setQueryData(['contacts', 'list', 'used-contacts'], [{ id: 999 }]);
		queryClient.setQueryData(
			['contacts', 'list', 'map-overlay', { mode: 'booking' }],
			[{ id: 998 }]
		);

		trimContactsListCache(queryClient);

		const lists = queryClient
			.getQueryCache()
			.findAll({ queryKey: ['contacts', 'list'] })
			.filter(
				(q) =>
					q.queryKey.length === 3 &&
					typeof q.queryKey[2] === 'object' &&
					q.queryKey[2] !== null
			);
		assert.equal(lists.length, 6);
		// Oldest four (i = 0..3) evicted.
		for (let i = 0; i < 10; i++) {
			const exists = lists.some(
				(q) => (q.queryKey[2] as { q: string }).q === `search-${i}`
			);
			assert.equal(exists, i >= 4, `list entry ${i}`);
		}
		assert.ok(
			queryClient.getQueryData(['contacts', 'list', 'used-contacts']),
			'used-contacts untouched'
		);
		assert.ok(
			queryClient.getQueryData(['contacts', 'list', 'map-overlay', { mode: 'booking' }]),
			'overlay window untouched'
		);
	});

	it('never evicts fresh list entries (age floor)', () => {
		const queryClient = new QueryClient();
		for (let i = 0; i < 10; i++) {
			queryClient.setQueryData(['contacts', 'list', { q: `s${i}` }], [{ id: i }]);
		}
		trimContactsListCache(queryClient);
		const lists = queryClient
			.getQueryCache()
			.findAll({ queryKey: ['contacts', 'list'] })
			.filter((q) => q.queryKey.length === 3 && typeof q.queryKey[2] === 'object');
		assert.equal(lists.length, 10);
	});
});

describe('trimContactResearchCache', () => {
	it('caps research entries at 150 by recency', () => {
		const queryClient = new QueryClient();
		for (let i = 0; i < 160; i++) {
			const key = ['contacts', 'detail', String(i), 'research'];
			queryClient.setQueryData(key, { id: i, metadata: 'm' });
			const query = queryClient.getQueryCache().find({ queryKey: key });
			assert.ok(query);
			query.setState({ dataUpdatedAt: Date.now() - OLD_MS - (160 - i) * 1000 });
		}
		trimContactResearchCache(queryClient);
		const remaining = queryClient
			.getQueryCache()
			.findAll({ queryKey: ['contacts', 'detail'] })
			.filter((q) => q.queryKey.length === 4 && q.queryKey[3] === 'research');
		assert.equal(remaining.length, 150);
		// The 10 oldest (i = 0..9) are gone.
		for (let i = 0; i < 10; i++) {
			assert.equal(
				queryClient.getQueryData(['contacts', 'detail', String(i), 'research']),
				undefined,
				`research ${i} evicted`
			);
		}
	});
});
