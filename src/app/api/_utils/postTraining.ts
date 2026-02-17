import { normalizeTextCaseAndWhitespace } from '@/utils';
import { fetchGemini } from './gemini';
import { GEMINI_MODEL_OPTIONS } from '@/constants';

export type PostTrainingProfile = {
	active: boolean;
	excludeTerms: string[];
	demoteTerms: string[];
	strictExclude?: boolean;
	requirePositive?: boolean;
	includeCompanyTerms?: string[];
	includeTitleTerms?: string[];
	includeWebsiteTerms?: string[];
	includeIndustryTerms?: string[];
	// Auxiliary, lower-priority inclusion terms used to fill tail (e.g., bars/restaurants)
	auxCompanyTerms?: string[];
	auxTitleTerms?: string[];
	auxWebsiteTerms?: string[];
	auxIndustryTerms?: string[];
};

const VALID_QUERY_TYPES = [
	'music_venue',
	'wedding_planner',
	'event_planner',
	'photographer',
	'catering',
	'general',
] as const;
type QueryType = (typeof VALID_QUERY_TYPES)[number];
// Cache for LLM responses to avoid repeated API calls for the same query
// The cache persists for the lifetime of the application instance
// In production, consider implementing TTL or size limits
const filterCache = new Map<string, PostTrainingProfile>();
const queryTypeCache = new Map<string, QueryType>(); // Cache for query type classification
const MAX_CACHE_SIZE = 100; // Prevent unbounded memory growth

function getInactiveProfile(): PostTrainingProfile {
	return { active: false, excludeTerms: [], demoteTerms: [] };
}

/**
 * Clear the filter cache - useful for testing or when filters need refreshing
 */
export function clearFilterCache(): void {
	filterCache.clear();
	queryTypeCache.clear();
}

/**
 * Get current cache size for monitoring
 */
export function getFilterCacheSize(): number {
	return filterCache.size;
}

/**
 * Keep cache growth bounded with simple FIFO eviction.
 */
function enforceBoundedCache<T>(cache: Map<string, T>): void {
	if (cache.size < MAX_CACHE_SIZE) return;
	const firstKey = cache.keys().next().value as string | undefined;
	if (firstKey) {
		cache.delete(firstKey);
	}
}

function cleanJsonResponse(raw: string): string {
	return raw
		.replace(/```json\s*/gi, '')
		.replace(/```/g, '')
		.trim();
}

function toStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => String(entry ?? '').trim())
		.filter((entry) => entry.length > 0);
}

