import prisma from '@/lib/prisma';
import { US_STATES } from '@/constants/usStates';
import {
	gazetteerPairKey,
	normalizeCityKey,
	type CityGazetteer,
	type GazetteerEntry,
} from './parse';

// DB-derived town gazetteer: one aggregate over the contacts table yields the
// median coordinates of every (city, state) pair with enough rows to trust.
// This is what lets the free-text parser resolve towns outside the curated
// dictionary ("Willimantic CT") to true city-precision anchors — coverage
// exactly mirrors where search results can actually exist.

const GAZETTEER_TTL_MS = 6 * 60 * 60 * 1000;
const PAIR_MIN_CONTACTS = 3;
// Pairs whose median sits on their state's centroid are almost certainly
// backfill-poisoned (old geocoding runs wrote state centroids onto rows);
// treating them as city precision would draw a confident 30km circle around
// an arbitrary point.
const STATE_CENTROID_POISON_KM = 2;

type GazetteerRow = {
	city: string;
	state: string;
	n: number;
	lat: number;
	lon: number;
};

const STATE_ABBR_BY_KEY: Map<string, string> = (() => {
	const map = new Map<string, string>();
	for (const state of US_STATES) {
		map.set(state.name.toLowerCase(), state.abbr);
		map.set(state.abbr.toLowerCase(), state.abbr);
	}
	map.set('district of columbia', 'DC');
	map.set('dc', 'DC');
	map.set('washington dc', 'DC');
	// Misspellings observed at volume in production data.
	map.set('flordia', 'FL');
	return map;
})();

const STATE_CENTROID_BY_ABBR: Map<string, { lat: number; lng: number }> = (() => {
	const map = new Map<string, { lat: number; lng: number }>();
	for (const state of US_STATES) map.set(state.abbr, state.centroid);
	map.set('DC', { lat: 38.9072, lng: -77.0369 });
	return map;
})();

// Resolve a raw contact `state` value ("Connecticut", "CT", "Arkansas, USA",
// "Washington, D.C.") to a state abbreviation, or null for non-US values.
const resolveStateAbbr = (rawState: string): string | null => {
	const lc = rawState.toLowerCase().trim();
	if (!lc) return null;
	const direct = STATE_ABBR_BY_KEY.get(lc);
	if (direct) return direct;
	const noPunct = lc.replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
	const punctStripped = STATE_ABBR_BY_KEY.get(noPunct);
	if (punctStripped) return punctStripped;
	const suffixStripped = lc
		.replace(/,?\s*(usa|us|u\.s\.a?\.?|united states( of america)?)$/i, '')
		.replace(/[,\s]+$/, '')
		.trim();
	if (suffixStripped && suffixStripped !== lc) {
		return resolveStateAbbr(suffixStripped);
	}
	return null;
};

const distanceKm = (
	a: { lat: number; lon: number },
	b: { lat: number; lon: number }
): number => {
	const R = 6371;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLon = toRad(b.lon - a.lon);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.sin(dLon / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const titleCaseCity = (cityKey: string): string =>
	cityKey
		.split(' ')
		.map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');

const buildCityGazetteer = async (): Promise<CityGazetteer> => {
	const startedAt = Date.now();
	const rows = await prisma.$queryRaw<GazetteerRow[]>`
		SELECT lower(btrim(city)) AS city,
		       lower(btrim(state)) AS state,
		       count(*)::int AS n,
		       percentile_cont(0.5) WITHIN GROUP (ORDER BY latitude) AS lat,
		       percentile_cont(0.5) WITHIN GROUP (ORDER BY longitude) AS lon
		FROM "Contact"
		WHERE city IS NOT NULL AND btrim(city) <> '' AND city NOT LIKE '%,%'
		  AND state IS NOT NULL AND btrim(state) <> ''
		  AND latitude IS NOT NULL AND longitude IS NOT NULL
		GROUP BY 1, 2
		HAVING count(*) >= ${PAIR_MIN_CONTACTS}
	`;

	// Multiple raw state spellings ("connecticut", "ct", "connecticut, usa")
	// collapse onto one abbreviation: keep the largest single subgroup's
	// median, sum the counts.
	const groups = new Map<
		string,
		{ cityKey: string; stateAbbr: string; total: number; best: GazetteerRow }
	>();
	let droppedState = 0;
	let droppedPoisoned = 0;
	for (const row of rows) {
		const stateAbbr = resolveStateAbbr(row.state);
		if (!stateAbbr) {
			droppedState++;
			continue;
		}
		const cityKey = normalizeCityKey(row.city);
		if (!cityKey) continue;
		const centroid = STATE_CENTROID_BY_ABBR.get(stateAbbr);
		if (
			centroid &&
			distanceKm(
				{ lat: row.lat, lon: row.lon },
				{ lat: centroid.lat, lon: centroid.lng }
			) <= STATE_CENTROID_POISON_KM
		) {
			droppedPoisoned++;
			continue;
		}
		const key = gazetteerPairKey(cityKey, stateAbbr);
		const existing = groups.get(key);
		if (existing) {
			existing.total += row.n;
			if (row.n > existing.best.n) existing.best = row;
		} else {
			groups.set(key, { cityKey, stateAbbr, total: row.n, best: row });
		}
	}

	const byCityState = new Map<string, GazetteerEntry>();
	for (const [key, group] of groups) {
		byCityState.set(key, {
			name: titleCaseCity(group.cityKey),
			stateAbbr: group.stateAbbr,
			lat: group.best.lat,
			lon: group.best.lon,
			count: group.total,
		});
	}

	const byName = new Map<string, GazetteerEntry[]>();
	let maxNameTokens = 1;
	for (const entry of byCityState.values()) {
		const nameKey = normalizeCityKey(entry.name);
		const list = byName.get(nameKey) ?? [];
		list.push(entry);
		byName.set(nameKey, list);
		const tokenCount = nameKey.split(' ').length;
		if (tokenCount > maxNameTokens) maxNameTokens = tokenCount;
	}
	for (const list of byName.values()) {
		list.sort((a, b) => b.count - a.count);
	}

	console.info(
		`[cityGazetteer] built entries=${byCityState.size} names=${byName.size} droppedNonUsState=${droppedState} droppedPoisonedMedian=${droppedPoisoned} buildMs=${Date.now() - startedAt}`
	);

	return { byCityState, byName, maxNameTokens: Math.min(maxNameTokens, 4) };
};

let lastGood: { table: CityGazetteer; builtAt: number } | null = null;
let inFlight: Promise<CityGazetteer | null> | null = null;

// Single-flight cached gazetteer with stale-if-error: a refresh failure keeps
// serving the previous table; a first-load failure returns null and the
// parser degrades to exactly the pre-gazetteer behavior.
export const getCityGazetteer = (): Promise<CityGazetteer | null> => {
	if (lastGood && Date.now() - lastGood.builtAt < GAZETTEER_TTL_MS) {
		return Promise.resolve(lastGood.table);
	}
	if (inFlight) return inFlight;
	inFlight = (async () => {
		try {
			const table = await buildCityGazetteer();
			lastGood = { table, builtAt: Date.now() };
			return table;
		} catch (err) {
			console.warn(
				`[cityGazetteer] build failed; ${lastGood ? 'serving stale table' : 'parser will run without gazetteer'}`,
				err
			);
			return lastGood?.table ?? null;
		} finally {
			inFlight = null;
		}
	})();
	return inFlight;
};
