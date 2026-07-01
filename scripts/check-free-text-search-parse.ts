import assert from 'node:assert/strict';
import { type BookingContactTitlePrefix } from '../src/constants/contactCategories';
import {
	gazetteerPairKey,
	normalizeCityKey,
	parseFreeTextSearchQuery,
	type CityGazetteer,
	type GazetteerEntry,
} from '../src/app/api/contacts/search/parse';
import { SEARCH_REGIONS_LIST } from '../src/constants/searchRegions';
import { US_STATES } from '../src/constants/usStates';
import {
	isNounLedQuery,
	resolveSearchDispatchBranch,
} from '../src/app/api/contacts/search/queryPredicates';

const expectCategory = (query: string, category: BookingContactTitlePrefix): void => {
	const parsed = parseFreeTextSearchQuery(query);
	assert.ok(
		parsed.categories.includes(category),
		`${query} should include category ${category}`
	);
};

const critical = parseFreeTextSearchQuery(
	'Music venues that support emerging artists in Newark, NJ'
);
assert.equal(critical.city?.name, 'Newark');
assert.equal(critical.city?.state, 'NJ');
assert.equal(critical.city?.coordinatePrecision, 'city');
assert.equal(critical.state?.abbr, 'NJ');
assert.deepEqual(critical.categories, ['Music Venues']);
assert.equal(critical.restOfQuery, 'support emerging artists');

const lowercaseCritical = parseFreeTextSearchQuery(
	'music venues that support emerging artists in newark, nj'
);
assert.equal(lowercaseCritical.city?.name, 'Newark');
assert.equal(lowercaseCritical.state?.abbr, 'NJ');

const nashville = parseFreeTextSearchQuery('music venues in Nashville');
assert.equal(nashville.city?.name, 'Nashville');
assert.equal(nashville.city?.state, 'TN');
assert.equal(nashville.state?.abbr ?? null, null);

const nearMe = parseFreeTextSearchQuery('coffee shops near me');
assert.equal(nearMe.state?.abbr ?? null, null);
assert.equal(nearMe.city?.name ?? null, null);
assert.deepEqual(nearMe.categories, ['Coffee Shops']);

const multiCategory = parseFreeTextSearchQuery('wineries or breweries in nj');
assert.equal(multiCategory.state?.abbr, 'NJ');
assert.equal(multiCategory.restOfQuery, '');
assert.ok(multiCategory.categories.includes('Wineries'));
assert.ok(multiCategory.categories.includes('Breweries'));

const categoryConnectorOnly = parseFreeTextSearchQuery('music venues or breweries');
assert.equal(categoryConnectorOnly.state?.abbr ?? null, null);
assert.equal(categoryConnectorOnly.restOfQuery, '');

const portlandComma = parseFreeTextSearchQuery('music venues in Portland, OR');
assert.equal(portlandComma.city?.name, 'Portland');
assert.equal(portlandComma.state?.abbr, 'OR');

const portlandLower = parseFreeTextSearchQuery('music venues in Portland or');
assert.equal(portlandLower.city?.name, 'Portland');
assert.equal(portlandLower.state?.abbr, 'OR');

const uppercaseIndiana = parseFreeTextSearchQuery('music venues in IN');
assert.equal(uppercaseIndiana.state?.abbr, 'IN');

expectCategory('music venues in Newark, NJ', 'Music Venues');

// ---------------------------------------------------------------------------
// Region table invariants
// ---------------------------------------------------------------------------

{
	const stateKeySet = new Set<string>();
	for (const s of US_STATES) {
		stateKeySet.add(s.name.toLowerCase());
		stateKeySet.add(s.abbr.toLowerCase());
	}
	const validAbbrs = new Set([...US_STATES.map((s) => s.abbr), 'DC']);
	const seenAliases = new Set<string>();
	for (const region of SEARCH_REGIONS_LIST) {
		for (const alias of region.aliases) {
			assert.ok(
				!seenAliases.has(alias),
				`region alias "${alias}" duplicated across regions`
			);
			seenAliases.add(alias);
			assert.ok(
				!stateKeySet.has(alias),
				`region alias "${alias}" collides with a state name/abbr`
			);
		}
		for (const abbr of region.stateAbbrs) {
			assert.ok(validAbbrs.has(abbr), `region ${region.key} has unknown state ${abbr}`);
		}
	}
}

