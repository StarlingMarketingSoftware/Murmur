import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	fetchGemini,
	handleApiError,
} from '@/app/api/_utils';
import { stripBothSidesOfBraces } from '@/utils/string';
import { getValidatedParamsFromUrl } from '@/utils';
import { getPostTrainingForQuery } from '@/app/api/_utils/postTraining';
import { applyHardcodedLocationOverrides } from '@/app/api/_utils/searchPreprocess';
import { Contact, EmailVerificationStatus, Prisma } from '@prisma/client';
import { searchSimilarContacts, upsertContactToVectorDb } from '../_utils/vectorDb';
import { GEMINI_MODEL_OPTIONS } from '@/constants';
import { StripeSubscriptionStatus } from '@/types';

const VECTOR_SEARCH_LIMIT_DEFAULT = 500;

const createContactSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	company: z.string().optional(),
	email: z.string().email(),
	address: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	country: z.string().optional(),
	website: z.string().optional(),
	phone: z.string().optional(),
	title: z.string().optional(),
	headline: z.string().optional(),
	linkedInUrl: z.string().optional(),
	photoUrl: z.string().optional(),
	metadata: z.string().optional(),
	isPrivate: z.boolean().optional().default(false),
	userId: z.string().optional(),
	companyLinkedInUrl: z.string().optional(),
	companyFoundedYear: z.string().optional(),
	companyType: z.string().optional(),
	companyTechStack: z.array(z.string()).optional(),
	companyPostalCode: z.string().optional(),
	companyKeywords: z.array(z.string()).optional(),
	companyIndustry: z.string().optional(),
});

const contactFilterSchema = z.object({
	query: z.string().optional(),
	limit: z.coerce.number().optional(),
	verificationStatus: z.nativeEnum(EmailVerificationStatus).optional(),
	contactListIds: z.array(z.number()).optional(),
	useVectorSearch: z.boolean().optional(),
	location: z.string().optional(),
	excludeUsedContacts: z.boolean().optional(),
	// Optional bounding-box override (used by map rectangle selection).
	// When present, the API will return contacts inside this box, optionally filtered by `bboxTitlePrefix`.
	bboxSouth: z.coerce.number().optional(),
	bboxWest: z.coerce.number().optional(),
	bboxNorth: z.coerce.number().optional(),
	bboxEast: z.coerce.number().optional(),
	bboxTitlePrefix: z.string().optional(),
});

export type ContactFilterData = z.infer<typeof contactFilterSchema>;

export type PostContactData = z.infer<typeof createContactSchema>;

export const maxDuration = 60;

const startsWithCaseInsensitive = (
	value: string | null | undefined,
	prefix: string
): boolean => {
	if (!value) return false;
	const normalizedPrefix = prefix.trim().toLowerCase();
	if (!normalizedPrefix) return false;
	return value.trim().toLowerCase().startsWith(normalizedPrefix);
};

const filterContactsByTitlePrefix = <T extends { title?: string | null }>(
	items: T[],
	prefix: string
): T[] => {
	const normalizedPrefix = prefix.trim();
	if (!normalizedPrefix) return items;
	return items.filter((item) =>
		startsWithCaseInsensitive(item.title ?? null, normalizedPrefix)
	);
};

