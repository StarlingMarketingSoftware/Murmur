import { Client } from '@elastic/elasticsearch';
import { 
  locationFilters, 
  normalizeLocation, 
  getNYCBoroughBoosts,
  type NormalizedLocation 
} from './locationNormalize';
import { 
  BOOSTED_TERMS, 
  VENUE_SYNONYMS, 
  buildExclusionQueries,
  buildVenueIndicatorBoosts 
} from './synonyms';

type ESQuery = Record<string, any>;

export interface SearchResult {
  tierUsed: number;
  hits: any[];
  total: number;
  message?: string;
}

// Main fields to search with their boost values
const SEARCH_FIELDS = [
  'company^8',
  'headline^3', 
  'metadata^2',
  'title^2',
  'city^4',
  'state^1',
  'address^1',
  'website^0.5',
];

// Fields for name/entity searches (higher precision)
const NAME_FIELDS = [
  'company^10',
  'headline^2',
];

// Fields for location searches
const LOCATION_FIELDS = [
  'city^5',
  'state^2',
  'address^1',
];

/**
 * Generate synonym should clauses for boosting relevant terms
 */
function buildSynonymShoulds(fields: string[] = ['company', 'headline', 'metadata', 'title']): ESQuery[] {
  const shoulds: ESQuery[] = [];
  
  for (const { term, boost } of BOOSTED_TERMS) {
    for (const field of fields) {
      shoulds.push({ 
        match_phrase: { 
          [field]: { 
            query: term, 
            boost: boost 
          } 
        } 
      });
    }
  }
  
  return shoulds;
}

/**
 * Clean the user query by removing location parts that were extracted
 */
function cleanQueryText(originalQuery: string, location: NormalizedLocation): string {
  let cleaned = originalQuery.toLowerCase();
  
  // Remove "in <location>" patterns
  cleaned = cleaned.replace(/\bin\s+[a-z\s,]+(?=\s|$)/gi, '');
  
  // For queries ending with location (e.g., "Music venue Boston"), remove the location part
  if (location.type !== 'none') {
    // Remove state from end of query
    if ((location.type === 'state' || location.type === 'city_state') && location.state) {
      // Escape special regex characters in state name
      const escapedState = location.state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only remove if it's at the end of the query
      cleaned = cleaned.replace(new RegExp(`\\s+${escapedState}$`, 'gi'), '');
      // Also try removing without word boundary for multi-word states
      cleaned = cleaned.replace(new RegExp(`\\s+${escapedState.toLowerCase()}$`, 'i'), '');
    }
    
    // Remove city from end of query
    if ((location.type === 'city_only' || location.type === 'city_state') && 'city' in location) {
      const escapedCity = location.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Only remove if it's at the end of the query
      cleaned = cleaned.replace(new RegExp(`\\s+${escapedCity}$`, 'gi'), '');
      // Also try removing without word boundary for multi-word cities
      cleaned = cleaned.replace(new RegExp(`\\s+${escapedCity.toLowerCase()}$`, 'i'), '');
    }
  }
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // If nothing left after cleaning or just very short, use venue synonyms as the query
  if (!cleaned || cleaned.length < 3) {
    return 'music venue live music bar club venue';
  }
  
  return cleaned;
}

/**
 * Build tiered queries from strictest to broadest
 */
