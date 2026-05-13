type ZodiacRange = {
	name: string;
	from: readonly [number, number];
	to: readonly [number, number];
};

const ZODIAC_DATE_RANGES: readonly ZodiacRange[] = [
	{ name: 'Capricornus', from: [12, 22], to: [1, 19] },
	{ name: 'Aquarius', from: [1, 20], to: [2, 18] },
	{ name: 'Pisces', from: [2, 19], to: [3, 20] },
	{ name: 'Aries', from: [3, 21], to: [4, 19] },
	{ name: 'Taurus', from: [4, 20], to: [5, 20] },
	{ name: 'Gemini', from: [5, 21], to: [6, 20] },
	{ name: 'Cancer', from: [6, 21], to: [7, 22] },
	{ name: 'Leo', from: [7, 23], to: [8, 22] },
	{ name: 'Virgo', from: [8, 23], to: [9, 22] },
	{ name: 'Libra', from: [9, 23], to: [10, 22] },
	{ name: 'Scorpius', from: [10, 23], to: [11, 21] },
	{ name: 'Sagittarius', from: [11, 22], to: [12, 21] },
];

const SUPPLEMENTARY_CONSTELLATIONS = [
	'Lyra',
	'Orion',
	'Ursa',
	'Cassiopeia',
	'Aquila',
	'Canis',
] as const;

export const getZodiacForDate = (date: Date): string => {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	for (const z of ZODIAC_DATE_RANGES) {
		const [fm, fd] = z.from;
		const [tm, td] = z.to;
		if (fm <= tm) {
			if (
				(month === fm && day >= fd) ||
				(month === tm && day <= td) ||
				(month > fm && month < tm)
			) {
				return z.name;
			}
		} else {
			// Range crosses year boundary (Capricornus: Dec 22 -> Jan 19).
			if (
				(month === fm && day >= fd) ||
				(month === tm && day <= td) ||
				month > fm ||
				month < tm
			) {
				return z.name;
			}
		}
	}
	return 'Aquarius';
};

export const generateCampaignName = (
	existingNames: readonly string[] = [],
	date: Date = new Date()
): string => {
	const primary = getZodiacForDate(date);
	const otherZodiacs = ZODIAC_DATE_RANGES.map((z) => z.name).filter(
		(n) => n !== primary
	);
	const candidates = [primary, ...SUPPLEMENTARY_CONSTELLATIONS, ...otherZodiacs];

	const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
	for (const candidate of candidates) {
		if (!taken.has(candidate.toLowerCase())) return candidate;
	}

	return primary;
};