function normalizeQueryType(value: unknown): QueryType | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase().replace(/['"]/g, '');
	return VALID_QUERY_TYPES.includes(normalized as QueryType)
		? (normalized as QueryType)
		: null;
}

function shouldApplyGeneralFiltering(normalizedQuery: string): boolean {
	return (
		normalizedQuery.includes('service') ||
		normalizedQuery.includes('provider') ||
		normalizedQuery.includes('consultant') ||
		normalizedQuery.includes('agency') ||
		normalizedQuery.includes('company')
	);
}

function classifyQueryTypeFallback(normalizedQuery: string): QueryType {
	if (
		normalizedQuery.includes('venue') ||
		normalizedQuery.includes('music') ||
		normalizedQuery.includes('concert') ||
		normalizedQuery.includes('theater')
	) {
		return 'music_venue';
	}
	if (normalizedQuery.includes('wedding')) {
		return 'wedding_planner';
	}
	if (normalizedQuery.includes('event') || normalizedQuery.includes('party')) {
		return 'event_planner';
	}
	if (normalizedQuery.includes('photo')) {
		return 'photographer';
	}
	if (normalizedQuery.includes('cater') || normalizedQuery.includes('food service')) {
		return 'catering';
	}
	return 'general';
}

function getFallbackProfileForQueryType(queryType: QueryType): PostTrainingProfile {
	switch (queryType) {
		case 'music_venue':
			return {
				active: true,
				excludeTerms: ['university', 'college', 'school', 'faculty', 'professor'],
				demoteTerms: ['campus', 'department'],
				strictExclude: true,
				requirePositive: true,
				includeCompanyTerms: ['venue', 'theater', 'theatre', 'hall', 'arena', 'club'],
				includeTitleTerms: ['booking', 'manager', 'promoter', 'talent buyer'],
				includeWebsiteTerms: ['tickets', 'events', 'concerts', 'shows'],
				includeIndustryTerms: ['entertainment', 'music', 'performing arts'],
				auxCompanyTerms: ['bar', 'restaurant', 'lounge'],
				auxTitleTerms: [],
				auxWebsiteTerms: [],
				auxIndustryTerms: [],
			};
		case 'wedding_planner':
			return {
				active: true,
				excludeTerms: ['weddingwire', 'theknot', 'wedding.com'],
				demoteTerms: [],
				strictExclude: true,
				requirePositive: false,
				includeCompanyTerms: ['wedding', 'bridal'],
				includeTitleTerms: ['planner', 'coordinator', 'consultant'],
				includeWebsiteTerms: [],
				includeIndustryTerms: ['wedding', 'events'],
			};
		case 'event_planner':
			return {
				active: true,
				excludeTerms: [],
				demoteTerms: [],
				strictExclude: false,
				requirePositive: false,
				includeCompanyTerms: ['event', 'planning'],
				includeTitleTerms: ['planner', 'coordinator', 'organizer'],
				includeWebsiteTerms: [],
				includeIndustryTerms: ['events', 'planning'],
			};
		case 'photographer':
			return {
				active: true,
				excludeTerms: ['shutterstock', 'getty', 'stock'],
				demoteTerms: [],
				strictExclude: false,
				requirePositive: false,
				includeCompanyTerms: ['photography', 'photo', 'studio'],
				includeTitleTerms: ['photographer'],
				includeWebsiteTerms: [],
				includeIndustryTerms: ['photography'],
			};
		case 'catering':
			return {
				active: true,
				excludeTerms: [],
				demoteTerms: [],
				strictExclude: false,
				requirePositive: false,
				includeCompanyTerms: ['catering', 'caterer'],
				includeTitleTerms: ['caterer', 'chef'],
				includeWebsiteTerms: [],
				includeIndustryTerms: ['catering', 'food service'],
			};
		default:
			return getInactiveProfile();
	}
}

function buildCombinedPostTrainingPrompt(query: string): string {
	return `You are an expert at search intent understanding and contact search filtering.
Given one search query, do BOTH tasks:
1) Classify the query into exactly one query type.
2) Generate filtering arrays for that query type.

Query: "${query}"

Allowed queryType values:
- "music_venue": venues, theaters, concert halls, live music spaces
- "wedding_planner": wedding planners/coordinators/organizers
- "event_planner": general event planners/party planners/corporate event organizers
- "photographer": photographers/photography services
- "catering": catering/caterers/food services for events
- "general": anything else

Return ONLY valid JSON in this exact shape:
{
  "queryType": "music_venue|wedding_planner|event_planner|photographer|catering|general",
  "filters": {
    "excludeTerms": [],
    "demoteTerms": [],
    "includeCompanyTerms": [],
    "includeTitleTerms": [],
    "includeWebsiteTerms": [],
    "includeIndustryTerms": [],
    "auxCompanyTerms": [],
    "auxTitleTerms": [],
    "auxWebsiteTerms": [],
    "auxIndustryTerms": []
  }
}

Type-specific guidance:
- music_venue:
  - Exclude educational institutions and unrelated executive/legal/academic roles.
  - Include venue/performance/operator and booking-related terms.
  - AUX terms may include bars/restaurants/nightlife as lower-priority tail fillers.
- wedding_planner:
  - Exclude marketplace/directory sites.
  - Include planner/coordinator/consultant provider signals.
- event_planner:
  - Focus on real planning services, not just venues/directories.
- photographer:
  - Exclude stock-photo providers and non-service noise.
- catering:
  - Focus on explicit catering services and providers.
- general:
  - Keep filters conservative and relevant.
  - If intent is broad and non-specific, keep arrays empty.

Rules:
- JSON only (no markdown fences).
- Every filter field must be an array of strings (empty array allowed).
- Prefer lowercase normalized terms.
- If uncertain, classify as "general".`;
}

function parseCombinedPostTrainingResponse(
	response: string
): { queryType: QueryType; profile: PostTrainingProfile } | null {
	const cleanedResponse = cleanJsonResponse(response);
	const parsed = JSON.parse(cleanedResponse) as Record<string, unknown>;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		return null;
	}

	const parsedQueryType = normalizeQueryType(parsed.queryType);
	if (!parsedQueryType) {
		return null;
	}

	const filtersRaw =
		parsed.filters && typeof parsed.filters === 'object' && !Array.isArray(parsed.filters)
			? (parsed.filters as Record<string, unknown>)
			: parsed;

	return {
		queryType: parsedQueryType,
		profile: {
			active: true,
			excludeTerms: toStringArray(filtersRaw.excludeTerms),
			demoteTerms: toStringArray(filtersRaw.demoteTerms),
			strictExclude: true,
			requirePositive: parsedQueryType === 'music_venue',
			includeCompanyTerms: toStringArray(filtersRaw.includeCompanyTerms),
			includeTitleTerms: toStringArray(filtersRaw.includeTitleTerms),
			includeWebsiteTerms: toStringArray(filtersRaw.includeWebsiteTerms),
			includeIndustryTerms: toStringArray(filtersRaw.includeIndustryTerms),
			auxCompanyTerms: toStringArray(filtersRaw.auxCompanyTerms),
			auxTitleTerms: toStringArray(filtersRaw.auxTitleTerms),
			auxWebsiteTerms: toStringArray(filtersRaw.auxWebsiteTerms),
			auxIndustryTerms: toStringArray(filtersRaw.auxIndustryTerms),
		},
	};
}