// ---------------------------------------------------------------------------
// Region parsing
// ---------------------------------------------------------------------------

const pnw = parseFreeTextSearchQuery('music venues pacific northwest');
assert.equal(pnw.region?.name, 'Pacific Northwest');
assert.deepEqual(pnw.region?.states.map((s) => s.abbr).sort(), ['OR', 'WA']);
assert.ok(pnw.hadExplicitPlace);
assert.deepEqual(pnw.categories, ['Music Venues']);
assert.equal(pnw.restOfQuery, '');

const pnwAbbr = parseFreeTextSearchQuery('breweries in the pnw');
assert.equal(pnwAbbr.region?.name, 'Pacific Northwest');

const northeast = parseFreeTextSearchQuery('wineries in the northeast');
assert.equal(northeast.region?.name, 'Northeast');
assert.equal(northeast.region?.states.length, 9);

const newEngland = parseFreeTextSearchQuery('new england breweries');
assert.equal(newEngland.region?.name, 'New England');
assert.equal(newEngland.country ?? null, null);

// Directional guard: "northeast ohio" is Ohio, not the Northeast region.
const neOhio = parseFreeTextSearchQuery('music venues northeast ohio');
assert.equal(neOhio.region ?? null, null);
assert.equal(neOhio.state?.abbr, 'OH');

const swFlorida = parseFreeTextSearchQuery('venues in southwest florida');
assert.equal(swFlorida.region ?? null, null);
assert.equal(swFlorida.state?.abbr, 'FL');

// Continuation guard: "the south carolina coast" is South Carolina.
const scCoast = parseFreeTextSearchQuery('wedding venues on the south carolina coast');
assert.equal(scCoast.region ?? null, null);
assert.equal(scCoast.state?.abbr, 'SC');

// "southern california" resolves as the SoCal region, not bare California.
const socal = parseFreeTextSearchQuery('music venues southern california');
assert.equal(socal.region?.name, 'Southern California');
assert.equal(socal.region?.scope, 'metro');
assert.equal(socal.state ?? null, null);

// Acronym uppercase gate: bare lowercase "dmv" is not a region; "the dmv" is.
const dmvLower = parseFreeTextSearchQuery('dmv venues');
assert.equal(dmvLower.region ?? null, null);
const dmvUpper = parseFreeTextSearchQuery('DMV venues');
assert.equal(dmvUpper.region?.name, 'DMV');
const theDmv = parseFreeTextSearchQuery('venues in the dmv');
assert.equal(theDmv.region?.name, 'DMV');

// Regions must not regress existing place handling.
const washingtonState = parseFreeTextSearchQuery('venues in washington');
assert.equal(washingtonState.state?.abbr, 'WA');
assert.equal(washingtonState.region ?? null, null);
const washingtonDc = parseFreeTextSearchQuery('venues in washington dc');
assert.equal(washingtonDc.city?.name, 'Washington');

// ---------------------------------------------------------------------------
// Gazetteer matching (fixture-injected — no DB)
// ---------------------------------------------------------------------------

