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
};

function normalize(text: string): string {
  return text.toLowerCase();
}

export function applyHardcodedLocationOverrides(
  rawQuery: string,
  parsed: { city: string | null; state: string | null; country: string | null; restOfQuery: string }
): LocationOverrideResult {
  const lowered = normalize(rawQuery);

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
  const cleanedRest = parsed.restOfQuery
    ? parsed.restOfQuery.replace(new RegExp(hit, 'ig'), '').replace(/\s+/g, ' ').trim()
    : parsed.restOfQuery;

  const forceCityExact = alias.forceExactCity && city ? city : undefined;

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
    penaltyTerms: [],
    strictPenalty: false,
  };
}


