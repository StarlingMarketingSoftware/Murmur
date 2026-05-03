/* eslint-disable @typescript-eslint/no-explicit-any */
// Run with: npx tsx src/app/api/contacts/curated-search/distribution.test.ts
// (Or: node --import tsx src/app/api/contacts/curated-search/distribution.test.ts)

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
	allocateAcrossCategories,
	allocateAcrossCategoriesDeterministic,
	contactLooksLikeBusinessEntity,
	distributeAcrossBuckets,
	interleaveByCategory,
	liveMusicSignalScore,
	titleHasStateSuffix,
	type CategoryPool,
} from './distribution';

const stub = (id: number, overrides: Record<string, unknown> = {}): any => ({
	id,
	apolloPersonId: null,
	firstName: `First${id}`,
	lastName: `Last${id}`,
	email: `c${id}@example.com`,
	company: `Company ${id}`,
	city: `City ${id}`,
	state: 'PA',
	country: 'United States',
	address: null,
	phone: null,
	website: `https://example.com/${id}`,
	title: 'Music Venues PA',
	headline: `Headline ${id}`,
	linkedInUrl: null,
	photoUrl: `https://example.com/photo/${id}.jpg`,
	metadata: null,
	companyLinkedInUrl: null,
	companyFoundedYear: null,
	companyType: null,
	companyTechStack: [],
	companyPostalCode: null,
	companyKeywords: [],
	companyIndustry: null,
	latitude: 40 + (id % 7) * 0.4,
	longitude: -75 + (id % 9) * 0.4,
	isPrivate: false,
	hasVectorEmbedding: false,
	userContactListCount: 0,
	manualDeselections: [],
	lastResearchedDate: null,
	emailValidationStatus: null,
	emailValidationSubStatus: null,
	emailValidatedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	userId: null,
	contactListId: null,
	...overrides,
});

const ALL_CATEGORIES = [
	'Music Venues',
	'Restaurants',
	'Coffee Shops',
	'Music Festivals',
	'Breweries',
	'Distilleries',
	'Wineries',
	'Cideries',
	'Wedding Planners',
	'Wedding Venues',
	'Radio Stations',
	'College Radio',
] as const;

const buildPool = (key: string, count: number, idBase: number): CategoryPool => ({
	key,
	label: key.toLowerCase(),
	contacts: Array.from({ length: count }, (_, i) => stub(idBase + i, { title: `${key} PA` })),
	radiusUsed: 250,
});

const breakdown = (allocated: { categoryKey: string }[]): Record<string, number> => {
	const out: Record<string, number> = {};
	for (const a of allocated) out[a.categoryKey] = (out[a.categoryKey] ?? 0) + 1;
	return out;
};

describe('allocateAcrossCategories — even distribution', () => {
	test('all 12 categories with 100+ each → 50 results split close to evenly', () => {
		const pools = ALL_CATEGORIES.map((k, i) => buildPool(k, 100, i * 1000));
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);

		assert.equal(allocated.length, 50, 'should fill exactly 50 slots');
		const counts = breakdown(allocated);
		const min = Math.min(...Object.values(counts));
		const max = Math.max(...Object.values(counts));
		assert.equal(Object.keys(counts).length, 12, 'all 12 categories represented');
		assert.ok(
			max - min <= 1,
			`even split: min=${min} max=${max} should differ by ≤1, got ${JSON.stringify(counts)}`
		);
	});

	test('all 12 with 100+ each, limit=50, randomized variant — same distribution properties', () => {
		const pools = ALL_CATEGORIES.map((k, i) => buildPool(k, 100, i * 1000));
		// Run many trials so we don't just luck into a passing arrangement.
		for (let trial = 0; trial < 50; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			assert.equal(allocated.length, 50, `trial ${trial}: should fill 50`);
			const counts = breakdown(allocated);
			assert.equal(Object.keys(counts).length, 12, `trial ${trial}: 12 categories`);
			const min = Math.min(...Object.values(counts));
			const max = Math.max(...Object.values(counts));
			assert.ok(
				max - min <= 1,
				`trial ${trial}: max-min=${max - min} >1, counts=${JSON.stringify(counts)}`
			);
		}
	});
});