/**
 * Main entry point for getting post-training filters based on a search query.
 * Uses one Gemini request to classify and produce filter terms together.
 */
export async function getPostTrainingForQuery(
	rawQuery: string
): Promise<PostTrainingProfile> {
	const normalizedQuery = normalizeTextCaseAndWhitespace(rawQuery);
	const cachedProfile = filterCache.get(normalizedQuery);
	const cachedQueryType = queryTypeCache.get(normalizedQuery);
	if (cachedProfile && cachedQueryType) {
		return cachedProfile;
	}

	try {
		// Skip LLM if no API key
		if (!process.env.GEMINI_API_KEY) {
			const fallbackProfile = getFallbackPostTraining(rawQuery);
			const fallbackType = classifyQueryTypeFallback(normalizedQuery);
			enforceBoundedCache(queryTypeCache);
			queryTypeCache.set(normalizedQuery, fallbackType);
			enforceBoundedCache(filterCache);
			filterCache.set(normalizedQuery, fallbackProfile);
			return fallbackProfile;
		}

		let queryType: QueryType = classifyQueryTypeFallback(normalizedQuery);
		let llmProfile: PostTrainingProfile | null = null;

		try {
			const response = await fetchGemini(
				GEMINI_MODEL_OPTIONS.gemini25FlashLite,
				buildCombinedPostTrainingPrompt(rawQuery),
				`Classify and generate post-training filters for query: "${rawQuery}"`,
				{ timeoutMs: 25000 }
			);
			const parsed = parseCombinedPostTrainingResponse(response);
			if (parsed) {
				queryType = parsed.queryType;
				llmProfile = parsed.profile;
			} else {
				console.warn(
					'Malformed combined post-training LLM output, using fallback profile.',
					{ queryType }
				);
			}
		} catch (error) {
			console.error('Error generating combined post-training output with LLM:', error);
		}

		let finalProfile: PostTrainingProfile;
		if (queryType === 'general' && !shouldApplyGeneralFiltering(normalizedQuery)) {
			// Keep broad/general queries inactive unless they suggest service-provider filtering.
			finalProfile = getInactiveProfile();
		} else if (llmProfile) {
			finalProfile = llmProfile;
		} else {
			finalProfile = getFallbackProfileForQueryType(queryType);
		}

		enforceBoundedCache(queryTypeCache);
		queryTypeCache.set(normalizedQuery, queryType);
		enforceBoundedCache(filterCache);
		filterCache.set(normalizedQuery, finalProfile);
		return finalProfile;
	} catch (error) {
		console.error('Error in getPostTrainingForQuery, falling back:', error);
		return getFallbackPostTraining(rawQuery);
	}
}

