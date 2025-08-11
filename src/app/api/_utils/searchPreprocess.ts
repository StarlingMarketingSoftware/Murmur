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

export function applyHardcodedLocationOverrides(
  rawQuery: string,
  parsed: { city: string | null; state: string | null; country: string | null; restOfQuery: string }
) {
  const lowered = normalize(rawQuery);

  // Find the first alias present in the query
  const hit = Object.keys(LOCATION_ALIASES).find((key) => lowered.includes(key));
  if (!hit) return parsed;

  const alias = LOCATION_ALIASES[hit];

  // Override parsed values
  const city = alias.city ?? parsed.city;
  const state = alias.state ?? parsed.state;
  const country = alias.country ?? parsed.country;

  // Remove the alias token from the restOfQuery to avoid diluting semantic intent
  const cleanedRest = parsed.restOfQuery
    ? parsed.restOfQuery.replace(new RegExp(hit, 'ig'), '').replace(/\s+/g, ' ').trim()
    : parsed.restOfQuery;

  return {
    city,
    state,
    country,
    restOfQuery: cleanedRest,
  };
}


