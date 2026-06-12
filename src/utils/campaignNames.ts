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

// Deep reserve drawn from the remaining IAU constellations so the pool is far
// larger than any realistic number of non-deleted campaigns per user.
const EXTENDED_CONSTELLATIONS = [
	'Andromeda',
	'Pegasus',
	'Perseus',
	'Draco',
	'Cygnus',
	'Hercules',
	'Phoenix',
	'Hydra',
	'Centaurus',
	'Cepheus',
	'Auriga',
	'Bootes',
	'Corona',
	'Delphinus',
	'Eridanus',
	'Carina',
	'Columba',
	'Corvus',
	'Crater',
	'Crux',
	'Dorado',
	'Fornax',
	'Grus',
	'Indus',
	'Lacerta',
	'Lepus',
	'Lupus',
	'Lynx',
	'Monoceros',
	'Musca',
	'Octans',
	'Pavo',
	'Pictor',
	'Puppis',
	'Pyxis',
	'Sagitta',
	'Sculptor',
	'Scutum',
	'Serpens',
	'Sextans',
	'Triangulum',
	'Tucana',
	'Vela',
	'Volans',
	'Vulpecula',
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

export const normalizeCampaignName = (input: string): string => {
	return input.trim().replace(/\s+/g, ' ');
};

const escapeRegExp = (input: string): string => {
	return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const getCampaignNameCandidates = (date: Date = new Date()): string[] => {
	const primary = getZodiacForDate(date);
	const otherZodiacs = ZODIAC_DATE_RANGES.map((z) => z.name).filter(
		(n) => n !== primary
	);
	return [
		primary,
		...SUPPLEMENTARY_CONSTELLATIONS,
		...otherZodiacs,
		...EXTENDED_CONSTELLATIONS,
	];
};

export const generateCampaignName = (
	existingNames: readonly string[] = [],
	date: Date = new Date()
): string => {
	const taken = new Set(
		existingNames.map((n) => normalizeCampaignName(n).toLowerCase())
	);
	for (const candidate of getCampaignNameCandidates(date)) {
		if (!taken.has(candidate.toLowerCase())) return candidate;
	}

	return getZodiacForDate(date);
};

// Server-side collision resolution for campaign creation. The client proposes
// a name from the campaigns it can see, which excludes archived ones — so a
// proposed constellation can collide with a hidden archived campaign. When
// that happens, advance to the next free constellation instead of appending a
// numeric suffix ("Gemini 1"). The suffix path remains only for user-chosen
// names and the practically unreachable case of every constellation being
// taken; it always returns a name absent from existingNames.
export const resolveUniqueCampaignName = (
	desiredName: string,
	existingNames: readonly string[],
	date: Date = new Date()
): string => {
	const baseName = normalizeCampaignName(desiredName);
	if (!baseName) return desiredName;

	const taken = new Set(
		existingNames.map((n) => normalizeCampaignName(n).toLowerCase())
	);
	if (!taken.has(baseName.toLowerCase())) return baseName;

	const candidates = getCampaignNameCandidates(date);
	if (candidates.some((c) => c.toLowerCase() === baseName.toLowerCase())) {
		for (const candidate of candidates) {
			if (!taken.has(candidate.toLowerCase())) return candidate;
		}
	}

	const basePattern = new RegExp(`^${escapeRegExp(baseName)}(?:\\s+(\\d+))?$`, 'i');
	const usedSuffixes = new Set<number>();
	for (const name of existingNames) {
		const match = basePattern.exec(normalizeCampaignName(name));
		const suffix = match?.[1];
		if (!suffix) continue;
		const n = Number(suffix);
		if (Number.isInteger(n) && n > 0) usedSuffixes.add(n);
	}

	let next = 1;
	while (usedSuffixes.has(next)) next += 1;
	return `${baseName} ${next}`;
};
