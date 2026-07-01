import type { Contact } from '@prisma/client';

// The adversarial query battery + composition-trait predicates for the
// search-quality harness. Trait predicates judge synthetic Contact rows built
// from ES doc fields (title/headline/company/companyIndustry/state) — never
// Postgres data (dev ids don't match ES; see esHydrator.ts).

export type CenterKey = 'nyc' | 'boise';

export const CENTERS: Record<CenterKey, { lat: number; lon: number }> = {
	nyc: { lat: 40.7, lon: -74.0 },
	boise: { lat: 43.6, lon: -116.2 },
};

export type BatteryEntry = {
	q: string;
	// Centers to sweep. Undefined = nyc only (the dashboard always sends IP
	// coords + radiusKm 250; nyc approximates a dense metro, boise probes the
	// geo-starvation regime).
	centers?: CenterKey[];
	// Trait tallies to report over the top 10 rows.
	traits?: string[];
	// Strict-mode (post-ranking-overhaul) assertions. Skipped in report mode.
	strict?: {
		top10AtLeast?: { trait: string; count: number }[];
		top10AtMost?: { trait: string; count: number }[];
		minReturned?: number;
		coverage?: string[];
	};
	note?: string;
};

const matchesAny = (
	value: string | null | undefined,
	re: RegExp
): boolean => !!value && re.test(value);

const CANONICAL_PREFIX_RE =
	/^(music venues|restaurants|coffee shops|music festivals|breweries|distilleries|wineries|cideries|wedding planners|wedding venues)\s/i;

export const TRAITS: Record<string, (c: Contact) => boolean> = {
	person: (c) => !!(c.firstName && c.firstName.trim()),
	canonicalVenue: (c) =>
		!c.firstName?.trim() && matchesAny(c.title, CANONICAL_PREFIX_RE),
	musicFaculty: (c) =>
		(matchesAny(c.title, /professor|faculty|lecturer|instructor/i) ||
			matchesAny(c.headline, /professor|faculty|lecturer|instructor/i)) &&
		(matchesAny(c.title, /music|jazz|composition|musicolog|conduct|piano|voice|strings|saxophone|percussion/i) ||
			matchesAny(c.headline, /music|jazz|composition|musicolog|conduct|piano|voice|strings|saxophone|percussion/i)),
	historyFaculty: (c) =>
		(matchesAny(c.title, /professor|faculty|lecturer|instructor/i) ||
			matchesAny(c.headline, /professor|faculty|lecturer|instructor/i)) &&
		(matchesAny(c.title, /histor/i) || matchesAny(c.headline, /histor/i)),
	professorRow: (c) =>
		matchesAny(c.title, /professor/i) || matchesAny(c.headline, /professor/i),
	recordLabel: (c) =>
		matchesAny(c.companyIndustry, /record label|\brecords?\b/i) ||
		matchesAny(c.company, /\brecords\b/i) ||
		matchesAny(c.title, /record label|a&r/i) ||
		matchesAny(c.headline, /record label|a&r/i),
	magazineRow: (c) =>
		matchesAny(c.company, /magazine/i) ||
		matchesAny(c.companyIndustry, /magazine|publishing|music media|press/i) ||
		matchesAny(c.title, /magazine/i),
	anrRow: (c) =>
		matchesAny(c.title, /a&r/i) || matchesAny(c.headline, /a&r/i),
	bookingAgentRow: (c) =>
		matchesAny(c.title, /booking agent|talent buyer|booking/i) ||
		matchesAny(c.headline, /booking agent|talent buyer/i),
	plumbingRow: (c) =>
		matchesAny(c.title, /plumb/i) ||
		matchesAny(c.company, /plumb/i) ||
		matchesAny(c.headline, /plumb/i) ||
		matchesAny(c.companyIndustry, /plumb/i),
	janitorialRow: (c) =>
		matchesAny(c.title, /janitor|custodia/i) ||
		matchesAny(c.company, /janitor|custodia/i) ||
		matchesAny(c.headline, /janitor|custodia/i),
	photographerRow: (c) =>
		matchesAny(c.title, /photograph/i) || matchesAny(c.headline, /photograph/i),
	marketingManagerRow: (c) =>
		matchesAny(c.title, /marketing/i) || matchesAny(c.headline, /marketing/i),
	// Many person-shaped rows in the index have empty firstName ("Restaurant
	// Manager" at a venue) — judge by the role title, not name presence.
	restaurantMgrTitleRow: (c) =>
		matchesAny(c.title, /\b(restaurant|general|food and beverage) manager\b/i),
	facilitiesRow: (c) =>
		matchesAny(c.title, /janitor|custodia|facilities/i) ||
		matchesAny(c.headline, /janitor|custodia|facilities/i),
};

