export const BOOKING_CONTACT_TITLE_PREFIXES = [
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

export type BookingContactTitlePrefix =
	(typeof BOOKING_CONTACT_TITLE_PREFIXES)[number];

export const PROMOTION_CONTACT_TITLE_PREFIXES = [
	'Radio Stations',
	'College Radio',
] as const;

// Curated search should use the same literal booking-category title prefixes
// that power the map overlay. Do not add singular variants here: titles like
// "Restaurant Manager at ..." are loose person/job rows, not category pins.
export const CURATED_BOOKING_CONTACT_TITLE_PREFIXES =
	BOOKING_CONTACT_TITLE_PREFIXES;

export const WINE_BEER_SPIRITS_CONTACT_TITLE_PREFIXES = [
	'Wineries',
	'Breweries',
	'Distilleries',
	'Cideries',
] as const satisfies readonly BookingContactTitlePrefix[];

/**
 * Maps a venue's free-text `businessType` to one of the booking categories so a
 * published venue slots into the right map overlay + curated/search category
 * (and earns the canonical "<Category> <State>" title tier). Case-insensitive
 * and substring-tolerant so it handles both the picker labels (e.g. "Music
 * Venue", "Winery") and custom entries (e.g. "brewpub", "cidery"). Returns null
 * for a blank or unrecognized type — those publish as a normal, uncategorized
 * contact rather than being forced into a wrong category.
 */
export const mapBusinessTypeToCategory = (
	businessType?: string | null
): BookingContactTitlePrefix | null => {
	const s = (businessType ?? '').toLowerCase().trim();
	if (!s) return null;
	// First match wins — most specific signals first so e.g. "brewpub" doesn't
	// fall through to a generic "bar" → Music Venues match.
	if (/distiller/.test(s)) return 'Distilleries';
	if (/cider/.test(s)) return 'Cideries';
	if (/brew/.test(s)) return 'Breweries';
	if (/winer|vineyard|\bwine\b/.test(s)) return 'Wineries';
	if (/coffee|caf[eé]|espresso/.test(s)) return 'Coffee Shops';
	if (/festival/.test(s)) return 'Music Festivals';
	if (/wedding/.test(s)) return 'Wedding Venues';
	if (/restaurant|eatery|diner|bistro|\bgrill\b/.test(s)) return 'Restaurants';
	if (/music|venue|concert|night\s?club|\bclub\b|\bbar\b/.test(s)) return 'Music Venues';
	return null;
};
