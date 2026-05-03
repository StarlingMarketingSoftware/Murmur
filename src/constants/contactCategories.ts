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
