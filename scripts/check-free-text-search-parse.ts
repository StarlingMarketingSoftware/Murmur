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

console.log('free-text parser checks passed');
