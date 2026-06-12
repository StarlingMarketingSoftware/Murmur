// Genre-affinity model for the applicant→event match score.
//
// The 11-label vocabulary mirrors the shared genre picker (profileGenreOptionRows
// in HybridPromptInput/profileFieldIcons.tsx): both Event.genres and the
// EventApplication.genre snapshot are drawn from it, so an exact-label table
// beats free-text similarity here. Affinities are editorial judgments of how
// interchangeable two genres are for a venue booking (1 = same audience/room,
// 0 = different worlds). Any change to the table or rules requires a
// SCORER_VERSION bump in matchScores.ts.

export const CANONICAL_GENRES = [
	'Pop',
	'Rock',
	'Country',
	'Jazz',
	'Electronic',
	'Classical',
	'Hip-Hop',
	'Gospel',
	'R&B',
	'Folk',
	'Other',
] as const;

export type CanonicalGenre = (typeof CANONICAL_GENRES)[number];

type ConcreteGenre = Exclude<CanonicalGenre, 'Other'>;

// Lowercase + strip non-alphanumerics so "Hip-Hop", "hip hop" and "HipHop"
// collapse to the same key.
const genreKey = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9]/g, '');

// Map, not object literal — a snapshot genre like "Constructor" would otherwise
// resolve through Object.prototype and crash genreAffinity.
const GENRE_ALIASES = new Map<string, CanonicalGenre>([
	['rap', 'Hip-Hop'],
	['rnb', 'R&B'],
	['rhythmandblues', 'R&B'],
	['edm', 'Electronic'],
	['dance', 'Electronic'],
	['electronica', 'Electronic'],
]);

const CANONICAL_BY_KEY = new Map<string, CanonicalGenre>(
	CANONICAL_GENRES.map((genre) => [genreKey(genre), genre])
);

// The apply modal constrains submissions to the vocabulary, but snapshots are
// plain strings — normalize defensively. Unknown non-empty input maps to 'Other'.
export const normalizeGenreLabel = (
	raw: string | null | undefined
): CanonicalGenre | null => {
	const key = genreKey((raw ?? '').trim());
	if (!key) return null;
	return CANONICAL_BY_KEY.get(key) ?? GENRE_ALIASES.get(key) ?? 'Other';
};

// Upper-triangle table (symmetric lookup below). Load-bearing adjacencies:
// Hip-Hop↔R&B / Gospel↔R&B (tightest modern + historical pairings),
// Jazz↔R&B/Gospel (shared lineage and harmonic vocabulary), Country↔Folk /
// Rock↔Folk/Country (the Americana/roots continuum), Pop as the crossover hub,
// Electronic↔Hip-Hop (beat/DJ formats), Jazz↔Classical (seated listening
// rooms). Far pairs (Classical↔Hip-Hop, Folk↔Hip-Hop, Country↔Electronic) are
// effectively mismatches.
const AFFINITY: Record<ConcreteGenre, Partial<Record<ConcreteGenre, number>>> = {
	Pop: {
		Rock: 0.7,
		Country: 0.5,
		Jazz: 0.3,
		Electronic: 0.65,
		Classical: 0.15,
		'Hip-Hop': 0.55,
		Gospel: 0.3,
		'R&B': 0.7,
		Folk: 0.4,
	},
	Rock: {
		Country: 0.55,
		Jazz: 0.25,
		Electronic: 0.35,
		Classical: 0.1,
		'Hip-Hop': 0.3,
		Gospel: 0.2,
		'R&B': 0.35,
		Folk: 0.6,
	},
	Country: {
		Jazz: 0.2,
		Electronic: 0.1,
		Classical: 0.1,
		'Hip-Hop': 0.15,
		Gospel: 0.45,
		'R&B': 0.2,
		Folk: 0.75,
	},
	Jazz: {
		Electronic: 0.25,
		Classical: 0.5,
		'Hip-Hop': 0.4,
		Gospel: 0.6,
		'R&B': 0.7,
		Folk: 0.3,
	},
	Electronic: { Classical: 0.15, 'Hip-Hop': 0.6, Gospel: 0.1, 'R&B': 0.45, Folk: 0.1 },
	Classical: { 'Hip-Hop': 0.05, Gospel: 0.35, 'R&B': 0.15, Folk: 0.3 },
	'Hip-Hop': { Gospel: 0.3, 'R&B': 0.75, Folk: 0.05 },
	Gospel: { 'R&B': 0.75, Folk: 0.35 },
	'R&B': { Folk: 0.15 },
	Folk: {},
};

// Directional: 'Other' on the applicant side means "style unknown" (neutral
// 0.5), while 'Other' in the event/venue list signals openness beyond the
// named genres (0.75).
export const genreAffinity = (
	applicant: CanonicalGenre,
	eventLabel: CanonicalGenre
): number => {
	if (applicant === eventLabel) return applicant === 'Other' ? 0.6 : 1;
	if (applicant === 'Other') return 0.5;
	if (eventLabel === 'Other') return 0.75;
	return AFFINITY[applicant][eventLabel] ?? AFFINITY[eventLabel][applicant] ?? 0.25;
};

export type GenreCompatibility = {
	score: number; // 0-1 affinity of the applicant's genre to the closest event/venue genre
	matchedGenre: CanonicalGenre | null; // event-side label producing the max
	constrained: boolean; // false when neither the event nor the venue lists any genre
	capTotalAt: number | null; // hard ceiling for the FINAL 0-100 score on a genre clash
};

const normalizeList = (labels: string[]): CanonicalGenre[] => {
	const out: CanonicalGenre[] = [];
	for (const label of labels) {
		const normalized = normalizeGenreLabel(label);
		if (normalized && !out.includes(normalized)) out.push(normalized);
	}
	return out;
};

// Event genres are the constraint; the venue profile's genres stand in when an
// event lists none. Score = best affinity across the constraint labels. The
// hard caps fire only on a measured clash between concrete labels — a missing
// or 'Other' applicant genre is penalized via the low score but must never
// hard-cap (unknown ≠ wrong).
export const genreCompatibility = (
	applicantGenre: string | null | undefined,
	eventGenres: string[],
	venueGenres: string[]
): GenreCompatibility => {
	const eventSide = normalizeList(eventGenres);
	const labels = eventSide.length ? eventSide : normalizeList(venueGenres);
	if (!labels.length) {
		// No genre constraint exists anywhere — neutral-positive, caps impossible.
		return { score: 0.7, matchedGenre: null, constrained: false, capTotalAt: null };
	}
	const applicant = normalizeGenreLabel(applicantGenre);
	if (!applicant) {
		return { score: 0.4, matchedGenre: null, constrained: true, capTotalAt: null };
	}
	let best = -1;
	let matched: CanonicalGenre | null = null;
	for (const label of labels) {
		const affinity = genreAffinity(applicant, label);
		if (affinity > best) {
			best = affinity;
			matched = label;
		}
	}
	let capTotalAt: number | null = null;
	if (applicant !== 'Other') {
		if (best <= 0.15) capTotalAt = 35;
		else if (best < 0.3) capTotalAt = 45;
		else if (best < 0.5) capTotalAt = 65;
	}
	return { score: best, matchedGenre: matched, constrained: true, capTotalAt };
};
