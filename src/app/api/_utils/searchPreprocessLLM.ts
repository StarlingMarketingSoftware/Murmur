import { fetchOpenAi } from './openai';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';

export type LocationOverrideResult = {
  overrides: { 
    city: string | null; 
    state: string | null; 
    country: string | null; 
    restOfQuery: string 
  };
  penaltyCities: string[];
  forceCityExactCity?: string;
  forceStateAny?: string[];
  forceCityAny?: string[];
  penaltyTerms: string[];
  strictPenalty?: boolean;
};

/**
 * LLM-powered location override processor
 * Replaces hardcoded location aliases and state synonyms with intelligent parsing
 */
export async function applyLLMLocationOverrides(
  rawQuery: string,
  parsed: { 
    city: string | null; 
    state: string | null; 
    country: string | null; 
    restOfQuery: string 
  }
): Promise<LocationOverrideResult> {
  try {
    // Use LLM to intelligently process location information
    const prompt = `You are a location disambiguation expert. Analyze the search query and parsed location data to provide intelligent overrides.

    TASK: Process location information and identify:
    1. City nicknames and their official names (e.g., "Philly" → "Philadelphia")
    2. Common misspellings and corrections (e.g., "Buffallo" → "Buffalo")
    3. Ambiguous abbreviations based on context (e.g., "LA" → "Los Angeles" vs "Louisiana")
    4. Multi-city regions (e.g., "NYC" covers multiple boroughs)
    5. State abbreviations and variations

    RETURN FORMAT (JSON only):
    {
      "city": "Official city name or null",
      "state": "Official state name or null",
      "country": "Official country name or null",
      "restOfQuery": "Query with location terms removed",
      "forceCityExact": "City name if exact match required or null",
      "forceStateAny": ["List of acceptable state variations"] or null,
      "forceCityAny": ["List of acceptable city variations"] or null,
      "penaltyCities": ["Cities to deprioritize"] or [],
      "locationConfidence": 0.0 to 1.0
    }

    SPECIAL RULES:
    - For "NYC" or "New York City": forceCityAny should include ["New York", "Brooklyn"]
    - For "Manhattan": set city to "New York" with forceCityExact
    - For "DC" variations: city="Washington", state="District of Columbia"
    - For "LA": default to Los Angeles unless Louisiana context is present
    - Standardize USA as "United States of America"
    - Clean location terms from restOfQuery

    CONTEXT CLUES:
    - Look for nearby location indicators
    - Consider industry/venue types (e.g., "music venues" suggests city search)
    - Disambiguate based on other terms in query`;

    const llmInput = JSON.stringify({
      rawQuery,
      parsedLocation: parsed
    });

    const response = await fetchOpenAi(
      OPEN_AI_MODEL_OPTIONS.o4mini,
      prompt,
      llmInput
    );

    const llmResult = JSON.parse(response);

    // Build the result structure
    const result: LocationOverrideResult = {
      overrides: {
        city: llmResult.city || parsed.city,
        state: llmResult.state || parsed.state,
        country: llmResult.country || parsed.country,
        restOfQuery: llmResult.restOfQuery || parsed.restOfQuery
      },
      penaltyCities: llmResult.penaltyCities || [],
      forceCityExactCity: llmResult.forceCityExact || undefined,
      forceStateAny: llmResult.forceStateAny || undefined,
      forceCityAny: llmResult.forceCityAny || undefined,
      penaltyTerms: llmResult.penaltyTerms || [],
      strictPenalty: llmResult.locationConfidence > 0.8
    };

    return result;
  } catch (error) {
    console.error('LLM location override failed, using original parsed data:', error);
    // Fallback to original parsed data if LLM fails
    return {
      overrides: parsed,
      penaltyCities: [],
      penaltyTerms: [],
      strictPenalty: false
    };
  }
}

/**
 * Hybrid approach: Try common cases with minimal latency, fall back to LLM for complex cases
 */
export async function applyHybridLocationOverrides(
  rawQuery: string,
  parsed: { 
    city: string | null; 
    state: string | null; 
    country: string | null; 
    restOfQuery: string 
  }
): Promise<LocationOverrideResult> {
  const lowered = rawQuery.toLowerCase();
  
  // Quick wins - handle the most common cases without LLM
  const quickPatterns = [
    { pattern: /\bnyc\b/i, result: { city: null, state: 'New York', forceCityAny: ['New York', 'Brooklyn'] } },
    { pattern: /\bphilly\b/i, result: { city: 'Philadelphia', state: 'Pennsylvania', forceCityExact: true } },
    { pattern: /\bdc\b|\bd\.c\./i, result: { city: 'Washington', state: 'District of Columbia', forceCityExact: true } },
    { pattern: /\bla\b(?!.*louisiana)/i, result: { city: 'Los Angeles', state: 'California', forceCityExact: true } }
  ];

  for (const { pattern, result } of quickPatterns) {
    if (pattern.test(lowered)) {
      const cleanedRest = parsed.restOfQuery
        .replace(pattern, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      return {
        overrides: {
          city: result.city || parsed.city,
          state: result.state || parsed.state,
          country: 'United States of America',
          restOfQuery: cleanedRest
        },
        penaltyCities: [],
        forceCityExactCity: result.forceCityExact ? result.city : undefined,
        forceCityAny: result.forceCityAny,
        penaltyTerms: [],
        strictPenalty: false
      };
    }
  }

  // For everything else, use the LLM
  return applyLLMLocationOverrides(rawQuery, parsed);
}

/**
 * Cache wrapper for LLM location processing to reduce API calls
 */
const locationCache = new Map<string, LocationOverrideResult>();
const CACHE_TTL = 3600000; // 1 hour
const cacheTimestamps = new Map<string, number>();

export async function applySmartLocationOverrides(
  rawQuery: string,
  parsed: { 
    city: string | null; 
    state: string | null; 
    country: string | null; 
    restOfQuery: string 
  }
): Promise<LocationOverrideResult> {
  const cacheKey = `${rawQuery}::${JSON.stringify(parsed)}`;
  
  // Check cache
  if (locationCache.has(cacheKey)) {
    const timestamp = cacheTimestamps.get(cacheKey) || 0;
    if (Date.now() - timestamp < CACHE_TTL) {
      return locationCache.get(cacheKey)!;
    }
  }

  // Process with hybrid approach
  const result = await applyHybridLocationOverrides(rawQuery, parsed);
  
  // Cache the result
  locationCache.set(cacheKey, result);
  cacheTimestamps.set(cacheKey, Date.now());
  
  // Limit cache size
  if (locationCache.size > 1000) {
    const oldestKey = Array.from(cacheTimestamps.entries())
      .sort((a, b) => a[1] - b[1])[0][0];
    locationCache.delete(oldestKey);
    cacheTimestamps.delete(oldestKey);
  }
  
  return result;
}