describe('allocateAcrossCategories — handles uneven pools', () => {
	test('one category dominates (Restaurants:1000, others:5 each) → all 12 represented, even-as-possible', () => {
		const pools = ALL_CATEGORIES.map((k, i) =>
			buildPool(k, k === 'Restaurants' ? 1000 : 5, i * 5000)
		);
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		const counts = breakdown(allocated);

		assert.equal(allocated.length, 50);
		assert.equal(Object.keys(counts).length, 12, 'all 12 categories represented');
		// idealShare = floor(50/12) = 4. Pass 1 → 4 from each = 48. Pass 2 → 2 more
		// slots filled one-by-one. So each category lands at 4 or 5 (max is each
		// pool's available count, so non-Restaurants cap at 5).
		const min = Math.min(...Object.values(counts));
		const max = Math.max(...Object.values(counts));
		assert.ok(max - min <= 1, `max-min=${max - min}, counts=${JSON.stringify(counts)}`);
		assert.ok(min >= 4, `each category should get at least 4, min=${min}`);
	});

	test('only 3 categories have data, each with 30 → splits evenly across those 3', () => {
		const liveKeys = ['Music Venues', 'Restaurants', 'Coffee Shops'];
		const pools: CategoryPool[] = ALL_CATEGORIES.map((k, i) =>
			buildPool(k, liveKeys.includes(k) ? 30 : 0, i * 5000)
		);
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		const counts = breakdown(allocated);

		assert.equal(allocated.length, 50);
		assert.equal(Object.keys(counts).length, 3, 'only the live categories represented');
		const min = Math.min(...Object.values(counts));
		const max = Math.max(...Object.values(counts));
		// 50 / 3 = 16.67 → counts should be {17,17,16}
		assert.ok(max - min <= 1, `max-min=${max - min}, counts=${JSON.stringify(counts)}`);
	});

	test('one category very sparse (Cideries:2) — its 2 are taken, slack absorbed by others', () => {
		const pools = ALL_CATEGORIES.map((k, i) =>
			buildPool(k, k === 'Cideries' ? 2 : 100, i * 5000)
		);
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		const counts = breakdown(allocated);

		assert.equal(allocated.length, 50);
		assert.equal(counts['Cideries'], 2, 'Cideries contributed all available');
		// No other category should be wildly over-represented.
		const otherCounts = Object.entries(counts)
			.filter(([k]) => k !== 'Cideries')
			.map(([, v]) => v);
		const max = Math.max(...otherCounts);
		assert.ok(max <= 6, `no non-Cideries category should exceed 6, got max=${max}`);
	});
});

describe('allocateAcrossCategories — edge cases', () => {
	test('empty pools → empty result', () => {
		const pools = ALL_CATEGORIES.map((k, i) => buildPool(k, 0, i * 100));
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		assert.deepEqual(allocated, []);
	});

	test('limit=0 → empty result', () => {
		const pools = [buildPool('Music Venues', 100, 0)];
		assert.deepEqual(allocateAcrossCategoriesDeterministic(pools, 0), []);
	});

	test('total available < limit → returns all available', () => {
		const pools = [buildPool('Music Venues', 3, 0), buildPool('Restaurants', 4, 100)];
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		assert.equal(allocated.length, 7);
		const counts = breakdown(allocated);
		assert.equal(counts['Music Venues'], 3);
		assert.equal(counts['Restaurants'], 4);
	});

	test('single category → all results from it', () => {
		const pools = [buildPool('Music Venues', 200, 0)];
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		assert.equal(allocated.length, 50);
		const counts = breakdown(allocated);
		assert.equal(counts['Music Venues'], 50);
	});

	test('no duplicate contacts in output', () => {
		const pools = ALL_CATEGORIES.map((k, i) => buildPool(k, 100, i * 1000));
		for (let trial = 0; trial < 20; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			const ids = new Set(allocated.map((a) => a.contact.id));
			assert.equal(
				ids.size,
				allocated.length,
				`trial ${trial}: duplicate contact ids in allocation`
			);
		}
	});
});

