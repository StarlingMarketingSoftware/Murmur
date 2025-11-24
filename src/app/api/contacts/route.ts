import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	fetchOpenAi,
	handleApiError,
} from '@/app/api/_utils';
import { stripBothSidesOfBraces } from '@/utils/string';
import { getValidatedParamsFromUrl } from '@/utils';
import { getPostTrainingForQuery } from '@/app/api/_utils/postTraining';
import { applyHardcodedLocationOverrides } from '@/app/api/_utils/searchPreprocess';
import { Contact, EmailVerificationStatus, Prisma } from '@prisma/client';
import { searchSimilarContacts, upsertContactToVectorDb } from '../_utils/vectorDb';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';
import { StripeSubscriptionStatus } from '@/types';

const VECTOR_SEARCH_LIMIT_DEFAULT = 50;

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
	return null;
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
		} = validatedFilters.data;
		let locationFilter = location ?? null;

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

		if (process.env.OPEN_AI_API_KEY && queryForLocationParsing) {
			try {
				locationResponse = await fetchOpenAi(
					OPEN_AI_MODEL_OPTIONS.o4mini,
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
					queryForLocationParsing
				);
			} catch (openAiError) {
				console.error('OpenAI location parsing failed:', openAiError);
				// Continue without location parsing if OpenAI fails
				locationResponse = null;
			}
		} else if (!process.env.OPEN_AI_API_KEY) {
			console.warn('OPEN_AI_API_KEY is not set. Location parsing will be skipped.');
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
						typeof queryJson.restOfQuery === 'string'
							? queryJson.restOfQuery
							: typeof parsed?.restOfQuery === 'string'
							? parsed.restOfQuery
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
		const effectiveLocationStrategy = isPromotionSearch
			? 'broad'
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
					Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 200)
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

				const results = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							{ title: { mode: 'insensitive', startsWith: 'Music Venues' } },
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: fetchTake,
				});

				// Prioritize exact state-label titles: "Music Venues <STATE or ABBR>"
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
					const m = /^music venues\b(.*)$/i.exec(trimmed);
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
					const aStateTitle = isStateLabelAfterPrefix(a.title);
					const bStateTitle = isStateLabelAfterPrefix(b.title);
					if (aStateTitle && !bStateTitle) return -1;
					if (!aStateTitle && bStateTitle) return 1;
					return 0;
				});

				return apiResponse(prioritized.slice(0, finalLimit));
			}
		}

		// Strict "Music Festivals" filter: when query mentions "festival(s)", only return titles starting with "Music Festivals"
		{
			const mentionsFestivals = /\bfestivals?\b/i.test(rawQueryForParsing);
			if (mentionsFestivals) {
				const finalLimit = Math.max(
					1,
					Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 200)
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

				const results = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							{ title: { mode: 'insensitive', startsWith: 'Music Festivals' } },
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: fetchTake,
				});

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
					const aStateTitle = isStateLabelAfterPrefix(a.title);
					const bStateTitle = isStateLabelAfterPrefix(b.title);
					if (aStateTitle && !bStateTitle) return -1;
					if (!aStateTitle && bStateTitle) return 1;
					return 0;
				});

				return apiResponse(prioritized.slice(0, finalLimit));
			}
		}

		// Special-case: Booking searches - filter to specific title prefixes and respect strict state if present
		if (isBookingSearch) {
			const finalLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 200));

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

			if (filteredResults.length > 0 || !useVectorSearch) {
				return apiResponse(filteredResults.slice(0, finalLimit));
			}
			// When vector search is requested but Prisma lacks matches, fall through
			// so Elasticsearch/vector logic below can attempt to satisfy the query.
		}

		// Special-case: Promotion searches prioritize Radio Stations across all states
		if (isPromotionSearch) {
			const finalLimit = Math.max(1, Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 200));
			const radioTitleWhere: Prisma.StringFilter = {
				mode: 'insensitive',
				contains: 'radio station',
			};

			const baseWhere: Prisma.ContactWhereInput = {
				id: addedContactIds.length > 0 ? { notIn: addedContactIds } : undefined,
				emailValidationStatus: verificationStatus
					? {
							equals: verificationStatus,
					  }
					: undefined,
			};
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

			// Fetch contacts with title indicating Radio Stations first
			const primary = await prisma.contact.findMany({
				where: {
					AND: [
						baseWhere,
						...stateStrictAnd,
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

			// If we didn't hit the limit, fill with broader radio-related signals
			const results = primary;
			if (results.length < finalLimit) {
				const filler = await prisma.contact.findMany({
					where: {
						AND: [
							baseWhere,
							...stateStrictAnd,
							{
								OR: [
									{ headline: { mode: 'insensitive', contains: 'radio' } },
									{ companyIndustry: { mode: 'insensitive', contains: 'radio' } },
									{ metadata: { mode: 'insensitive', contains: 'radio' } },
								],
							},
						],
					},
					orderBy: [{ state: 'asc' }, { city: 'asc' }, { company: 'asc' }],
					take: finalLimit - results.length,
				});
				// Deduplicate by id
				const seen = new Set(results.map((c) => c.id));
				for (const c of filler) {
					if (seen.has(c.id)) continue;
					results.push(c);
					seen.add(c.id);
					if (results.length >= finalLimit) break;
				}
			}

			return apiResponse(results.slice(0, finalLimit));
		}

		const substringSearch = async (): Promise<Contact[]> => {
			const searchTerms: string[] =
				query
					?.toLowerCase()
					.split(/\s+/)
					.filter((term) => term.length > 0) || [];
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
			const requestedLimit = Math.max(
				1,
				Math.min(limit ?? VECTOR_SEARCH_LIMIT_DEFAULT, 200)
			);
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

			// Defensive strict-location enforcement for vector results
			if (
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
						latitude: null,
						longitude: null,
						isPrivate: false,
						hasVectorEmbedding: true,
						userContactListCount: 0,
						manualDeselections: 0,
						lastResearchedDate: null,
						emailValidationStatus: 'valid',
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

				return apiResponse(filteredFallbackContacts.slice(0, limit));
			}

			return apiResponse(contacts.slice(0, limit));
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
