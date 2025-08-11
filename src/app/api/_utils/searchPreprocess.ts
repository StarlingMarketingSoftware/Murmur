export type HardcodedLocation = {
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

// Minimal, deterministic aliases. Extend as needed.
const LOCATION_ALIASES: Record<string, HardcodedLocation> = {
  // User request: "manhattan" corresponds to New York, New York
  manhattan: { city: 'New York', state: 'New York', country: 'United States of America' },
};

function normalize(text: string): string {
  return text.toLowerCase();
}

// City penalty lists tied to aliases. Values are lowercase for matching.
const LOCATION_PENALTY_CITIES: Record<string, string[]> = {
  // For queries containing "manhattan", softly deprioritize these cities
  manhattan: [
    'amityville',
    'brooklyn',
    'lima',
    'woodstock',
    'westhampton beach',
    'lindenhurst',
    'buffalo',
    'rochester',
    'clifton park',
    'montauk',
  ],
};

export function applyHardcodedLocationOverrides(
  rawQuery: string,
  parsed: { city: string | null; state: string | null; country: string | null; restOfQuery: string }
): { overrides: { city: string | null; state: string | null; country: string | null; restOfQuery: string }; penaltyCities?: string[]; forceCityExactCity?: string } {
  const lowered = normalize(rawQuery);

  // Find the first alias present in the query
  const hit = Object.keys(LOCATION_ALIASES).find((key) => lowered.includes(key));
  if (!hit) return { overrides: parsed };

  const alias = LOCATION_ALIASES[hit];

  // Override parsed values
  const city = alias.city ?? parsed.city;
  const state = alias.state ?? parsed.state;
  const country = alias.country ?? parsed.country;

  // Remove the alias token from the restOfQuery to avoid diluting semantic intent
  const cleanedRest = parsed.restOfQuery
    ? parsed.restOfQuery.replace(new RegExp(hit, 'ig'), '').replace(/\s+/g, ' ').trim()
    : parsed.restOfQuery;

  const penaltyCities = LOCATION_PENALTY_CITIES[hit];
  // For aliases that represent a specific city (e.g., Manhattan -> New York), enforce exact city match
  const forceCityExactCity = alias.city || undefined;

  return {
    overrides: {
      city,
      state,
      country,
      restOfQuery: cleanedRest,
    },
    penaltyCities,
    forceCityExactCity,
  };
}