describe('allocateAcrossCategories — weighted shares', () => {
	test('weight 0.5 gets ~half the share of weight 1', () => {
		const liveKeys = [
			'Music Venues',
			'Restaurants',
			'Coffee Shops',
			'Music Festivals',
			'Breweries',
			'Distilleries',
			'Wineries',
			'Cideries',
			'Wedding Planners',
			'Wedding Venues',
		] as const;
		const pools: CategoryPool[] = liveKeys.map((k, i) => ({
			...buildPool(k, 100, i * 1000),
			weight: k.startsWith('Wedding') ? 0.5 : 1,
		}));
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		const counts = breakdown(allocated);

		assert.equal(allocated.length, 50, 'should fill 50 slots');
		assert.equal(Object.keys(counts).length, 10, 'all 10 categories represented');

		const weddingTotal = (counts['Wedding Planners'] ?? 0) + (counts['Wedding Venues'] ?? 0);
		const nonWeddingAvg =
			Object.entries(counts)
				.filter(([k]) => !k.startsWith('Wedding'))
				.map(([, v]) => v)
				.reduce((s, v) => s + v, 0) / 8;

		// At weight 0.5 vs weight 1, each wedding category's share should be
		// roughly half the average non-wedding category's share.
		const weddingPerCategoryAvg = weddingTotal / 2;
		assert.ok(
			weddingPerCategoryAvg < nonWeddingAvg,
			`wedding avg ${weddingPerCategoryAvg} should be < non-wedding avg ${nonWeddingAvg}`
		);
		assert.ok(
			weddingPerCategoryAvg <= nonWeddingAvg * 0.7,
			`wedding avg ${weddingPerCategoryAvg} should be ≤ 70% of non-wedding avg ${nonWeddingAvg}`
		);
	});

	test('total always equals limit even with mixed weights', () => {
		const liveKeys = ['A', 'B', 'C', 'D'] as const;
		const pools: CategoryPool[] = liveKeys.map((k, i) => ({
			...buildPool(k, 100, i * 1000),
			weight: i % 2 === 0 ? 1 : 0.5,
		}));
		for (let trial = 0; trial < 20; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			assert.equal(
				allocated.length,
				50,
				`trial ${trial}: should fill exactly 50 with mixed weights`
			);
		}
	});

	test('weight 2 gets roughly double the share', () => {
		const pools: CategoryPool[] = [
			{ ...buildPool('A', 100, 0), weight: 2 },
			{ ...buildPool('B', 100, 1000), weight: 1 },
			{ ...buildPool('C', 100, 2000), weight: 1 },
			{ ...buildPool('D', 100, 3000), weight: 1 },
		];
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		const counts = breakdown(allocated);
		// Total weight = 5; A target = 50 * (2/5) = 20; others = 10 each.
		assert.equal(counts['A'], 20);
		assert.equal(counts['B'], 10);
		assert.equal(counts['C'], 10);
		assert.equal(counts['D'], 10);
		assert.equal(allocated.length, 50);
	});

	test('weighted deficit redistributes when pool can\'t fill its target', () => {
		const pools: CategoryPool[] = [
			{ ...buildPool('A', 100, 0), weight: 1 },
			{ ...buildPool('B', 100, 1000), weight: 1 },
			// C wants 50 * (2/4) = 25 but only has 5.
			{ ...buildPool('C', 5, 2000), weight: 2 },
		];
		const allocated = allocateAcrossCategoriesDeterministic(pools, 50);
		const counts = breakdown(allocated);
		assert.equal(counts['C'], 5, 'C contributed all available');
		assert.equal(allocated.length, 50, 'deficit redistributed');
		// A and B together should pick up the 20-slot deficit.
		assert.equal((counts['A'] ?? 0) + (counts['B'] ?? 0), 45);
	});

	test('omitting weight defaults to 1 (back-compat)', () => {
		const pools: CategoryPool[] = [
			buildPool('A', 100, 0), // no weight set
			buildPool('B', 100, 1000),
			buildPool('C', 100, 2000),
			buildPool('D', 100, 3000),
		];
		const allocated = allocateAcrossCategoriesDeterministic(pools, 40);
		const counts = breakdown(allocated);
		// Even split with no weights: 10 each.
		for (const k of ['A', 'B', 'C', 'D']) {
			assert.equal(counts[k], 10, `${k} should get 10`);
		}
	});
});

describe('allocateAcrossCategories — randomization properties', () => {
	test('different runs produce different orderings (variation across calls)', () => {
		const pools = ALL_CATEGORIES.map((k, i) => buildPool(k, 100, i * 1000));
		const seen = new Set<string>();
		for (let i = 0; i < 30; i++) {
			const allocated = allocateAcrossCategories(pools, 50);
			seen.add(allocated.map((a) => a.contact.id).join(','));
		}
		assert.ok(seen.size > 25, `expected high variation across 30 runs, got ${seen.size} unique`);
	});

	test('over many runs, no single category systematically over-allocated when pools equal', () => {
		const pools = ALL_CATEGORIES.map((k, i) => buildPool(k, 100, i * 1000));
		const totals: Record<string, number> = {};
		for (const k of ALL_CATEGORIES) totals[k] = 0;
		const trials = 200;
		for (let i = 0; i < trials; i++) {
			const allocated = allocateAcrossCategories(pools, 50);
			for (const a of allocated) totals[a.categoryKey] = (totals[a.categoryKey] ?? 0) + 1;
		}
		// Each category should have ~ trials * (50/12) = 833 picks. Allow a generous
		// 20% tolerance for randomness.
		const expected = trials * (50 / ALL_CATEGORIES.length);
		const tolerance = expected * 0.2;
		for (const [k, total] of Object.entries(totals)) {
			assert.ok(
				Math.abs(total - expected) < tolerance,
				`${k} appeared ${total} times across ${trials} trials, expected ~${expected.toFixed(
					0
				)} (±${tolerance.toFixed(0)})`
			);
		}
	});
});

