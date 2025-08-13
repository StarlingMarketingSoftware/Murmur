import { Client } from '@elastic/elasticsearch';
import { Contact } from '@prisma/client';
import { runWithFallback, getSearchSuggestions } from './queryBuilder';
import { normalizeLocation } from './locationNormalize';

// Initialize Elasticsearch client (using same config as vectorDb.ts)
const getElasticsearchClient = () => {
  return new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    ...(process.env.ELASTICSEARCH_API_KEY && {
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      },
    }),
    requestTimeout: 60000,
    maxRetries: 3,
  });
};

export interface VenueSearchOptions {
  query: string;
  limit?: number;
  verificationStatus?: string;
  excludeContactIds?: number[];
}

export interface VenueSearchResult {
  contacts: any[];
  tierUsed: number;
  total: number;
  message?: string;
  suggestions?: string[];
  locationParsed?: ReturnType<typeof normalizeLocation>;
}

/**
 * Search for venues using the new tiered fallback system
 */
export async function searchVenues(options: VenueSearchOptions): Promise<VenueSearchResult> {
  const {
    query,
    limit = 100,
    verificationStatus,
    excludeContactIds = []
  } = options;
  
  const es = getElasticsearchClient();
  const INDEX_NAME = 'contacts';
  
  // Run tiered search
  const searchResult = await runWithFallback(es, INDEX_NAME, query, limit);
  
  // Filter results based on additional criteria
  let filteredHits = searchResult.hits;
  
  // Apply verification status filter if provided
  if (verificationStatus) {
    filteredHits = filteredHits.filter(hit => 
      hit._source?.emailValidationStatus === verificationStatus
    );
  }
  
  // Exclude specific contact IDs if provided
  if (excludeContactIds.length > 0) {
    const excludeSet = new Set(excludeContactIds.map(id => String(id)));
    filteredHits = filteredHits.filter(hit => 
      !excludeSet.has(String(hit._source?.contactId || hit._id))
    );
  }
  
  // Transform Elasticsearch hits to contact format
  const contacts = filteredHits.map(hit => ({
    id: Number(hit._source?.contactId || hit._id),
    email: hit._source?.email || '',
    firstName: hit._source?.firstName || null,
    lastName: hit._source?.lastName || null,
    company: hit._source?.company || null,
    title: hit._source?.title || null,
    headline: hit._source?.headline || null,
    city: hit._source?.city || null,
    state: hit._source?.state || null,
    country: hit._source?.country || null,
    address: hit._source?.address || null,
    website: hit._source?.website || null,
    metadata: hit._source?.metadata || null,
    companyFoundedYear: hit._source?.companyFoundedYear || null,
    companyType: hit._source?.companyType || null,
    companyTechStack: hit._source?.companyTechStack || null,
    companyKeywords: hit._source?.companyKeywords || null,
    companyIndustry: hit._source?.companyIndustry || null,
    latitude: hit._source?.coordinates?.lat || null,
    longitude: hit._source?.coordinates?.lon || null,
    score: hit._score || 0,
    highlights: hit.highlight || {},
  }));
  
  // Get search suggestions if needed
  const suggestions = searchResult.tierUsed > 1 
    ? getSearchSuggestions(searchResult.tierUsed, query, contacts.length)
    : undefined;
  
  // Parse location for debugging/logging
  const locationParsed = normalizeLocation(query);
  
  return {
    contacts,
    tierUsed: searchResult.tierUsed,
    total: contacts.length,
    message: searchResult.message,
    suggestions,
    locationParsed,
  };
}

/**
 * Helper function to migrate from vector search to tiered search
 * This maintains backward compatibility with existing code
 */
export async function searchVenuesWithVectorFallback(
  options: VenueSearchOptions & { useVectorSearch?: boolean }
): Promise<VenueSearchResult> {
  // For now, always use the new tiered search
  // Vector search can be integrated as an additional tier if needed
  return searchVenues(options);
}

/**
 * Get venue by exact name match (for autocomplete/typeahead)
 */
export async function searchVenueByName(
  name: string,
  limit: number = 10
): Promise<any[]> {
  const es = getElasticsearchClient();
  const INDEX_NAME = 'contacts';
  
  const response = await es.search({
    index: INDEX_NAME,
    query: {
      bool: {
        should: [
          {
            match_phrase_prefix: {
              company: {
                query: name,
                boost: 3.0
              }
            }
          },
          {
            match: {
              company: {
                query: name,
                fuzziness: 'AUTO',
                boost: 1.0
              }
            }
          }
        ],
        minimum_should_match: 1
      }
    },
    size: limit,
    _source: ['contactId', 'company', 'city', 'state', 'headline']
  });
  
  return response.hits?.hits || [];
}
