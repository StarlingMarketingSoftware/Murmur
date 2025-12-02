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

// Cache for LLM responses to avoid repeated API calls for the same query
// The cache persists for the lifetime of the application instance
// In production, consider implementing TTL or size limits
const filterCache = new Map<string, PostTrainingProfile>();
const queryTypeCache = new Map<string, string>(); // Cache for query type classification
const MAX_CACHE_SIZE = 100; // Prevent unbounded memory growth

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
 * Classify the query type using LLM to understand synonyms and variations
 * This replaces hardcoded pattern matching with intelligent understanding
 */
async function classifyQueryType(query: string): Promise<string> {
	const normalizedQuery = normalizeTextCaseAndWhitespace(query);

	// Check cache first
	if (queryTypeCache.has(normalizedQuery)) {
		return queryTypeCache.get(normalizedQuery)!;
	}

	const prompt = `You are an expert at understanding search queries and classifying them into categories. Analyze the following query and determine its type.

Query: "${query}"

Classify this query into ONE of these categories:
1. "music_venue" - For queries looking for music venues, concert halls, performance spaces, live music locations, theaters, amphitheaters, or any place where live music performances happen
2. "wedding_planner" - For queries looking for wedding planners, wedding coordinators, wedding organizers, or wedding services
3. "event_planner" - For queries looking for general event planners, party planners, corporate event organizers
4. "photographer" - For queries looking for photographers, photography services, photo studios
5. "catering" - For queries looking for caterers, catering services, food services for events
6. "general" - For any other type of query that doesn't fit the above categories

Consider synonyms and related terms. For example:
- "venue", "live music", "concert space", "performance hall", "music hall", "theater", "club with bands" → music_venue
- "wedding coordinator", "bridal consultant", "wedding organizer" → wedding_planner
- "event coordinator", "party organizer", "corporate events" → event_planner

Return ONLY the category name (e.g., "music_venue"), nothing else.`;

	try {
		const response = await fetchGemini(
			GEMINI_MODEL_OPTIONS.gemini25FlashLite,
			prompt,
			`Classify this search query: "${query}"`,
			{ timeoutMs: 20000 } // allow more time for LLM classification
		);

		const queryType = response.trim().toLowerCase().replace(/['"]/g, '');

		// Validate the response is one of our expected types
		const validTypes = [
			'music_venue',
			'wedding_planner',
			'event_planner',
			'photographer',
			'catering',
			'general',
		];
		const finalType = validTypes.includes(queryType) ? queryType : 'general';

		// Cache the result with size limit
		if (queryTypeCache.size >= MAX_CACHE_SIZE) {
			const firstKey = queryTypeCache.keys().next().value;
			if (firstKey) queryTypeCache.delete(firstKey);
		}
		queryTypeCache.set(normalizedQuery, finalType);

		return finalType;
	} catch (error) {
		console.error('Error classifying query type with LLM:', error);

		// Fallback to basic pattern matching if LLM fails
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
}

/**
 * Generate filter terms using OpenAI based on the query context
 * This replaces hardcoded lists with dynamic, context-aware filtering
 */
async function generateFiltersWithLLM(
	query: string,
	queryType: string
): Promise<PostTrainingProfile> {
	const cacheKey = `${queryType}:${query}`;

	// Check cache first
	if (filterCache.has(cacheKey)) {
		return filterCache.get(cacheKey)!;
	}

	// Build context-specific guidelines
	let contextGuidelines = '';
	switch (queryType) {
		case 'music_venue':
			contextGuidelines = `
- Exclude: educational institutions (universities, colleges, conservatories), unrelated C-suite titles, academic faculty, legal professions, individual musicians/bands
- Include: performance venues, concert halls, theaters, entertainment spaces, live music venues, clubs
- Auxiliary (lower priority): bars, restaurants, nightclubs that might host live music
- Focus on venue management, booking, and production roles`;
			break;
		case 'wedding_planner':
			contextGuidelines = `
- Exclude: directory/aggregator sites (WeddingWire, The Knot, etc.), venues without planning services
- Include: individual planners, planning companies, wedding coordinators, bridal consultants
- Focus on actual service providers, not marketplaces`;
			break;
		case 'event_planner':
			contextGuidelines = `
- Exclude: venues without planning services, directory sites
- Include: event planning companies, party planners, corporate event organizers, meeting planners
- Focus on planning and coordination services`;
			break;
		case 'photographer':
			contextGuidelines = `
- Exclude: stock photo sites, photo printing services only
- Include: professional photographers, photography studios, photo services
- Focus on actual photographers and studios`;
			break;
		case 'catering':
			contextGuidelines = `
- Exclude: restaurants without catering services, grocery stores
- Include: catering companies, food service providers, event caterers
- Focus on businesses that specifically offer catering services`;
			break;
		default:
			contextGuidelines = `
- Analyze the query intent and generate relevant filters
- Exclude irrelevant or spam-like results
- Include terms that match the service or role being searched`;
	}

	const prompt = `You are an expert at understanding search queries and generating appropriate filters for contact searches. Based on the query type and context, generate relevant filter terms.

Query Type: ${queryType}
Query: ${query}

Generate filter terms in the following JSON format:
{
  "excludeTerms": ["terms that should be completely excluded from results"],
  "demoteTerms": ["terms that should be deprioritized but not excluded"],
  "includeCompanyTerms": ["positive company-related terms to prioritize"],
  "includeTitleTerms": ["positive job title terms to prioritize"],
  "includeWebsiteTerms": ["positive website-related terms to prioritize"],
  "includeIndustryTerms": ["positive industry terms to prioritize"],
  "auxCompanyTerms": ["lower-priority company terms for filling results"],
  "auxTitleTerms": ["lower-priority title terms"],
  "auxWebsiteTerms": ["lower-priority website terms"],
  "auxIndustryTerms": ["lower-priority industry terms"]
}

Context-Specific Guidelines:${contextGuidelines}

General Guidelines:
- Be comprehensive but relevant
- Return only valid JSON, no additional text
- Consider common variations, abbreviations, and related terms
- Think about what would be irrelevant noise vs helpful results
- Include plural forms and common misspellings where appropriate`;

	try {
		const response = await fetchGemini(
			GEMINI_MODEL_OPTIONS.gemini25FlashLite,
			prompt,
			`Generate appropriate filter terms for this ${queryType} search query: "${query}"`,
			{ timeoutMs: 25000 } // filter generation can take longer
		);

		// Clean the response to ensure it's valid JSON
		const cleanedResponse = response
			.replace(/```json\n?/g, '')
			.replace(/```\n?/g, '')
			.trim();
		const filters = JSON.parse(cleanedResponse);

		const profile: PostTrainingProfile = {
			active: true,
			excludeTerms: filters.excludeTerms || [],
			demoteTerms: filters.demoteTerms || [],
			strictExclude: true,
			requirePositive: queryType === 'music_venue',
			includeCompanyTerms: filters.includeCompanyTerms || [],
			includeTitleTerms: filters.includeTitleTerms || [],
			includeWebsiteTerms: filters.includeWebsiteTerms || [],
			includeIndustryTerms: filters.includeIndustryTerms || [],
			auxCompanyTerms: filters.auxCompanyTerms || [],
			auxTitleTerms: filters.auxTitleTerms || [],
			auxWebsiteTerms: filters.auxWebsiteTerms || [],
			auxIndustryTerms: filters.auxIndustryTerms || [],
		};

		// Cache the result with size limit
		if (filterCache.size >= MAX_CACHE_SIZE) {
			// Simple FIFO eviction - remove the oldest entry
			const firstKey = filterCache.keys().next().value;
			if (firstKey) filterCache.delete(firstKey);
		}
		filterCache.set(cacheKey, profile);

		return profile;
	} catch (error) {
		console.error('Error generating filters with LLM:', error);

		// Return a more intelligent fallback based on query type
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
				// Default fallback
				return {
					active: false,
					excludeTerms: [],
					demoteTerms: [],
				};
		}
	}
}

/**
 * Main entry point for getting post-training filters based on a search query.
 *
 * This function now uses LLM to intelligently understand query intent and synonyms.
 * For example, all of these will be recognized as music venue searches:
 * - "music venue"
 * - "concert hall"
 * - "live music"
 * - "performance space"
 * - "theater"
 * - "venue"
 * - "amphitheater"
 * - "club with bands"
 *
 * The LLM classification ensures we catch all variations without hardcoding every possibility.
 *
 * @param rawQuery - The search query from the user
 * @returns PostTrainingProfile with appropriate filters for the query type
 */
export async function getPostTrainingForQuery(
	rawQuery: string
): Promise<PostTrainingProfile> {
	try {
		// Skip LLM if no API key
		if (!process.env.GEMINI_API_KEY) {
			return getFallbackPostTraining(rawQuery);
		}

		// Use LLM to intelligently classify the query type
		const queryType = await classifyQueryType(rawQuery);

		// If it's a general query with no specific filtering needs, return inactive profile
		if (queryType === 'general') {
			// Still check if the query might benefit from filtering
			const q = normalizeTextCaseAndWhitespace(rawQuery);
			const mightNeedFiltering =
				q.includes('service') ||
				q.includes('provider') ||
				q.includes('consultant') ||
				q.includes('agency') ||
				q.includes('company');

			if (mightNeedFiltering) {
				return await generateFiltersWithLLM(rawQuery, 'general');
			}

			return { active: false, excludeTerms: [], demoteTerms: [] };
		}

		// Generate appropriate filters for the classified query type
		return await generateFiltersWithLLM(rawQuery, queryType);
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