const fixtureEntries: GazetteerEntry[] = [
	{ name: 'Willimantic', stateAbbr: 'CT', lat: 41.7106, lon: -72.2081, count: 6 },
	{ name: 'Buffalo', stateAbbr: 'NY', lat: 42.8864, lon: -78.8784, count: 187 },
	{ name: 'Buffalo', stateAbbr: 'WY', lat: 44.3483, lon: -106.6989, count: 4 },
	{ name: 'St Johnsbury', stateAbbr: 'VT', lat: 44.4192, lon: -72.0151, count: 8 },
	{ name: 'Reading', stateAbbr: 'PA', lat: 40.3356, lon: -75.9269, count: 30 },
	{ name: 'Greenville', stateAbbr: 'SC', lat: 34.8526, lon: -82.394, count: 20 },
	{ name: 'Greenville', stateAbbr: 'NC', lat: 35.6127, lon: -77.3664, count: 18 },
	{ name: 'Springfield', stateAbbr: 'MO', lat: 37.2089, lon: -93.2923, count: 18 },
	{ name: 'Midwest City', stateAbbr: 'OK', lat: 35.4495, lon: -97.3967, count: 5 },
	{ name: 'Bozeman', stateAbbr: 'MT', lat: 45.677, lon: -111.0429, count: 25 },
];
const fixtureGazetteer: CityGazetteer = (() => {
	const byCityState = new Map<string, GazetteerEntry>();
	const byName = new Map<string, GazetteerEntry[]>();
	let maxNameTokens = 1;
	for (const entry of fixtureEntries) {
		const key = normalizeCityKey(entry.name);
		byCityState.set(gazetteerPairKey(key, entry.stateAbbr), entry);
		const list = byName.get(key) ?? [];
		list.push(entry);
		byName.set(key, list);
		maxNameTokens = Math.max(maxNameTokens, key.split(' ').length);
	}
	for (const list of byName.values()) list.sort((a, b) => b.count - a.count);
	return { byCityState, byName, maxNameTokens };
})();

const opts = { gazetteer: fixtureGazetteer };

// Obscure town with explicit state, all forms.
for (const q of [
	'music venues in Willimantic, CT',
	'music venues willimantic ct',
	'venues in Willimantic Connecticut',
]) {
	const parsed = parseFreeTextSearchQuery(q, opts);
	assert.equal(parsed.city?.name, 'Willimantic', q);
	assert.equal(parsed.city?.coordinatePrecision, 'city', q);
	assert.equal(parsed.state?.abbr, 'CT', q);
}

// Non-adjacent state + town still resolves via the state-restricted probe.
const nonAdjacent = parseFreeTextSearchQuery('connecticut venues in willimantic', opts);
assert.equal(nonAdjacent.city?.name, 'Willimantic');

// Curated-list city (state-centroid precision today) upgrades to the
// gazetteer median.
const buffalo = parseFreeTextSearchQuery('music venues in Buffalo, NY', opts);
assert.equal(buffalo.city?.coordinatePrecision, 'city');
assert.ok(Math.abs((buffalo.city?.lat ?? 0) - 42.8864) < 0.01);

// Seeded cities keep their hand-picked coords (never overwritten).
const hartford = parseFreeTextSearchQuery('Hartford CT', opts);
assert.equal(hartford.city?.coordinatePrecision, 'city');
assert.ok(Math.abs((hartford.city?.lat ?? 0) - 41.7637) < 0.01);
assert.ok(hartford.hadExplicitPlace);

// Bare-name guards: dominance accepts Buffalo→NY, splits stay neutral,
// stoplisted common words never match.
const bareBuffalo = parseFreeTextSearchQuery('venues in buffalo', opts);
assert.equal(bareBuffalo.city?.name, 'Buffalo');
assert.equal(bareBuffalo.city?.state, 'NY');
const bareGreenville = parseFreeTextSearchQuery('venues in greenville', opts);
assert.equal(bareGreenville.city ?? null, null);
const poetryReading = parseFreeTextSearchQuery('poetry reading venues', opts);
assert.equal(poetryReading.city ?? null, null);
const bareBozeman = parseFreeTextSearchQuery('venues in bozeman', opts);
assert.equal(bareBozeman.city?.name, 'Bozeman');
// Curated-list disambiguation is the existing contract ("springfield" → MO
// via CITY_LOCATIONS_LIST order) and upgrades to gazetteer city precision.
const bareSpringfield = parseFreeTextSearchQuery('venues in springfield', opts);
assert.equal(bareSpringfield.city?.state, 'MO');
assert.equal(bareSpringfield.city?.coordinatePrecision, 'city');

