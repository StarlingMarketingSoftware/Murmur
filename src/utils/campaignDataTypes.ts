import { getStateAbbreviation } from '@/utils/string';
import {
	isBreweryTitle,
	isCideryTitle,
	isCoffeeShopTitle,
	isDistilleryTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineryTitle,
} from '@/utils/restaurantTitle';

export type CampaignDataTypeKind = 'category' | 'state';

export type CampaignDataTypeCategoryKey =
	| 'wine_beer_spirits'
	| 'restaurants'
	| 'coffee_shops'
	| 'music_venues'
	| 'music_festivals'
	| 'wedding'
	| 'radio';

export type CampaignDataTypeSummary =
	| {
			kind: 'category';
			key: CampaignDataTypeCategoryKey;
			label: string;
			count: number;
	  }
	| {
			kind: 'state';
			key: string;
			label: string;
			count: number;
	  };

export type CampaignDataTypeContactSource = {
	title?: string | null;
	headline?: string | null;
	state?: string | null;
};

const CATEGORY_ORDER: CampaignDataTypeCategoryKey[] = [
	'wine_beer_spirits',
	'restaurants',
	'coffee_shops',
	'music_venues',
	'music_festivals',
	'wedding',
	'radio',
];

const CATEGORY_LABEL_BY_KEY: Record<CampaignDataTypeCategoryKey, string> = {
	wine_beer_spirits: 'Wine, Beer, and Spirits',
	restaurants: 'Restaurants',
	coffee_shops: 'Coffee Shops',
	music_venues: 'Music Venues',
	music_festivals: 'Music Festivals',
	wedding: 'Wedding',
	radio: 'Radio Stations',
};

const normalizeCampaignDataCategoryText = (text: string | null | undefined): string => {
	return (text ?? '')
		.trim()
		.replace(/^\[[^\]]+\]\s*/, '')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ');
};

export const getCampaignDataCategoryFromText = (
	text: string | null | undefined
): CampaignDataTypeCategoryKey | null => {
	const value = normalizeCampaignDataCategoryText(text);
	if (!value) return null;

	if (
		isWineryTitle(value) ||
		isBreweryTitle(value) ||
		isDistilleryTitle(value) ||
		isCideryTitle(value) ||
		/^wine\s*,?\s*beer\s*,?\s*(?:and\s*)?spirits(\s|$)/i.test(value)
	) {
		return 'wine_beer_spirits';
	}
	if (isRestaurantTitle(value)) return 'restaurants';
	if (isCoffeeShopTitle(value)) return 'coffee_shops';
	if (isMusicVenueTitle(value)) return 'music_venues';
	if (isMusicFestivalTitle(value) || /^festivals?(\s|$)/i.test(value)) {
		return 'music_festivals';
	}
	if (
		isWeddingPlannerTitle(value) ||
		isWeddingVenueTitle(value) ||
		/^wedding(\s|$)/i.test(value)
	) {
		return 'wedding';
	}
	if (/^(?:radio\s*stations?|college\s*radio)(\s|$)/i.test(value)) return 'radio';

	return null;
};

export const getCampaignDataCategoryLabel = (
	key: CampaignDataTypeCategoryKey
): string => CATEGORY_LABEL_BY_KEY[key];

export const normalizeCampaignDataState = (
	state: string | null | undefined
): string | null => {
	const abbr = getStateAbbreviation(state).trim().toUpperCase();
	return /^[A-Z]{2}$/.test(abbr) ? abbr : null;
};

export const summarizeCampaignDataTypes = ({
	contacts,
	extraTexts = [],
}: {
	contacts: CampaignDataTypeContactSource[];
	extraTexts?: Array<string | null | undefined>;
}): CampaignDataTypeSummary[] => {
	const categoryCounts = new Map<CampaignDataTypeCategoryKey, number>();
	const stateCounts = new Map<string, number>();

	for (const text of extraTexts) {
		const category = getCampaignDataCategoryFromText(text);
		if (!category) continue;
		categoryCounts.set(category, Math.max(1, categoryCounts.get(category) ?? 0));
	}

	for (const contact of contacts) {
		const category =
			getCampaignDataCategoryFromText(contact.title) ??
			getCampaignDataCategoryFromText(contact.headline);
		if (!category) continue;

		categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);

		const state = normalizeCampaignDataState(contact.state);
		if (state) {
			stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
		}
	}

	if (categoryCounts.size === 0) return [];

	const categories = CATEGORY_ORDER.filter((key) => categoryCounts.has(key)).map((key) => ({
		kind: 'category' as const,
		key,
		label: CATEGORY_LABEL_BY_KEY[key],
		count: categoryCounts.get(key) ?? 0,
	}));

	const states = Array.from(stateCounts.entries())
		.sort(([aKey, aCount], [bKey, bCount]) => bCount - aCount || aKey.localeCompare(bKey))
		.map(([key, count]) => ({
			kind: 'state' as const,
			key,
			label: key,
			count,
		}));

	return [...categories, ...states];
};
