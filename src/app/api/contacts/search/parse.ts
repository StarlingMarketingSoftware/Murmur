import { type BookingContactTitlePrefix } from '@/constants/contactCategories';
import { US_STATES } from '@/constants/usStates';

// Small known-city dictionary for the most common booking destinations. We
// don't try to be comprehensive — anything we miss falls through to the
// lexical retriever's `match` on the `city` field. The dictionary exists so
// "music venues in nashville" can resolve a center point and apply a strong
// locality multiplier.
const KNOWN_CITIES: { name: string; state: string; lat: number; lon: number }[] = [
	{ name: 'New York', state: 'NY', lat: 40.7128, lon: -74.006 },
	{ name: 'NYC', state: 'NY', lat: 40.7128, lon: -74.006 },
	{ name: 'Brooklyn', state: 'NY', lat: 40.6782, lon: -73.9442 },
	{ name: 'Manhattan', state: 'NY', lat: 40.7831, lon: -73.9712 },
	{ name: 'Queens', state: 'NY', lat: 40.7282, lon: -73.7949 },
	{ name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
	{ name: 'LA', state: 'CA', lat: 34.0522, lon: -118.2437 },
	{ name: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194 },
	{ name: 'SF', state: 'CA', lat: 37.7749, lon: -122.4194 },
	{ name: 'Oakland', state: 'CA', lat: 37.8044, lon: -122.2712 },
	{ name: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611 },
	{ name: 'Sacramento', state: 'CA', lat: 38.5816, lon: -121.4944 },
	{ name: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298 },
	{ name: 'Austin', state: 'TX', lat: 30.2672, lon: -97.7431 },
	{ name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 },
	{ name: 'Dallas', state: 'TX', lat: 32.7767, lon: -96.797 },
	{ name: 'San Antonio', state: 'TX', lat: 29.4241, lon: -98.4936 },
	{ name: 'Fort Worth', state: 'TX', lat: 32.7555, lon: -97.3308 },
	{ name: 'Nashville', state: 'TN', lat: 36.1627, lon: -86.7816 },
	{ name: 'Memphis', state: 'TN', lat: 35.1495, lon: -90.049 },
	{ name: 'Knoxville', state: 'TN', lat: 35.9606, lon: -83.9207 },
	{ name: 'Atlanta', state: 'GA', lat: 33.749, lon: -84.388 },
	{ name: 'Savannah', state: 'GA', lat: 32.0809, lon: -81.0912 },
	{ name: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589 },
	{ name: 'Cambridge', state: 'MA', lat: 42.3736, lon: -71.1097 },
	{ name: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
	{ name: 'Portland', state: 'OR', lat: 45.5152, lon: -122.6784 },
	{ name: 'Denver', state: 'CO', lat: 39.7392, lon: -104.9903 },
	{ name: 'Boulder', state: 'CO', lat: 40.015, lon: -105.2705 },
	{ name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
	{ name: 'Orlando', state: 'FL', lat: 28.5383, lon: -81.3792 },
	{ name: 'Tampa', state: 'FL', lat: 27.9506, lon: -82.4572 },
	{ name: 'Jacksonville', state: 'FL', lat: 30.3322, lon: -81.6557 },
	{ name: 'New Orleans', state: 'LA', lat: 29.9511, lon: -90.0715 },
	{ name: 'NOLA', state: 'LA', lat: 29.9511, lon: -90.0715 },
	{ name: 'Philadelphia', state: 'PA', lat: 39.9526, lon: -75.1652 },
	{ name: 'Philly', state: 'PA', lat: 39.9526, lon: -75.1652 },
	{ name: 'Pittsburgh', state: 'PA', lat: 40.4406, lon: -79.9959 },
	{ name: 'Phoenix', state: 'AZ', lat: 33.4484, lon: -112.074 },
	{ name: 'Tucson', state: 'AZ', lat: 32.2226, lon: -110.9747 },
	{ name: 'Las Vegas', state: 'NV', lat: 36.1699, lon: -115.1398 },
	{ name: 'Vegas', state: 'NV', lat: 36.1699, lon: -115.1398 },
	{ name: 'Reno', state: 'NV', lat: 39.5296, lon: -119.8138 },
	{ name: 'Detroit', state: 'MI', lat: 42.3314, lon: -83.0458 },
	{ name: 'Ann Arbor', state: 'MI', lat: 42.2808, lon: -83.743 },
	{ name: 'Grand Rapids', state: 'MI', lat: 42.9634, lon: -85.6681 },
	{ name: 'Minneapolis', state: 'MN', lat: 44.9778, lon: -93.265 },
	{ name: 'Saint Paul', state: 'MN', lat: 44.9537, lon: -93.09 },
	{ name: 'St Paul', state: 'MN', lat: 44.9537, lon: -93.09 },
	{ name: 'Milwaukee', state: 'WI', lat: 43.0389, lon: -87.9065 },
	{ name: 'Madison', state: 'WI', lat: 43.0731, lon: -89.4012 },
	{ name: 'Charlotte', state: 'NC', lat: 35.2271, lon: -80.8431 },
	{ name: 'Raleigh', state: 'NC', lat: 35.7796, lon: -78.6382 },
	{ name: 'Asheville', state: 'NC', lat: 35.5951, lon: -82.5515 },
	{ name: 'Durham', state: 'NC', lat: 35.994, lon: -78.8986 },
	{ name: 'Charleston', state: 'SC', lat: 32.7765, lon: -79.9311 },
	{ name: 'Columbia', state: 'SC', lat: 34.0007, lon: -81.0348 },
	{ name: 'Richmond', state: 'VA', lat: 37.5407, lon: -77.436 },
	{ name: 'Norfolk', state: 'VA', lat: 36.8508, lon: -76.2859 },
	{ name: 'Virginia Beach', state: 'VA', lat: 36.8529, lon: -75.978 },
	{ name: 'Washington', state: 'DC', lat: 38.9072, lon: -77.0369 },
	{ name: 'DC', state: 'DC', lat: 38.9072, lon: -77.0369 },
	{ name: 'Baltimore', state: 'MD', lat: 39.2904, lon: -76.6122 },
	{ name: 'Cleveland', state: 'OH', lat: 41.4993, lon: -81.6944 },
	{ name: 'Cincinnati', state: 'OH', lat: 39.1031, lon: -84.512 },
	{ name: 'Columbus', state: 'OH', lat: 39.9612, lon: -82.9988 },
	{ name: 'Indianapolis', state: 'IN', lat: 39.7684, lon: -86.1581 },
	{ name: 'Bloomington', state: 'IN', lat: 39.1653, lon: -86.5264 },
	{ name: 'Louisville', state: 'KY', lat: 38.2527, lon: -85.7585 },
	{ name: 'Lexington', state: 'KY', lat: 38.0406, lon: -84.5037 },
	{ name: 'St Louis', state: 'MO', lat: 38.627, lon: -90.1994 },
	{ name: 'Saint Louis', state: 'MO', lat: 38.627, lon: -90.1994 },
	{ name: 'Kansas City', state: 'MO', lat: 39.0997, lon: -94.5786 },
	{ name: 'Salt Lake City', state: 'UT', lat: 40.7608, lon: -111.891 },
	{ name: 'SLC', state: 'UT', lat: 40.7608, lon: -111.891 },
	{ name: 'Albuquerque', state: 'NM', lat: 35.0844, lon: -106.6504 },
	{ name: 'Santa Fe', state: 'NM', lat: 35.687, lon: -105.9378 },
	{ name: 'Oklahoma City', state: 'OK', lat: 35.4676, lon: -97.5164 },
	{ name: 'OKC', state: 'OK', lat: 35.4676, lon: -97.5164 },
	{ name: 'Tulsa', state: 'OK', lat: 36.154, lon: -95.9928 },
	{ name: 'Honolulu', state: 'HI', lat: 21.3099, lon: -157.8581 },
	{ name: 'Anchorage', state: 'AK', lat: 61.2181, lon: -149.9003 },
	{ name: 'Burlington', state: 'VT', lat: 44.4759, lon: -73.2121 },
	{ name: 'Providence', state: 'RI', lat: 41.824, lon: -71.4128 },
	{ name: 'Hartford', state: 'CT', lat: 41.7637, lon: -72.6851 },
	{ name: 'New Haven', state: 'CT', lat: 41.3083, lon: -72.9279 },
];

export type ParsedSearchQuery = {
	raw: string;
	categories: BookingContactTitlePrefix[];
	city: { name: string; state: string | null; lat: number; lon: number } | null;
	state: { name: string; abbr: string; lat: number; lon: number } | null;
	country: string | null;
	restOfQuery: string;
	hadExplicitCategory: boolean;
	hadExplicitPlace: boolean;
	mentionsLiveMusic: boolean;
};

const LIVE_MUSIC_DETECTORS: readonly RegExp[] = [
	/\blive\s?music\b/i,
	/\bconcerts?\b/i,
	/\bgigs?\b/i,
	/\bbands?\b/i,
	/\bjazz\b/i,
	/\bblues\b/i,
	/\bopen\s?mic\b/i,
	/\bvenues?\b/i,
	/\bshows?\b/i,
	/\bperforming arts\b/i,
];

const CATEGORY_VARIANTS: { prefix: BookingContactTitlePrefix; phrases: string[] }[] = [
	{ prefix: 'Music Venues', phrases: ['music venues', 'music venue', 'venues', 'venue'] },
	{ prefix: 'Restaurants', phrases: ['restaurants', 'restaurant'] },
	{ prefix: 'Coffee Shops', phrases: ['coffee shops', 'coffee shop', 'coffee', 'cafes', 'cafe', 'café', 'coffeehouse', 'coffeehouses'] },
	{ prefix: 'Music Festivals', phrases: ['music festivals', 'music festival', 'festivals', 'festival'] },
	{ prefix: 'Breweries', phrases: ['breweries', 'brewery', 'brewpub', 'brewpubs', 'taproom', 'taprooms'] },
	{ prefix: 'Distilleries', phrases: ['distilleries', 'distillery'] },
	{ prefix: 'Wineries', phrases: ['wineries', 'winery', 'vineyards', 'vineyard'] },
	{ prefix: 'Cideries', phrases: ['cideries', 'cidery', 'cider house', 'cider houses'] },
	{ prefix: 'Wedding Planners', phrases: ['wedding planners', 'wedding planner', 'wedding coordinators', 'wedding coordinator'] },
	{ prefix: 'Wedding Venues', phrases: ['wedding venues', 'wedding venue'] },
];

// Sorted longest-first so multi-word phrases match before their substrings.
const FLAT_CATEGORY_PHRASES = (() => {
	const flat: { prefix: BookingContactTitlePrefix; phrase: string }[] = [];
	for (const variant of CATEGORY_VARIANTS) {
		for (const phrase of variant.phrases) {
			flat.push({ prefix: variant.prefix, phrase: phrase.toLowerCase() });
		}
	}
	flat.sort((a, b) => b.phrase.length - a.phrase.length);
	return flat;
})();

const STATES_LONGEST_FIRST = [...US_STATES].sort(
	(a, b) => b.name.length - a.name.length
);

const KNOWN_CITIES_LONGEST_FIRST = [...KNOWN_CITIES].sort(
	(a, b) => b.name.length - a.name.length
);

const escapeForRegex = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripPhraseFromQuery = (query: string, phrase: string): string => {
	const re = new RegExp(`\\b${escapeForRegex(phrase)}\\b`, 'gi');
	return query.replace(re, ' ').replace(/\s+/g, ' ').trim();
};

const COUNTRY_DETECTORS: { country: string; patterns: RegExp[] }[] = [
	{ country: 'United States', patterns: [/\busa\b/i, /\bunited states\b/i, /\bu\.s\.?a?\b/i, /\bamerica\b/i] },
	{ country: 'Canada', patterns: [/\bcanada\b/i, /\bcanadian\b/i] },
	{ country: 'United Kingdom', patterns: [/\buk\b/i, /\bunited kingdom\b/i, /\bbritain\b/i, /\benglish?\b/i] },
];

export const parseFreeTextSearchQuery = (rawQuery: string): ParsedSearchQuery => {
	const raw = (rawQuery ?? '').trim();
	let working = ' ' + raw.toLowerCase().replace(/\s+/g, ' ') + ' ';

	const categoriesFound = new Set<BookingContactTitlePrefix>();
	for (const { prefix, phrase } of FLAT_CATEGORY_PHRASES) {
		const re = new RegExp(`\\s${escapeForRegex(phrase)}\\s`, 'i');
		if (re.test(working)) {
			categoriesFound.add(prefix);
			// Strip the phrase so it doesn't leak into restOfQuery or get matched
			// twice for overlapping variants ("music venue" vs "venue").
			working = working.replace(new RegExp(`\\s${escapeForRegex(phrase)}\\s`, 'gi'), ' ');
		}
	}

	let stateMatch: ParsedSearchQuery['state'] = null;
	for (const state of STATES_LONGEST_FIRST) {
		const namePattern = new RegExp(`\\b${escapeForRegex(state.name)}\\b`, 'i');
		if (namePattern.test(working)) {
			stateMatch = {
				name: state.name,
				abbr: state.abbr,
				lat: state.centroid.lat,
				lon: state.centroid.lng,
			};
			working = stripPhraseFromQuery(working, state.name);
			break;
		}
	}
	if (!stateMatch) {
		// Two-letter state abbreviations: only accept when surrounded by spaces or
		// punctuation — never embedded inside a word like "or" inside "Oregon".
		// Walk the largest-first list to keep it deterministic.
		for (const state of US_STATES) {
			const abbrPattern = new RegExp(`(?:^|[\\s,])${state.abbr}(?:[\\s,.!?]|$)`, 'i');
			if (abbrPattern.test(' ' + working + ' ')) {
				stateMatch = {
					name: state.name,
					abbr: state.abbr,
					lat: state.centroid.lat,
					lon: state.centroid.lng,
				};
				working = working.replace(
					new RegExp(`(^|[\\s,])${state.abbr}([\\s,.!?]|$)`, 'gi'),
					'$1$2'
				).replace(/\s+/g, ' ').trim();
				working = ' ' + working + ' ';
				break;
			}
		}
	}

	let cityMatch: ParsedSearchQuery['city'] = null;
	for (const city of KNOWN_CITIES_LONGEST_FIRST) {
		const cityPattern = new RegExp(`\\b${escapeForRegex(city.name)}\\b`, 'i');
		if (cityPattern.test(working)) {
			cityMatch = { name: city.name, state: city.state, lat: city.lat, lon: city.lon };
			working = stripPhraseFromQuery(working, city.name);
			break;
		}
	}

	let country: string | null = null;
	for (const detector of COUNTRY_DETECTORS) {
		for (const pattern of detector.patterns) {
			if (pattern.test(working)) {
				country = detector.country;
				working = working.replace(pattern, ' ');
				break;
			}
		}
		if (country) break;
	}

	// Strip filler "in" / "near" / "around" connectives now that the place
	// candidates are gone. The remaining tokens become `restOfQuery` for the
	// kNN retriever — best when it's the substantive intent ("indie rock with
	// craft beer" rather than "music venues in austin").
	const restOfQuery = working
		.replace(/\b(in|near|around|at|located|within)\b/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	const mentionsLiveMusic = LIVE_MUSIC_DETECTORS.some((re) => re.test(raw));

	return {
		raw,
		categories: [...categoriesFound],
		city: cityMatch,
		state: stateMatch,
		country,
		restOfQuery,
		hadExplicitCategory: categoriesFound.size > 0,
		hadExplicitPlace: cityMatch !== null || stateMatch !== null,
		mentionsLiveMusic,
	};
};
