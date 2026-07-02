import type { GetContactResearchData } from '@/app/api/contacts/[id]/research/route';

// Research-detail seeds harvested from fat map-overlay rows (see useContacts.ts:
// useGetContactsMapOverlay slims those rows in its queryFn). Stored once per
// contact id instead of duplicated inside every cached overlay window, and served
// synchronously to useGetContactResearch via initialData so the research panel /
// street cards render with data on first paint — no fetch, no loading flash.
export interface ContactResearchSeed {
	ts: number;
	data: GetContactResearchData;
}

const seeds = new Map<number, ContactResearchSeed>();

export const setContactResearchSeed = (id: number, data: GetContactResearchData) => {
	seeds.set(id, { ts: Date.now(), data });
};

export const getContactResearchSeed = (id: number): ContactResearchSeed | null =>
	seeds.get(id) ?? null;

// Whether this contact's research came from a slimmed overlay row. Consumers use
// this to mirror the inline-field semantics the row would have had (e.g. the
// inline path never carried companyKeywords, so seeded merges must not either).
export const hasContactResearchSeed = (id: number): boolean => seeds.has(id);

// Drop seeds for contacts no longer present in any retained overlay window —
// called from the overlay-cache LRU pass so seeds and windows die together.
export const retainContactResearchSeeds = (liveIds: ReadonlySet<number>) => {
	for (const id of seeds.keys()) {
		if (!liveIds.has(id)) seeds.delete(id);
	}
};