describe('titleHasStateSuffix — canonical-naming detector', () => {
	const cases: [string, boolean][] = [
		['Coffee Shops Pennsylvania', true],
		['Coffee Shops PA', true],
		['Music Venues New York', true],
		['Music Venues NY', true],
		['Wineries California', true],
		['Wineries CA', true],
		['Restaurants TX', true],
		['Restaurants Texas', true],
		['Music Festivals South Carolina', true],
		['Music Festivals North Dakota', true],
		['Coffee Shops PA.', true], // trailing period tolerated
		['Restaurant PA', false], // singular prefix is not a map-overlay category label
		['Coffee Shop PA', false],
		['Restaurants with live music in PA', false],
		['Coffee Shops looking for performers NY', false],
		['Radio Stations PA', false], // curated search uses booking overlay categories only
		['Coffee Shop Owner', false],
		['Restaurant Manager at Joe\'s', false],
		['Head Barista', false],
		['CEO', false],
		['Music Venues', false], // bare prefix, no state
		['', false],
	];
	for (const [title, expected] of cases) {
		test(`"${title}" → ${expected}`, () => {
			assert.equal(titleHasStateSuffix(title), expected);
		});
	}

	test('null/undefined safe', () => {
		assert.equal(titleHasStateSuffix(null), false);
		assert.equal(titleHasStateSuffix(undefined), false);
	});
});

describe('contactLooksLikeBusinessEntity — business-vs-person detector', () => {
	test('generated venue/category rows have no person name and qualify', () => {
		assert.equal(
			contactLooksLikeBusinessEntity(
				stub(1, {
					title: 'Restaurants Pennsylvania',
					firstName: null,
					lastName: null,
					company: 'The Bar at 1720',
				})
			),
			true
		);
	});

	test('chef/manager people rows are not business-entity rows even with generated category title', () => {
		assert.equal(
			contactLooksLikeBusinessEntity(
				stub(2, {
					title: 'Restaurants New York',
					firstName: 'Aimee',
					lastName: 'Follette',
					company: 'Sun In Bloom',
					headline: 'Founder, CEO, and Executive Chef at Sun In Bloom',
				})
			),
			false
		);
	});
});