// st/saint normalization: both spellings hit the same gazetteer key.
const saintJohnsbury = parseFreeTextSearchQuery('venues in saint johnsbury vt', opts);
assert.equal(saintJohnsbury.city?.name, 'St Johnsbury');
const stJohnsbury = parseFreeTextSearchQuery('venues in st. johnsbury, vt', opts);
assert.equal(stJohnsbury.city?.name, 'St Johnsbury');

// Direction-named towns beat region detection.
const midwestCity = parseFreeTextSearchQuery('venues in midwest city ok', opts);
assert.equal(midwestCity.city?.name, 'Midwest City');
assert.equal(midwestCity.region ?? null, null);

// Without the gazetteer, parsing degrades to the static dictionaries.
const noGazetteer = parseFreeTextSearchQuery('music venues willimantic ct');
assert.equal(noGazetteer.city ?? null, null);
assert.equal(noGazetteer.state?.abbr, 'CT');

// ---------------------------------------------------------------------------
// General-query battery: professions / org types must stay category-free and
// route to the hybrid branch — the parser must never hijack them into a
// curated path. Dispatch is computed via queryPredicates (same predicates the
// route uses).
// ---------------------------------------------------------------------------

const expectGeneralQuery = (
	query: string,
	expected: { rest?: string; nounLed?: boolean } = {}
): void => {
	const parsed = parseFreeTextSearchQuery(query);
	assert.deepEqual(parsed.categories, [], `${query} must stay category-free`);
	assert.equal(
		resolveSearchDispatchBranch(parsed),
		'hybrid',
		`${query} must route to the hybrid branch`
	);
	if (expected.rest !== undefined) {
		assert.equal(parsed.restOfQuery, expected.rest, `${query} restOfQuery`);
	}
	if (expected.nounLed !== undefined) {
		assert.equal(
			isNounLedQuery(parsed),
			expected.nounLed,
			`${query} isNounLedQuery`
		);
	}
};

expectGeneralQuery('professor of music', {
	// "of" survives filler stripping — 3 substantive tokens → NOT noun-led,
	// which is why the person-target probe historically never ran for this.
	rest: 'professor of music',
	nounLed: false,
});
expectGeneralQuery('music professor', { rest: 'music professor', nounLed: true });
expectGeneralQuery('professor of history', {
	rest: 'professor of history',
	nounLed: false,
});
expectGeneralQuery('professor', { rest: 'professor', nounLed: true });
expectGeneralQuery('plumber', { rest: 'plumber', nounLed: true });
expectGeneralQuery('janitor', { rest: 'janitor', nounLed: true });
expectGeneralQuery('record label', { rest: 'record label', nounLed: true });
expectGeneralQuery('music magazine', { rest: 'music magazine', nounLed: true });
expectGeneralQuery('magazine editor', { rest: 'magazine editor', nounLed: true });
expectGeneralQuery('booking agent', { rest: 'booking agent', nounLed: true });
expectGeneralQuery('talent buyer', { rest: 'talent buyer', nounLed: true });
expectGeneralQuery('music supervisor', { rest: 'music supervisor', nounLed: true });
// Wedding phrases in CATEGORY_VARIANTS are all two-word ("wedding planners",
// "wedding venues") — "wedding photographer" must never match them.
expectGeneralQuery('wedding photographer', {
	rest: 'wedding photographer',
	nounLed: true,
});

// Filler stripping is whole-token: "A&R" survives (a \b regex would strip the
// leading A as an article — the `&` is a word boundary), and hyphenated
// compounds like "rock-and-roll" keep their connectives.
{
	const anr = parseFreeTextSearchQuery('A&R');
	assert.deepEqual(anr.categories, []);
	assert.equal(resolveSearchDispatchBranch(anr), 'hybrid');
	assert.equal(anr.restOfQuery, 'A&R');

	const rockAndRoll = parseFreeTextSearchQuery('rock-and-roll venues');
	assert.equal(rockAndRoll.restOfQuery, 'rock-and-roll');
}

