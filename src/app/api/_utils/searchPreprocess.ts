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
  // When provided, downstream search should accept any of these city values as exact matches
  forceCityAny?: string[];
  penaltyTerms: string[];
  strictPenalty?: boolean;
};

// Minimal, deterministic aliases. Extend as needed.
const LOCATION_ALIASES: Record<string, HardcodedLocation> = {
  // User request: "manhattan" corresponds to New York, New York (strict city match)
  manhattan: { city: 'New York', state: 'New York', country: 'United States of America', forceExactCity: true },
  // NYC maps to multiple boroughs/cities; we enforce state strictly and allow multiple cities via forceCityAny
  nyc: { city: null, state: 'New York', country: 'United States of America' },
  // Explicit handling for "New York City"
  'new york city': { city: null, state: 'New York', country: 'United States of America' },
  'newyorkcity': { city: null, state: 'New York', country: 'United States of America' },
  // Philadelphia strict handling (correct spelling, common nickname, and misspelling)
  philadelphia: { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  philly: { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  phiadelphia: { city: 'Philadelphia', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  brooklyn: { city: 'Brooklyn', state: 'New York', country: 'United States of America', forceExactCity: true },
  boston: { city: 'Boston', state: 'Massachusetts', country: 'United States of America', forceExactCity: true },
  baltimore: { city: 'Baltimore', state: 'Maryland', country: 'United States of America', forceExactCity: true },
  chicago: { city: 'Chicago', state: 'Illinois', country: 'United States of America', forceExactCity: true },
  nashville: { city: 'Nashville', state: 'Tennessee', country: 'United States of America', forceExactCity: true },
  memphis: { city: 'Memphis', state: 'Tennessee', country: 'United States of America', forceExactCity: true },
  'washington dc': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'washington, dc': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'washingtondc': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'district of columbia': { city: 'Washington', state: 'District of Columbia', country: 'United States of America', forceExactCity: true },
  'los angeles': { city: 'Los Angeles', state: 'California', country: 'United States of America', forceExactCity: true },
  'losangeles': { city: 'Los Angeles', state: 'California', country: 'United States of America', forceExactCity: true },
  'las vegas': { city: 'Las Vegas', state: 'Nevada', country: 'United States of America', forceExactCity: true },
  'new orleans': { city: 'New Orleans', state: 'Louisiana', country: 'United States of America', forceExactCity: true },
  'neworleans': { city: 'New Orleans', state: 'Louisiana', country: 'United States of America', forceExactCity: true },
  'san antonio': { city: 'San Antonio', state: 'Texas', country: 'United States of America', forceExactCity: true },
  'san diego': { city: 'San Diego', state: 'California', country: 'United States of America', forceExactCity: true },
  'san jose': { city: 'San Jose', state: 'California', country: 'United States of America', forceExactCity: true },
  'san francisco': { city: 'San Francisco', state: 'California', country: 'United States of America', forceExactCity: true },
  'sanfrancisco': { city: 'San Francisco', state: 'California', country: 'United States of America', forceExactCity: true },
  fresno: { city: 'Fresno', state: 'California', country: 'United States of America', forceExactCity: true },
  sacramento: { city: 'Sacramento', state: 'California', country: 'United States of America', forceExactCity: true },
  oakland: { city: 'Oakland', state: 'California', country: 'United States of America', forceExactCity: true },
  'long beach': { city: 'Long Beach', state: 'California', country: 'United States of America', forceExactCity: true },
  'longbeach': { city: 'Long Beach', state: 'California', country: 'United States of America', forceExactCity: true },
  buffallo: { city: 'Buffalo', state: 'New York', country: 'United States of America', forceExactCity: true },
  rochester: { city: 'Rochester', state: 'New York', country: 'United States of America', forceExactCity: true },
  indianapolis: { city: 'Indianapolis', state: 'Indiana', country: 'United States of America', forceExactCity: true },
  jacksonville: { city: 'Jacksonville', state: 'Florida', country: 'United States of America', forceExactCity: true },
  miami: { city: 'Miami', state: 'Florida', country: 'United States of America', forceExactCity: true },
  houston: { city: 'Houston', state: 'Texas', country: 'United States of America', forceExactCity: true },
  austin: { city: 'Austin', state: 'Texas', country: 'United States of America', forceExactCity: true },
  dallas: { city: 'Dallas', state: 'Texas', country: 'United States of America', forceExactCity: true },
  'fort worth': { city: 'Fort Worth', state: 'Texas', country: 'United States of America', forceExactCity: true },
  'fortworth': { city: 'Fort Worth', state: 'Texas', country: 'United States of America', forceExactCity: true },
  'el paso': { city: 'El Paso', state: 'Texas', country: 'United States of America', forceExactCity: true },
  'elpaso': { city: 'El Paso', state: 'Texas', country: 'United States of America', forceExactCity: true },
  atlanta: { city: 'Atlanta', state: 'Georgia', country: 'United States of America', forceExactCity: true },
  louisville: { city: 'Louisville', state: 'Kentucky', country: 'United States of America', forceExactCity: true },
  charlotte: { city: 'Charlotte', state: 'North Carolina', country: 'United States of America', forceExactCity: true },
  raleigh: { city: 'Raleigh', state: 'North Carolina', country: 'United States of America', forceExactCity: true },
  'virginia beach': { city: 'Virginia Beach', state: 'Virginia', country: 'United States of America', forceExactCity: true },
  'virginiabeach': { city: 'Virginia Beach', state: 'Virginia', country: 'United States of America', forceExactCity: true },
  'virginia beah': { city: 'Virginia Beach', state: 'Virginia', country: 'United States of America', forceExactCity: true },
  minneapolis: { city: 'Minneapolis', state: 'Minnesota', country: 'United States of America', forceExactCity: true },
  seattle: { city: 'Seattle', state: 'Washington', country: 'United States of America', forceExactCity: true },
  denver: { city: 'Denver', state: 'Colorado', country: 'United States of America', forceExactCity: true },
  'colorado springs': { city: 'Colorado Springs', state: 'Colorado', country: 'United States of America', forceExactCity: true },
  'coloradosprings': { city: 'Colorado Springs', state: 'Colorado', country: 'United States of America', forceExactCity: true },
  hartford: { city: 'Hartford', state: 'Connecticut', country: 'United States of America', forceExactCity: true },
  'kansas city': { city: 'Kansas City', state: 'Missouri', country: 'United States of America', forceExactCity: true },
  'kansascity': { city: 'Kansas City', state: 'Missouri', country: 'United States of America', forceExactCity: true },
  'oklahoma city': { city: 'Oklahoma City', state: 'Oklahoma', country: 'United States of America', forceExactCity: true },
  'oklahomacity': { city: 'Oklahoma City', state: 'Oklahoma', country: 'United States of America', forceExactCity: true },
  tulsa: { city: 'Tulsa', state: 'Oklahoma', country: 'United States of America', forceExactCity: true },
  detroit: { city: 'Detroit', state: 'Michigan', country: 'United States of America', forceExactCity: true },
  albuquerque: { city: 'Albuquerque', state: 'New Mexico', country: 'United States of America', forceExactCity: true },
  albequerque: { city: 'Albuquerque', state: 'New Mexico', country: 'United States of America', forceExactCity: true },
  milwaukee: { city: 'Milwaukee', state: 'Wisconsin', country: 'United States of America', forceExactCity: true },
  wilmington: { city: 'Wilmington', state: 'Delaware', country: 'United States of America', forceExactCity: true },
  harrisburg: { city: 'Harrisburg', state: 'Pennsylvania', country: 'United States of America', forceExactCity: true },
  omaha: { city: 'Omaha', state: 'Nebraska', country: 'United States of America', forceExactCity: true },
  cleveland: { city: 'Cleveland', state: 'Ohio', country: 'United States of America', forceExactCity: true },
  columbus: { city: 'Columbus', state: 'Ohio', country: 'United States of America', forceExactCity: true },
  wichita: { city: 'Wichita', state: 'Kansas', country: 'United States of America', forceExactCity: true },
  pheonix: { city: 'Pheonix', state: 'Arizona', country: 'United States of America', forceExactCity: true },
  phoenix: { city: 'Phoenix', state: 'Arizona', country: 'United States of America', forceExactCity: true },
  tucson: { city: 'Tucson', state: 'Arizona', country: 'United States of America', forceExactCity: true },
  mesa: { city: 'Mesa', state: 'Arizona', country: 'United States of America', forceExactCity: true },
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

  // Special-case: standalone "LA" tokens that likely mean Los Angeles.
  // Prefer Los Angeles unless Louisiana is explicitly referenced.
  const laTokenRegex = /(^|[^a-z])l\.?\s*a\.?([^a-z]|$)/i;
  const explicitLouisiana = /\blouisiana\b/i.test(lowered) || /\bnew orleans\b|\bbaton rouge\b|\bshreveport\b/i.test(lowered);
  if (laTokenRegex.test(lowered) && !explicitLouisiana) {
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

  // Find alias present in the query using strict, word-boundary-aware matching.
  // Prefer the longest matching alias to avoid partial overshadowing (e.g., "washington dc" over "dc").
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const aliasKeys = Object.keys(LOCATION_ALIASES);
  const matchingAliases = aliasKeys.filter((key) => {
    const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, 'i');
    return pattern.test(lowered);
  });
  const hit = matchingAliases.sort((a, b) => b.length - a.length)[0];
  if (!hit) {
    // If LLM didn't parse a state, deterministically detect one from raw query using full state names (not 2-letter abbreviations)
    let detectedStateCanonical: string | null = null;
    let detectedKey: string | null = null;
    const nonAbbrevStateKeys = Object.keys(STATE_SYNONYMS).filter((k) => k.length > 2);
    for (const key of nonAbbrevStateKeys.sort((a, b) => b.length - a.length)) {
      const pattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`, 'i');
      if (pattern.test(lowered)) {
        detectedKey = key;
        detectedStateCanonical = STATE_SYNONYMS[key][0];
        break;
      }
    }

    if (detectedStateCanonical) {
      const cleanedRest = parsed.restOfQuery
        ? parsed.restOfQuery
            .replace(new RegExp(`\\b${detectedKey!.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')}\\b`, 'ig'), '')
            .replace(/\s+/g, ' ')
            .trim()
        : parsed.restOfQuery;

      const forceStateAny = STATE_SYNONYMS[detectedKey!.toLowerCase()] || [detectedStateCanonical];

      return {
        overrides: {
          city: parsed.city,
          state: detectedStateCanonical,
          country: parsed.country,
          restOfQuery: cleanedRest,
        },
        penaltyCities: [],
        forceStateAny,
        penaltyTerms: [],
        strictPenalty: false,
      };
    } else {
      // Even without detected state or alias, provide state synonyms if parsed contains a state
      const stateKey = (parsed.state || '').toLowerCase();
      const forceStateAny = stateKey && STATE_SYNONYMS[stateKey] ? STATE_SYNONYMS[stateKey] : undefined;

      return {
        overrides: parsed,
        penaltyCities: [],
        forceStateAny,
        penaltyTerms: [],
        strictPenalty: false,
      };
    }
  }

  const alias = LOCATION_ALIASES[hit];

  // Override parsed values
  const city = alias.city ?? parsed.city;
  const state = alias.state ?? parsed.state;
  const country = alias.country ?? parsed.country;

  // Remove the alias token from the restOfQuery using boundary-aware replacement
  const cleanedRest = parsed.restOfQuery
    ? parsed.restOfQuery
        .replace(new RegExp(`\\b${escapeRegex(hit)}\\b`, 'ig'), '')
        .replace(/\s+/g, ' ')
        .trim()
    : parsed.restOfQuery;

  const forceCityExact = alias.forceExactCity && city ? city : undefined;
  // If we have a known state, allow strict matching against any of its common synonyms/abbreviations
  const stateKey = (state || '').toLowerCase();
  const forceStateAny = stateKey && STATE_SYNONYMS[stateKey] ? STATE_SYNONYMS[stateKey] : undefined;
  // NYC: allow both New York and Brooklyn as exact city matches
  // NYC and "New York City": allow both New York and Brooklyn as exact city matches
  const forceCityAny = (hit === 'nyc' || hit === 'new york city' || hit === 'newyorkcity')
    ? ['New York', 'Brooklyn']
    : undefined;

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
    forceCityAny,
    penaltyTerms: [],
    strictPenalty: false,
  };
}


// Build a canonical map from any known state token to its USPS abbreviation
const STATE_ABBREV_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const entries = Object.entries(STATE_SYNONYMS);
  for (const [key, values] of entries) {
    const abbr = values.find((v) => /^[A-Z]{2}$/.test(v)) || values[1] || '';
    if (!abbr) continue;
    map[normalizeKey(key)] = abbr.toUpperCase();
    for (const v of values) {
      map[normalizeKey(v)] = abbr.toUpperCase();
    }
  }
  return map;
})();

export function stateToAbbrev(state: string | null | undefined): string | null {
  if (!state) return null;
  const key = state.toLowerCase().replace(/[^a-z]/g, '');
  return STATE_ABBREV_MAP[key] || null;
}

