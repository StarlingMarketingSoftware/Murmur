// Hero search bar gradient library.
//
// The dashboard search bar shows one of these gradients at a time, picked
// deterministically from the date + AM/PM bucket so the mood shifts twice
// per day. The pick is hash-based (not round-robin) so the visual order
// across days feels shuffled rather than marching through the list.
//
// SEARCH_GRADIENT_DEFAULT is the original magenta/red gradient. It is the
// fallback used by CSS when JS hasn't applied the per-bucket pick yet, and
// it carries extra weight in the weighted selection so it appears slightly
// more often than any individual alternative.

export const SEARCH_GRADIENT_DEFAULT =
	'linear-gradient(90deg, #DA29B4 1.69%, #EA1F1F 34.7%, #E122F2 65.83%, #F00404 98.97%)';

const SEARCH_GRADIENT_ALTERNATES: readonly string[] = [
	'linear-gradient(90deg, #29DAC6 1.69%, #1FAAEA 17.59%, #7C29DA 34.43%, #0D888C 65.83%, #9A17EC 98.97%)',
	'linear-gradient(90deg, #6DDA29 1.69%, #1FAAEA 17.59%, #6DDA29 34.43%, #0D888C 65.83%, #17EC17 98.97%)',
	'linear-gradient(90deg, #6DDA29 1.69%, #E0EA1F 17.59%, #6DDA29 34.43%, #60A038 65.83%, #E1EC17 98.97%)',
	'linear-gradient(90deg, #29DAC0 1.69%, #17D3EC 17.59%, #29DAC0 34.43%, #3863A0 65.83%, #17D3EC 98.97%)',
	'linear-gradient(90deg, #8D29DA 1.69%, #EC17B0 17.59%, #AB29DA 34.43%, #F73F6D 65.83%, #9717EC 98.97%)',
	'linear-gradient(90deg, #DA2952 1.69%, #EC17B0 17.59%, #DA4729 34.43%, #F73F6D 65.83%, #EC8817 98.97%)',
];

// Weighted selection: default at 3, alternates at 2 each.
// Total weight = 3 + 6 * 2 = 15. Default appears 3/15 ≈ 20% of buckets;
// each alternate ≈ 13.3%. Uniform baseline would be 1/7 ≈ 14.3%, so the
// default is a tasteful bump above baseline rather than dominant.
const DEFAULT_WEIGHT = 3;
const ALTERNATE_WEIGHT = 2;

const WEIGHTED_ENTRIES: readonly { gradient: string; weight: number }[] = [
	{ gradient: SEARCH_GRADIENT_DEFAULT, weight: DEFAULT_WEIGHT },
	...SEARCH_GRADIENT_ALTERNATES.map((gradient) => ({ gradient, weight: ALTERNATE_WEIGHT })),
];

const TOTAL_WEIGHT = WEIGHTED_ENTRIES.reduce((sum, entry) => sum + entry.weight, 0);

// djb2 — non-cryptographic, well-distributed for short keys like our bucket
// strings. We just need stable, well-spread integers; this fits.
function hashBucketKey(key: string): number {
	let hash = 5381;
	for (let i = 0; i < key.length; i += 1) {
		hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
	}
	return hash >>> 0;
}

export type SearchGradientBucket = 'AM' | 'PM';

export function getSearchGradientBucket(date: Date): SearchGradientBucket {
	return date.getHours() < 12 ? 'AM' : 'PM';
}

export function getSearchGradientBucketKey(date: Date): string {
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();
	return `${year}-${month}-${day}-${getSearchGradientBucket(date)}`;
}

export function getSearchGradientForDate(date: Date): string {
	const bucketKey = getSearchGradientBucketKey(date);
	let target = hashBucketKey(bucketKey) % TOTAL_WEIGHT;
	for (const entry of WEIGHTED_ENTRIES) {
		if (target < entry.weight) return entry.gradient;
		target -= entry.weight;
	}
	return SEARCH_GRADIENT_DEFAULT;
}

// Milliseconds from `from` until the next AM/PM bucket boundary (noon or
// midnight, whichever is sooner). Used to schedule a live swap so the
// gradient updates without a page reload when the user is sitting on the
// dashboard across the boundary.
export function getMsUntilNextSearchGradientBucket(from: Date): number {
	const next = new Date(from);
	next.setMinutes(0, 0, 0);
	next.setHours(from.getHours() < 12 ? 12 : 24);
	return next.getTime() - from.getTime();
}