describe('distributeAcrossBuckets — canonical title bonus', () => {
	test('canonical "<Prefix> <State>" titles surface ahead of non-canonical with equal data', () => {
		const canonical: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(i, { title: 'Coffee Shops PA' })
		);
		const dynamic: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, { title: 'Head Barista at a coffee shop' })
		);
		// Single-bucket scenario: same coords for everyone so we test pure
		// intra-bucket ordering.
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...canonical, ...dynamic].map((c) => ({ ...c, ...sameCoords }));

		const picked = distributeAcrossBuckets(candidates, 5, null, 1000);
		// All five should be canonical (state-suffix bonus elevates them above
		// equivalent-quality dynamic titles).
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected canonical contact, got id=${(c as any).id} title=${(c as any).title}`
			);
		}
	});

	test('canonical title beats rich dynamic title regardless of data completeness', () => {
		// Empty canonical: title matches state pattern, but no other data.
		const emptyCanonical: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(i, {
				title: 'Coffee Shops PA',
				company: '',
				headline: null,
				website: null,
				email: '',
				photoUrl: null,
			})
		);
		// Rich dynamic: title isn't canonical, but every field populated.
		const richDynamic: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, { title: 'Head Barista at Joe\'s' })
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...emptyCanonical, ...richDynamic].map((c) => ({
			...c,
			...sameCoords,
		}));

		const picked = distributeAcrossBuckets(candidates, 5, null, 1000);
		// Hard rule: canonical always outranks non-canonical regardless of quality.
		// Top 5 should be the empty canonical ones.
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected canonical contact (hard rule), got id=${(c as any).id} title=${(c as any).title}`
			);
		}
	});

	test('long category-like titles ending in a state are not treated as canonical', () => {
		const canonical: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(i, {
				title: 'Restaurants PA',
				company: '',
				headline: null,
				website: null,
				email: '',
				photoUrl: null,
			})
		);
		const longLoose: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, {
				title: 'Restaurants with live music booking opportunities in PA',
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...longLoose, ...canonical].map((c) => ({
			...c,
			...sameCoords,
		}));

		const picked = distributeAcrossBuckets(candidates, 5, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected exact category-state label, got id=${(c as any).id} title=${(c as any).title}`
			);
		}
	});

	test('business-entity canonical rows outrank person rows with the same generated title', () => {
		const businessRows: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(i, {
				title: 'Restaurants New York',
				firstName: null,
				lastName: null,
				company: `Venue ${i}`,
				headline: 'Restaurant and live music venue',
			})
		);
		const personRows: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, {
				title: 'Restaurants New York',
				firstName: `Chef${i}`,
				lastName: `Person${i}`,
				company: `Restaurant Group ${i}`,
				headline: 'Executive Chef at Restaurant Group',
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...personRows, ...businessRows].map((c) => ({
			...c,
			...sameCoords,
		}));

		const picked = distributeAcrossBuckets(candidates, 5, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected business category row, got id=${(c as any).id} firstName=${
					(c as any).firstName
				}`
			);
		}
	});

	test('dynamic titles only fill tail after canonical inventory is exhausted', () => {
		// Fewer canonical than the requested limit — dynamic should fill the rest,
		// but canonical positions come first.
		const canonical: any[] = Array.from({ length: 3 }, (_, i) =>
			stub(i, { title: 'Restaurants TX' })
		);
		const dynamic: any[] = Array.from({ length: 10 }, (_, i) =>
			stub(100 + i, { title: 'Restaurant Owner' })
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...canonical, ...dynamic].map((c) => ({ ...c, ...sameCoords }));

		const picked = distributeAcrossBuckets(candidates, 8, null, 1000);
		// First 3 should be the canonical entries.
		for (let i = 0; i < 3; i++) {
			assert.ok(
				(picked[i] as any).id < 100,
				`position ${i}: expected canonical, got id=${(picked[i] as any).id}`
			);
		}
		// Remaining 5 should be dynamic.
		for (let i = 3; i < 8; i++) {
			assert.ok(
				(picked[i] as any).id >= 100,
				`position ${i}: expected dynamic, got id=${(picked[i] as any).id}`
			);
		}
	});

	test('canonical with moderate data outranks non-canonical with average data', () => {
		// Canonical title + 2 of 5 quality fields = 4 effective.
		const canonicalModerate: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(i, {
				title: 'Wineries CA',
				company: 'Some Winery',
				headline: 'Winery',
				website: null,
				email: '',
				photoUrl: null,
			})
		);
		// Non-canonical title + 3 of 5 quality fields = 3 effective.
		const dynamicAverage: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, {
				title: 'Winemaker',
				company: 'Vineyards Inc',
				headline: 'Head winemaker',
				website: 'https://example.com',
				email: '',
				photoUrl: null,
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...canonicalModerate, ...dynamicAverage].map((c) => ({
			...c,
			...sameCoords,
		}));

		const picked = distributeAcrossBuckets(candidates, 5, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`canonical-moderate (4) should beat dynamic-average (3); got id=${(c as any).id}`
			);
		}
	});
});

describe('interleaveByCategory — no category clumps at the top', () => {
	const CURATED_8 = [
		'Music Venues',
		'Restaurants',
		'Coffee Shops',
		'Music Festivals',
		'Breweries',
		'Distilleries',
		'Wineries',
		'Cideries',
	] as const;

	test('first 8 positions hit all 8 distinct categories (no repeats in top)', () => {
		const pools: CategoryPool[] = CURATED_8.map((k, i) => buildPool(k, 100, i * 1000));
		for (let trial = 0; trial < 50; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			const interleaved = interleaveByCategory(allocated);
			const topKeys = interleaved.slice(0, 8).map((a) => a.categoryKey);
			const unique = new Set(topKeys);
			assert.equal(
				unique.size,
				8,
				`trial ${trial}: top 8 should be 8 distinct categories, got ${JSON.stringify(topKeys)}`
			);
		}
	});

	test('top 16 positions show every category exactly twice', () => {
		const pools: CategoryPool[] = CURATED_8.map((k, i) => buildPool(k, 100, i * 1000));
		for (let trial = 0; trial < 30; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			const interleaved = interleaveByCategory(allocated);
			const top16 = interleaved.slice(0, 16);
			const counts: Record<string, number> = {};
			for (const a of top16) counts[a.categoryKey] = (counts[a.categoryKey] ?? 0) + 1;
			for (const k of CURATED_8) {
				assert.equal(counts[k], 2, `trial ${trial}: ${k} should appear exactly twice in top 16`);
			}
		}
	});

	test('no two adjacent same-category items in the full output', () => {
		const pools: CategoryPool[] = CURATED_8.map((k, i) => buildPool(k, 100, i * 1000));
		for (let trial = 0; trial < 30; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			const interleaved = interleaveByCategory(allocated);
			for (let i = 1; i < interleaved.length; i++) {
				assert.notEqual(
					interleaved[i].categoryKey,
					interleaved[i - 1].categoryKey,
					`trial ${trial}: adjacent same-category at positions ${i - 1},${i}: ${
						interleaved[i].categoryKey
					}`
				);
			}
		}
	});

	test('preserves all allocated items (no drops, no duplicates)', () => {
		const pools: CategoryPool[] = CURATED_8.map((k, i) => buildPool(k, 100, i * 1000));
		const allocated = allocateAcrossCategories(pools, 50);
		const interleaved = interleaveByCategory(allocated);
		assert.equal(interleaved.length, allocated.length);
		const ids = new Set(interleaved.map((a) => a.contact.id));
		assert.equal(ids.size, allocated.length, 'no duplicate ids');
	});

	test('different runs produce different orderings (round shuffle varies sequence)', () => {
		const pools: CategoryPool[] = CURATED_8.map((k, i) => buildPool(k, 100, i * 1000));
		const seqs = new Set<string>();
		for (let trial = 0; trial < 20; trial++) {
			const allocated = allocateAcrossCategories(pools, 50);
			const interleaved = interleaveByCategory(allocated);
			seqs.add(interleaved.map((a) => a.categoryKey).join('|'));
		}
		assert.ok(seqs.size > 15, `expected high sequence variation, got ${seqs.size} unique`);
	});

	test('handles uneven pools — top still mixes all available categories', () => {
		// Cideries=2, others=100 (mirrors a sparse category in user's region).
		const pools: CategoryPool[] = CURATED_8.map((k, i) =>
			buildPool(k, k === 'Cideries' ? 2 : 100, i * 5000)
		);
		const allocated = allocateAcrossCategories(pools, 50);
		const interleaved = interleaveByCategory(allocated);

		// Top 8 should still try to represent everything available.
		const top8 = interleaved.slice(0, 8).map((a) => a.categoryKey);
		const unique = new Set(top8);
		assert.equal(unique.size, 8, `top 8 should cover all 8 categories: ${JSON.stringify(top8)}`);
	});

	test('empty input → empty output', () => {
		assert.deepEqual(interleaveByCategory([]), []);
	});
});