const normalizeSearchText = (value: string | null | undefined): string =>
	(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// Coffee-shop search refinements:
// - Filter out obvious non-coffee businesses that match "coffee" loosely (e.g., "Coffee Marketing Agency")
// - Demote marketing-oriented roles so "Coffee Shops" searches skew toward operators/owners
const queryMentionsCoffeeTerms = (rawQuery: string | null | undefined): boolean => {
	const q = normalizeSearchText(rawQuery);
	if (!q) return false;
	// Prefer simple containment (robust to punctuation and unicode), and keep it conservative.
	if (q.includes('coffee')) return true;
	if (q.includes('café')) return true;
	if (q.includes('espresso')) return true;
	if (q.includes('roaster') || q.includes('roastery')) return true;
	// "cafe" but avoid matching inside unrelated words like "cafeteria"
	if (/(^|[^a-z])cafe(s)?([^a-z]|$)/.test(q)) return true;
	return false;
};

const COFFEE_MARKETING_INTENT_TERMS = [
	'marketing',
	'advertising',
	'brand',
	'branding',
	'communications',
	'public relations',
	'social media',
	'content',
	'seo',
	'sem',
] as const;

const coffeeQueryWantsMarketing = (rawQuery: string | null | undefined): boolean => {
	const q = normalizeSearchText(rawQuery);
	if (!q) return false;
	return COFFEE_MARKETING_INTENT_TERMS.some((t) => q.includes(t));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _contactHasStrongCoffeeBusinessSignals = (contact: Contact): boolean => {
	const company = normalizeSearchText(contact.company);
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const industry = normalizeSearchText(contact.companyIndustry);
	const website = normalizeSearchText(contact.website);
	const metadata = normalizeSearchText(contact.metadata);
	const keywordBlob = (contact.companyKeywords ?? [])
		.map((k) => normalizeSearchText(k))
		.filter(Boolean)
		.join(' ');

	// IMPORTANT: titles like "Coffee Shops <State>" are list labels in this dataset and can be wrong.
	// For "is this really a coffee business?" checks, we avoid letting that list-label title alone
	// count as a strong coffee signal. Note: radio stations are now hard-excluded from coffee searches.
	const titleIsCoffeeShopsList = /^coffee shops?\b/.test(title);

	const otherBlob = `${company} ${industry} ${website} ${metadata} ${keywordBlob}`.trim();
	const titleHeadline = `${title} ${headline}`.trim();
	if (!otherBlob && !titleHeadline) return false;

	// Strong, coffee-specific terms (prefer non-title fields first)
	const hasStrongCoffeeInOtherFields =
		/\bcoffee\s*shop(s)?\b/.test(otherBlob) ||
		/(^|[^a-z])cafe(s)?([^a-z]|$)/.test(otherBlob) ||
		otherBlob.includes('café') ||
		/\bespresso\b/.test(otherBlob) ||
		/\broaster(y)?\b/.test(otherBlob) ||
		/\bbarista\b/.test(otherBlob) ||
		/\bcoffee\s*house(s)?\b/.test(otherBlob) ||
		/\bcoffeehouse(s)?\b/.test(otherBlob);
	if (hasStrongCoffeeInOtherFields) return true;

	// Allow operational coffee signals in titles/headlines, but NOT the generic list-label
	// "Coffee Shops <State>".
	if (!titleIsCoffeeShopsList) {
		const hasOperationalCoffeeInTitleHeadline =
			/(^|[^a-z])cafe(s)?([^a-z]|$)/.test(titleHeadline) ||
			titleHeadline.includes('café') ||
			/\bbarista\b/.test(titleHeadline) ||
			/\bespresso\b/.test(titleHeadline) ||
			/\broaster(y)?\b/.test(titleHeadline) ||
			/\bcoffee\s*house(s)?\b/.test(titleHeadline) ||
			/\bcoffeehouse(s)?\b/.test(titleHeadline) ||
			// "coffee shop manager" etc (singular) should count; plural list labels are handled above.
			/\bcoffee\s*shop\b/.test(titleHeadline);
		if (hasOperationalCoffeeInTitleHeadline) return true;
	}

	// Softer: company mentions coffee + other hospitality/coffee-adjacent context
	const companyMentionsCoffee = /\bcoffee\b/.test(company) || company.includes('café');
	if (!companyMentionsCoffee) return false;

	const hospitalityContext = `${company} ${industry} ${keywordBlob} ${metadata} ${website}`.trim();
	if (/\b(hospitality|restaurant|food|food service|food & beverage)\b/.test(hospitalityContext))
		return true;
	if (/\b(menu|order|pickup|takeout|delivery)\b/.test(hospitalityContext)) return true;
	if (/\b(beer|bar|bakery|brunch|breakfast|tea)\b/.test(company)) return true;

	return false;
};

const contactLooksLikeRadioStation = (contact: Contact): boolean => {
	const company = normalizeSearchText(contact.company);
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const industry = normalizeSearchText(contact.companyIndustry);
	const website = normalizeSearchText(contact.website);
	const metadata = normalizeSearchText(contact.metadata);
	const keywordBlob = (contact.companyKeywords ?? [])
		.map((k) => normalizeSearchText(k))
		.filter(Boolean)
		.join(' ');
	const blob = `${company} ${title} ${headline} ${industry} ${website} ${metadata} ${keywordBlob}`.trim();
	if (!blob) return false;

	// Explicit radio-station language (covers "College Radio New York")
	const hasRadioWords =
		/\b(college\s+radio|public\s+radio|community\s+radio|radio\s+station|radio|broadcast|broadcasting)\b/.test(
			blob
		) ||
		// "FM" appears commonly in call signs, and is rare for coffee shops.
		/(^|[^a-z])f\.?m\.?([^a-z]|$)/.test(blob) ||
		// Industry signal from Apollo/ES
		/\b(broadcast\s+media|radio)\b/.test(industry) ||
		// Network signal
		/\bnpr\b/.test(blob);

	// US call-sign pattern (e.g., WEOS, WVCR-FM)
	const rawCompanyTitle = `${contact.company ?? ''} ${contact.title ?? ''}`.trim();
	const rawCompanyTitleUc = rawCompanyTitle.toUpperCase();
	const hasUsCallSign = /\b[WK][A-Z]{2,3}(-FM|-AM)?\b/.test(rawCompanyTitleUc);

	return hasRadioWords || hasUsCallSign;
};

const contactLooksLikeCoffeeMarketingRole = (contact: Contact): boolean => {
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const blob = `${title} ${headline}`.trim();
	if (!blob) return false;
	return COFFEE_MARKETING_INTENT_TERMS.some((t) => blob.includes(t));
};

const contactLooksLikeNonCoffeeBusinessForCoffeeSearch = (
	contact: Contact,
	allowMarketing: boolean
): boolean => {
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const industry = normalizeSearchText(contact.companyIndustry);
	const company = normalizeSearchText(contact.company);

	// Hard exclude radio stations from coffee searches - no exceptions.
	// This removes "College Radio <State>" lists and call-sign entries like "WVCR-FM".
	if (contactLooksLikeRadioStation(contact)) {
		return true;
	}

	// "Jazz Cafe" is a music venue term, not a coffee shop
	const blob = `${title} ${company} ${headline} ${industry}`.trim();
	if (/\bjazz cafe\b/i.test(blob)) return true;

	// If the title explicitly mentions coffee shop terms, it's likely a coffee business
	if (
		/\bcoffee\s*shop/i.test(title) ||
		/\bcafe\b/i.test(title) ||
		title.includes('café') ||
		/\bbarista\b/i.test(title) ||
		/\bcoffee\s*house/i.test(title) ||
		/\bcoffeehouse\b/i.test(title)
	) {
		return false;
	}

	// Exception for role-based negatives: if the company name clearly indicates a cafe/coffee shop,
	// don't exclude it outright (we'll demote marketing roles later).
	const companyLooksLikeCafeOrCoffeeShop =
		/\bcoffee\s*shop(s)?\b/i.test(company) ||
		/(^|[^a-z])cafe(s)?([^a-z]|$)/i.test(company) ||
		company.includes('café') ||
		/\bcoffee\s*house(s)?\b/i.test(company) ||
		/\bcoffeehouse(s)?\b/i.test(company);

	// Titles/industries/company terms that indicate the contact is NOT a coffee shop
	// even if "coffee" appears somewhere in the record.
	const NON_COFFEE_CONTEXT_TERMS: string[] = [
		// Marketing/agency noise (most common for false positives)
		'marketing',
		'advertising',
		'agency',
		'digital innovation',
		// Corporate/tech noise
		'materials manager',
		'senior director',
		'software engineer',
		'developer',
		'consultant',
		'account executive',
		'sales manager',
		'project manager',
		'product manager',
		'data analyst',
		'financial',
		'accountant',
		'attorney',
		'lawyer',
		'legal',
		'insurance',
		'real estate',
		'recruiting',
		'hr manager',
		'human resources',
		'tech',
		'technology',
		'it manager',
		// Entertainment venue noise (e.g., movie theaters)
		'theater',
		'theatre',
		'cinema',
		'movie',
		'film',
		'box office',
		'screening',
	];

	const contextBlob = `${title} ${headline} ${industry} ${company}`.trim();
	for (const term of NON_COFFEE_CONTEXT_TERMS) {
		// If the query explicitly asks for marketing, don't treat marketing terms as disqualifying.
		if (allowMarketing && COFFEE_MARKETING_INTENT_TERMS.includes(term as any)) continue;
		if (contextBlob.includes(term)) {
			// Allow obvious cafes/coffee shops through; role demotion will handle ordering.
			if (companyLooksLikeCafeOrCoffeeShop) return false;
			return true;
		}
	}

	// If the industry is clearly coffee/restaurant/food service/hospitality, it's likely a coffee business.
	// NOTE: This check runs AFTER the non-coffee term screen so "Director of Marketing" doesn't slip
	// through just because the industry is "hospitality".
	if (
		/\bcoffee\b/i.test(industry) ||
		/\bfood\s*(service|&\s*beverage)/i.test(industry) ||
		/\brestaurant/i.test(industry) ||
		/\bhospitality/i.test(industry)
	) {
		return false;
	}

	return false;
};

// Heuristic: used to de-prioritize obvious universities/colleges in "Music Venues" searches.
const contactLooksLikeHigherEducation = (contact: Contact): boolean => {
	const company = normalizeSearchText(contact.company);
	const website = normalizeSearchText(contact.website);
	const industry = normalizeSearchText(contact.companyIndustry);
	const type = normalizeSearchText(contact.companyType);
	const keywordBlob = (contact.companyKeywords ?? [])
		.map((k) => normalizeSearchText(k))
		.filter(Boolean)
		.join(' ');

	// Strong signal: .edu domain
	if (website.includes('.edu')) return true;

	// Strong signal: org name contains education terms
	if (/\b(university|college|community college|school|academy|campus)\b/.test(company)) {
		return true;
	}

	// Softer signals from Apollo-derived fields
	if (
		/\bhigher education\b|\beducation management\b|\bprimary\/secondary education\b|\be-?learning\b/.test(
			industry
		)
	) {
		return true;
	}
	if (/\b(university|college|education)\b/.test(type)) return true;
	if (/\b(university|college|higher education|student)\b/.test(keywordBlob)) return true;

	return false;
};

// Higher score = more likely to be a real venue (club/theater/music hall/etc.).
const contactMusicVenueRelevanceScore = (contact: Contact): number => {
	const company = normalizeSearchText(contact.company);
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const industry = normalizeSearchText(contact.companyIndustry);
	const type = normalizeSearchText(contact.companyType);
	const website = normalizeSearchText(contact.website);
	const metadata = normalizeSearchText(contact.metadata);
	const keywordBlob = (contact.companyKeywords ?? [])
		.map((k) => normalizeSearchText(k))
		.filter(Boolean)
		.join(' ');

	const blob = `${company} ${title} ${headline} ${industry} ${type} ${website} ${metadata} ${keywordBlob}`.trim();
	if (!blob) return 0;

	let score = 0;

	// Music-specific signals
	if (/\bmusic venues?\b/.test(blob)) score += 12;
	if (/\blive music\b/.test(blob)) score += 10;
	if (/\bconcerts?\b|\bgigs?\b|\bshows?\b/.test(blob)) score += 6;

	// Dedicated venue signals (theaters/halls/etc.)
	// NOTE: Avoid matching "venues" (plural) so we don't boost everything just because the list title is
	// "Music Venues <State>".
	const hasStrongDedicatedVenueTerms =
		/\b(music hall|concert hall|auditorium|amphitheat(?:er|re)|arena|pavilion|theat(?:er|re)|performing arts|arts (?:center|centre)|coliseum|stadium|opera|symphony|cabaret)\b/.test(
			blob
		);
	const hasSoftEventSpaceTerms =
		/\b(venue|event (?:center|centre)|event space|banquet hall|ballroom|stage)\b/.test(
			blob
		);

	if (hasStrongDedicatedVenueTerms) score += 10;
	else if (hasSoftEventSpaceTerms) score += 4;

	// Avoid generic "club" to prevent false positives like "wine club", "golf club", etc.
	// "jazz cafe" is a music venue, not a coffee shop.
	const hasClubTerms = /\b(night ?club|jazz club|music club|jazz cafe)\b/.test(blob);
	if (hasClubTerms) score += 6;

	// Hospitality terms that often indicate "not a dedicated music venue".
	// These places can still host live music, but in "Music Venues" searches we want them lower
	// than actual venues.
	const hasBarTerms =
		/\b(bars?|pubs?|taverns?|saloons?|lounges?|cocktails?|speakeas(?:y|ies)|cantinas?)\b/.test(
			blob
		);
	const hasBreweryTerms =
		/\b(brewery|breweries|brewing|taprooms?|taphouses?|tap ?houses?|brewpubs?|microbrewery|microbreweries|alehouses?|beer gardens?|cideries?|cidery|meader(?:y|ies)|distiller(?:y|ies))\b/.test(
			blob
		);
	const hasWineryTerms =
		/\b(wineries?|vineyards?|vintners?|wine ?bars?|wine tasting|tasting rooms?|wine (?:cellar|cellars))\b/.test(
			blob
		);
	const hasCafeTerms =
		/\b(cafe|cafes|café|cafés|coffee|coffee ?houses?|espresso|roastery|roasteries|tea ?houses?)\b/.test(
			blob
		);
	const hasRestaurantTerms =
		/\b(restaurants?|bistros?|grills?|eatery|eateries|diners?|kitchens?|pizzerias?|pizza|bbq|steakhouses?)\b/.test(
			blob
		);

	const hospitalityPenalty =
		(hasCafeTerms ? 14 : 0) +
		(hasWineryTerms ? 22 : 0) +
		(hasBreweryTerms ? 22 : 0) +
		(hasBarTerms ? 12 : 0) +
		(hasRestaurantTerms ? 8 : 0);
	if (hospitalityPenalty > 0) {
		// If it already looks like a dedicated venue, apply a smaller penalty.
		// BUT: wineries/breweries/distilleries should still be pushed down in "Music Venues"
		// searches even if they mention an event space.
		const divisor =
			(hasStrongDedicatedVenueTerms || hasClubTerms) && !(hasBreweryTerms || hasWineryTerms)
				? 2
				: 1;
		score -= Math.ceil(hospitalityPenalty / divisor);
	}

	if (website && !website.includes('.edu')) score += 1;
	return score;
};

// For "Music Venues" searches, treat obvious cafes/bars/breweries as "hospitality-only"
// unless there are also strong dedicated-venue signals.
const contactLooksLikeHospitalityOnlyForMusicVenueSearch = (contact: Contact): boolean => {
	const company = normalizeSearchText(contact.company);
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const industry = normalizeSearchText(contact.companyIndustry);
	const type = normalizeSearchText(contact.companyType);
	const website = normalizeSearchText(contact.website);
	const metadata = normalizeSearchText(contact.metadata);
	const keywordBlob = (contact.companyKeywords ?? [])
		.map((k) => normalizeSearchText(k))
		.filter(Boolean)
		.join(' ');

	const blob = `${company} ${title} ${headline} ${industry} ${type} ${website} ${metadata} ${keywordBlob}`.trim();
	if (!blob) return false;

	const hasStrongDedicatedVenueTerms =
		/\b(music hall|concert hall|auditorium|amphitheat(?:er|re)|arena|pavilion|theat(?:er|re)|performing arts|arts (?:center|centre)|coliseum|stadium|opera|symphony|cabaret)\b/.test(
			blob
		);
	// Avoid generic "club" to prevent false positives like "wine club", "golf club", etc.
	// "jazz cafe" is a music venue, not a coffee shop.
	const hasClubTerms = /\b(night ?club|jazz club|music club|jazz cafe)\b/.test(blob);

	const hasBarTerms =
		/\b(bars?|pubs?|taverns?|saloons?|lounges?|cocktails?|speakeas(?:y|ies)|cantinas?)\b/.test(
			blob
		);
	const hasBreweryTerms =
		/\b(brewery|breweries|brewing|taprooms?|taphouses?|tap ?houses?|brewpubs?|microbrewery|microbreweries|alehouses?|beer gardens?|cideries?|cidery|meader(?:y|ies)|distiller(?:y|ies))\b/.test(
			blob
		);
	const hasWineryTerms =
		/\b(wineries?|vineyards?|vintners?|wine ?bars?|wine tasting|tasting rooms?|wine (?:cellar|cellars))\b/.test(
			blob
		);
	// Exclude "jazz cafe" from cafe terms - it's a music venue, not a coffee shop
	const hasJazzCafe = /\bjazz cafe\b/.test(blob);
	const hasCafeTerms =
		!hasJazzCafe &&
		/\b(cafe|cafes|café|cafés|coffee|coffee ?houses?|espresso|roastery|roasteries|tea ?houses?)\b/.test(
			blob
		);
	const hasRestaurantTerms =
		/\b(restaurants?|bistros?|grills?|eatery|eateries|diners?|kitchens?|pizzerias?|pizza|bbq|steakhouses?)\b/.test(
			blob
		);

	const hasHospitalityTerms =
		hasBarTerms || hasBreweryTerms || hasWineryTerms || hasCafeTerms || hasRestaurantTerms;

	if (!hasHospitalityTerms) return false;
	if (hasBreweryTerms || hasWineryTerms) return true;
	if (hasStrongDedicatedVenueTerms || hasClubTerms) return false;
	return true;
};

const contactLooksLikeWineryOrBreweryForMusicVenueSearch = (contact: Contact): boolean => {
	const company = normalizeSearchText(contact.company);
	const title = normalizeSearchText(contact.title);
	const headline = normalizeSearchText(contact.headline);
	const industry = normalizeSearchText(contact.companyIndustry);
	const type = normalizeSearchText(contact.companyType);
	const website = normalizeSearchText(contact.website);
	const metadata = normalizeSearchText(contact.metadata);
	const keywordBlob = (contact.companyKeywords ?? [])
		.map((k) => normalizeSearchText(k))
		.filter(Boolean)
		.join(' ');

	const blob = `${company} ${title} ${headline} ${industry} ${type} ${website} ${metadata} ${keywordBlob}`.trim();
	if (!blob) return false;

	const hasBreweryTerms =
		/\b(brewery|breweries|brewing|taprooms?|taphouses?|tap ?houses?|brewpubs?|microbrewery|microbreweries|alehouses?|beer gardens?|cideries?|cidery|meader(?:y|ies)|distiller(?:y|ies))\b/.test(
			blob
		);
	const hasWineryTerms =
		/\b(wineries?|vineyards?|vintners?|wine ?bars?|wine tasting|tasting rooms?|wine (?:cellar|cellars))\b/.test(
			blob
		);

	return hasBreweryTerms || hasWineryTerms;
};

const US_STATE_METADATA = [
	{ abbr: 'AL', name: 'Alabama' },
	{ abbr: 'AK', name: 'Alaska' },
	{ abbr: 'AZ', name: 'Arizona' },
	{ abbr: 'AR', name: 'Arkansas' },
	{ abbr: 'CA', name: 'California' },
	{ abbr: 'CO', name: 'Colorado' },
	{ abbr: 'CT', name: 'Connecticut' },
	{ abbr: 'DE', name: 'Delaware' },
	{ abbr: 'FL', name: 'Florida' },
	{ abbr: 'GA', name: 'Georgia' },
	{ abbr: 'HI', name: 'Hawaii' },
	{ abbr: 'ID', name: 'Idaho' },
	{ abbr: 'IL', name: 'Illinois' },
	{ abbr: 'IN', name: 'Indiana' },
	{ abbr: 'IA', name: 'Iowa' },
	{ abbr: 'KS', name: 'Kansas' },
	{ abbr: 'KY', name: 'Kentucky' },
	{ abbr: 'LA', name: 'Louisiana' },
	{ abbr: 'ME', name: 'Maine' },
	{ abbr: 'MD', name: 'Maryland' },
	{ abbr: 'MA', name: 'Massachusetts' },
	{ abbr: 'MI', name: 'Michigan' },
	{ abbr: 'MN', name: 'Minnesota' },
	{ abbr: 'MS', name: 'Mississippi' },
	{ abbr: 'MO', name: 'Missouri' },
	{ abbr: 'MT', name: 'Montana' },
	{ abbr: 'NE', name: 'Nebraska' },
	{ abbr: 'NV', name: 'Nevada' },
	{ abbr: 'NH', name: 'New Hampshire' },
	{ abbr: 'NJ', name: 'New Jersey' },
	{ abbr: 'NM', name: 'New Mexico' },
	{ abbr: 'NY', name: 'New York' },
	{ abbr: 'NC', name: 'North Carolina' },
	{ abbr: 'ND', name: 'North Dakota' },
	{ abbr: 'OH', name: 'Ohio' },
	{ abbr: 'OK', name: 'Oklahoma' },
	{ abbr: 'OR', name: 'Oregon' },
	{ abbr: 'PA', name: 'Pennsylvania' },
	{ abbr: 'RI', name: 'Rhode Island' },
	{ abbr: 'SC', name: 'South Carolina' },
	{ abbr: 'SD', name: 'South Dakota' },
	{ abbr: 'TN', name: 'Tennessee' },
	{ abbr: 'TX', name: 'Texas' },
	{ abbr: 'UT', name: 'Utah' },
	{ abbr: 'VT', name: 'Vermont' },
	{ abbr: 'VA', name: 'Virginia' },
	{ abbr: 'WA', name: 'Washington' },
	{ abbr: 'WV', name: 'West Virginia' },
	{ abbr: 'WI', name: 'Wisconsin' },
	{ abbr: 'WY', name: 'Wyoming' },
	{ abbr: 'DC', name: 'District of Columbia' },
] as const;

const STATE_ABBR_TO_NAME = US_STATE_METADATA.reduce<Record<string, string>>(
	(acc, state) => {
		acc[state.abbr] = state.name;
		return acc;
	},
	{}
);

const STATE_NAME_TO_CANONICAL = US_STATE_METADATA.reduce<Record<string, string>>(
	(acc, state) => {
		acc[state.name.toLowerCase()] = state.name;
		return acc;
	},
	{}
);

const STATE_NAME_TO_ABBR = US_STATE_METADATA.reduce<Record<string, string>>(
	(acc, state) => {
		acc[state.name.toLowerCase()] = state.abbr;
		return acc;
	},
	{}
);

const ALL_STATE_ABBRS: string[] = US_STATE_METADATA.map((s) => s.abbr);

// Approximate "nearby states" based on state borders (land + commonly accepted water borders)
const US_STATE_NEIGHBORS: Record<string, readonly string[]> = {
	AL: ['FL', 'GA', 'TN', 'MS'],
	AK: [],
	AZ: ['CA', 'NV', 'UT', 'NM'],
	AR: ['MO', 'TN', 'MS', 'LA', 'TX', 'OK'],
	CA: ['OR', 'NV', 'AZ'],
	CO: ['WY', 'NE', 'KS', 'OK', 'NM', 'UT'],
	CT: ['NY', 'MA', 'RI'],
	DE: ['MD', 'PA', 'NJ'],
	DC: ['MD', 'VA'],
	FL: ['AL', 'GA'],
	GA: ['FL', 'AL', 'TN', 'NC', 'SC'],
	HI: [],
	ID: ['WA', 'OR', 'NV', 'UT', 'WY', 'MT'],
	IL: ['WI', 'IA', 'MO', 'KY', 'IN'],
	IN: ['MI', 'OH', 'KY', 'IL'],
	IA: ['MN', 'WI', 'IL', 'MO', 'NE', 'SD'],
	KS: ['NE', 'MO', 'OK', 'CO'],
	KY: ['IL', 'IN', 'OH', 'WV', 'VA', 'TN', 'MO'],
	LA: ['TX', 'AR', 'MS'],
	ME: ['NH'],
	MD: ['VA', 'WV', 'PA', 'DE', 'DC'],
	MA: ['RI', 'CT', 'NY', 'VT', 'NH'],
	MI: ['WI', 'IN', 'OH'],
	MN: ['ND', 'SD', 'IA', 'WI'],
	MS: ['LA', 'AR', 'TN', 'AL'],
	MO: ['IA', 'IL', 'KY', 'TN', 'AR', 'OK', 'KS', 'NE'],
	MT: ['ID', 'WY', 'SD', 'ND'],
	NE: ['SD', 'IA', 'MO', 'KS', 'CO', 'WY'],
	NV: ['OR', 'ID', 'UT', 'AZ', 'CA'],
	NH: ['ME', 'MA', 'VT'],
	NJ: ['NY', 'PA', 'DE'],
	NM: ['AZ', 'CO', 'OK', 'TX'],
	NY: ['PA', 'NJ', 'CT', 'MA', 'VT'],
	NC: ['VA', 'TN', 'GA', 'SC'],
	ND: ['MN', 'SD', 'MT'],
	OH: ['MI', 'IN', 'KY', 'WV', 'PA'],
	OK: ['KS', 'MO', 'AR', 'TX', 'NM', 'CO'],
	OR: ['WA', 'ID', 'NV', 'CA'],
	PA: ['NY', 'NJ', 'DE', 'MD', 'WV', 'OH'],
	RI: ['CT', 'MA'],
	SC: ['NC', 'GA'],
	SD: ['ND', 'MN', 'IA', 'NE', 'WY', 'MT'],
	TN: ['KY', 'VA', 'NC', 'GA', 'AL', 'MS', 'AR', 'MO'],
	TX: ['NM', 'OK', 'AR', 'LA'],
	UT: ['ID', 'WY', 'CO', 'AZ', 'NV'],
	VT: ['NY', 'MA', 'NH'],
	VA: ['NC', 'TN', 'KY', 'WV', 'MD', 'DC'],
	WA: ['ID', 'OR'],
	WV: ['OH', 'PA', 'MD', 'VA', 'KY'],
	WI: ['MI', 'MN', 'IA', 'IL'],
	WY: ['MT', 'SD', 'NE', 'CO', 'UT', 'ID'],
};

const buildStateDistanceMap = (startAbbr: string): Map<string, number> => {
	const start = startAbbr.toUpperCase();
	const distances = new Map<string, number>();

	if (!ALL_STATE_ABBRS.includes(start)) {
		return distances;
	}

	const queue: string[] = [start];
	distances.set(start, 0);

	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		const currentDistance = distances.get(current) ?? 0;
		const neighbors = US_STATE_NEIGHBORS[current] ?? [];
		for (const neighbor of neighbors) {
			const n = neighbor.toUpperCase();
			if (distances.has(n)) continue;
			distances.set(n, currentDistance + 1);
			queue.push(n);
		}
	}

	return distances;
};

const STATE_FUZZY_MAX_DISTANCE = 2;
const STATE_FUZZY_MIN_LENGTH = 5;

const levenshteinDistance = (a: string, b: string): number => {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const prevRow: number[] = Array.from({ length: b.length + 1 }, (_, idx) => idx);
	const currRow: number[] = new Array(b.length + 1).fill(0);

	for (let i = 1; i <= a.length; i++) {
		currRow[0] = i;
		const charA = a[i - 1];
		for (let j = 1; j <= b.length; j++) {
			const charB = b[j - 1];
			const cost = charA === charB ? 0 : 1;
			currRow[j] = Math.min(
				currRow[j - 1] + 1, // insertion
				prevRow[j] + 1, // deletion
				prevRow[j - 1] + cost // substitution
			);
		}
		for (let j = 0; j <= b.length; j++) {
			prevRow[j] = currRow[j];
		}
	}

	return prevRow[b.length];
};

const detectStateByFuzzyMatch = (value: string): string | null => {
	const normalized = value.toLowerCase();
	if (normalized.length < STATE_FUZZY_MIN_LENGTH) {
		return null;
	}

	let bestMatch: { name: string; distance: number } | null = null;
	for (const state of US_STATE_METADATA) {
		const distance = levenshteinDistance(normalized, state.name.toLowerCase());
		if (!bestMatch || distance < bestMatch.distance) {
			bestMatch = { name: state.name, distance };
			if (distance === 0) break;
		}
	}

	if (bestMatch && bestMatch.distance <= STATE_FUZZY_MAX_DISTANCE) {
		return bestMatch.name;
	}
	return null;
};

const COUNTRY_ALIASES: Record<string, string> = {
	usa: 'United States of America',
	us: 'United States of America',
	'u.s.': 'United States of America',
	'u.s.a.': 'United States of America',
	'united states': 'United States of America',
	'united states of america': 'United States of America',
	america: 'United States of America',
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const toTitleCase = (value: string): string =>
	value
		.split(' ')
		.filter(Boolean)
		.map((segment) => segment[0].toUpperCase() + segment.slice(1).toLowerCase())
		.join(' ');

const detectStateFromValue = (value: string | null | undefined): string | null => {
	if (!value) return null;
	const cleaned = normalizeWhitespace(value);
	if (!cleaned) return null;
	const upper = cleaned.toUpperCase();
	if (STATE_ABBR_TO_NAME[upper]) {
		return STATE_ABBR_TO_NAME[upper];
	}
	const lower = cleaned.toLowerCase();
	if (STATE_NAME_TO_CANONICAL[lower]) {
		return STATE_NAME_TO_CANONICAL[lower];
	}
	const fuzzy = detectStateByFuzzyMatch(cleaned);
	return fuzzy ?? null;
};

const normalizeStateAbbrFromValue = (value: string | null | undefined): string | null => {
	const canonical = detectStateFromValue(value);
	if (!canonical) return null;
	return STATE_NAME_TO_ABBR[canonical.toLowerCase()] ?? null;
};

const getStateSynonymsForAbbr = (abbr: string): string[] => {
	const upper = abbr.toUpperCase();
	const name = STATE_ABBR_TO_NAME[upper];
	return name ? [name, upper] : [upper];
};

const normalizeCountryValue = (value: string | null | undefined): string | null => {
	if (!value) return null;
	const cleaned = normalizeWhitespace(value);
	if (!cleaned) return null;
	const alias = COUNTRY_ALIASES[cleaned.toLowerCase()];
	if (alias) return alias;
	return toTitleCase(cleaned);
};

type ParentheticalLocation = {
	city: string | null;
	state: string | null;
	country: string | null;
	restOfQuery: string;
	originalText: string;
};

const extractParentheticalLocation = (query: string): ParentheticalLocation | null => {
	if (!query) return null;
	const match = /\(([^)]+)\)/.exec(query);
	if (!match) return null;
	const locationText = match[1]?.trim() ?? '';
	if (!locationText) return null;
	const restOfQuery = normalizeWhitespace(query.replace(match[0], ' '));
	const parts = locationText
		.split(',')
		.map((part) => normalizeWhitespace(part))
		.filter(Boolean);

	let city: string | null = null;
	let state: string | null = null;
	let country: string | null = null;

	if (parts.length === 1) {
		const stateCandidate = detectStateFromValue(parts[0]);
		if (stateCandidate) {
			state = stateCandidate;
		} else if (COUNTRY_ALIASES[parts[0].toLowerCase()]) {
			country = normalizeCountryValue(parts[0]);
		} else {
			city = toTitleCase(parts[0]);
		}
	} else if (parts.length === 2) {
		const [first, second] = parts;
		const stateCandidate = detectStateFromValue(second);
		if (stateCandidate) {
			city = toTitleCase(first);
			state = stateCandidate;
		} else {
			city = toTitleCase(first);
			country = normalizeCountryValue(second);
		}
	} else if (parts.length >= 3) {
		city = toTitleCase(parts[0]);
		const potentialState = detectStateFromValue(parts[1]);
		state = potentialState ?? toTitleCase(parts[1]);
		country = normalizeCountryValue(parts[parts.length - 1]);
	}

	return {
		city,
		state,
		country,
		restOfQuery,
		originalText: locationText,
	};
};

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Check subscription status
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: { stripeSubscriptionStatus: true },
		});

		// Allow both active subscriptions and free trials
		if (
			!user ||
			(user.stripeSubscriptionStatus !== StripeSubscriptionStatus.ACTIVE &&
				user.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING)
		) {
			return apiBadRequest(
				'An active subscription or free trial is required to search for contacts'
			);
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, contactFilterSchema);
		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}
		const {
			contactListIds,
			verificationStatus,
			query,
			limit,
			useVectorSearch,
			location,
			excludeUsedContacts,
			bboxSouth,
			bboxWest,
			bboxNorth,
			bboxEast,
			bboxTitlePrefix,
		} = validatedFilters.data;
		let locationFilter = location ?? null;

		// --- Bounding-box override (map rectangle selection) ---
		// When bbox params are present, we bypass the complex LLM/vector search flow and
		// return contacts within the selected box. This keeps the UI snappy for map-based
		// exploration while preserving the main search behavior when no bbox is provided.
		const hasBboxFilter =
			[bboxSouth, bboxWest, bboxNorth, bboxEast].every(
				(n) => typeof n === 'number' && Number.isFinite(n)
			) && bboxSouth != null;
		if (hasBboxFilter) {
			const clamp = (n: number, min: number, max: number) =>
				Math.max(min, Math.min(max, n));
			const minLat = clamp(Math.min(bboxSouth!, bboxNorth!), -90, 90);
			const maxLat = clamp(Math.max(bboxSouth!, bboxNorth!), -90, 90);
			const minLng = clamp(Math.min(bboxWest!, bboxEast!), -180, 180);
			const maxLng = clamp(Math.max(bboxWest!, bboxEast!), -180, 180);

			// We currently do not support antimeridian-crossing viewports.
			if (maxLng < minLng) {
				return apiBadRequest('Invalid bounds');
			}

			// Derive the category/title prefix from the request (explicit param wins),
			// or infer it from the structured dashboard query (e.g. "[Booking] Music Venues (Maine)").
			const inferTitlePrefixFromQuery = (q: string | null | undefined): string => {
				const s = (q ?? '').trim();
				if (!s) return '';
				return (
					s
						.replace(/^\[[^\]]+\]\s*/i, '') // strip leading [Why]
						.replace(/\s*\([^)]*\)\s*$/i, '') // strip trailing (Where)
						.replace(/\s+in\s+.+$/i, '') // legacy "... in <where>"
						.trim() || ''
				);
			};
			/**
			 * Map user-facing "What" labels to the DB title prefixes used for filtering.
			 * This is especially important for bbox (rectangle selection) searches, which
			 * intentionally bypass the richer query parsing/vector flow.
			 */
			const normalizeBboxTitlePrefix = (value: string): string => {
				const trimmed = value.trim();
				if (!trimmed) return '';
				// The UI "What" is "Festivals", but contacts are stored as "Music Festivals ...".
				// Treat "Festival(s)" as an alias so rectangle selection behaves like normal search.
				if (/^festivals?$/i.test(trimmed)) return 'Music Festivals';
				return trimmed;
			};
			const titlePrefix = normalizeBboxTitlePrefix(
				(bboxTitlePrefix ?? '').trim() || inferTitlePrefixFromQuery(query)
			);

			// Respect "exclude used contacts" (contacts already in any of the user's lists).
			let addedContactIds: number[] = [];
			if (excludeUsedContacts) {
				const userContactLists = await prisma.userContactList.findMany({
					where: { userId },
					select: {
						contacts: {
							select: { id: true },
						},
					},
				});
				addedContactIds = userContactLists.flatMap((list) => list.contacts.map((c) => c.id));
			}

			const requestedLimit = Math.max(
				1,
				Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 2000)
			);

			const where: Prisma.ContactWhereInput = {
				latitude: { gte: minLat, lte: maxLat },
				longitude: { gte: minLng, lte: maxLng },
				id: excludeUsedContacts && addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
				emailValidationStatus: verificationStatus ? { equals: verificationStatus } : undefined,
				...(titlePrefix
					? {
							title: {
								not: null,
								startsWith: titlePrefix,
								mode: 'insensitive',
							},
					  }
					: {}),
			};

			const contacts = await prisma.contact.findMany({
				where,
				take: requestedLimit,
				orderBy: [{ id: 'asc' }],
			});

			return apiResponse(contacts);
		}

		let locationResponse: string | null = null;
		const rawQuery = query || '';
		// Special directives
		const _trimmedLc = rawQuery.trim().toLowerCase();
		const isPromotionSearch = _trimmedLc.startsWith('[promotion]');
		const isBookingSearch = _trimmedLc.startsWith('[booking]');
		const rawQueryForParsing = isPromotionSearch
			? rawQuery.replace(/^\s*\[promotion\]\s*/i, '')
			: isBookingSearch
			? rawQuery.replace(/^\s*\[booking\]\s*/i, '')
			: rawQuery;
		const isWineBeerSpiritsQuery = (() => {
			const normalized = rawQueryForParsing.toLowerCase();
			const hasWine = /\bwine\b/.test(normalized);
			const hasBeer = /\bbeer\b/.test(normalized);
			const hasSpirits = /\bspirits?\b/.test(normalized);
			if (!(hasWine && hasBeer && hasSpirits)) return false;
			// Prefer matches where the three appear in the canonical order but allow any punctuation
			return /\bwine[^a-zA-Z0-9]+beer[^a-zA-Z0-9]+(and\s+)?spirits?/.test(
				normalized
			);
		})();
		// Detect wedding planner queries - more lenient matching for wedding-related contacts
		const isWeddingPlannerQuery = (() => {
			const normalized = rawQueryForParsing.toLowerCase();
			return /\bwedding\s*(planner|coordinator|organizer|consultant)?s?\b/i.test(normalized);
		})();
		const parentheticalLocation = extractParentheticalLocation(rawQueryForParsing);
		if (parentheticalLocation && !locationFilter) {
			locationFilter = parentheticalLocation.originalText;
		}
		const queryForLocationParsing =
			parentheticalLocation?.restOfQuery ?? rawQueryForParsing;
		let queryJson: {
			city: string | null;
			state: string | null;
			country: string | null;
			restOfQuery: string;
		} = {
			city: parentheticalLocation?.city ?? null,
			state: parentheticalLocation?.state ?? null,
			country: parentheticalLocation?.country ?? null,
			restOfQuery: queryForLocationParsing,
		};

		if (process.env.GEMINI_API_KEY && queryForLocationParsing) {
			try {
				locationResponse = await fetchGemini(
					GEMINI_MODEL_OPTIONS.gemini25FlashLite,
					`You are a geography and language expert that can tell the difference between words that are city, states, or countries, and words that are not, based on knowledge about place names as well as semantics and context of a given sentence. You will be given a search query that may contain words that are city, states, or countries, amongst other non-location based terms. You will separate the location words from the rest of the query, and return the words that are city, state, or country, along with the rest of the query in a JSON string in the following format: {"city": "cityName", "state": "stateName", "country": "countryName", "restOfQuery": "restOfQuery"}. 
                    
                    Additional instructions:
                    - Do not include country unless it is specified.
                    - If the country in the query is some variant of the United States, return "United States of America". 
                    - If the search term contains "new york", specify the state. Only specify the city if it says "new york city" or "NYC".
                    - If there is no city, state, or country in the query, return null in the fields that are not found. For example: {"city": null, "state": "Pennsylvania", "country": null, "restOfQuery": "restOfQuery"} 
                    - If any of the location terms are misspelled, returned the correct spelling. For example, if the query is "Pensylvania", return {"city": null, "state": "Pennsylvania", "country": null, "restOfQuery": "restOfQuery"}
                    - If the query includes slang or abbreviations, return the official spelling. For example, if the query is "NYC", return {"city": "New York City", "state": null, "country": null, "restOfQuery": "restOfQuery"}
                    - Return a valid JSON string that can be parsed by a JSON.parse() in JavaScript. 
                    - There are some place names that can also be a word (such as buffalo steak house in new york) (Buffalo is a city in New York but it is also a general word for an animal). Use the context of the query to determine if the word is a place name or not.
                    - Return the JSON string and nothing else.`,
					queryForLocationParsing,
					{ timeoutMs: 10000 } // 10s timeout for location parsing
				);
			} catch (geminiError) {
				console.error('Gemini location parsing failed:', geminiError);
				// Continue without location parsing if Gemini fails
				locationResponse = null;
			}
		} else if (!process.env.GEMINI_API_KEY) {
			console.warn('GEMINI_API_KEY is not set. Location parsing will be skipped.');
		}

		// Parse location via LLM with a fast timeout and graceful fallback or no-LLM fallback
		if (locationResponse) {
			try {
				const parsed = JSON.parse(stripBothSidesOfBraces(locationResponse));
				queryJson = {
					city: queryJson.city ?? parsed?.city ?? null,
					state: queryJson.state ?? parsed?.state ?? null,
					country: queryJson.country ?? parsed?.country ?? null,
					restOfQuery:
						typeof parsed?.restOfQuery === 'string'
							? parsed.restOfQuery
							: typeof queryJson.restOfQuery === 'string'
							? queryJson.restOfQuery
							: rawQueryForParsing,
				};
			} catch (e) {
				console.warn('OpenAI location parsing failed, falling back to raw query.', e);
			}
		}
		// Apply deterministic overrides and tuning knobs
		const {
			overrides,
			penaltyCities,
			forceCityExactCity,
			forceStateAny,
			forceCityAny,
			penaltyTerms,
			strictPenalty,
		} = applyHardcodedLocationOverrides(query || '', queryJson);
		queryJson = overrides;
		const bookingTitlePrefix = isBookingSearch
			? (queryJson.restOfQuery ?? '').trim()
			: '';
		const shouldFilterBookingTitles = bookingTitlePrefix.length > 0;
		const requestedLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500));
		const effectiveLocationStrategy = isPromotionSearch
			? 'broad'
			: queryJson?.state && requestedLimit >= 500
			? 'flexible'
			: queryJson?.state
			? 'strict'
			: 'flexible';

		const numberContactListIds: number[] =
			contactListIds?.map((id) => Number(id)).filter((id) => !isNaN(id)) || [];

		let contacts: Contact[] = [];

		const userContactLists = await prisma.userContactList.findMany({
			where: {
				userId: userId,
			},
			include: {
				contacts: true,
			},
		});

		const addedContactIds: number[] = [];

		if (excludeUsedContacts) {
			for (const list of userContactLists) {
				for (const contact of list.contacts) {
					addedContactIds.push(contact.id);
				}
			}
		}

		// Strict "Music Venues" filter: when query mentions "music venues" (or singular), only return titles starting with "Music Venues"
		{
			const mentionsMusicVenues = /\bmusic venues?\b/i.test(rawQueryForParsing);
			if (mentionsMusicVenues) {
				const finalLimit = Math.max(
					1,
					Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500)
				);
				// Pull a much larger candidate set so we can fill with real venues
				// before showing universities/colleges.
				const fetchTake = Math.min(finalLimit * 10, 2000);

				const baseWhere: Prisma.ContactWhereInput = {
					id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				};

				// Respect strict state if present (exact or any-of synonyms)
				const stateStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceStateAny && forceStateAny.length > 0) {
					stateStrictAnd.push({
						OR: forceStateAny.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				} else if (queryJson.state) {
					const canon = detectStateFromValue(queryJson.state) || queryJson.state;
					const abbr = STATE_NAME_TO_ABBR[String(canon).toLowerCase()];
					const statesToMatch = [canon, abbr].filter(Boolean).map(String);
					stateStrictAnd.push({
						OR: statesToMatch.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				}

				// Strict city matching when present
				const cityStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceCityExactCity) {
					cityStrictAnd.push({
						city: { equals: forceCityExactCity, mode: 'insensitive' },
					});
				} else if (forceCityAny && forceCityAny.length > 0) {
					cityStrictAnd.push({
						OR: forceCityAny.map((c) => ({
							city: { equals: c, mode: 'insensitive' },
						})),
					});
				}

				const extractStateLabelAfterMusicPrefix = (
					title: string | null | undefined
				): string | null => {
					if (!title) return null;
					const trimmed = title.trim();
					const m = /^music venues?\b(.*)$/i.exec(trimmed);
					if (!m) return null;
					let rest = m[1].trim();
					// Remove common separators right after prefix
					rest = rest.replace(/^[-–—:|,()\[\]]+/, '').trim();
					// Collapse repeated whitespace
					rest = rest.replace(/\s+/g, ' ').trim();
					if (!rest) return null;
					return rest;
				};

				const titleStateCanonical = (title: string | null | undefined): string | null => {
					const label = extractStateLabelAfterMusicPrefix(title);
					if (!label) return null;
					return detectStateFromValue(label);
				};

				// Build target state canonical set (if a state is present)
				const targetStatesCanonical: string[] = (() => {
					const candidates: string[] = [];
					if (forceStateAny && forceStateAny.length > 0) {
						for (const s of forceStateAny) {
							const canon = detectStateFromValue(s);
							if (canon) candidates.push(canon);
						}
					} else if (queryJson.state) {
						const canon = detectStateFromValue(queryJson.state);
						if (canon) candidates.push(canon);
					}
					return Array.from(new Set(candidates));
				})();
				const targetStateSetLc = new Set(targetStatesCanonical.map((s) => s.toLowerCase()));
				const targetStateAbbr =
					normalizeStateAbbrFromValue(queryJson.state) ||
					(forceStateAny && forceStateAny.length > 0
						? normalizeStateAbbrFromValue(forceStateAny[0])
						: null);

				// Exact state-label titles we want to prioritize heavily (e.g. "Music Venues Pennsylvania")
				const exactTitleLcSet = new Set<string>();
				for (const canon of targetStatesCanonical) {
					exactTitleLcSet.add(normalizeSearchText(`Music Venues ${canon}`));
					const abbr = STATE_NAME_TO_ABBR[canon.toLowerCase()];
					if (abbr) exactTitleLcSet.add(normalizeSearchText(`Music Venues ${abbr}`));
				}

				// Query exact state-label titles first so we don't miss them due to pagination.
				const exactTitleOr: Prisma.ContactWhereInput[] = [];
				for (const canon of targetStatesCanonical) {
					exactTitleOr.push({
						title: { equals: `Music Venues ${canon}`, mode: 'insensitive' },
					});
					const abbr = STATE_NAME_TO_ABBR[canon.toLowerCase()];
					if (abbr) {
						exactTitleOr.push({
							title: { equals: `Music Venues ${abbr}`, mode: 'insensitive' },
						});
					}
				}

				const exactTitleResults =
					exactTitleOr.length > 0
						? await prisma.contact.findMany({
								where: {
									AND: [baseWhere, ...cityStrictAnd, { OR: exactTitleOr }],
								},
								orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
								take: fetchTake,
						  })
						: [];

				let candidates: Contact[] = exactTitleResults.slice();

				if (candidates.length < fetchTake) {
					const prefixResults = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								...stateStrictAnd,
								...cityStrictAnd,
								{ title: { mode: 'insensitive', startsWith: 'Music Venues' } },
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: fetchTake,
					});
					candidates = candidates.concat(prefixResults);
				}

				// Dedupe initial candidates.
				{
					const seen = new Set<number>();
					candidates = candidates.filter((c) => {
						if (seen.has(c.id)) return false;
						seen.add(c.id);
						return true;
					});
				}

				// Fallback: if we somehow filtered everything out, fall back to the original strict-state query.
				if (candidates.length === 0) {
					candidates = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								...stateStrictAnd,
								...cityStrictAnd,
								{ title: { mode: 'insensitive', startsWith: 'Music Venues' } },
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: fetchTake,
					});
				}

				// Prefer actual venues over universities/colleges for "Music Venues" searches.
				const higherEdCache = new Map<number, boolean>();
				const isHigherEd = (c: Contact): boolean => {
					if (higherEdCache.has(c.id)) return higherEdCache.get(c.id)!;
					const v = contactLooksLikeHigherEducation(c);
					higherEdCache.set(c.id, v);
					return v;
				};

				// If we have a state (e.g. "Pennsylvania") and our in-state "Music Venues" list
				// would otherwise be padded by universities/colleges, fill with real "Music Venues"
				// from surrounding states first (same strategy as radio station proximity filling).
				if (targetStateAbbr) {
					const countNonHigherEd = (): number =>
						candidates.reduce((sum, c) => sum + (isHigherEd(c) ? 0 : 1), 0);

					let nonHigherEdCount = countNonHigherEd();
					if (nonHigherEdCount < finalLimit) {
						const dist = buildStateDistanceMap(targetStateAbbr);
						const ringMap = new Map<number, string[]>();
						for (const abbr of ALL_STATE_ABBRS) {
							const d = dist.get(abbr);
							const key = d == null ? 999 : d;
							const arr = ringMap.get(key) ?? [];
							arr.push(abbr);
							ringMap.set(key, arr);
						}
						const stateRings = Array.from(ringMap.entries())
							.sort((a, b) => a[0] - b[0])
							.map(([, abbrs]) => abbrs.sort());

						const buildStateOr = (abbrs: string[]): Prisma.ContactWhereInput | null => {
							if (!abbrs || abbrs.length === 0) return null;
							const values = new Set<string>();
							for (const abbr of abbrs) {
								for (const v of getStateSynonymsForAbbr(abbr)) values.add(v);
							}
							if (values.size === 0) return null;
							return {
								OR: Array.from(values).map((v) => ({
									state: { equals: v, mode: 'insensitive' },
								})),
							};
						};

						const notHigherEdWhere: Prisma.ContactWhereInput = {
							NOT: {
								OR: [
									{ company: { mode: 'insensitive', contains: 'university' } },
									{ company: { mode: 'insensitive', contains: 'college' } },
									{ website: { mode: 'insensitive', contains: '.edu' } },
								],
							},
						};

						const seenIds = new Set<number>(candidates.map((c) => c.id));
						const buildSeenExclusion = (): Prisma.ContactWhereInput =>
							seenIds.size > 0 ? { id: { notIn: Array.from(seenIds) } } : {};
						const addUnique = (items: Contact[]) => {
							for (const c of items) {
								if (seenIds.has(c.id)) continue;
								candidates.push(c);
								seenIds.add(c.id);
							}
						};

						for (
							let ringIdx = 1;
							ringIdx < stateRings.length && nonHigherEdCount < finalLimit;
							ringIdx++
						) {
							const ring = stateRings[ringIdx] ?? [];
							if (ring.length === 0) continue;
							const stateOr = buildStateOr(ring);
							if (!stateOr) continue;

							const needed = finalLimit - nonHigherEdCount;
							const take = Math.min(fetchTake, Math.max(needed * 4, 200), 2000);
							const ringResults = await prisma.contact.findMany({
								where: {
									AND: [
										baseWhere,
										buildSeenExclusion(),
										stateOr,
										notHigherEdWhere,
										{ title: { mode: 'insensitive', startsWith: 'Music Venues' } },
									],
								},
								orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
								take: take,
							});

							addUnique(ringResults);
							nonHigherEdCount = countNonHigherEd();
						}
					}
				}

				const venueScoreCache = new Map<number, number>();
				const venueScore = (c: Contact): number => {
					if (venueScoreCache.has(c.id)) return venueScoreCache.get(c.id)!;
					const v = contactMusicVenueRelevanceScore(c);
					venueScoreCache.set(c.id, v);
					return v;
				};

				const hospitalityOnlyCache = new Map<number, boolean>();
				const hospitalityOnly = (c: Contact): boolean => {
					if (hospitalityOnlyCache.has(c.id)) return hospitalityOnlyCache.get(c.id)!;
					const v = contactLooksLikeHospitalityOnlyForMusicVenueSearch(c);
					hospitalityOnlyCache.set(c.id, v);
					return v;
				};

				const wineryOrBreweryCache = new Map<number, boolean>();
				const wineryOrBrewery = (c: Contact): boolean => {
					if (wineryOrBreweryCache.has(c.id)) return wineryOrBreweryCache.get(c.id)!;
					const v = contactLooksLikeWineryOrBreweryForMusicVenueSearch(c);
					wineryOrBreweryCache.set(c.id, v);
					return v;
				};

				const targetCityLc = normalizeSearchText(forceCityExactCity || queryJson.city || '');
				const distanceMap = targetStateAbbr ? buildStateDistanceMap(targetStateAbbr) : null;

				const scored = candidates.map((c) => {
					const titleLc = normalizeSearchText(c.title);
					const exactTitle = exactTitleLcSet.size > 0 && exactTitleLcSet.has(titleLc);
					const titleCanon = titleStateCanonical(c.title);
					const matchesTargetStateTitle =
						titleCanon && targetStateSetLc.size > 0
							? targetStateSetLc.has(titleCanon.toLowerCase())
							: false;
					const cityMatch =
						targetCityLc.length > 0 && normalizeSearchText(c.city) === targetCityLc;
					const higherEd = isHigherEd(c);
					const stateAbbrForDistance =
						normalizeStateAbbrFromValue(c.state) ||
						(titleCanon ? normalizeStateAbbrFromValue(titleCanon) : null);
					const distance =
						distanceMap && stateAbbrForDistance
							? distanceMap.get(stateAbbrForDistance) ?? Number.POSITIVE_INFINITY
							: Number.POSITIVE_INFINITY;
					return {
						contact: c,
						exactTitle,
						matchesTargetStateTitle,
						cityMatch,
						higherEd,
						distance,
						hospitalityOnly: hospitalityOnly(c),
						wineryOrBrewery: wineryOrBrewery(c),
						venueScore: venueScore(c),
					};
				});

				scored.sort((a, b) => {
					if (a.exactTitle !== b.exactTitle) return a.exactTitle ? -1 : 1;
					if (a.matchesTargetStateTitle !== b.matchesTargetStateTitle) {
						return a.matchesTargetStateTitle ? -1 : 1;
					}
					// Prefer non-higher-ed results
					if (a.higherEd !== b.higherEd) return a.higherEd ? 1 : -1;
					// Prefer closer states (in-state, then neighbors, then farther)
					if (a.distance !== b.distance) return a.distance - b.distance;
					// Prefer contacts that look more like real venues
					if (a.venueScore !== b.venueScore) return b.venueScore - a.venueScore;
					// Prefer exact city matches (if applicable)
					if (a.cityMatch !== b.cityMatch) return a.cityMatch ? -1 : 1;
					// Stable-ish fallback
					return (a.contact.company || '').localeCompare(b.contact.company || '');
				});

				// Always put higher-ed at the bottom (as a last-resort filler).
				// Also push obvious cafes/bars/breweries below dedicated venues.
				const ordered = scored
					.filter((x) => !x.higherEd && !x.hospitalityOnly)
					.concat(
						scored.filter(
							(x) => !x.higherEd && x.hospitalityOnly && !x.wineryOrBrewery
						)
					)
					.concat(scored.filter((x) => !x.higherEd && x.wineryOrBrewery))
					.concat(scored.filter((x) => x.higherEd))
					.map((x) => x.contact);

				return apiResponse(ordered.slice(0, finalLimit));
			}
		}

		// Strict "Music Festivals" filter: when query mentions "festival(s)", only return titles starting with "Music Festivals"
		{
			const mentionsFestivals = /\bfestivals?\b/i.test(rawQueryForParsing);
			if (mentionsFestivals) {
				// Festivals are often sparsely populated; avoid "jumping" across the map to
				// distant states just to hit the global 500-result cap.
				const FESTIVALS_LIMIT_CAP = 300;
				const finalLimit = Math.max(
					1,
					Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, FESTIVALS_LIMIT_CAP)
				);
				const fetchTake = Math.min(finalLimit * 4, 500);

				const baseWhere: Prisma.ContactWhereInput = {
					id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				};

				// Respect strict state if present (exact or any-of synonyms)
				const stateStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceStateAny && forceStateAny.length > 0) {
					stateStrictAnd.push({
						OR: forceStateAny.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				} else if (queryJson.state) {
					const canon = detectStateFromValue(queryJson.state) || queryJson.state;
					const abbr = STATE_NAME_TO_ABBR[String(canon).toLowerCase()];
					const statesToMatch = [canon, abbr].filter(Boolean).map(String);
					stateStrictAnd.push({
						OR: statesToMatch.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				}

				// Strict city matching when present
				const cityStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceCityExactCity) {
					cityStrictAnd.push({
						city: { equals: forceCityExactCity, mode: 'insensitive' },
					});
				} else if (forceCityAny && forceCityAny.length > 0) {
					cityStrictAnd.push({
						OR: forceCityAny.map((c) => ({
							city: { equals: c, mode: 'insensitive' },
						})),
					});
				}

				const results = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							...cityStrictAnd,
							{ title: { mode: 'insensitive', startsWith: 'Music Festivals' } },
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: fetchTake,
				});

				// If we're under the requested limit and we have a target state, pad with nearby
				// states (same strategy as radio station proximity filling).
				if (results.length < finalLimit) {
					const targetStateAbbr =
						normalizeStateAbbrFromValue(queryJson.state) ||
						(forceStateAny && forceStateAny.length > 0
							? normalizeStateAbbrFromValue(forceStateAny[0])
							: null);
					if (targetStateAbbr) {
						const seen = new Set(results.map((c) => c.id));
						const addUnique = (items: typeof results) => {
							for (const c of items) {
								if (seen.has(c.id)) continue;
								results.push(c);
								seen.add(c.id);
								if (results.length >= finalLimit) break;
							}
						};
						const buildSeenExclusion = (): Prisma.ContactWhereInput =>
							seen.size > 0 ? { id: { notIn: Array.from(seen) } } : {};
						const buildStateOr = (abbrs: string[]): Prisma.ContactWhereInput | null => {
							if (!abbrs || abbrs.length === 0) return null;
							const values = new Set<string>();
							for (const abbr of abbrs) {
								for (const v of getStateSynonymsForAbbr(abbr)) values.add(v);
							}
							if (values.size === 0) return null;
							return {
								OR: Array.from(values).map((v) => ({
									state: { equals: v, mode: 'insensitive' },
								})),
							};
						};

						// "Surrounding states" = bordering states only (distance 1).
						// This prevents cases like including Washington for Montana while Idaho is empty.
						const neighboringStates = (US_STATE_NEIGHBORS[targetStateAbbr] ?? [])
							.slice()
							.map((s) => s.toUpperCase())
							.sort();

						const festivalsStartsWith: Prisma.ContactWhereInput = {
							title: { mode: 'insensitive', startsWith: 'Music Festivals' },
						};

						// If city was specified, first fill with other festivals in the same state (other cities).
						if (results.length < finalLimit && cityStrictAnd.length > 0) {
							const stateOr = buildStateOr([targetStateAbbr]);
							if (stateOr) {
								const inState = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											festivalsStartsWith,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - results.length,
								});
								addUnique(inState);
							}
						}

						// Then fill with surrounding states (bordering) only.
						if (results.length < finalLimit && neighboringStates.length > 0) {
							const stateOr = buildStateOr(neighboringStates);
							if (stateOr) {
								const filler = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											festivalsStartsWith,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - results.length,
								});
								addUnique(filler);
							}
						}
					}
				}

				// Prioritize exact state-label titles: "Music Festivals <STATE or ABBR>"
				const STATE_NAMES = [
					'Alabama',
					'Alaska',
					'Arizona',
					'Arkansas',
					'California',
					'Colorado',
					'Connecticut',
					'Delaware',
					'Florida',
					'Georgia',
					'Hawaii',
					'Idaho',
					'Illinois',
					'Indiana',
					'Iowa',
					'Kansas',
					'Kentucky',
					'Louisiana',
					'Maine',
					'Maryland',
					'Massachusetts',
					'Michigan',
					'Minnesota',
					'Mississippi',
					'Missouri',
					'Montana',
					'Nebraska',
					'Nevada',
					'New Hampshire',
					'New Jersey',
					'New Mexico',
					'New York',
					'North Carolina',
					'North Dakota',
					'Ohio',
					'Oklahoma',
					'Oregon',
					'Pennsylvania',
					'Rhode Island',
					'South Carolina',
					'South Dakota',
					'Tennessee',
					'Texas',
					'Utah',
					'Vermont',
					'Virginia',
					'Washington',
					'West Virginia',
					'Wisconsin',
					'Wyoming',
					'District of Columbia',
				];
				const STATE_ABBRS = [
					'AL',
					'AK',
					'AZ',
					'AR',
					'CA',
					'CO',
					'CT',
					'DE',
					'FL',
					'GA',
					'HI',
					'ID',
					'IL',
					'IN',
					'IA',
					'KS',
					'KY',
					'LA',
					'ME',
					'MD',
					'MA',
					'MI',
					'MN',
					'MS',
					'MO',
					'MT',
					'NE',
					'NV',
					'NH',
					'NJ',
					'NM',
					'NY',
					'NC',
					'ND',
					'OH',
					'OK',
					'OR',
					'PA',
					'RI',
					'SC',
					'SD',
					'TN',
					'TX',
					'UT',
					'VT',
					'VA',
					'WA',
					'WV',
					'WI',
					'WY',
					'DC',
				];
				const STATE_NAME_SET = new Set(STATE_NAMES.map((s) => s.toLowerCase()));
				const STATE_ABBR_SET = new Set(STATE_ABBRS);

				const isStateLabelAfterPrefix = (title: string | null | undefined): boolean => {
					if (!title) return false;
					const trimmed = title.trim();
					const m = /^music festivals\b(.*)$/i.exec(trimmed);
					if (!m) return false;
					let rest = m[1].trim();
					// Remove common separators right after prefix
					rest = rest.replace(/^[-–—:|,()\[\]]+/, '').trim();
					// Collapse repeated whitespace
					rest = rest.replace(/\s+/g, ' ').trim();
					if (!rest) return false;
					// Match exact state label
					if (STATE_NAME_SET.has(rest.toLowerCase())) return true;
					if (STATE_ABBR_SET.has(rest.toUpperCase())) return true;
					return false;
				};

				const prioritized = results.sort((a, b) => {
					const targetCityLc = (forceCityExactCity || queryJson.city || '')
						.trim()
						.toLowerCase();
					const aCityMatch =
						targetCityLc.length > 0 &&
						(a.city || '').trim().toLowerCase() === targetCityLc;
					const bCityMatch =
						targetCityLc.length > 0 &&
						(b.city || '').trim().toLowerCase() === targetCityLc;
					// First, prioritize exact city matches
					if (aCityMatch && !bCityMatch) return -1;
					if (!aCityMatch && bCityMatch) return 1;

					const aStateTitle = isStateLabelAfterPrefix(a.title);
					const bStateTitle = isStateLabelAfterPrefix(b.title);
					if (aStateTitle && !bStateTitle) return -1;
					if (!aStateTitle && bStateTitle) return 1;
					return 0;
				});

				return apiResponse(prioritized.slice(0, finalLimit));
			}
		}

		// Strict "Restaurants" filter: when query mentions "restaurant(s)", only return titles starting with "Restaurants"
		{
			const mentionsRestaurants = /\brestaurants?\b/i.test(rawQueryForParsing);
			if (mentionsRestaurants) {
				const finalLimit = Math.max(
					1,
					Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500)
				);
				const fetchTake = Math.min(finalLimit * 4, 500);

				const baseWhere: Prisma.ContactWhereInput = {
					id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				};

				// Respect strict state if present (exact or any-of synonyms)
				const stateStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceStateAny && forceStateAny.length > 0) {
					stateStrictAnd.push({
						OR: forceStateAny.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				} else if (queryJson.state) {
					stateStrictAnd.push({
						state: { equals: queryJson.state, mode: 'insensitive' },
					});
				}

				// Strict city matching when present
				const cityStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceCityExactCity) {
					cityStrictAnd.push({
						city: { equals: forceCityExactCity, mode: 'insensitive' },
					});
				} else if (forceCityAny && forceCityAny.length > 0) {
					cityStrictAnd.push({
						OR: forceCityAny.map((c) => ({
							city: { equals: c, mode: 'insensitive' },
						})),
					});
				}
				
				const results = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							...cityStrictAnd,
							{ title: { mode: 'insensitive', startsWith: 'Restaurants' } },
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: fetchTake,
				});
				
				// If not enough exact "Restaurants" prefix matches, try broader title-based fallbacks
				if (results.length < finalLimit) {
					const filler = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								...stateStrictAnd,
								...cityStrictAnd,
								{
									OR: [
										{ title: { mode: 'insensitive', startsWith: 'Restaurant' } }, // singular
										{ title: { mode: 'insensitive', contains: 'restaurant' } }, // general containment
									],
								},
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: Math.max(0, fetchTake - results.length),
					});
					const seen = new Set(results.map((c) => c.id));
					for (const c of filler) {
						if (seen.has(c.id)) continue;
						results.push(c);
						seen.add(c.id);
						if (results.length >= fetchTake) break;
					}
				}

				// Special inclusion rule: if searching for Philadelphia, PA, also include contacts
				// with address containing "Philadelphia" and state "Pennsylvania", even if city differs.
				{
					const isPhillyCity =
						(forceCityExactCity &&
							forceCityExactCity.trim().toLowerCase() === 'philadelphia') ||
						(queryJson.city && queryJson.city.trim().toLowerCase() === 'philadelphia');
					const hasPaState =
						(forceStateAny &&
							forceStateAny.map((s) => s.toLowerCase()).includes('pennsylvania')) ||
						(queryJson.state && queryJson.state.trim().toLowerCase() === 'pennsylvania');

					if (isPhillyCity && hasPaState && results.length < fetchTake) {
						const phillyAddressExtras = await prisma.contact.findMany({
							where: {
								AND: [
									baseWhere,
									{ state: { equals: 'Pennsylvania', mode: 'insensitive' } },
									{ address: { contains: 'Philadelphia', mode: 'insensitive' } },
								],
							},
							orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
							take: Math.max(0, fetchTake - results.length),
						});
						const seen = new Set(results.map((c) => c.id));
						for (const c of phillyAddressExtras) {
							if (seen.has(c.id)) continue;
							results.push(c);
							seen.add(c.id);
							if (results.length >= fetchTake) break;
						}
					}
				}

				// Helper to check if a contact looks like a non-restaurant (tech, university, executive at non-food company)
				const contactLooksLikeNonRestaurant = (contact: Contact): boolean => {
					const company = (contact.company || '').toLowerCase();
					const title = (contact.title || '').toLowerCase();
					const headline = (contact.headline || '').toLowerCase();
					const industry = (contact.companyIndustry || '').toLowerCase();

					// Exclude universities/colleges (unless they have a restaurant-specific title)
					const universityPattern = /\b(university|college|school|academy|institute)\b/i;
					if (universityPattern.test(company)) {
						// Allow if title clearly indicates restaurant role
						if (!/\b(chef|cook|restaurant|dining|food service|catering)\b/i.test(title)) {
							return true;
						}
					}

					// Exclude tech/executive roles at non-food companies
					const techExecutiveRoles = /\b(cto|ceo|cfo|coo|cmo|vp|vice president|director|founder|co-founder|engineer|developer|software|product manager|data scientist)\b/i;
					if (techExecutiveRoles.test(title) || techExecutiveRoles.test(headline)) {
						// Only exclude if company doesn't look like a restaurant
						const restaurantCompanyPattern = /\b(restaurant|grill|bistro|kitchen|eatery|diner|pizzeria|steakhouse|tavern|trattoria|dining|food|catering)\b/i;
						if (!restaurantCompanyPattern.test(company) && !restaurantCompanyPattern.test(industry)) {
							return true;
						}
					}

					// Exclude obvious tech/media companies
					const nonRestaurantCompany = /\b(software|tech|technology|media|marketing|agency|consulting|solutions|platform|app|digital|analytics)\b/i;
					if (nonRestaurantCompany.test(company) && !/\b(restaurant|food|dining)\b/i.test(company)) {
						return true;
					}

					return false;
				};

				// Before going to nearby states, try to find more restaurant-related contacts in the target state
				// by checking companyIndustry, companyKeywords, and other fields
				if (results.length < finalLimit) {
					const seen = new Set(results.map((c) => c.id));
					const restaurantIndustryFiller = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								...stateStrictAnd,
								...cityStrictAnd,
								{ id: { notIn: Array.from(seen) } },
								{
									OR: [
										// Industry-based matches
										{ companyIndustry: { contains: 'restaurant', mode: 'insensitive' } },
										{ companyIndustry: { contains: 'food service', mode: 'insensitive' } },
										{ companyIndustry: { contains: 'food & beverage', mode: 'insensitive' } },
										{ companyIndustry: { contains: 'hospitality', mode: 'insensitive' } },
										{ companyIndustry: { contains: 'dining', mode: 'insensitive' } },
										// Company name patterns
										{ company: { contains: 'restaurant', mode: 'insensitive' } },
										{ company: { contains: 'grill', mode: 'insensitive' } },
										{ company: { contains: 'bistro', mode: 'insensitive' } },
										{ company: { contains: 'kitchen', mode: 'insensitive' } },
										{ company: { contains: 'eatery', mode: 'insensitive' } },
										{ company: { contains: 'diner', mode: 'insensitive' } },
										{ company: { contains: 'pizzeria', mode: 'insensitive' } },
										{ company: { contains: 'steakhouse', mode: 'insensitive' } },
										{ company: { contains: 'cafe', mode: 'insensitive' } },
										{ company: { contains: 'tavern', mode: 'insensitive' } },
										{ company: { contains: 'trattoria', mode: 'insensitive' } },
									],
								},
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: (finalLimit - results.length) * 2, // Fetch extra to account for filtering
					});
					
					for (const c of restaurantIndustryFiller) {
						if (seen.has(c.id)) continue;
						if (contactLooksLikeNonRestaurant(c)) continue; // Filter out non-restaurants
						results.push(c);
						seen.add(c.id);
						if (results.length >= finalLimit) break;
					}
					
				}

				// If we're still under the requested limit and we have a target state, pad with nearby
				// states (same strategy as radio station proximity filling).
				if (results.length < finalLimit) {
					const targetStateAbbr =
						normalizeStateAbbrFromValue(queryJson.state) ||
						(forceStateAny && forceStateAny.length > 0
							? normalizeStateAbbrFromValue(forceStateAny[0])
							: null);
					if (targetStateAbbr) {
						const seen = new Set(results.map((c) => c.id));
						const addUnique = (items: typeof results) => {
							for (const c of items) {
								if (seen.has(c.id)) continue;
								// Filter out non-restaurant contacts
								if (contactLooksLikeNonRestaurant(c)) continue;
								results.push(c);
								seen.add(c.id);
								if (results.length >= finalLimit) break;
							}
						};
						const buildSeenExclusion = (): Prisma.ContactWhereInput =>
							seen.size > 0 ? { id: { notIn: Array.from(seen) } } : {};
						const buildStateOr = (abbrs: string[]): Prisma.ContactWhereInput | null => {
							if (!abbrs || abbrs.length === 0) return null;
							const values = new Set<string>();
							for (const abbr of abbrs) {
								for (const v of getStateSynonymsForAbbr(abbr)) values.add(v);
							}
							if (values.size === 0) return null;
							return {
								OR: Array.from(values).map((v) => ({
									state: { equals: v, mode: 'insensitive' },
								})),
							};
						};

						const stateRings: string[][] = (() => {
							const dist = buildStateDistanceMap(targetStateAbbr);
							const ringMap = new Map<number, string[]>();
							for (const abbr of ALL_STATE_ABBRS) {
								const d = dist.get(abbr);
								const key = d == null ? 999 : d;
								const arr = ringMap.get(key) ?? [];
								arr.push(abbr);
								ringMap.set(key, arr);
							}
							return Array.from(ringMap.entries())
								.sort((a, b) => a[0] - b[0])
								.map(([, abbrs]) => abbrs.sort());
						})();

						const restaurantsStartsWithOr: Prisma.ContactWhereInput = {
							OR: [
								{ title: { mode: 'insensitive', startsWith: 'Restaurants' } },
								{ title: { mode: 'insensitive', startsWith: 'Restaurant' } },
							],
						};
						const restaurantsContainsOr: Prisma.ContactWhereInput = {
							OR: [{ title: { mode: 'insensitive', contains: 'restaurant' } }],
						};

						// If city was specified, first fill with other restaurants in the same state (other cities).
						if (results.length < finalLimit && cityStrictAnd.length > 0) {
							const stateOr = buildStateOr([targetStateAbbr]);
							if (stateOr) {
								const inStateStartsWith = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											restaurantsStartsWithOr,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - results.length,
								});
								addUnique(inStateStartsWith);

								if (results.length < finalLimit) {
									const inStateContains = await prisma.contact.findMany({
										where: {
											AND: [
												baseWhere,
												buildSeenExclusion(),
												stateOr,
												restaurantsContainsOr,
											],
										},
										orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
										take: finalLimit - results.length,
									});
									addUnique(inStateContains);
								}
							}
						}

						// Then fill with nearby states until we hit the limit (proximity-ordered).
						if (results.length < finalLimit) {
							for (
								let ringIdx = 1;
								ringIdx < stateRings.length && results.length < finalLimit;
								ringIdx++
							) {
								const ring = stateRings[ringIdx] ?? [];
								if (ring.length === 0) continue;
								const stateOr = buildStateOr(ring);
								if (!stateOr) continue;
								const filler = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											restaurantsStartsWithOr,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - results.length,
								});
								addUnique(filler);
							}
						}
						
						if (results.length < finalLimit) {
							for (
								let ringIdx = 1;
								ringIdx < stateRings.length && results.length < finalLimit;
								ringIdx++
							) {
								const ring = stateRings[ringIdx] ?? [];
								if (ring.length === 0) continue;
								const stateOr = buildStateOr(ring);
								if (!stateOr) continue;
								const filler = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											restaurantsContainsOr,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - results.length,
								});
								addUnique(filler);
							}
						}
					}
				}

				// Prioritize exact state-label titles: "Restaurants <STATE or ABBR>"
				const STATE_NAMES = [
					'Alabama',
					'Alaska',
					'Arizona',
					'Arkansas',
					'California',
					'Colorado',
					'Connecticut',
					'Delaware',
					'Florida',
					'Georgia',
					'Hawaii',
					'Idaho',
					'Illinois',
					'Indiana',
					'Iowa',
					'Kansas',
					'Kentucky',
					'Louisiana',
					'Maine',
					'Maryland',
					'Massachusetts',
					'Michigan',
					'Minnesota',
					'Mississippi',
					'Missouri',
					'Montana',
					'Nebraska',
					'Nevada',
					'New Hampshire',
					'New Jersey',
					'New Mexico',
					'New York',
					'North Carolina',
					'North Dakota',
					'Ohio',
					'Oklahoma',
					'Oregon',
					'Pennsylvania',
					'Rhode Island',
					'South Carolina',
					'South Dakota',
					'Tennessee',
					'Texas',
					'Utah',
					'Vermont',
					'Virginia',
					'Washington',
					'West Virginia',
					'Wisconsin',
					'Wyoming',
					'District of Columbia',
				];
				const STATE_ABBRS = [
					'AL',
					'AK',
					'AZ',
					'AR',
					'CA',
					'CO',
					'CT',
					'DE',
					'FL',
					'GA',
					'HI',
					'ID',
					'IL',
					'IN',
					'IA',
					'KS',
					'KY',
					'LA',
					'ME',
					'MD',
					'MA',
					'MI',
					'MN',
					'MS',
					'MO',
					'MT',
					'NE',
					'NV',
					'NH',
					'NJ',
					'NM',
					'NY',
					'NC',
					'ND',
					'OH',
					'OK',
					'OR',
					'PA',
					'RI',
					'SC',
					'SD',
					'TN',
					'TX',
					'UT',
					'VT',
					'VA',
					'WA',
					'WV',
					'WI',
					'WY',
					'DC',
				];
				const STATE_NAME_SET = new Set(STATE_NAMES.map((s) => s.toLowerCase()));
				const STATE_ABBR_SET = new Set(STATE_ABBRS);

				const isStateLabelAfterPrefix = (title: string | null | undefined): boolean => {
					if (!title) return false;
					const trimmed = title.trim();
					const m = /^restaurants?\b(.*)$/i.exec(trimmed);
					if (!m) return false;
					let rest = m[1].trim();
					// Remove common separators right after prefix
					rest = rest.replace(/^[-–—:|,()\[\]]+/, '').trim();
					// Collapse repeated whitespace
					rest = rest.replace(/\s+/g, ' ').trim();
					if (!rest) return false;
					// Match exact state label
					if (STATE_NAME_SET.has(rest.toLowerCase())) return true;
					if (STATE_ABBR_SET.has(rest.toUpperCase())) return true;
					return false;
				};

				// Extract canonical state name if title matches "Restaurants <STATE or ABBR>"
				const extractStateLabelAfterPrefix = (
					title: string | null | undefined
				): string | null => {
					if (!title) return null;
					const trimmed = title.trim();
					const m = /^restaurants?\b(.*)$/i.exec(trimmed);
					if (!m) return null;
					let rest = m[1].trim();
					rest = rest.replace(/^[-–—:|,()\[\]]+/, '').trim();
					rest = rest.replace(/\s+/g, ' ').trim();
					if (!rest) return null;
					// Normalize to canonical state using shared helper (accepts abbr or name)
					const canonical = detectStateFromValue(rest);
					return canonical ?? null;
				};

				// Precompute target states (normalized) for matching preference when available
				const targetStatesCanonical: string[] = (() => {
					const candidates: string[] = [];
					if (forceStateAny && forceStateAny.length > 0) {
						for (const s of forceStateAny) {
							const canon = detectStateFromValue(s);
							if (canon) candidates.push(canon);
						}
					} else if (queryJson.state) {
						const canon = detectStateFromValue(queryJson.state);
						if (canon) candidates.push(canon);
					}
					return candidates;
				})();
				const targetStateSetLc = new Set(
					targetStatesCanonical.map((s) => s.toLowerCase())
				);
				const targetStateAbbr =
					normalizeStateAbbrFromValue(queryJson.state) ||
					(forceStateAny && forceStateAny.length > 0
						? normalizeStateAbbrFromValue(forceStateAny[0])
						: null);
				const distanceMap = targetStateAbbr ? buildStateDistanceMap(targetStateAbbr) : null;

				// If nothing matched at all, fall through to downstream booking/vector logic
				if (results.length === 0) {
					// no early return
				} else {
					const prioritized = results.sort((a, b) => {
						const aStateCanonicalFromTitle = extractStateLabelAfterPrefix(a.title);
						const bStateCanonicalFromTitle = extractStateLabelAfterPrefix(b.title);
						const aStateCanonical =
							aStateCanonicalFromTitle || detectStateFromValue(a.state) || null;
						const bStateCanonical =
							bStateCanonicalFromTitle || detectStateFromValue(b.state) || null;

						// 1) Prefer matches to the requested state (when known)
						const aMatchesTarget =
							targetStateSetLc.size > 0 && aStateCanonical
								? targetStateSetLc.has(aStateCanonical.toLowerCase())
								: false;
						const bMatchesTarget =
							targetStateSetLc.size > 0 && bStateCanonical
								? targetStateSetLc.has(bStateCanonical.toLowerCase())
								: false;
						if (aMatchesTarget && !bMatchesTarget) return -1;
						if (!aMatchesTarget && bMatchesTarget) return 1;

						// 2) Prefer closer states (in-state, then neighbors, then farther)
						if (distanceMap) {
							const aAbbr =
								normalizeStateAbbrFromValue(a.state) ||
								(aStateCanonical ? normalizeStateAbbrFromValue(aStateCanonical) : null);
							const bAbbr =
								normalizeStateAbbrFromValue(b.state) ||
								(bStateCanonical ? normalizeStateAbbrFromValue(bStateCanonical) : null);
							const aDistance =
								aAbbr != null
									? distanceMap.get(aAbbr) ?? Number.POSITIVE_INFINITY
									: Number.POSITIVE_INFINITY;
							const bDistance =
								bAbbr != null
									? distanceMap.get(bAbbr) ?? Number.POSITIVE_INFINITY
									: Number.POSITIVE_INFINITY;
							if (aDistance !== bDistance) return aDistance - bDistance;
						}

						// 3) Prefer titles of the form "Restaurants <STATE or ABBR>"
						const aHasStateLabel = !!aStateCanonicalFromTitle;
						const bHasStateLabel = !!bStateCanonicalFromTitle;
						if (aHasStateLabel && !bHasStateLabel) return -1;
						if (!aHasStateLabel && bHasStateLabel) return 1;

						// 4) Then prioritize exact city matches if a target city is known
						const targetCityLc = (forceCityExactCity || queryJson.city || '')
							.trim()
							.toLowerCase();
						const aCityMatch =
							targetCityLc.length > 0 &&
							(a.city || '').trim().toLowerCase() === targetCityLc;
						const bCityMatch =
							targetCityLc.length > 0 &&
							(b.city || '').trim().toLowerCase() === targetCityLc;
						// Prioritize exact city matches (e.g., "New York")
						if (aCityMatch && !bCityMatch) return -1;
						if (!aCityMatch && bCityMatch) return 1;

						// 5) Fallback: simple presence of a state label after prefix
						const aStateTitle = isStateLabelAfterPrefix(a.title);
						const bStateTitle = isStateLabelAfterPrefix(b.title);
						if (aStateTitle && !bStateTitle) return -1;
						if (!aStateTitle && bStateTitle) return 1;

						// 6) Demote cafe matches - cafes are more coffee-focused than restaurant-focused
						const cafePattern = /(^|[^a-z])caf[eé]($|[^a-z])/i;
						const aIsCafe =
							cafePattern.test(a.company || '') ||
							cafePattern.test(a.title || '');
						const bIsCafe =
							cafePattern.test(b.company || '') ||
							cafePattern.test(b.title || '');
						if (!aIsCafe && bIsCafe) return -1;
						if (aIsCafe && !bIsCafe) return 1;

						// 7) Demote hotel matches - hotels are lodging-focused, not restaurant-focused
						const hotelPattern = /\b(hotel|motel|inn|lodge|resort|suites)\b/i;
						const aIsHotel =
							hotelPattern.test(a.company || '') ||
							hotelPattern.test(a.title || '');
						const bIsHotel =
							hotelPattern.test(b.company || '') ||
							hotelPattern.test(b.title || '');
						if (!aIsHotel && bIsHotel) return -1;
						if (aIsHotel && !bIsHotel) return 1;

						// 8) Demote music venue matches - these belong in music venue searches
						const musicVenuePattern = /\b(music hall|concert hall|amphitheat(?:er|re)|arena|pavilion|auditorium|theat(?:er|re)|performing arts|coliseum|stadium|opera|symphony|night ?club|jazz club|live music|music venue)\b/i;
						const aIsMusicVenue =
							musicVenuePattern.test(a.company || '') ||
							musicVenuePattern.test(a.title || '');
						const bIsMusicVenue =
							musicVenuePattern.test(b.company || '') ||
							musicVenuePattern.test(b.title || '');
						if (!aIsMusicVenue && bIsMusicVenue) return -1;
						if (aIsMusicVenue && !bIsMusicVenue) return 1;

						return 0;
					});

					return apiResponse(prioritized.slice(0, finalLimit));
				}
			}
		}

		// Lenient "Coffee Shops" filter: broaden matching to common coffee terms across multiple fields
		{
			const mentionsCoffee =
				/\bcoffee\b|\bcaf[eé]\b|\bespresso\b|\bcoffee shops?\b/i.test(rawQueryForParsing);
			if (mentionsCoffee) {
				const finalLimit = Math.max(
					1,
					Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500)
				);
				const fetchTake = Math.min(finalLimit * 6, 800);
				const allowMarketing = coffeeQueryWantsMarketing(rawQueryForParsing);

				const baseWhere: Prisma.ContactWhereInput = {
					id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				};

				// Keep state strict, but loosen city constraints
				const stateStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceStateAny && forceStateAny.length > 0) {
					stateStrictAnd.push({
						OR: forceStateAny.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				} else if (queryJson.state) {
					const canon = detectStateFromValue(queryJson.state) || queryJson.state;
					const abbr = STATE_NAME_TO_ABBR[String(canon).toLowerCase()];
					const statesToMatch = [canon, abbr].filter(Boolean).map(String);
					stateStrictAnd.push({
						OR: statesToMatch.map((s) => ({
							state: { equals: s, mode: 'insensitive' },
						})),
					});
				}

				// City is optional for lenient coffee search; only enforce if an exact city is forced
				const cityStrictAnd: Prisma.ContactWhereInput[] = [];
				if (forceCityExactCity) {
					cityStrictAnd.push({
						city: { equals: forceCityExactCity, mode: 'insensitive' },
					});
				} else if (forceCityAny && forceCityAny.length > 0) {
					cityStrictAnd.push({
						OR: forceCityAny.map((c) => ({
							city: { equals: c, mode: 'insensitive' },
						})),
					});
				}

				const extractStateLabelAfterCoffeePrefix = (
					title: string | null | undefined
				): string | null => {
					if (!title) return null;
					const trimmed = title.trim();
					const m = /^coffee shops?\b(.*)$/i.exec(trimmed);
					if (!m) return null;
					let rest = m[1].trim();
					// Remove common separators right after prefix
					rest = rest.replace(/^[-–—:|,()\[\]]+/, '').trim();
					// Collapse repeated whitespace
					rest = rest.replace(/\s+/g, ' ').trim();
					if (!rest) return null;
					return rest;
				};

				const titleStateCanonical = (title: string | null | undefined): string | null => {
					const label = extractStateLabelAfterCoffeePrefix(title);
					if (!label) return null;
					return detectStateFromValue(label);
				};

				const COFFEE_TERMS = [
					'coffee',
					'coffee shop',
					'coffee shops',
					'cafe',
					'café',
					'espresso',
					'roaster',
					'roastery',
				];

				const coffeeBroadOr: Prisma.ContactWhereInput = {
					OR: COFFEE_TERMS.flatMap((t) => [
						{ title: { mode: 'insensitive', contains: t } },
						{ company: { mode: 'insensitive', contains: t } },
						{ companyIndustry: { mode: 'insensitive', contains: t } },
						{ website: { mode: 'insensitive', contains: t } },
						{ metadata: { mode: 'insensitive', contains: t } },
					]),
				};

				const candidates: Contact[] = [];
				const seenIds = new Set<number>();
				const addUnique = (items: Contact[]) => {
					for (const c of items) {
						if (seenIds.has(c.id)) continue;
						candidates.push(c);
						seenIds.add(c.id);
					}
				};
				const buildSeenExclusion = (): Prisma.ContactWhereInput =>
					seenIds.size > 0 ? { id: { notIn: Array.from(seenIds) } } : {};

				// If a state is present, prefer exact state-label titles: "Coffee Shops <STATE or ABBR>"
				if (queryJson.state && queryJson.state.trim().length > 0) {
					const canonicalState = detectStateFromValue(queryJson.state) || queryJson.state;
					const targetAbbr = STATE_NAME_TO_ABBR[String(canonicalState).toLowerCase()];
					const targetLabels = new Set(
						[targetAbbr, canonicalState]
							.filter(Boolean)
							.map((s) => String(s).toLowerCase())
					);

					const coffeeTitleStartsWith = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								...cityStrictAnd,
								{ title: { mode: 'insensitive', startsWith: 'Coffee Shops' } },
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: Math.min(fetchTake, 500),
					});

					const preferredByStateLabel = coffeeTitleStartsWith.filter((c) => {
						const label = extractStateLabelAfterCoffeePrefix(c.title);
						if (!label) return false;
						const canon = detectStateFromValue(label) || label;
						return targetLabels.has(canon.toLowerCase());
					});

					addUnique(preferredByStateLabel);
				}

				const primary = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							...cityStrictAnd,
							coffeeBroadOr,
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: fetchTake,
				});
				addUnique(primary);

				// If we're under limit and have a target state, pad with nearby states (same strategy as radio stations).
				if (candidates.length < finalLimit) {
					const targetStateAbbr =
						normalizeStateAbbrFromValue(queryJson.state) ||
						(forceStateAny && forceStateAny.length > 0
							? normalizeStateAbbrFromValue(forceStateAny[0])
							: null);
					if (targetStateAbbr) {
						const buildStateOr = (abbrs: string[]): Prisma.ContactWhereInput | null => {
							if (!abbrs || abbrs.length === 0) return null;
							const values = new Set<string>();
							for (const abbr of abbrs) {
								for (const v of getStateSynonymsForAbbr(abbr)) values.add(v);
							}
							if (values.size === 0) return null;
							return {
								OR: Array.from(values).map((v) => ({
									state: { equals: v, mode: 'insensitive' },
								})),
							};
						};

						const stateRings: string[][] = (() => {
							const dist = buildStateDistanceMap(targetStateAbbr);
							const ringMap = new Map<number, string[]>();
							for (const abbr of ALL_STATE_ABBRS) {
								const d = dist.get(abbr);
								const key = d == null ? 999 : d;
								const arr = ringMap.get(key) ?? [];
								arr.push(abbr);
								ringMap.set(key, arr);
							}
							return Array.from(ringMap.entries())
								.sort((a, b) => a[0] - b[0])
								.map(([, abbrs]) => abbrs.sort());
						})();

						const coffeeTitleStartsWithOr: Prisma.ContactWhereInput = {
							OR: [
								{ title: { mode: 'insensitive', startsWith: 'Coffee Shops' } },
								{ title: { mode: 'insensitive', startsWith: 'Coffee Shop' } },
							],
						};

						// If city was specified strictly, first fill with other coffee shops in the same state (other cities).
						if (candidates.length < finalLimit && cityStrictAnd.length > 0) {
							const stateOr = buildStateOr([targetStateAbbr]);
							if (stateOr) {
								const inStateTitle = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											coffeeTitleStartsWithOr,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - candidates.length,
								});
								addUnique(inStateTitle);

								if (candidates.length < finalLimit) {
									const inStateBroad = await prisma.contact.findMany({
										where: {
											AND: [
												baseWhere,
												buildSeenExclusion(),
												stateOr,
												coffeeBroadOr,
											],
										},
										orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
										take: finalLimit - candidates.length,
									});
									addUnique(inStateBroad);
								}
							}
						}

						// Then fill with nearby states until we hit the limit (proximity-ordered).
						if (candidates.length < finalLimit) {
							for (
								let ringIdx = 1;
								ringIdx < stateRings.length && candidates.length < finalLimit;
								ringIdx++
							) {
								const ring = stateRings[ringIdx] ?? [];
								if (ring.length === 0) continue;
								const stateOr = buildStateOr(ring);
								if (!stateOr) continue;
								const filler = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											coffeeTitleStartsWithOr,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - candidates.length,
								});
								addUnique(filler);
							}
						}

						// Finally, if still under limit, widen to broader coffee signals in nearby states.
						if (candidates.length < finalLimit) {
							for (
								let ringIdx = 1;
								ringIdx < stateRings.length && candidates.length < finalLimit;
								ringIdx++
							) {
								const ring = stateRings[ringIdx] ?? [];
								if (ring.length === 0) continue;
								const stateOr = buildStateOr(ring);
								if (!stateOr) continue;
								const filler = await prisma.contact.findMany({
									where: {
										AND: [
											baseWhere,
											buildSeenExclusion(),
											stateOr,
											coffeeBroadOr,
										],
									},
									orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
									take: finalLimit - candidates.length,
								});
								addUnique(filler);
							}
						}
					}
				}

				// Prefer records explicitly labeled as "Coffee Shops" in title
				if (candidates.length > 0 || !useVectorSearch) {
					const scoreCoffeeTitle = (title: string | null | undefined): number => {
						const t = (title || '').trim().toLowerCase();
						let s = 0;
						if (t.startsWith('coffee shops')) s += 4;
						else if (t.startsWith('coffee shop')) s += 3;
						if (t.includes('coffee shops')) s += 2;
						if (t.includes('coffee shop')) s += 1;
						return s;
					};

					const targetStateAbbrForSort =
						normalizeStateAbbrFromValue(queryJson.state) ||
						(forceStateAny && forceStateAny.length > 0
							? normalizeStateAbbrFromValue(forceStateAny[0])
							: null);
					const distanceMap = targetStateAbbrForSort
						? buildStateDistanceMap(targetStateAbbrForSort)
						: null;
					const targetCityLc = normalizeSearchText(forceCityExactCity || queryJson.city || '');

					// Filter out contacts that look like non-coffee businesses
					// (e.g., marketing agencies, tech companies with "coffee" in name)
					const filteredCandidates = candidates.filter(
						(c) => !contactLooksLikeNonCoffeeBusinessForCoffeeSearch(c, allowMarketing)
					);

					const scored = filteredCandidates.map((c) => {
						const titleCanon = titleStateCanonical(c.title);
						const stateAbbrForDistance =
							normalizeStateAbbrFromValue(c.state) ||
							(titleCanon ? normalizeStateAbbrFromValue(titleCanon) : null);
						const distance =
							distanceMap && stateAbbrForDistance
								? distanceMap.get(stateAbbrForDistance) ?? Number.POSITIVE_INFINITY
								: Number.POSITIVE_INFINITY;
						const cityMatch =
							targetCityLc.length > 0 &&
							normalizeSearchText(c.city) === targetCityLc;
						return {
							contact: c,
							distance,
							cityMatch,
							coffeeTitleScore: scoreCoffeeTitle(c.title),
							marketingPenalty:
								!allowMarketing && contactLooksLikeCoffeeMarketingRole(c) ? 1 : 0,
						};
					});

					scored.sort((a, b) => {
						// Prefer closer states (in-state, then neighbors, then farther)
						if (a.distance !== b.distance) return a.distance - b.distance;
						// Prefer explicit Coffee Shops title labeling
						if (a.coffeeTitleScore !== b.coffeeTitleScore) {
							return b.coffeeTitleScore - a.coffeeTitleScore;
						}
						// Prefer exact city matches (if applicable)
						if (a.cityMatch !== b.cityMatch) return a.cityMatch ? -1 : 1;
						// Demote marketing-oriented roles for coffee searches
						if (a.marketingPenalty !== b.marketingPenalty) {
							return a.marketingPenalty - b.marketingPenalty;
						}
						// Stable-ish fallback
						return (a.contact.company || '').localeCompare(b.contact.company || '');
					});

					return apiResponse(scored.map((x) => x.contact).slice(0, finalLimit));
				}
				// If still empty and vector requested, let vector path try below
			}
		}

		// Special-case: wine/beer/spirits queries - return only beverage venue titles
		if (isWineBeerSpiritsQuery) {
			const finalLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500));
			const beveragePrefixes = ['Wineries', 'Distilleries', 'Breweries', 'Cideries'];

			const baseWhere: Prisma.ContactWhereInput = {
				id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
				emailValidationStatus: verificationStatus
					? { equals: verificationStatus }
					: undefined,
			};

			const stateStrictAnd: Prisma.ContactWhereInput[] = [];
			if (forceStateAny && forceStateAny.length > 0) {
				stateStrictAnd.push({
					OR: forceStateAny.map((s) => ({
						state: { equals: s, mode: 'insensitive' },
					})),
				});
			} else if (queryJson.state) {
				stateStrictAnd.push({
					state: { equals: queryJson.state, mode: 'insensitive' },
				});
			}

			const cityStrictAnd: Prisma.ContactWhereInput[] = [];
			if (forceCityExactCity) {
				cityStrictAnd.push({
					city: { equals: forceCityExactCity, mode: 'insensitive' },
				});
			} else if (forceCityAny && forceCityAny.length > 0) {
				cityStrictAnd.push({
					OR: forceCityAny.map((c) => ({
						city: { equals: c, mode: 'insensitive' },
					})),
				});
			}

			const beverageStartsWithOr: Prisma.ContactWhereInput = {
				OR: beveragePrefixes.map((p) => ({
					title: { mode: 'insensitive', startsWith: p },
				})),
			};
			const beverageContainsOr: Prisma.ContactWhereInput = {
				OR: beveragePrefixes.map((p) => ({
					title: { mode: 'insensitive', contains: p },
				})),
			};

			const primary = await prisma.contact.findMany({
				where: {
					AND: [
						baseWhere,
						...stateStrictAnd,
						...cityStrictAnd,
						beverageStartsWithOr,
					],
				},
				orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
				take: finalLimit,
			});

			const results = primary.slice();
			const seen = new Set(results.map((c) => c.id));
			const addUnique = (items: typeof primary) => {
				for (const c of items) {
					if (seen.has(c.id)) continue;
					results.push(c);
					seen.add(c.id);
					if (results.length >= finalLimit) break;
				}
			};
			const buildSeenExclusion = (): Prisma.ContactWhereInput =>
				seen.size > 0 ? { id: { notIn: Array.from(seen) } } : {};

			// First, if we're under limit, allow contains-based fill within the strict location.
			if (results.length < finalLimit) {
				const fillerSameLocation = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							buildSeenExclusion(),
							...stateStrictAnd,
							...cityStrictAnd,
							beverageContainsOr,
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: finalLimit - results.length,
				});
				addUnique(fillerSameLocation);
			}

			// If we have a target state, we can pad with nearby states (same strategy as radio station filling).
			const targetStateAbbr =
				normalizeStateAbbrFromValue(queryJson.state) ||
				(forceStateAny && forceStateAny.length > 0
					? normalizeStateAbbrFromValue(forceStateAny[0])
					: null);
			const buildStateOr = (abbrs: string[]): Prisma.ContactWhereInput | null => {
				if (!abbrs || abbrs.length === 0) return null;
				const values = new Set<string>();
				for (const abbr of abbrs) {
					for (const v of getStateSynonymsForAbbr(abbr)) values.add(v);
				}
				if (values.size === 0) return null;
				return {
					OR: Array.from(values).map((v) => ({
						state: { equals: v, mode: 'insensitive' },
					})),
				};
			};
			const stateRings: string[][] = targetStateAbbr
				? (() => {
						const dist = buildStateDistanceMap(targetStateAbbr);
						const ringMap = new Map<number, string[]>();
						for (const abbr of ALL_STATE_ABBRS) {
							const d = dist.get(abbr);
							const key = d == null ? 999 : d;
							const arr = ringMap.get(key) ?? [];
							arr.push(abbr);
							ringMap.set(key, arr);
						}
						return Array.from(ringMap.entries())
							.sort((a, b) => a[0] - b[0])
							.map(([, abbrs]) => abbrs.sort());
				  })()
				: [];

			// If city was specified, first fill with other beverage venues in the same state (other cities)
			if (results.length < finalLimit && targetStateAbbr && cityStrictAnd.length > 0) {
				const stateOr = buildStateOr([targetStateAbbr]);
				if (stateOr) {
					const inStateStartsWith = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								buildSeenExclusion(),
								stateOr,
								beverageStartsWithOr,
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: finalLimit - results.length,
					});
					addUnique(inStateStartsWith);

					if (results.length < finalLimit) {
						const inStateContains = await prisma.contact.findMany({
							where: {
								AND: [
									baseWhere,
									buildSeenExclusion(),
									stateOr,
									beverageContainsOr,
								],
							},
							orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
							take: finalLimit - results.length,
						});
						addUnique(inStateContains);
					}
				}
			}

			// Then fill with nearby states until we hit the limit (proximity-ordered).
			if (results.length < finalLimit && targetStateAbbr) {
				for (
					let ringIdx = 1;
					ringIdx < stateRings.length && results.length < finalLimit;
					ringIdx++
				) {
					const ring = stateRings[ringIdx] ?? [];
					if (ring.length === 0) continue;
					const stateOr = buildStateOr(ring);
					if (!stateOr) continue;
					const filler = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								buildSeenExclusion(),
								stateOr,
								beverageStartsWithOr,
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: finalLimit - results.length,
					});
					addUnique(filler);
				}
			}

			// Finally, if still under limit, widen to contains-based matches in nearby states (still proximity-ordered).
			if (results.length < finalLimit) {
				if (targetStateAbbr) {
					for (
						let ringIdx = 1;
						ringIdx < stateRings.length && results.length < finalLimit;
						ringIdx++
					) {
						const ring = stateRings[ringIdx] ?? [];
						if (ring.length === 0) continue;
						const stateOr = buildStateOr(ring);
						if (!stateOr) continue;
						const filler = await prisma.contact.findMany({
							where: {
								AND: [
									baseWhere,
									buildSeenExclusion(),
									stateOr,
									beverageContainsOr,
								],
							},
							orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
							take: finalLimit - results.length,
						});
						addUnique(filler);
					}
				} else {
					const filler = await prisma.contact.findMany({
						where: {
							AND: [
								baseWhere,
								buildSeenExclusion(),
								...stateStrictAnd,
								...cityStrictAnd,
								beverageContainsOr,
							],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: finalLimit - results.length,
					});
					addUnique(filler);
				}
			}

			// Do not apply booking title-prefix filtering here; this flow enforces the
			// beverage categories directly.
			return apiResponse(results.slice(0, finalLimit));
		}

		// Special-case: Wedding planner searches - more lenient matching for wedding-related contacts
		if (isWeddingPlannerQuery) {
			const finalLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500));

			// Aggregator sites to exclude
			const excludedDomains = [
				'weddingwire',
				'theknot',
				'wedding.com',
				'zola.com',
				'bridebook',
				'hitched',
			];

			const baseWhere: Prisma.ContactWhereInput = {
				id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
				emailValidationStatus: verificationStatus
					? { equals: verificationStatus }
					: undefined,
				// Exclude aggregator sites and restaurants
				AND: [
					...excludedDomains.map(
						(domain): Prisma.ContactWhereInput => ({
							NOT: {
								OR: [
									{ website: { contains: domain, mode: 'insensitive' } },
									{ company: { contains: domain, mode: 'insensitive' } },
									{ email: { contains: domain, mode: 'insensitive' } },
								],
							},
						})
					),
					// Exclude restaurants from wedding planner searches
					{
						NOT: {
							OR: [
								{ title: { startsWith: 'Restaurants', mode: 'insensitive' } },
								{ title: { startsWith: 'Restaurant ', mode: 'insensitive' } },
							],
						},
					},
				],
			};

			// State matching - lenient, not strict
			const stateAnd: Prisma.ContactWhereInput[] = [];
			if (forceStateAny && forceStateAny.length > 0) {
				stateAnd.push({
					OR: forceStateAny.map((s) => ({
						state: { equals: s, mode: 'insensitive' },
					})),
				});
			} else if (queryJson.state) {
				const canon = detectStateFromValue(queryJson.state) || queryJson.state;
				const abbr = STATE_NAME_TO_ABBR[String(canon).toLowerCase()];
				const statesToMatch = [canon, abbr].filter(Boolean).map(String);
				stateAnd.push({
					OR: statesToMatch.map((s) => ({
						state: { equals: s, mode: 'insensitive' },
					})),
				});
			}

			// City matching - only if explicitly specified
			const cityAnd: Prisma.ContactWhereInput[] = [];
			if (forceCityExactCity) {
				cityAnd.push({
					city: { equals: forceCityExactCity, mode: 'insensitive' },
				});
			} else if (forceCityAny && forceCityAny.length > 0) {
				cityAnd.push({
					OR: forceCityAny.map((c) => ({
						city: { equals: c, mode: 'insensitive' },
					})),
				});
			}

			// Wedding-related search terms - filter for contacts with "wedding" in relevant fields
			const weddingTermsOr: Prisma.ContactWhereInput = {
				OR: [
					{ title: { contains: 'wedding', mode: 'insensitive' } },
					{ company: { contains: 'wedding', mode: 'insensitive' } },
					{ headline: { contains: 'wedding', mode: 'insensitive' } },
					{ metadata: { contains: 'wedding', mode: 'insensitive' } },
					{ companyIndustry: { contains: 'wedding', mode: 'insensitive' } },
					// Also include "bridal" as a related term
					{ title: { contains: 'bridal', mode: 'insensitive' } },
					{ company: { contains: 'bridal', mode: 'insensitive' } },
					{ headline: { contains: 'bridal', mode: 'insensitive' } },
					{ companyIndustry: { contains: 'bridal', mode: 'insensitive' } },
					// Event planner/coordinator that might do weddings
					{ title: { contains: 'event planner', mode: 'insensitive' } },
					{ title: { contains: 'event coordinator', mode: 'insensitive' } },
				],
			};

			// Relevance scoring function - higher score = more relevant to "wedding planner"
			const scoreWeddingRelevance = (c: Contact): number => {
				let score = 0;
				const title = (c.title || '').toLowerCase();
				const company = (c.company || '').toLowerCase();
				const headline = (c.headline || '').toLowerCase();
				const industry = (c.companyIndustry || '').toLowerCase();
				const metadata = (c.metadata || '').toLowerCase();

				// Highest priority: exact "wedding planner" or "wedding coordinator" in title
				if (/wedding\s*(planner|coordinator|organizer|consultant)/i.test(title)) {
					score += 100;
				}
				// High priority: "wedding planner" in company name
				if (/wedding\s*(planner|coordinator|organizer|consultant)/i.test(company)) {
					score += 80;
				}
				// High priority: "wedding planner" in headline
				if (/wedding\s*(planner|coordinator|organizer|consultant)/i.test(headline)) {
					score += 70;
				}
				// Medium priority: "wedding" in title without planner
				if (title.includes('wedding') && score < 100) {
					score += 50;
				}
				// Medium priority: "bridal" terms
				if (title.includes('bridal') || company.includes('bridal')) {
					score += 45;
				}
				// Medium priority: "wedding" in company name
				if (company.includes('wedding') && score < 80) {
					score += 40;
				}
				// Lower priority: "wedding" in industry/metadata
				if (industry.includes('wedding') || industry.includes('bridal')) {
					score += 30;
				}
				if (metadata.includes('wedding') || metadata.includes('bridal')) {
					score += 20;
				}
				// Lower priority: general event planners (might do weddings)
				if (
					/event\s*(planner|coordinator|organizer)/i.test(title) ||
					/event\s*(planner|coordinator|organizer)/i.test(company)
				) {
					score += 15;
				}

				return score;
			};

			const results: Contact[] = [];
			const seen = new Set<number>();
			const addUnique = (items: Contact[]) => {
				for (const c of items) {
					if (seen.has(c.id)) continue;
					results.push(c);
					seen.add(c.id);
				}
			};
			const buildSeenExclusion = (): Prisma.ContactWhereInput =>
				seen.size > 0 ? { id: { notIn: Array.from(seen) } } : {};

			// First: find all wedding-related contacts in the target state/city
			const primaryResults = await prisma.contact.findMany({
				where: {
					AND: [baseWhere, ...stateAnd, ...cityAnd, weddingTermsOr],
				},
				take: finalLimit * 3, // Fetch more to allow for sorting
			});
			addUnique(primaryResults);

			// If city was specified but we have few results, expand to rest of state
			if (results.length < finalLimit && cityAnd.length > 0 && stateAnd.length > 0) {
				const stateWideResults = await prisma.contact.findMany({
					where: {
						AND: [baseWhere, buildSeenExclusion(), ...stateAnd, weddingTermsOr],
					},
					take: finalLimit * 2,
				});
				addUnique(stateWideResults);
			}

			// If still under limit and we have a target state, fill from nearby states
			const targetStateAbbr =
				normalizeStateAbbrFromValue(queryJson.state) ||
				(forceStateAny && forceStateAny.length > 0
					? normalizeStateAbbrFromValue(forceStateAny[0])
					: null);

			if (results.length < finalLimit && targetStateAbbr) {
				const dist = buildStateDistanceMap(targetStateAbbr);
				const ringMap = new Map<number, string[]>();
				for (const abbr of ALL_STATE_ABBRS) {
					const d = dist.get(abbr);
					const key = d == null ? 999 : d;
					const arr = ringMap.get(key) ?? [];
					arr.push(abbr);
					ringMap.set(key, arr);
				}
				const stateRings = Array.from(ringMap.entries())
					.sort((a, b) => a[0] - b[0])
					.map(([, abbrs]) => abbrs.sort());

				for (
					let ringIdx = 1;
					ringIdx < stateRings.length && results.length < finalLimit;
					ringIdx++
				) {
					const ring = stateRings[ringIdx] ?? [];
					if (ring.length === 0) continue;

					const stateValues = new Set<string>();
					for (const abbr of ring) {
						for (const v of getStateSynonymsForAbbr(abbr)) stateValues.add(v);
					}
					if (stateValues.size === 0) continue;

					const nearbyStateOr: Prisma.ContactWhereInput = {
						OR: Array.from(stateValues).map((v) => ({
							state: { equals: v, mode: 'insensitive' },
						})),
					};

					const nearbyResults = await prisma.contact.findMany({
						where: {
							AND: [baseWhere, buildSeenExclusion(), nearbyStateOr, weddingTermsOr],
						},
						take: finalLimit - results.length,
					});
					addUnique(nearbyResults);
				}
			}

			// Sort results by wedding relevance score (highest first)
			results.sort((a, b) => scoreWeddingRelevance(b) - scoreWeddingRelevance(a));

			return apiResponse(results.slice(0, finalLimit));
		}

		// Special-case: Booking searches - filter to specific title prefixes and respect strict state if present
		if (isBookingSearch) {
			const finalLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500));

			const baseWhere: Prisma.ContactWhereInput = {
				id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
				emailValidationStatus: verificationStatus
					? {
							equals: verificationStatus,
					  }
					: undefined,
			};

			// Strict state matching when present
			const stateStrictAnd: Prisma.ContactWhereInput[] = [];
			if (forceStateAny && forceStateAny.length > 0) {
				stateStrictAnd.push({
					OR: forceStateAny.map((s) => ({
						state: { equals: s, mode: 'insensitive' },
					})),
				});
			} else if (queryJson.state) {
				stateStrictAnd.push({
					state: { equals: queryJson.state, mode: 'insensitive' },
				});
			}
			
			// Strict city matching when present
			const cityStrictAnd: Prisma.ContactWhereInput[] = [];
			if (forceCityExactCity) {
				cityStrictAnd.push({
					city: { equals: forceCityExactCity, mode: 'insensitive' },
				});
			} else if (forceCityAny && forceCityAny.length > 0) {
				cityStrictAnd.push({
					OR: forceCityAny.map((c) => ({
						city: { equals: c, mode: 'insensitive' },
					})),
				});
			}

			const defaultTitlePrefixes = [
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
			];

			const cleanQuery = queryJson.restOfQuery.trim();
			const effectivePrefixes =
				cleanQuery.length > 0 ? [cleanQuery] : defaultTitlePrefixes;

			const primary = await prisma.contact.findMany({
				where: {
					AND: [
						baseWhere,
						...stateStrictAnd,
						...cityStrictAnd,
						{
							OR: effectivePrefixes.map((p) => ({
								title: { mode: 'insensitive', startsWith: p },
							})),
						},
					],
				},
				orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
				take: finalLimit,
			});
			
			// Optional: if under limit, allow contains-based fill (still title-focused)
			const results = primary;
			if (results.length < finalLimit) {
				const filler = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							...cityStrictAnd,
							{
								OR: effectivePrefixes.map((p) => ({
									title: { mode: 'insensitive', contains: p },
								})),
							},
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: finalLimit - results.length,
				});
				const seen = new Set(results.map((c) => c.id));
				for (const c of filler) {
					if (seen.has(c.id)) continue;
					results.push(c);
					seen.add(c.id);
					if (results.length >= finalLimit) break;
				}
			}

			const filteredResults = shouldFilterBookingTitles
				? filterContactsByTitlePrefix(results, bookingTitlePrefix)
				: results;
			
			// Reorder to put exact city matches first when a target city is known
			const targetCityLc = (forceCityExactCity || queryJson.city || '')
				.trim()
				.toLowerCase();
			const orderedResults =
				targetCityLc.length === 0
					? filteredResults
					: filteredResults.slice().sort((a, b) => {
							const aCityMatch = (a.city || '').trim().toLowerCase() === targetCityLc;
							const bCityMatch = (b.city || '').trim().toLowerCase() === targetCityLc;
							if (aCityMatch && !bCityMatch) return -1;
							if (!aCityMatch && bCityMatch) return 1;
							return 0;
					  });

			if (filteredResults.length > 0 || !useVectorSearch) {
				return apiResponse(orderedResults.slice(0, finalLimit));
			}
			// When vector search is requested but Prisma lacks matches, fall through
			// so Elasticsearch/vector logic below can attempt to satisfy the query.
		}

		// Special-case: Promotion searches prioritize Radio Stations across all states
		if (isPromotionSearch) {
			const finalLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 500));
			const radioTitleWhere: Prisma.StringFilter = {
				mode: 'insensitive',
				contains: 'radio station',
			};

			const baseWhere: Prisma.ContactWhereInput = {
				emailValidationStatus: verificationStatus
					? {
							equals: verificationStatus,
					  }
					: undefined,
			};
			const usedExclusion: Prisma.ContactWhereInput =
				addedContactIds.length > 0 ? { id: { notIn: addedContactIds } } : {};
			// Enforce strict state matching when a state is present in the query
			const stateStrictAnd: Prisma.ContactWhereInput[] = [];
			if (forceStateAny && forceStateAny.length > 0) {
				stateStrictAnd.push({
					OR: forceStateAny.map((s) => ({
						state: { equals: s, mode: 'insensitive' },
					})),
				});
			} else if (queryJson.state) {
				stateStrictAnd.push({
					state: { equals: queryJson.state, mode: 'insensitive' },
				});
			}

			// Strict city matching when present
			const cityStrictAnd: Prisma.ContactWhereInput[] = [];
			if (forceCityExactCity) {
				cityStrictAnd.push({
					city: { equals: forceCityExactCity, mode: 'insensitive' },
				});
			} else if (forceCityAny && forceCityAny.length > 0) {
				cityStrictAnd.push({
					OR: forceCityAny.map((c) => ({
						city: { equals: c, mode: 'insensitive' },
					})),
				});
			}

			// Fetch contacts with title indicating Radio Stations first
			const primary = await prisma.contact.findMany({
				where: {
					AND: [
						baseWhere,
						usedExclusion,
						...stateStrictAnd,
						...cityStrictAnd,
						{
							OR: [
								{ title: radioTitleWhere },
								{ company: { mode: 'insensitive', contains: 'radio station' } },
							],
						},
					],
				},
				orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
				take: finalLimit,
			});

			const results = primary;
			const seen = new Set(results.map((c) => c.id));
			const addUnique = (items: typeof primary) => {
				for (const c of items) {
					if (seen.has(c.id)) continue;
					results.push(c);
					seen.add(c.id);
					if (results.length >= finalLimit) break;
				}
			};
			const buildExclusionWhere = (): Prisma.ContactWhereInput => {
				const excluded = new Set<number>([...addedContactIds, ...Array.from(seen)]);
				return excluded.size > 0 ? { id: { notIn: Array.from(excluded) } } : {};
			};
			const buildStateOr = (abbrs: string[]): Prisma.ContactWhereInput | null => {
				if (!abbrs || abbrs.length === 0) return null;
				const values = new Set<string>();
				for (const abbr of abbrs) {
					for (const v of getStateSynonymsForAbbr(abbr)) values.add(v);
				}
				if (values.size === 0) return null;
				return {
					OR: Array.from(values).map((v) => ({
						state: { equals: v, mode: 'insensitive' },
					})),
				};
			};

			const targetStateAbbr =
				normalizeStateAbbrFromValue(queryJson.state) ||
				(forceStateAny && forceStateAny.length > 0
					? normalizeStateAbbrFromValue(forceStateAny[0])
					: null);
			const stateRings: string[][] = targetStateAbbr
				? (() => {
						const dist = buildStateDistanceMap(targetStateAbbr);
						const ringMap = new Map<number, string[]>();
						for (const abbr of ALL_STATE_ABBRS) {
							const d = dist.get(abbr);
							const key = d == null ? 999 : d;
							const arr = ringMap.get(key) ?? [];
							arr.push(abbr);
							ringMap.set(key, arr);
						}
						return Array.from(ringMap.entries())
							.sort((a, b) => a[0] - b[0])
							.map(([, abbrs]) => abbrs.sort());
				  })()
				: [ALL_STATE_ABBRS.slice().sort()];

			const radioStationOr: Prisma.ContactWhereInput = {
				OR: [
					{ title: radioTitleWhere },
					{ company: { mode: 'insensitive', contains: 'radio station' } },
				],
			};

			// If city was specified, first fill with other Radio Stations in the same state (other cities)
			if (results.length < finalLimit && targetStateAbbr && cityStrictAnd.length > 0) {
				const stateOr = buildStateOr([targetStateAbbr]);
				const whereAnd: Prisma.ContactWhereInput[] = [
					baseWhere,
					buildExclusionWhere(),
					radioStationOr,
				];
				if (stateOr) whereAnd.push(stateOr);
				const inState = await prisma.contact.findMany({
					where: { AND: whereAnd },
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: finalLimit - results.length,
				});
				addUnique(inState);
			}

			// Then fill with radio stations in nearby states until we hit the limit
			if (results.length < finalLimit) {
				if (targetStateAbbr) {
					for (
						let ringIdx = 1;
						ringIdx < stateRings.length && results.length < finalLimit;
						ringIdx++
					) {
						const ring = stateRings[ringIdx] ?? [];
						if (ring.length === 0) continue;
						const stateOr = buildStateOr(ring);
						const whereAnd: Prisma.ContactWhereInput[] = [
							baseWhere,
							buildExclusionWhere(),
							radioStationOr,
						];
						if (stateOr) whereAnd.push(stateOr);
						const filler = await prisma.contact.findMany({
							where: { AND: whereAnd },
							orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
							take: finalLimit - results.length,
						});
						addUnique(filler);
					}
				} else {
					const filler = await prisma.contact.findMany({
						where: {
							AND: [baseWhere, buildExclusionWhere(), radioStationOr],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: finalLimit - results.length,
					});
					addUnique(filler);
				}
			}

			// Finally, if we still didn't hit the limit, fill with broader radio-related signals (still proximity-ordered)
			if (results.length < finalLimit) {
				const broadRadioOr: Prisma.ContactWhereInput = {
					OR: [
						{ headline: { mode: 'insensitive', contains: 'radio' } },
						{ companyIndustry: { mode: 'insensitive', contains: 'radio' } },
						{ metadata: { mode: 'insensitive', contains: 'radio' } },
					],
				};
				if (targetStateAbbr) {
					for (
						let ringIdx = 0;
						ringIdx < stateRings.length && results.length < finalLimit;
						ringIdx++
					) {
						const ring = stateRings[ringIdx] ?? [];
						if (ring.length === 0) continue;
						const stateOr = buildStateOr(ring);
						const whereAnd: Prisma.ContactWhereInput[] = [
							baseWhere,
							buildExclusionWhere(),
							broadRadioOr,
						];
						if (stateOr) whereAnd.push(stateOr);
						const filler = await prisma.contact.findMany({
							where: { AND: whereAnd },
							orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
							take: finalLimit - results.length,
						});
						addUnique(filler);
					}
				} else {
					const filler = await prisma.contact.findMany({
						where: {
							AND: [baseWhere, buildExclusionWhere(), broadRadioOr],
						},
						orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
						take: finalLimit - results.length,
					});
					addUnique(filler);
				}
			}

			return apiResponse(results.slice(0, finalLimit));
		}

		const substringSearch = async (): Promise<Contact[]> => {
			// For booking-style queries, ignore directive tokens (e.g. "[booking]")
			// and raw parenthetical locations when building search terms. Use the
			// cleaned, non-location portion of the query instead so we don't require
			// impossible literal matches like "[booking]" or "(philadelphia, pa)".
			// Always prefer the non-location portion (restOfQuery) for term matching,
			// regardless of booking mode, to avoid forcing tokens like "(new" or "ny)".
			const baseSearch = (
				queryJson?.restOfQuery ||
				rawQueryForParsing ||
				query ||
				''
			).toLowerCase();

			const searchTerms: string[] = baseSearch
				.split(/\s+/)
				.filter((term) => term.length > 0);
			const caseInsensitiveMode = 'insensitive' as const;
			// Build location OR conditions only when parsed parts are present to satisfy Prisma types
			const locationOr: Prisma.ContactWhereInput[] = [];
			if (locationFilter) {
				if (queryJson.city) {
					locationOr.push(
						{ city: { contains: queryJson.city, mode: caseInsensitiveMode } },
						{ address: { contains: queryJson.city, mode: caseInsensitiveMode } }
					);
				}
				if (queryJson.state) {
					locationOr.push(
						{ state: { contains: queryJson.state, mode: caseInsensitiveMode } },
						{ address: { contains: queryJson.state, mode: caseInsensitiveMode } }
					);
				}
				if (queryJson.country) {
					locationOr.push(
						{ country: { contains: queryJson.country, mode: caseInsensitiveMode } },
						{ address: { contains: queryJson.country, mode: caseInsensitiveMode } }
					);
				}
			}

			// If preprocessing hinted an exact city (e.g., Philadelphia strict mode), enforce strict city/state
			const strictLocationAnd: Prisma.ContactWhereInput[] = [];
			if (forceCityExactCity) {
				strictLocationAnd.push({
					city: { equals: forceCityExactCity, mode: caseInsensitiveMode },
				});
			}
			if (
				(forceCityExactCity || (forceCityAny && forceCityAny.length > 0)) &&
				queryJson.state
			) {
				if (forceStateAny && forceStateAny.length > 0) {
					strictLocationAnd.push({
						OR: forceStateAny.map((s) => ({
							state: { equals: s, mode: caseInsensitiveMode },
						})),
					});
				} else {
					strictLocationAnd.push({
						state: { equals: queryJson.state, mode: caseInsensitiveMode },
					});
				}
			}
			if (forceCityAny && forceCityAny.length > 0) {
				strictLocationAnd.push({
					OR: forceCityAny.map((c) => ({
						city: { equals: c, mode: caseInsensitiveMode },
					})),
				});
			}

			const whereConditions: Prisma.ContactWhereInput = {
				AND: [
					// Search terms condition (only if there are search terms)
					...(searchTerms.length > 0
						? [
								{
									AND: searchTerms.map((term) => ({
										OR: [
											{ firstName: { contains: term, mode: caseInsensitiveMode } },
											{ lastName: { contains: term, mode: caseInsensitiveMode } },
											{ title: { contains: term, mode: caseInsensitiveMode } },
											{ email: { contains: term, mode: caseInsensitiveMode } },
											{ company: { contains: term, mode: caseInsensitiveMode } },
											{ city: { contains: term, mode: caseInsensitiveMode } },
											{ state: { contains: term, mode: caseInsensitiveMode } },
											{ country: { contains: term, mode: caseInsensitiveMode } },
											{ address: { contains: term, mode: caseInsensitiveMode } },
											{ headline: { contains: term, mode: caseInsensitiveMode } },
											{ linkedInUrl: { contains: term, mode: caseInsensitiveMode } },
											{ website: { contains: term, mode: caseInsensitiveMode } },
											{ phone: { contains: term, mode: caseInsensitiveMode } },
										],
									})),
								},
						  ]
						: []),
					// Email validation status condition
					...(verificationStatus
						? [{ emailValidationStatus: { equals: verificationStatus } }]
						: []),
					// Location condition (must match at least one location field)
					...(locationFilter && locationOr.length > 0 ? [{ OR: locationOr }] : []),
					// Strict city/state enforcement when we have forceCityExactCity from preprocessing (e.g., Philadelphia)
					...(strictLocationAnd.length > 0 ? strictLocationAnd : []),
					// Exclude used contacts condition
					...(excludeUsedContacts && addedContactIds.length > 0
						? [{ id: { notIn: addedContactIds } }]
						: []),
				],
			};

			// Overshoot take for venue-like queries so we can fill tail with aux (bars/restaurants)
			const requestedLimit = limit ?? VECTOR_SEARCH_LIMIT_DEFAULT;
			const effectiveTake = requestedLimit;

			return await prisma.contact.findMany({
				where: whereConditions,
				take: effectiveTake,
				orderBy: {
					userContactListCount: 'asc',
				},
			});
		};

		// if it's a search by ContactListId, only filter by this ContactList.id and validation status
		if (numberContactListIds.length > 0) {
			contacts = await prisma.contact.findMany({
				where: {
					userContactLists: {
						some: {
							id: {
								in: numberContactListIds,
							},
						},
					},
					emailValidationStatus: {
						equals: verificationStatus,
					},
				},
				orderBy: {
					company: 'asc',
				},
			});
			return apiResponse(contacts);
		}

		// If vector search is enabled and we have a query, use vector search
		if (useVectorSearch && query) {
			// Determine if this is a venue-like query that uses positive signals; overshoot to allow a lenient tail
			let postTrainingProfile;
			try {
				postTrainingProfile = await getPostTrainingForQuery(query || '');
			} catch (error) {
				console.error('Error getting post training profile:', error);
				postTrainingProfile = { active: false, excludeTerms: [], demoteTerms: [] };
			}
			const effectiveVectorLimit = postTrainingProfile.requirePositive
				? Math.min(Math.max(requestedLimit + 20, Math.ceil(requestedLimit * 1.2)), 200)
				: requestedLimit;
			// Protect the vector path with a timeout and fallback to substring search
			const vectorSearchWithTimeout = async () => {
				const timeoutMs = 14000;
				return await Promise.race([
					searchSimilarContacts(
						queryJson,
						effectiveVectorLimit,
						effectiveLocationStrategy,
						{
							penaltyCities,
							forceCityExactCity,
							forceStateAny,
							forceCityAny,
							penaltyTerms,
							strictPenalty,
						}
					),
					new Promise<never>((_, reject) =>
						setTimeout(() => reject(new Error('Vector search timed out')), timeoutMs)
					),
				]);
			};

			let vectorSearchResults;
			try {
				vectorSearchResults = await vectorSearchWithTimeout();
			} catch (e) {
				console.warn(
					'Vector search timed out or failed, falling back to substring search.',
					e
				);
				const fallback = await substringSearch();
				const filteredFallback = shouldFilterBookingTitles
					? filterContactsByTitlePrefix(fallback, bookingTitlePrefix)
					: fallback;
				return apiResponse(filteredFallback);
			}

			// If vector returns no matches (e.g., strict state filter too narrow), fall back to substring search
			if (!vectorSearchResults?.matches || vectorSearchResults.matches.length === 0) {
				console.warn(
					'Vector search returned no matches, falling back to substring search.'
				);
				const fallback = await substringSearch();
				return apiResponse(fallback);
			}
			// Pre-filter ES matches using post-training to remove academic institutions early,
			// but allow a lenient tail to fill close-to-limit venue searches
			const prePostProfile = postTrainingProfile;
			let esMatches = vectorSearchResults.matches;
			if (prePostProfile.active && esMatches.length > 0) {
				type EsMatch = { id: string; score: number; metadata: Record<string, unknown> };
				const excludeTerms = prePostProfile.excludeTerms.map((t) => t.toLowerCase());
				const includeCompany = (prePostProfile.includeCompanyTerms || []).map((t) =>
					t.toLowerCase()
				);
				const includeTitle = (prePostProfile.includeTitleTerms || []).map((t) =>
					t.toLowerCase()
				);
				const includeWebsite = (prePostProfile.includeWebsiteTerms || []).map((t) =>
					t.toLowerCase()
				);
				const includeIndustry = (prePostProfile.includeIndustryTerms || []).map((t) =>
					t.toLowerCase()
				);
				const auxCompany = (prePostProfile.auxCompanyTerms || []).map((t) =>
					t.toLowerCase()
				);
				const auxTitle = (prePostProfile.auxTitleTerms || []).map((t) => t.toLowerCase());
				const auxWebsite = (prePostProfile.auxWebsiteTerms || []).map((t) =>
					t.toLowerCase()
				);
				const auxIndustry = (prePostProfile.auxIndustryTerms || []).map((t) =>
					t.toLowerCase()
				);
				const containsAny = (text: string | null | undefined, terms: string[]) => {
					if (!text) return false;
					const lc = String(text).toLowerCase();
					return terms.some((t) => lc.includes(t));
				};
				const metaValue = (
					md: Record<string, unknown> | undefined,
					key: string
				): string | null => {
					if (!md) return null;
					const value = (md as Record<string, unknown>)[key];
					if (value == null) return null;
					if (typeof value === 'string') return value;
					if (Array.isArray(value)) {
						const first = value[0] as unknown;
						return first == null ? null : String(first);
					}
					return String(value);
				};
				const passesPositive = (md: Record<string, unknown>) => {
					if (!prePostProfile.requirePositive) return true;
					return (
						containsAny(metaValue(md, 'company'), includeCompany) ||
						containsAny(metaValue(md, 'title'), includeTitle) ||
						containsAny(metaValue(md, 'headline'), [
							...includeCompany,
							...includeTitle,
						]) ||
						containsAny(metaValue(md, 'website'), includeWebsite) ||
						containsAny(metaValue(md, 'companyIndustry'), includeIndustry) ||
						containsAny(metaValue(md, 'metadata'), [...includeCompany, ...includeTitle])
					);
				};
				const passesAux = (md: Record<string, unknown>) => {
					// Lower-priority inclusions to fill tail (e.g., bars/restaurants)
					return (
						containsAny(metaValue(md, 'company'), auxCompany) ||
						containsAny(metaValue(md, 'title'), auxTitle) ||
						containsAny(metaValue(md, 'headline'), [...auxCompany, ...auxTitle]) ||
						containsAny(metaValue(md, 'website'), auxWebsite) ||
						containsAny(metaValue(md, 'companyIndustry'), auxIndustry) ||
						containsAny(metaValue(md, 'metadata'), [...auxCompany, ...auxTitle])
					);
				};

				// Always enforce hard excludes first
				const strictlyAllowed = esMatches.filter((m) => {
					const md: Record<string, unknown> = m.metadata || {};
					return !(
						containsAny(md.company as string | null, excludeTerms) ||
						containsAny(md.title as string | null, excludeTerms) ||
						containsAny(md.headline as string | null, excludeTerms)
					);
				});

				// Require positives for primary set when configured, then prefer aux (bars/restaurants) for tail fill
				const strictlyAllowedTyped = strictlyAllowed as unknown as EsMatch[];
				const positivesOnly = prePostProfile.requirePositive
					? strictlyAllowedTyped.filter((m) => passesPositive(m.metadata || {}))
					: strictlyAllowed;

				const finalLimit = limit ?? VECTOR_SEARCH_LIMIT_DEFAULT;

				if (prePostProfile.requirePositive) {
					// Prioritize: positives -> aux -> remaining non-excluded
					const seen = new Set<string>();
					const keyOf = (m: EsMatch) =>
						String((m.metadata as Record<string, unknown>)['contactId'] || m.id || '');
					const ordered: EsMatch[] = [];
					const pushIfNew = (m: EsMatch) => {
						const k = keyOf(m);
						if (!k || seen.has(k)) return false;
						seen.add(k);
						ordered.push(m);
						return true;
					};

					for (const m of positivesOnly as unknown as EsMatch[]) pushIfNew(m);
					for (const m of strictlyAllowedTyped) {
						if (!passesPositive(m.metadata || {}) && passesAux(m.metadata || {}))
							pushIfNew(m);
						if (ordered.length >= finalLimit) break;
					}
					if (ordered.length < finalLimit) {
						for (const m of strictlyAllowedTyped) {
							if (!passesPositive(m.metadata || {}) && !passesAux(m.metadata || {}))
								pushIfNew(m);
							if (ordered.length >= finalLimit) break;
						}
					}
					esMatches = ordered.slice(0, finalLimit) as unknown as typeof esMatches;
				} else {
					esMatches = positivesOnly.slice(0, finalLimit) as unknown as typeof esMatches;
				}
			}
			const vectorSearchContactIds = esMatches
				.map((match) => Number(match.metadata.contactId ?? match.id))
				.filter((n) => Number.isFinite(n));
			const esRankByContactId = new Map<number, number>();
			for (let i = 0; i < esMatches.length; i++) {
				const match = esMatches[i] as unknown as {
					id: string;
					score?: number;
					metadata?: Record<string, unknown>;
				};
				const md = (match?.metadata || {}) as Record<string, unknown>;
				const idNum = Number(md.contactId ?? match.id);
				if (!Number.isFinite(idNum)) continue;
				if (!esRankByContactId.has(idNum)) esRankByContactId.set(idNum, i);
			}
			const addedContactIdsSet = new Set(addedContactIds);

			// const vectorSearchContactEmails = vectorSearchResults.matches.map(
			// 	(match) => match.metadata.email
			// ); // for testing production data locally

			contacts = await prisma.contact.findMany({
				where: {
					id: {
						in: vectorSearchContactIds,
						notIn: addedContactIds,
					},
					// email: { // for testing production data locally
					// 	in: vectorSearchContactEmails,
					// },
					emailValidationStatus: verificationStatus
						? {
								equals: verificationStatus,
						  }
						: undefined,
				},
			});

			// Enrich missing names from Elasticsearch metadata
			if (contacts && contacts.length > 0) {
				const idToEsName = new Map<
					number,
					{ firstName: string | null; lastName: string | null }
				>();
				for (const m of esMatches as Array<{
					id: string;
					metadata: Record<string, unknown>;
				}>) {
					const meta = (m?.metadata || {}) as Record<string, unknown>;
					const idNum = Number(meta.contactId ?? m.id);
					if (!Number.isFinite(idNum)) continue;
					const firstName = (meta.firstName as string | null | undefined) ?? null;
					const lastName = (meta.lastName as string | null | undefined) ?? null;
					if (
						(firstName && String(firstName).trim()) ||
						(lastName && String(lastName).trim())
					) {
						idToEsName.set(idNum, {
							firstName: firstName ? String(firstName) : null,
							lastName: lastName ? String(lastName) : null,
						});
					}
				}

				contacts = contacts.map((c) => {
					const hasDbName =
						(c.firstName && c.firstName.trim()) || (c.lastName && c.lastName.trim());
					if (hasDbName) return c;
					const meta = idToEsName.get(c.id);
					if (!meta) return c;
					return {
						...c,
						firstName: meta.firstName ?? c.firstName,
						lastName: meta.lastName ?? c.lastName,
					};
				});
			}

			// Re-order (and partially fill) results to match Elasticsearch relevance order
			// so the UI can show "most relevant first" consistently.
			if (esMatches && esMatches.length > 0) {
				const idToContact = new Map<number, Contact>();
				for (const c of contacts) idToContact.set(c.id, c);

				const toArray = (val: unknown): string[] =>
					Array.isArray(val)
						? val.map((v) => String(v)).filter(Boolean)
						: val
						? String(val)
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean)
						: [];

				const ordered: Contact[] = [];
				for (const match of esMatches as Array<{
					id: string;
					metadata: Record<string, unknown>;
				}>) {
					const md: Record<string, unknown> = match.metadata || {};
					const parsedId = Number(md.contactId ?? match.id);
					if (!Number.isFinite(parsedId)) continue;
					if (addedContactIdsSet.has(parsedId)) continue;

					const existing = idToContact.get(parsedId);
					if (existing) {
						ordered.push(existing);
						continue;
					}

					// Build a minimal fallback contact from ES metadata when local DB doesn't have it
					const coords = md.coordinates as
						| { lat?: number; lon?: number }
						| null
						| undefined;
					const latitude =
						coords?.lat != null && Number.isFinite(coords.lat) ? coords.lat : null;
					const longitude =
						coords?.lon != null && Number.isFinite(coords.lon) ? coords.lon : null;

					ordered.push({
						id: parsedId,
						apolloPersonId: null,
						firstName: (md.firstName as string) ?? null,
						lastName: (md.lastName as string) ?? null,
						email: (md.email as string) ?? '',
						company: (md.company as string) ?? null,
						city: (md.city as string) ?? null,
						state: (md.state as string) ?? null,
						country: (md.country as string) ?? null,
						address: (md.address as string) ?? null,
						phone: null,
						website: (md.website as string) ?? null,
						title: (md.title as string) ?? null,
						headline: (md.headline as string) ?? null,
						linkedInUrl: null,
						photoUrl: null,
						metadata: (md.metadata as string) ?? null,
						companyLinkedInUrl: null,
						companyFoundedYear: (md.companyFoundedYear as string) ?? null,
						companyType: (md.companyType as string) ?? null,
						companyTechStack: toArray(md.companyTechStack),
						companyPostalCode: null,
						companyKeywords: toArray(md.companyKeywords),
						companyIndustry: (md.companyIndustry as string) ?? null,
						latitude,
						longitude,
						isPrivate: false,
						hasVectorEmbedding: true,
						userContactListCount: 0,
						manualDeselections: 0,
						lastResearchedDate: null,
						emailValidationStatus: EmailVerificationStatus.valid,
						emailValidationSubStatus: null,
						emailValidatedAt: null,
						createdAt: new Date().toISOString() as unknown as Date,
						updatedAt: new Date().toISOString() as unknown as Date,
						userId: null,
						contactListId: null,
					} as Contact);
				}

				contacts = ordered.length > 0 ? ordered : contacts;
			}

			// Defensive strict-location enforcement for vector results
			if (
				effectiveLocationStrategy === 'strict' &&
				(forceCityExactCity || (forceCityAny && forceCityAny.length > 0)) &&
				(queryJson.state || forceStateAny)
			) {
				const allowedStates =
					forceStateAny && forceStateAny.length > 0
						? new Set(forceStateAny.map((s) => s.toLowerCase()))
						: queryJson.state
						? new Set([queryJson.state.toLowerCase()])
						: new Set<string>();
				const targetCities =
					forceCityAny && forceCityAny.length > 0
						? new Set(forceCityAny.map((c) => c.toLowerCase()))
						: forceCityExactCity
						? new Set([forceCityExactCity.toLowerCase()])
						: new Set<string>();
				contacts = contacts.filter((c) => {
					const cityVal = (c.city || '').toLowerCase();
					const cityOk = targetCities.size === 0 ? true : targetCities.has(cityVal);
					const stateVal = (c.state || '').toLowerCase();
					const stateOk = allowedStates.size === 0 ? true : allowedStates.has(stateVal);
					return cityOk && stateOk;
				});
			}

			// Posttraining step: reuse earlier postTrainingProfile to avoid a second LLM call
			const postProfile = postTrainingProfile || {
				active: false,
				excludeTerms: [],
				demoteTerms: [],
			};
			if (postProfile.active && contacts.length > 0) {
				const excludeTerms = postProfile.excludeTerms.map((t) => t.toLowerCase());
				const demoteTerms = postProfile.demoteTerms.map((t) => t.toLowerCase());
				const includeCompany = (postProfile.includeCompanyTerms || []).map((t) =>
					t.toLowerCase()
				);
				const includeTitle = (postProfile.includeTitleTerms || []).map((t) =>
					t.toLowerCase()
				);
				const includeWebsite = (postProfile.includeWebsiteTerms || []).map((t) =>
					t.toLowerCase()
				);
				const includeIndustry = (postProfile.includeIndustryTerms || []).map((t) =>
					t.toLowerCase()
				);
				const auxCompany = (postProfile.auxCompanyTerms || []).map((t) =>
					t.toLowerCase()
				);
				const auxTitle = (postProfile.auxTitleTerms || []).map((t) => t.toLowerCase());
				const auxWebsite = (postProfile.auxWebsiteTerms || []).map((t) =>
					t.toLowerCase()
				);
				const auxIndustry = (postProfile.auxIndustryTerms || []).map((t) =>
					t.toLowerCase()
				);

				const containsAny = (text: string | null | undefined, terms: string[]) => {
					if (!text) return false;
					const lc = text.toLowerCase();
					return terms.some((t) => lc.includes(t));
				};
				const passesPositive = (c: Contact) => {
					if (!postProfile.requirePositive) return true;
					return (
						containsAny(c.company, includeCompany) ||
						containsAny(c.title, includeTitle) ||
						containsAny(c.headline, [...includeCompany, ...includeTitle]) ||
						containsAny(c.website, includeWebsite) ||
						containsAny(c.companyIndustry, includeIndustry) ||
						containsAny(c.metadata, [...includeCompany, ...includeTitle])
					);
				};
				const passesAux = (c: Contact) => {
					return (
						containsAny(c.company, auxCompany) ||
						containsAny(c.title, auxTitle) ||
						containsAny(c.headline, [...auxCompany, ...auxTitle]) ||
						containsAny(c.website, auxWebsite) ||
						containsAny(c.companyIndustry, auxIndustry) ||
						containsAny(c.metadata, [...auxCompany, ...auxTitle])
					);
				};

				// Exclude (hard if strictExclude=true), then require positive signals if configured
				const strictlyAllowed = postProfile.strictExclude
					? contacts.filter(
							(c) =>
								!containsAny(c.company, excludeTerms) &&
								!containsAny(c.title, excludeTerms) &&
								!containsAny(c.headline, excludeTerms)
					  )
					: contacts;

				let filtered = postProfile.requirePositive
					? strictlyAllowed.filter(passesPositive)
					: strictlyAllowed;

				// If exclusion removed too many (e.g., fewer than limit), fill with demoted ones first;
				// when near the cap, allow a lenient tail of non-excluded items even without positives
				const finalLimit = limit ?? VECTOR_SEARCH_LIMIT_DEFAULT;
				if (filtered.length < finalLimit) {
					// Prefer demoted positives first
					const demotedPositives = strictlyAllowed.filter(
						(c) =>
							(containsAny(c.company, demoteTerms) ||
								containsAny(c.title, demoteTerms) ||
								containsAny(c.headline, demoteTerms)) &&
							(!postProfile.requirePositive || passesPositive(c))
					);

					const existingIds = new Set(filtered.map((c) => c.id));
					const filler: Contact[] = [];
					for (const c of demotedPositives) {
						if (existingIds.has(c.id)) continue;
						filler.push(c);
						existingIds.add(c.id);
						if (filtered.length + filler.length >= finalLimit) break;
					}

					// If still short and we're requiring positives, prioritize AUX (bars/restaurants)
					if (
						postProfile.requirePositive &&
						filtered.length + filler.length < finalLimit
					) {
						for (const c of strictlyAllowed) {
							if (existingIds.has(c.id)) continue;
							if (!passesPositive(c) && passesAux(c)) {
								filler.push(c);
								existingIds.add(c.id);
								if (filtered.length + filler.length >= finalLimit) break;
							}
						}
					}

					// Finally, fill with remaining non-excluded if still short
					if (
						postProfile.requirePositive &&
						filtered.length + filler.length < finalLimit
					) {
						for (const c of strictlyAllowed) {
							if (existingIds.has(c.id)) continue;
							if (!passesPositive(c) && !passesAux(c)) {
								filler.push(c);
								existingIds.add(c.id);
								if (filtered.length + filler.length >= finalLimit) break;
							}
						}
					}

					filtered = [...filtered, ...filler].slice(0, finalLimit);
				}

				contacts = filtered;
			}

			if (shouldFilterBookingTitles && contacts.length > 0) {
				contacts = filterContactsByTitlePrefix(contacts, bookingTitlePrefix);
			}

			const coffeeRefineActive = queryMentionsCoffeeTerms(rawQueryForParsing);
			const coffeeAllowMarketing = coffeeRefineActive
				? coffeeQueryWantsMarketing(rawQueryForParsing)
				: false;

			// Coffee Shops refinement for vector results: remove obvious non-coffee hits (e.g., theaters, agencies)
			// and push marketing roles down without disturbing state-distance ordering too much.
			if (coffeeRefineActive && contacts.length > 0) {
				contacts = contacts.filter(
					(c) => !contactLooksLikeNonCoffeeBusinessForCoffeeSearch(c, coffeeAllowMarketing)
				);
			}

			// If a state is present and we're returning the full 500-result list,
			// keep in-state results first, then nearby states, then farther ones.
			let didStateDistanceSort = false;
			if (contacts.length > 1 && requestedLimit >= 500) {
				const targetStateAbbr =
					normalizeStateAbbrFromValue(queryJson.state) ||
					(forceStateAny && forceStateAny.length > 0
						? normalizeStateAbbrFromValue(forceStateAny[0])
						: null);
				if (targetStateAbbr) {
					didStateDistanceSort = true;
					const distanceMap = buildStateDistanceMap(targetStateAbbr);
					const targetCityLc = (forceCityExactCity || queryJson.city || '')
						.trim()
						.toLowerCase();
					contacts = contacts
						.map((c, idx) => {
							const stateAbbr = normalizeStateAbbrFromValue(c.state);
							const distance = stateAbbr
								? distanceMap.get(stateAbbr) ?? Number.POSITIVE_INFINITY
								: Number.POSITIVE_INFINITY;
							const cityTier =
								targetCityLc.length > 0 &&
								(c.city || '').trim().toLowerCase() === targetCityLc
									? 0
									: targetCityLc.length > 0
									? 1
									: 0;
							const baseRank = esRankByContactId.get(c.id) ?? idx;
							const marketingPenalty =
								coffeeRefineActive &&
								!coffeeAllowMarketing &&
								contactLooksLikeCoffeeMarketingRole(c)
									? 1_000_000
									: 0;
							const rank = baseRank + marketingPenalty;
							return { c, distance, cityTier, rank, idx };
						})
						.sort((a, b) => {
							if (a.distance !== b.distance) return a.distance - b.distance;
							if (a.cityTier !== b.cityTier) return a.cityTier - b.cityTier;
							if (a.rank !== b.rank) return a.rank - b.rank;
							return a.idx - b.idx;
						})
						.map((x) => x.c);
				}
			}

			// If we did NOT apply the distance sort, we can safely demote marketing roles
			// by stable partition while preserving ES relevance order.
			if (coffeeRefineActive && !coffeeAllowMarketing && contacts.length > 1 && !didStateDistanceSort) {
				const nonMarketing = contacts.filter((c) => !contactLooksLikeCoffeeMarketingRole(c));
				const marketing = contacts.filter((c) => contactLooksLikeCoffeeMarketingRole(c));
				contacts =
					nonMarketing.length >= requestedLimit
						? nonMarketing
						: [...nonMarketing, ...marketing];
			}

			// Fallback: if local Postgres doesn't have these contacts, return minimal data from Elasticsearch directly
			if (!contacts || contacts.length === 0) {
				const fallbackContacts = esMatches.map((match) => {
					const md: Record<string, unknown> = match.metadata || {};
					const parsedId = Number(md.contactId);
					const toArray = (val: unknown) =>
						Array.isArray(val)
							? val
							: val
							? String(val)
									.split(',')
									.map((s) => s.trim())
									.filter(Boolean)
							: [];

					// Extract coordinates from ES metadata (stored as coordinates: { lat, lon })
					const coords = md.coordinates as
						| { lat?: number; lon?: number }
						| null
						| undefined;
					const latitude =
						coords?.lat != null && Number.isFinite(coords.lat) ? coords.lat : null;
					const longitude =
						coords?.lon != null && Number.isFinite(coords.lon) ? coords.lon : null;

					return {
						id: Number.isFinite(parsedId)
							? parsedId
							: Math.floor(Math.random() * 1_000_000_000),
						apolloPersonId: null,
						firstName: (md.firstName as string) ?? null,
						lastName: (md.lastName as string) ?? null,
						email: (md.email as string) ?? '',
						company: (md.company as string) ?? null,
						city: (md.city as string) ?? null,
						state: (md.state as string) ?? null,
						country: (md.country as string) ?? null,
						address: (md.address as string) ?? null,
						phone: null,
						website: (md.website as string) ?? null,
						title: (md.title as string) ?? null,
						headline: (md.headline as string) ?? null,
						linkedInUrl: null,
						photoUrl: null,
						metadata: (md.metadata as string) ?? null,
						companyLinkedInUrl: null,
						companyFoundedYear: (md.companyFoundedYear as string) ?? null,
						companyType: (md.companyType as string) ?? null,
						companyTechStack: toArray(md.companyTechStack),
						companyPostalCode: null,
						companyKeywords: toArray(md.companyKeywords),
						companyIndustry: (md.companyIndustry as string) ?? null,
						latitude,
						longitude,
						isPrivate: false,
						hasVectorEmbedding: true,
						userContactListCount: 0,
						manualDeselections: 0,
						lastResearchedDate: null,
						emailValidationStatus: EmailVerificationStatus.valid,
						emailValidationSubStatus: null,
						emailValidatedAt: null,
						createdAt: new Date().toISOString() as unknown as Date,
						updatedAt: new Date().toISOString() as unknown as Date,
						userId: null,
						contactListId: null,
					};
				});

				const filteredFallbackContacts = shouldFilterBookingTitles
					? filterContactsByTitlePrefix(fallbackContacts, bookingTitlePrefix)
					: fallbackContacts;

				let refinedFallback = filteredFallbackContacts;
				if (queryMentionsCoffeeTerms(rawQueryForParsing) && refinedFallback.length > 0) {
					const allowMarketing = coffeeQueryWantsMarketing(rawQueryForParsing);
					refinedFallback = refinedFallback.filter(
						(c) => !contactLooksLikeNonCoffeeBusinessForCoffeeSearch(c, allowMarketing)
					);
					if (!allowMarketing && refinedFallback.length > 1) {
						const nonMarketing = refinedFallback.filter(
							(c) => !contactLooksLikeCoffeeMarketingRole(c)
						);
						const marketing = refinedFallback.filter((c) =>
							contactLooksLikeCoffeeMarketingRole(c)
						);
						refinedFallback =
							nonMarketing.length >= requestedLimit
								? nonMarketing
								: [...nonMarketing, ...marketing];
					}
				}

				return apiResponse(refinedFallback.slice(0, requestedLimit));
			}

			return apiResponse(contacts.slice(0, requestedLimit));
		} else {
			// Use regular search if vector search is not enabled
			contacts = await substringSearch();

			return apiResponse(contacts);
		}
	} catch (error) {
		console.error('Contact search API error:', {
			error,
			message: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
			hasOpenAiKey: !!process.env.OPEN_AI_API_KEY,
		});
		return handleApiError(error);
	}
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = createContactSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { isPrivate, userId: passedUserId, ...contactData } = validatedData.data;

		if (isPrivate && !passedUserId) {
			return apiBadRequest('Private contacts must be associated with a user');
		}

		if (!isPrivate && passedUserId) {
			return apiBadRequest('Non-private contacts cannot be associated with a user');
		}

		if (passedUserId !== userId) {
			return apiUnauthorized('User passed userId that is not the current user');
		}

		const contact = await prisma.contact.create({
			data: {
				...contactData,
				user: passedUserId ? { connect: { clerkId: passedUserId } } : undefined,
			},
		});

		if (!isPrivate) {
			await upsertContactToVectorDb(contact);
		}

		return apiResponse(contact);
	} catch (error) {
		return handleApiError(error);
	}
}