// Place-bearing general queries: the place parses, the profession/org rest
// survives, and the branch stays hybrid.
{
	const laLabels = parseFreeTextSearchQuery('record labels in los angeles');
	assert.equal(laLabels.city?.name, 'Los Angeles');
	assert.equal(laLabels.restOfQuery, 'record labels');
	assert.deepEqual(laLabels.categories, []);
	assert.equal(resolveSearchDispatchBranch(laLabels), 'hybrid');

	const sfManagers = parseFreeTextSearchQuery('marketing manager san francisco');
	assert.equal(sfManagers.city?.name, 'San Francisco');
	assert.equal(sfManagers.restOfQuery, 'marketing manager');
	assert.equal(resolveSearchDispatchBranch(sfManagers), 'hybrid');
}

// Category-noun traps: a trailing category noun attaches a category (known
// behavior) but the non-vague rest keeps these on the HYBRID branch — they
// must never fully hijack into the curated tray. (The category-multiplier
// distortion these carry is addressed at the intent layer, not the parser.)
{
	const roaster = parseFreeTextSearchQuery('coffee roaster');
	assert.deepEqual(roaster.categories, ['Coffee Shops']);
	assert.equal(roaster.restOfQuery, 'roaster');
	assert.equal(resolveSearchDispatchBranch(roaster), 'hybrid');

	const restaurantManager = parseFreeTextSearchQuery('restaurant manager');
	assert.deepEqual(restaurantManager.categories, ['Restaurants']);
	assert.equal(restaurantManager.restOfQuery, 'manager');
	assert.equal(resolveSearchDispatchBranch(restaurantManager), 'hybrid');
}

// Bare category nouns keep their intended curated default.
assert.equal(
	resolveSearchDispatchBranch(parseFreeTextSearchQuery('coffee')),
	'curated-category'
);
assert.equal(
	resolveSearchDispatchBranch(parseFreeTextSearchQuery('festival')),
	'curated-category'
);

// Regression pins: the curated/place/local-business branches must keep
// winning dispatch for their queries (the hybrid-path overhaul never runs).
assert.equal(
	resolveSearchDispatchBranch(parseFreeTextSearchQuery('music venues nashville')),
	'curated-category'
);
assert.equal(
	resolveSearchDispatchBranch(parseFreeTextSearchQuery('bars in austin')),
	'local-business'
);
assert.equal(
	resolveSearchDispatchBranch(parseFreeTextSearchQuery('austin')),
	'place-only'
);

// ---------------------------------------------------------------------------
// Hero-bar query format: the dashboard's why/what/where form composes
// "[Why] What (Where)" (no "in", parens included). The place matchers consume
// the span and the token-level filler strip drops the orphaned parens; the
// legacy-route delegation additionally pre-normalizes before calling the
// engine.
// ---------------------------------------------------------------------------

{
	// Orphaned parens left by place stripping are dropped from restOfQuery.
	const parenQuery = parseFreeTextSearchQuery('record label (Austin, TX)');
	assert.equal(parenQuery.city?.name, 'Austin');
	assert.equal(parenQuery.state?.abbr, 'TX');
	assert.equal(parenQuery.restOfQuery, 'record label');

	// The demo/Where-only default query. parse.ts recognizes NO category here
	// ("wine"/"beer"/"spirits" match nothing in CATEGORY_VARIANTS) — which is
	// exactly why the PR-7 legacy-delegation gate must use the LEGACY route's
	// own detectors (isWineBeerSpiritsQuery) and never delegate this shape.
	const wbs = parseFreeTextSearchQuery('[Booking] Wine, Beer, and Spirits (California)');
	assert.deepEqual(wbs.categories, []);
	assert.equal(wbs.state?.abbr, 'CA');
}

console.log('free-text parser checks passed');