export function buildTiers(userQuery: string): ESQuery[] {
  const location = normalizeLocation(userQuery);
  const filters = locationFilters(location);
  const cleanedQuery = cleanQueryText(userQuery, location);
  const shouldSynonyms = buildSynonymShoulds();
  const mustNotExclusions = buildExclusionQueries();
  const venueBoosts = buildVenueIndicatorBoosts();
  const nycBoosts = getNYCBoroughBoosts(userQuery);
  
  const tiers: ESQuery[] = [];
  
  // ========== TIER 1: Strict matching with location ==========
  // Requires most query terms to match, applies location filters
  tiers.push({
    bool: {
      must: [
        {
          multi_match: {
            query: cleanedQuery,
            fields: SEARCH_FIELDS,
            type: 'best_fields',
            operator: 'AND',
            minimum_should_match: '75%',
            tie_breaker: 0.3
          }
        }
      ],
      filter: filters,
      should: [
        ...shouldSynonyms,
        ...venueBoosts,
        ...nycBoosts,
        // Boost exact phrase matches
        {
          multi_match: {
            query: cleanedQuery,
            fields: NAME_FIELDS,
            type: 'phrase',
            boost: 2.0
          }
        }
      ],
      must_not: mustNotExclusions,
      minimum_should_match: 0
    }
  });
  
  // ========== TIER 2: Looser text matching with fuzzy ==========
  // Allows more flexibility in term matching, adds prefix matching
  tiers.push({
    bool: {
      must: [
        {
          dis_max: {
            tie_breaker: 0.3,
            queries: [
              {
                multi_match: {
                  query: cleanedQuery,
                  fields: SEARCH_FIELDS,
                  type: 'best_fields',
                  operator: 'OR',
                  minimum_should_match: '50%',
                  fuzziness: 'AUTO:4,7'
                }
              },
              {
                multi_match: {
                  query: cleanedQuery,
                  fields: NAME_FIELDS,
                  type: 'phrase_prefix',
                  boost: 1.5
                }
              }
            ]
          }
        }
      ],
      filter: filters,
      should: [
        ...shouldSynonyms,
        ...venueBoosts,
        ...nycBoosts
      ],
      must_not: mustNotExclusions,
      minimum_should_match: 0
    }
  });
  
  // ========== TIER 3: Relaxed location (city as should, not filter) ==========
  // Keeps state filter but makes city optional with boost
  const stateOnlyFilters = filters.filter((f: any) => {
    // Keep only state filters, not city filters
    return !(f.term && f.term['city.keyword']) && 
           !(f.bool && f.bool.should); // Remove NYC multi-city filter
  });
  
  const cityBoosts = filters
    .filter((f: any) => f.term && f.term['city.keyword'])
    .map((f: any) => ({
      term: {
        'city.keyword': {
          value: f.term['city.keyword'],
          boost: 2.0
        }
      }
    }));
  
  tiers.push({
    bool: {
      must: [
        {
          multi_match: {
            query: `${cleanedQuery} ${VENUE_SYNONYMS.slice(0, 5).join(' ')}`,
            fields: SEARCH_FIELDS,
            type: 'most_fields',
            operator: 'OR',
            minimum_should_match: '35%',
            fuzziness: 'AUTO'
          }
        }
      ],
      filter: stateOnlyFilters,
      should: [
        ...cityBoosts,
        ...shouldSynonyms,
        ...venueBoosts,
        ...nycBoosts,
        // Add wildcard matching for partial terms
        {
          wildcard: {
            company: {
              value: `*${cleanedQuery.split(' ')[0]}*`,
              boost: 0.5
            }
          }
        }
      ],
      must_not: mustNotExclusions,
      minimum_should_match: 0
    }
  });
  
  // ========== TIER 4: State-only with heavy synonym expansion ==========
  // Focus on finding any venue-like business in the state
  tiers.push({
    bool: {
      must: [
        {
          bool: {
            should: [
              // Match user query loosely
              {
                multi_match: {
                  query: cleanedQuery,
                  fields: SEARCH_FIELDS,
                  operator: 'OR',
                  minimum_should_match: '25%',
                  fuzziness: 'AUTO'
                }
              },
              // Match venue synonyms
              {
                multi_match: {
                  query: VENUE_SYNONYMS.join(' '),
                  fields: ['company^3', 'headline^2', 'metadata', 'title'],
                  operator: 'OR',
                  minimum_should_match: '20%'
                }
              }
            ],
            minimum_should_match: 1
          }
        }
      ],
      filter: stateOnlyFilters.length > 0 ? stateOnlyFilters : undefined,
      should: [
        ...shouldSynonyms,
        ...venueBoosts,
        // Boost any venue indicators strongly
        {
          multi_match: {
            query: 'live music concert venue bar club theater',
            fields: ['company^2', 'headline^1.5', 'metadata'],
            operator: 'OR',
            boost: 1.0
          }
        }
      ],
      must_not: mustNotExclusions,
      minimum_should_match: 0
    }
  });
  
  // ========== TIER 5: Broadest search - no location filters ==========
  // Last resort to avoid empty results
  tiers.push({
    bool: {
      should: [
        // Try to match the original query
        {
          multi_match: {
            query: userQuery,
            fields: SEARCH_FIELDS,
            type: 'best_fields',
            operator: 'OR',
            fuzziness: 'AUTO',
            boost: 2.0
          }
        },
        // Match venue terms
        {
          multi_match: {
            query: VENUE_SYNONYMS.join(' '),
            fields: ['company^3', 'headline^2', 'metadata'],
            operator: 'OR',
            minimum_should_match: '10%',
            boost: 1.0
          }
        },
        // Match any venue indicators
        ...venueBoosts,
        // Very loose match to avoid 0 results
        {
          match_all: {
            boost: 0.01
          }
        }
      ],
      must_not: mustNotExclusions,
      minimum_should_match: 1
    }
  });
  
  return tiers;
}