export const BATTERY: BatteryEntry[] = [
	{
		q: 'professor of music',
		centers: ['nyc', 'boise'],
		traits: ['musicFaculty', 'professorRow', 'canonicalVenue', 'person'],
		strict: {
			top10AtLeast: [{ trait: 'musicFaculty', count: 7 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
			minReturned: 25,
		},
	},
	{
		q: 'music professor',
		traits: ['musicFaculty', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'musicFaculty', count: 6 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
		},
		note: 'word-order robustness',
	},
	{
		q: 'professor of history',
		traits: ['historyFaculty', 'musicFaculty', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'historyFaculty', count: 7 }],
			top10AtMost: [{ trait: 'musicFaculty', count: 1 }],
		},
		note: 'discipline disjointness vs professor of music',
	},
	{
		q: 'professor',
		traits: ['professorRow', 'canonicalVenue'],
		strict: { top10AtLeast: [{ trait: 'professorRow', count: 8 }] },
	},
	{
		q: 'record label',
		centers: ['nyc', 'boise'],
		traits: ['recordLabel', 'canonicalVenue', 'person'],
		strict: {
			top10AtLeast: [{ trait: 'recordLabel', count: 7 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
			minReturned: 15,
		},
	},
	{
		q: 'record labels in los angeles',
		traits: ['recordLabel', 'canonicalVenue'],
		strict: { top10AtLeast: [{ trait: 'recordLabel', count: 6 }] },
		note: 'explicit place — CA enforcement must hold',
	},
	{
		q: 'music magazine',
		traits: ['magazineRow', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'magazineRow', count: 5 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
		},
	},
	{
		q: 'magazine editor',
		traits: ['magazineRow', 'person'],
		strict: { top10AtLeast: [{ trait: 'magazineRow', count: 5 }] },
	},
	{
		q: 'A&R',
		traits: ['anrRow', 'recordLabel', 'canonicalVenue'],
		strict: { top10AtLeast: [{ trait: 'anrRow', count: 6 }] },
	},
	{
		q: 'booking agent',
		traits: ['bookingAgentRow', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'bookingAgentRow', count: 5 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
		},
	},
	{
		q: 'talent buyer',
		traits: ['bookingAgentRow', 'canonicalVenue'],
		strict: { top10AtLeast: [{ trait: 'bookingAgentRow', count: 5 }] },
	},
	{
		q: 'music supervisor',
		traits: ['person', 'canonicalVenue'],
		strict: { top10AtMost: [{ trait: 'canonicalVenue', count: 0 }] },
	},
	{
		q: 'janitor',
		traits: ['janitorialRow', 'facilitiesRow', 'canonicalVenue', 'person'],
		strict: {
			// The LLM's vetted synonyms (custodian/custodial/facilities) surface
			// facilities directors/managers — the honest best answer this corpus
			// has for "janitor". The gate's job is ZERO venue junk, not zero
			// results: coverage may legitimately reach full via synonym
			// evidence.
			top10AtLeast: [{ trait: 'facilitiesRow', count: 6 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
			coverage: ['sparse', 'partial', 'full'],
		},
		note: 'data void for the literal role — synonyms surface facilities staff, zero venue junk',
	},
	{
		q: 'plumber',
		traits: ['plumbingRow', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'plumbingRow', count: 5 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 0 }],
		},
		note: 'thin-but-servable — prefix-aware + company-surface evidence must catch plumbing companies',
	},
	{
		q: 'wedding photographer',
		traits: ['photographerRow', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'photographerRow', count: 3 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 2 }],
		},
	},
	{
		q: 'marketing manager san francisco',
		traits: ['marketingManagerRow', 'person'],
		strict: { top10AtLeast: [{ trait: 'marketingManagerRow', count: 6 }] },
	},
	{
		q: 'coffee roaster',
		traits: ['canonicalVenue', 'person'],
		strict: { top10AtMost: [{ trait: 'canonicalVenue', count: 2 }] },
		note: 'category-noun trap — roasteries, not coffee-shop venue tray',
	},
	{
		q: 'restaurant manager',
		traits: ['restaurantMgrTitleRow', 'person', 'canonicalVenue'],
		strict: {
			top10AtLeast: [{ trait: 'restaurantMgrTitleRow', count: 6 }],
			top10AtMost: [{ trait: 'canonicalVenue', count: 1 }],
		},
		note: 'category-noun trap',
	},
];

// Dispatch-regression trio: these must keep routing AWAY from the hybrid path
// and their candidate composition is snapshotted as a baseline (branch +
// returned ids), compared as sets with tolerance.
export const REGRESSION_TRIO = [
	'music venues nashville',
	'bars in austin',
	'austin',
] as const;