// Get the music venue profile with all the exclusions
function getMusicVenueProfile(): PostTrainingProfile {
	const excludeTerms = [
		'university',
		'university of',
		'state university',
		'community college',
		'college of',
		'school of music',
		'conservatory',
		'institute of technology',
		'polytechnic',
		'CEO',
		'president',
		'vice president',
		'director of sales',
		'director of marketing',
		'faculty',
		'professor',
		'lawyer',
		'partner',
		'law firm',
		'songwriter',
		'drummer',
		'guitarist',
		'producer',
		'band',
		'bandleader',
	];

	const includeCompanyTerms = [
		'theatre',
		'theater',
		'performing arts center',
		'concert hall',
		'music hall',
		'auditorium',
		'amphitheater',
		'amphitheatre',
		'opera house',
		'pavilion',
		'arena',
		'ballroom',
		'civic center',
		'playhouse',
		'house of blues',
		'fillmore',
		'music venue',
		'live music',
	];

	const auxCompanyTerms = [
		'bar',
		'pub',
		'tavern',
		'lounge',
		'brewery',
		'restaurant',
		'bistro',
		'cafe',
		'nightclub',
		'club',
		'jazz club',
		'blues club',
	];

	const includeTitleTerms = [
		'music venue',
		'talent buyer',
		'talent booker',
		'booker',
		'booking',
		'promoter',
		'venue manager',
		'general manager',
		'production manager',
		'events manager',
		'event coordinator',
		'programming director',
		'entertainment director',
		'box office',
		'house manager',
		'stage manager',
		'technical director',
	];

	return {
		active: true,
		excludeTerms,
		demoteTerms: ['college', 'univ', 'campus', 'school', 'symphony'],
		strictExclude: true,
		requirePositive: true,
		includeCompanyTerms,
		includeTitleTerms,
		includeWebsiteTerms: [
			'tickets',
			'ticketing',
			'theatre',
			'theater',
			'venue',
			'concert',
			'events',
			'calendar',
			'live',
			'music',
		],
		includeIndustryTerms: ['performing arts', 'entertainment', 'music', 'live events'],
		auxCompanyTerms,
		auxWebsiteTerms: ['menu', 'reservations', 'happy hour', 'bar', 'restaurant'],
		auxIndustryTerms: ['hospitality', 'food and beverage', 'restaurants', 'bars'],
	};
}

// Synchronous fallback for when LLM is not available
function getFallbackPostTraining(rawQuery: string): PostTrainingProfile {
	const q = normalizeTextCaseAndWhitespace(rawQuery);

	// Music venue specific post-training
	if (
		q.includes('music venue') ||
		q.includes('music venues') ||
		q.includes('concert') ||
		q.includes('performance') ||
		q.includes('live music')
	) {
		return getMusicVenueProfile();
	}

	// Wedding planner specific
	if (q.includes('wedding planner') || q.includes('wedding planners')) {
		return {
			active: true,
			excludeTerms: ['weddingwire'],
			demoteTerms: [],
			strictExclude: true,
		};
	}

	return { active: false, excludeTerms: [], demoteTerms: [] };
}