/**
 * Execute search with tiered fallback
 */
export async function runWithFallback(
  es: Client,
  index: string,
  userQuery: string,
  size: number = 25
): Promise<SearchResult> {
  const tiers = buildTiers(userQuery);
  
  // Log the search attempt
  console.log(`[Search] Query: "${userQuery}", Location: ${JSON.stringify(normalizeLocation(userQuery))}`);
  
  for (let i = 0; i < tiers.length; i++) {
    try {
      const response = await es.search({
        index,
        query: tiers[i],
        size,
        track_scores: true,
        _source: true,
        highlight: {
          fields: {
            company: {},
            headline: {},
            metadata: {}
          }
        }
      });
      
      const hits = response.hits?.hits || [];
      const total = response.hits?.total?.value || response.hits?.total || 0;
      
      if (hits.length > 0) {
        console.log(`[Search] Tier ${i + 1} returned ${hits.length} results`);
        
        let message: string | undefined;
        if (i === 0) {
          message = undefined; // Perfect match
        } else if (i === 1) {
          message = 'Showing results with flexible matching';
        } else if (i === 2) {
          message = 'Expanded search to nearby areas';
        } else if (i === 3) {
          message = 'Showing all venues in the state';
        } else {
          message = 'Showing broadest results - try adding a location';
        }
        
        return {
          tierUsed: i + 1,
          hits,
          total,
          message
        };
      }
      
      console.log(`[Search] Tier ${i + 1} returned 0 results, trying next tier`);
      
    } catch (error) {
      console.error(`[Search] Error in tier ${i + 1}:`, error);
      // Continue to next tier on error
    }
  }
  
  // If all tiers fail, return empty results
  console.warn('[Search] All tiers exhausted, returning empty results');
  return {
    tierUsed: tiers.length,
    hits: [],
    total: 0,
    message: 'No results found. Try broadening your search terms.'
  };
}

/**
 * Get search suggestions based on tier used and results
 */
export function getSearchSuggestions(
  tierUsed: number,
  query: string,
  totalResults: number
): string[] {
  const suggestions: string[] = [];
  const location = normalizeLocation(query);
  
  if (tierUsed > 2 && totalResults < 5) {
    // Suggest broader searches
    if (location.type === 'city_state' || location.type === 'city_only') {
      suggestions.push('Try searching for the entire state');
    }
    suggestions.push('Try using broader terms like "venue" or "live music"');
    suggestions.push('Remove specific requirements and search more generally');
  }
  
  if (tierUsed === 1 && totalResults > 100) {
    // Suggest more specific searches
    suggestions.push('Add more specific terms to narrow results');
    if (location.type === 'state') {
      suggestions.push('Try adding a city name for more targeted results');
    }
  }
  
  return suggestions;
}