describe('distributeAcrossBuckets — geographic spread within a category', () => {
	const pa = { lat: 40, lon: -75 };

	test('contacts clustered in one city + scattered region → spread, not pile', () => {
		const cluster: any[] = Array.from({ length: 80 }, (_, i) =>
			stub(i, { latitude: 40.0 + i * 0.001, longitude: -75.0 + i * 0.001 })
		);
		const scattered: any[] = Array.from({ length: 20 }, (_, i) =>
			stub(1000 + i, { latitude: 40 + i * 0.5, longitude: -75 + i * 0.4 })
		);
		const candidates = [...cluster, ...scattered];

		// Run many trials — random tie-break inside buckets means we shouldn't
		// always grab the same cluster members, and the round-robin across cells
		// should actively pull scattered points in.
		const scatteredIds = new Set(scattered.map((c) => c.id));
		let trialsWithScatteredHits = 0;
		for (let t = 0; t < 30; t++) {
			const picked = distributeAcrossBuckets(candidates, 20, pa, 250);
			assert.equal(picked.length, 20);
			if (picked.some((c: any) => scatteredIds.has(c.id))) trialsWithScatteredHits++;
		}
		assert.ok(
			trialsWithScatteredHits >= 28,
			`scattered points should appear in nearly every trial, hit only ${trialsWithScatteredHits}/30`
		);
	});

	test('candidates with no coordinates → still bucketed by state, no crash', () => {
		const noCoords: any[] = Array.from({ length: 30 }, (_, i) =>
			stub(i, { latitude: null, longitude: null, state: i % 2 === 0 ? 'CA' : 'PA' })
		);
		const picked = distributeAcrossBuckets(noCoords, 20, null, null);
		assert.equal(picked.length, 20);
		const states = new Set(picked.map((c: any) => c.state));
		assert.equal(states.size, 2, 'should pull from both states via state buckets');
	});

	test('quality tier surfaces well-formed contacts first', () => {
		const candidates: any[] = [
			...Array.from({ length: 5 }, (_, i) =>
				stub(i, {
					company: '',
					headline: null,
					website: null,
					email: '',
					photoUrl: null,
				})
			),
			...Array.from({ length: 5 }, (_, i) => stub(100 + i)),
		];
		// Single bucket so we test pure intra-bucket sort.
		const picked = distributeAcrossBuckets(candidates, 5, null, 1000);
		// All five chosen should be the high-quality (id ≥ 100) ones.
		for (const c of picked) {
			assert.ok((c as any).id >= 100, `expected high-quality contact, got id=${(c as any).id}`);
		}
	});
});

