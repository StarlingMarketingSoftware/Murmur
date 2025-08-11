export type HardcodedLocation = {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  // When true, downstream search should enforce exact city match if possible
  forceExactCity?: boolean;
};

export type LocationOverrideResult = {
  overrides: { city: string | null; state: string | null; country: string | null; restOfQuery: string };
  penaltyCities: string[];
  forceCityExactCity?: string;
  // When provided, downstream search should accept any of these state values as exact matches
  forceStateAny?: string[];
  penaltyTerms: string[];
  strictPenalty?: boolean;
};

// Minimal, deterministic aliases. Extend as needed.
const LOCATION_ALIASES: Record<string, HardcodedLocation> = {
  // User request: "manhattan" corresponds to New York, New York
  manhattan: { city: 'New York', state: 'New York', country: 'United States of America' },
  // Philadelphia strict handling (correct spelling, common nickname, and misspelling)
  philadelphia: { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  philly: { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  phiadelphia: { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  // Brooklyn strict handling
  brooklyn: { city: 'Brooklyn', state: 'New York', country: 'United States of America', forceExactCity: true },
  // Boston strict handling
  boston: { city: 'Boston', state: 'Massachusetts', country: 'United States of America', forceExactCity: true },
  // Baltimore strict handling
  baltimore: { city: 'Baltimore', state: 'Maryland', country: 'United States of America', forceExactCity: true },
  // Chicago strict handling
  chicago: { city: 'Chicago', state: 'Illinois', country: 'United States of America', forceExactCity: true },
  // Washington, DC strict handling with common variations
  'washington dc': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'washington, dc': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'washingtondc': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'district of columbia': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
};

function normalize(text: string): string {
  return text.toLowerCase();
}

// Synonyms for state values to ensure strict matching allows common abbreviations
const STATE_SYNONYMS: Record<string, string[]> = {
  'district of columbia': ['District of Columbia', 'DC'],
  'dc': ['District of Columbia', 'DC'],
  'new york': ['New York', 'NY'],
  'pennsylvania': ['Pennsylvania', 'PA'],
  'massachusetts': ['Massachusetts', 'MA'],
  'maryland': ['Maryland', 'MD'],
  'illinois': ['Illinois', 'IL'],
};

export function applyHardcodedLocationOverrides(
  rawQuery: string,
  parsed: { city: string | null; state: string | null; country: string | null; restOfQuery: string }
): LocationOverrideResult {
  const lowered = normalize(rawQuery);

  // Special-case: standalone "DC" tokens (e.g., "Music venues DC", "in D.C.") map to Washington, DC
  // Accept variations like: DC, D.C, D.C., D C
  const dcTokenRegex = /(^|[^a-z])d\.?\s*c\.?([^a-z]|$)/i;
  if (dcTokenRegex.test(lowered)) {
    const cleanedRest = parsed.restOfQuery
      ? parsed.restOfQuery.replace(/\bD\.?\s*C\.?\b/gi, '').replace(/\s+/g, ' ').trim()
      : parsed.restOfQuery;

    return {
      overrides: {
        city: 'Washington',
        state: 'District of Columbia',
        country: 'United States of America',
        restOfQuery: cleanedRest,
      },
      penaltyCities: [],
      forceCityExactCity: 'Washington',
      forceStateAny: ['District of Columbia', 'DC'],
      penaltyTerms: [],
      strictPenalty: false,
    };
  }

  // Find the first alias present in the query
  const hit = Object.keys(LOCATION_ALIASES).find((key) => lowered.includes(key));
  if (!hit) {
    return {
      overrides: parsed,
      penaltyCities: [],
      penaltyTerms: [],
    };
  }

  const alias = LOCATION_ALIASES[hit];

  // Override parsed values
  const city = alias.city ?? parsed.city;
  const state = alias.state ?? parsed.state;
  const country = alias.country ?? parsed.country;

  // Remove the alias token from the restOfQuery to avoid diluting semantic intent
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cleanedRest = parsed.restOfQuery
    ? parsed.restOfQuery.replace(new RegExp(escapeRegex(hit), 'ig'), '').replace(/\s+/g, ' ').trim()
    : parsed.restOfQuery;

  const forceCityExact = alias.forceExactCity && city ? city : undefined;
  // If we have a known state, allow strict matching against any of its common synonyms/abbreviations
  const stateKey = (state || '').toLowerCase();
  const forceStateAny = stateKey && STATE_SYNONYMS[stateKey] ? STATE_SYNONYMS[stateKey] : undefined;

  return {
    overrides: {
      city,
      state,
      country,
      restOfQuery: cleanedRest,
    },
    penaltyCities: [],
    // Hint the downstream search to require an exact city match when appropriate
    forceCityExactCity: forceCityExact,
    forceStateAny,
    penaltyTerms: [],
    strictPenalty: false,
  };
}


