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
  // Los Angeles: handle "LA" token elsewhere; include explicit alias forms here
  'los angeles': { city: 'Los Angeles', state: 'California', country: 'United States of America', forceExactCity: true },
  'losangeles': { city: 'Los Angeles', state: 'California', country: 'United States of America', forceExactCity: true },
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
  'alabama': ['Alabama', 'AL'],
  'al': ['Alabama', 'AL'],
  'alaska': ['Alaska', 'AK'],
  'ak': ['Alaska', 'AK'],
  'arizona': ['Arizona', 'AZ'],
  'az': ['Arizona', 'AZ'],
  'arkansas': ['Arkansas', 'AR'],
  'ar': ['Arkansas', 'AR'],
  'california': ['California', 'CA'],
  'ca': ['California', 'CA'],
  'colorado': ['Colorado', 'CO'],
  'co': ['Colorado', 'CO'],
  'connecticut': ['Connecticut', 'CT'],
  'ct': ['Connecticut', 'CT'],
  'delaware': ['Delaware', 'DE'],
  'de': ['Delaware', 'DE'],
  'florida': ['Florida', 'FL'],
  'fl': ['Florida', 'FL'],
  'georgia': ['Georgia', 'GA'],
  'ga': ['Georgia', 'GA'],
  'hawaii': ['Hawaii', 'HI'],
  'hi': ['Hawaii', 'HI'],
  'idaho': ['Idaho', 'ID'],
  'id': ['Idaho', 'ID'],
  'il': ['Illinois', 'IL'],
  'indiana': ['Indiana', 'IN'],
  'in': ['Indiana', 'IN'],
  'iowa': ['Iowa', 'IA'],
  'ia': ['Iowa', 'IA'],
  'kansas': ['Kansas', 'KS'],
  'ks': ['Kansas', 'KS'],
  'kentucky': ['Kentucky', 'KY'],
  'ky': ['Kentucky', 'KY'],
  'louisiana': ['Louisiana', 'LA'],
  'la': ['Louisiana', 'LA'],
  'maine': ['Maine', 'ME'],
  'me': ['Maine', 'ME'],
  'md': ['Maryland', 'MD'],
  'ma': ['Massachusetts', 'MA'],
  'michigan': ['Michigan', 'MI'],
  'mi': ['Michigan', 'MI'],
  'minnesota': ['Minnesota', 'MN'],
  'mn': ['Minnesota', 'MN'],
  'mississippi': ['Mississippi', 'MS'],
  'ms': ['Mississippi', 'MS'],
  'missouri': ['Missouri', 'MO'],
  'mo': ['Missouri', 'MO'],
  'montana': ['Montana', 'MT'],
  'mt': ['Montana', 'MT'],
  'nebraska': ['Nebraska', 'NE'],
  'ne': ['Nebraska', 'NE'],
  'nevada': ['Nevada', 'NV'],
  'nv': ['Nevada', 'NV'],
  'new hampshire': ['New Hampshire', 'NH'],
  'nh': ['New Hampshire', 'NH'],
  'new jersey': ['New Jersey', 'NJ'],
  'nj': ['New Jersey', 'NJ'],
  'new mexico': ['New Mexico', 'NM'],
  'nm': ['New Mexico', 'NM'],
  'ny': ['New York', 'NY'],
  'north carolina': ['North Carolina', 'NC'],
  'nc': ['North Carolina', 'NC'],
  'north dakota': ['North Dakota', 'ND'],
  'nd': ['North Dakota', 'ND'],
  'ohio': ['Ohio', 'OH'],
  'oh': ['Ohio', 'OH'],
  'oklahoma': ['Oklahoma', 'OK'],
  'ok': ['Oklahoma', 'OK'],
  'oregon': ['Oregon', 'OR'],
  'or': ['Oregon', 'OR'],
  'pa': ['Pennsylvania', 'PA'],
  'rhode island': ['Rhode Island', 'RI'],
  'ri': ['Rhode Island', 'RI'],
  'south carolina': ['South Carolina', 'SC'],
  'sc': ['South Carolina', 'SC'],
  'south dakota': ['South Dakota', 'SD'],
  'sd': ['South Dakota', 'SD'],
  'tennessee': ['Tennessee', 'TN'],
  'tn': ['Tennessee', 'TN'],
  'texas': ['Texas', 'TX'],
  'tx': ['Texas', 'TX'],
  'utah': ['Utah', 'UT'],
  'ut': ['Utah', 'UT'],
  'vermont': ['Vermont', 'VT'],
  'vt': ['Vermont', 'VT'],
  'virginia': ['Virginia', 'VA'],
  'va': ['Virginia', 'VA'],
  'washington': ['Washington', 'WA'],
  'wa': ['Washington', 'WA'],
  'west virginia': ['West Virginia', 'WV'],
  'wv': ['West Virginia', 'WV'],
  'wisconsin': ['Wisconsin', 'WI'],
  'wi': ['Wisconsin', 'WI'],
  'wyoming': ['Wyoming', 'WY'],
  'wy': ['Wyoming', 'WY'],
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

  // Special-case: standalone "LA" tokens that likely mean Los Angeles (avoid matching state code 'LA' for Louisiana by context)
  // We scope this to queries that contain venue or job-like terms, or when no other state/city present.
  const laTokenRegex = /(^|[^a-z])l\.?\s*a\.?([^a-z]|$)/i;
  const hasSomeOtherState = Object.keys(STATE_SYNONYMS).some((k) => new RegExp(`(^|[^a-z])${k}([^a-z]|$)`, 'i').test(lowered));
  if (laTokenRegex.test(lowered) && !hasSomeOtherState) {
    const cleanedRest = parsed.restOfQuery
      ? parsed.restOfQuery.replace(/\bL\.?\s*A\.?\b/gi, '').replace(/\s+/g, ' ').trim()
      : parsed.restOfQuery;
    return {
      overrides: {
        city: 'Los Angeles',
        state: 'California',
        country: 'United States of America',
        restOfQuery: cleanedRest,
      },
      penaltyCities: [],
      forceCityExactCity: 'Los Angeles',
      forceStateAny: ['California', 'CA'],
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