describe('liveMusicSignalScore — vocabulary detection', () => {
	test('returns 0 for a contact with no music-related text anywhere', () => {
		const c = stub(1, {
			title: 'Restaurants PA',
			headline: 'Italian restaurant',
			metadata: 'Family-owned trattoria, open lunch and dinner.',
			companyKeywords: ['italian', 'pasta', 'wine'],
			companyIndustry: 'food and beverage',
			companyType: 'restaurant',
		});
		assert.equal(liveMusicSignalScore(c), 0);
	});

	test('strong term in metadata scores ≥ 6', () => {
		const c = stub(1, {
			title: 'Restaurants PA',
			metadata: 'Cozy restaurant with live music every Friday and Saturday night.',
		});
		assert.ok(liveMusicSignalScore(c) >= 6, `expected ≥6, got ${liveMusicSignalScore(c)}`);
	});

	test('show-time language in metadata adds schedule bonus on top of the strong term', () => {
		const noTimes = stub(1, {
			title: 'Restaurants PA',
			metadata: 'We host live music on weekends.',
		});
		const withTimes = stub(2, {
			title: 'Restaurants PA',
			metadata: 'Live music every Friday, sets at 7pm and 10pm — full menu until midnight.',
		});
		assert.ok(
			liveMusicSignalScore(withTimes) > liveMusicSignalScore(noTimes),
			`expected schedule bonus to apply: noTimes=${liveMusicSignalScore(
				noTimes
			)} withTimes=${liveMusicSignalScore(withTimes)}`
		);
	});

	test('multiple strong terms across multiple fields stack', () => {
		const single = stub(1, {
			title: 'Restaurants PA',
			metadata: 'Live music on weekends.',
		});
		const multi = stub(2, {
			title: 'Restaurants PA',
			headline: 'Restaurant and music venue',
			metadata: 'Live music every Friday.',
			companyKeywords: ['concert hall', 'live entertainment'],
		});
		assert.ok(
			liveMusicSignalScore(multi) > liveMusicSignalScore(single),
			`multi-field hits should stack: single=${liveMusicSignalScore(
				single
			)} multi=${liveMusicSignalScore(multi)}`
		);
	});

	test('weak term alone scores positive but small', () => {
		const c = stub(1, {
			title: 'Restaurants PA',
			metadata: 'Beer garden with a stage in the back.',
		});
		const score = liveMusicSignalScore(c);
		assert.ok(score > 0 && score < 6, `weak-only should score in (0, 6), got ${score}`);
	});

	test('caps at 50 even with extreme keyword density', () => {
		const c = stub(1, {
			title: 'Music Venues PA',
			headline: 'Live music venue and concert hall',
			metadata:
				'Live music every night with concerts, gigs, jazz, blues, bands, performances, shows, set times at 7pm, 9pm, 11pm. Touring acts, performing arts, open mic.',
			companyKeywords: [
				'live music',
				'concert venue',
				'music hall',
				'live performance',
				'live entertainment',
				'live shows',
				'live acts',
				'live bands',
			],
			companyIndustry: 'live music',
			companyType: 'concert venue',
		});
		assert.ok(liveMusicSignalScore(c) <= 50, `expected ≤50 cap, got ${liveMusicSignalScore(c)}`);
	});

	test('null/undefined fields are safe', () => {
		const c = stub(1, {
			title: null,
			headline: null,
			metadata: null,
			company: null,
			companyKeywords: null,
			companyIndustry: null,
			companyType: null,
		});
		assert.equal(liveMusicSignalScore(c), 0);
	});
});

describe('distributeAcrossBuckets — live music tier', () => {
	test('within the same canonical category, live-music rows surface above non-music rows', () => {
		const musicCanonical: any[] = Array.from({ length: 3 }, (_, i) =>
			stub(i, {
				title: 'Restaurants PA',
				company: `Music Restaurant ${i}`,
				headline: 'Restaurant with live music every weekend',
				metadata: 'Live music every Friday and Saturday night, sets at 8pm and 10pm.',
			})
		);
		const plainCanonical: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, {
				title: 'Restaurants PA',
				company: `Plain Restaurant ${i}`,
				headline: 'Family-owned trattoria',
				metadata: 'Italian-American cuisine, open for lunch and dinner.',
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...plainCanonical, ...musicCanonical].map((c) => ({
			...c,
			...sameCoords,
		}));

		// Top 3 picks should all be music-flagged canonical rows.
		const picked = distributeAcrossBuckets(candidates, 3, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected music-flagged canonical row in top 3, got id=${(c as any).id} headline=${
					(c as any).headline
				}`
			);
		}
	});

	test('non-canonical music row does NOT outrank canonical non-music row in the same category', () => {
		// Canonical without music signal.
		const canonicalNoMusic: any[] = Array.from({ length: 3 }, (_, i) =>
			stub(i, {
				title: 'Restaurants PA',
				company: `Plain Restaurant ${i}`,
				headline: 'Family restaurant',
				metadata: null,
			})
		);
		// Non-canonical (loose) row with strong music signal.
		const looseWithMusic: any[] = Array.from({ length: 3 }, (_, i) =>
			stub(100 + i, {
				title: 'Restaurants with live music in PA',
				company: `Music Restaurant ${i}`,
				headline: 'Live music venue and restaurant',
				metadata:
					'Live music every Friday, sets at 8pm and 10pm. Concert hall vibes.',
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...looseWithMusic, ...canonicalNoMusic].map((c) => ({
			...c,
			...sameCoords,
		}));

		// Even with strong music signal, loose rows must still rank below canonical
		// rows of the same category — CANONICAL_TIER (100k) > LIVE_MUSIC_TIER max
		// (50 * 1000 = 50k). This preserves the canonical-first ordering rule.
		const picked = distributeAcrossBuckets(candidates, 3, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected canonical row to lead even without music signal, got id=${(c as any).id}`
			);
		}
	});

	test('among non-canonical rows, live-music rows surface above non-music rows', () => {
		const looseWithMusic: any[] = Array.from({ length: 3 }, (_, i) =>
			stub(i, {
				title: 'Restaurant Owner',
				company: `Live Music Spot ${i}`,
				headline: 'Live music venue',
				metadata: 'Live music every Friday and Saturday.',
			})
		);
		const looseNoMusic: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, {
				title: 'Restaurant Owner',
				company: `Plain Spot ${i}`,
				headline: 'Restaurant owner',
				metadata: null,
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...looseNoMusic, ...looseWithMusic].map((c) => ({
			...c,
			...sameCoords,
		}));

		const picked = distributeAcrossBuckets(candidates, 3, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`among non-canonical rows, expected music-flagged on top, got id=${(c as any).id}`
			);
		}
	});

	test('live-music boost works on metadata-only signal (e.g. a Brewery that hosts shows)', () => {
		const breweryWithMusic: any[] = Array.from({ length: 2 }, (_, i) =>
			stub(i, {
				title: 'Breweries PA',
				company: `Music Brewery ${i}`,
				headline: 'Craft brewery',
				metadata:
					'Live music every Thursday and Saturday, sets at 7pm and 9pm. Open mic Wednesdays.',
			})
		);
		const breweryNoMusic: any[] = Array.from({ length: 5 }, (_, i) =>
			stub(100 + i, {
				title: 'Breweries PA',
				company: `Plain Brewery ${i}`,
				headline: 'Craft brewery',
				metadata: 'Six rotating taps, kitchen open until 10pm.',
			})
		);
		const sameCoords = { latitude: 40.0, longitude: -75.0 };
		const candidates = [...breweryNoMusic, ...breweryWithMusic].map((c) => ({
			...c,
			...sameCoords,
		}));

		const picked = distributeAcrossBuckets(candidates, 2, null, 1000);
		for (const c of picked) {
			assert.ok(
				(c as any).id < 100,
				`expected music-hosting brewery on top, got id=${(c as any).id} metadata=${
					(c as any).metadata
				}`
			);
		}
	});

	test('category balance is preserved when live-music boost is applied across categories', () => {
		// Two categories, one with heavy music signal everywhere, one with none.
		// The cross-category allocation must still split slots evenly — the music
		// boost is a within-bucket signal, not a category-share signal.
		const musicHeavyCategory: any[] = Array.from({ length: 50 }, (_, i) =>
			stub(i, {
				title: 'Music Venues PA',
				company: `Venue ${i}`,
				headline: 'Live music every night',
				metadata: 'Live music, concerts, gigs, set times at 8pm and 10pm.',
			})
		);
		const musicLightCategory: any[] = Array.from({ length: 50 }, (_, i) =>
			stub(1000 + i, {
				title: 'Wineries PA',
				company: `Winery ${i}`,
				headline: 'Estate winery',
				metadata: 'Tastings by appointment. Vineyard tours on weekends.',
			})
		);
		const pools: CategoryPool[] = [
			{
				key: 'Music Venues',
				label: 'music venues',
				contacts: musicHeavyCategory,
				radiusUsed: 250,
			},
			{
				key: 'Wineries',
				label: 'wineries',
				contacts: musicLightCategory,
				radiusUsed: 250,
			},
		];
		const allocated = allocateAcrossCategoriesDeterministic(pools, 20);
		const counts = breakdown(allocated);
		assert.equal(counts['Music Venues'], 10, 'each category still gets its even share');
		assert.equal(counts['Wineries'], 10, 'each category still gets its even share');
	});
});
