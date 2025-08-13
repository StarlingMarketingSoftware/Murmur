export type NormalizedLocation =
  | { type: 'city_state'; city: string; state?: string }
  | { type: 'state'; state: string }
  | { type: 'city_only'; city: string }
  | { type: 'none' };

// NYC boroughs and special mappings
const NYC_BOROUGH_MAP = new Map<string, { city: string; state: string }>([
  ['manhattan', { city: 'New York', state: 'New York' }],
  ['new york city', { city: 'New York', state: 'New York' }],
  ['nyc', { city: 'New York', state: 'New York' }],
  ['brooklyn', { city: 'Brooklyn', state: 'New York' }],
  ['queens', { city: 'Queens', state: 'New York' }],
  ['bronx', { city: 'Bronx', state: 'New York' }],
  ['staten island', { city: 'Staten Island', state: 'New York' }],
]);

// US States mapping (full name to abbreviation and vice versa)
const US_STATES = new Map<string, string>([
  ['alabama', 'AL'], ['al', 'Alabama'],
  ['alaska', 'AK'], ['ak', 'Alaska'],
  ['arizona', 'AZ'], ['az', 'Arizona'],
  ['arkansas', 'AR'], ['ar', 'Arkansas'],
  ['california', 'CA'], ['ca', 'California'],
  ['colorado', 'CO'], ['co', 'Colorado'],
  ['connecticut', 'CT'], ['ct', 'Connecticut'],
  ['delaware', 'DE'], ['de', 'Delaware'],
  ['florida', 'FL'], ['fl', 'Florida'],
  ['georgia', 'GA'], ['ga', 'Georgia'],
  ['hawaii', 'HI'], ['hi', 'Hawaii'],
  ['idaho', 'ID'], ['id', 'Idaho'],
  ['illinois', 'IL'], ['il', 'Illinois'],
  ['indiana', 'IN'], ['in', 'Indiana'],
  ['iowa', 'IA'], ['ia', 'Iowa'],
  ['kansas', 'KS'], ['ks', 'Kansas'],
  ['kentucky', 'KY'], ['ky', 'Kentucky'],
  ['louisiana', 'LA'], ['la', 'Louisiana'],
  ['maine', 'ME'], ['me', 'Maine'],
  ['maryland', 'MD'], ['md', 'Maryland'],
  ['massachusetts', 'MA'], ['ma', 'Massachusetts'],
  ['michigan', 'MI'], ['mi', 'Michigan'],
  ['minnesota', 'MN'], ['mn', 'Minnesota'],
  ['mississippi', 'MS'], ['ms', 'Mississippi'],
  ['missouri', 'MO'], ['mo', 'Missouri'],
  ['montana', 'MT'], ['mt', 'Montana'],
  ['nebraska', 'NE'], ['ne', 'Nebraska'],
  ['nevada', 'NV'], ['nv', 'Nevada'],
  ['new hampshire', 'NH'], ['nh', 'New Hampshire'],
  ['new jersey', 'NJ'], ['nj', 'New Jersey'],
  ['new mexico', 'NM'], ['nm', 'New Mexico'],
  ['new york', 'NY'], ['ny', 'New York'],
  ['north carolina', 'NC'], ['nc', 'North Carolina'],
  ['north dakota', 'ND'], ['nd', 'North Dakota'],
  ['ohio', 'OH'], ['oh', 'Ohio'],
  ['oklahoma', 'OK'], ['ok', 'Oklahoma'],
  ['oregon', 'OR'], ['or', 'Oregon'],
  ['pennsylvania', 'PA'], ['pa', 'Pennsylvania'],
  ['rhode island', 'RI'], ['ri', 'Rhode Island'],
  ['south carolina', 'SC'], ['sc', 'South Carolina'],
  ['south dakota', 'SD'], ['sd', 'South Dakota'],
  ['tennessee', 'TN'], ['tn', 'Tennessee'],
  ['texas', 'TX'], ['tx', 'Texas'],
  ['utah', 'UT'], ['ut', 'Utah'],
  ['vermont', 'VT'], ['vt', 'Vermont'],
  ['virginia', 'VA'], ['va', 'Virginia'],
  ['washington', 'WA'], ['wa', 'Washington'],
  ['west virginia', 'WV'], ['wv', 'West Virginia'],
  ['wisconsin', 'WI'], ['wi', 'Wisconsin'],
  ['wyoming', 'WY'], ['wy', 'Wyoming'],
  ['district of columbia', 'DC'], ['dc', 'District of Columbia'],
]);

// Major cities that might appear in queries
const MAJOR_CITIES = new Set([
  'boise', 'los angeles', 'san francisco', 'san diego', 'sacramento',
  'denver', 'phoenix', 'tucson', 'atlanta', 'miami', 'orlando', 'tampa',
  'chicago', 'indianapolis', 'detroit', 'columbus', 'cleveland', 'cincinnati',
  'boston', 'baltimore', 'philadelphia', 'pittsburgh', 'nashville', 'memphis',
  'new orleans', 'houston', 'dallas', 'austin', 'san antonio', 'seattle',
  'portland', 'las vegas', 'salt lake city', 'milwaukee', 'minneapolis',
  'st louis', 'kansas city', 'omaha', 'des moines', 'oklahoma city',
  'albuquerque', 'charlotte', 'raleigh', 'richmond', 'washington dc',
]);

export function normalizeLocation(query: string): NormalizedLocation {
  const lower = query.toLowerCase().trim();
  
  // Check for NYC boroughs and special cases first
  for (const [key, val] of NYC_BOROUGH_MAP.entries()) {
    if (lower.includes(key)) {
      return { type: 'city_state', city: val.city, state: val.state };
    }
  }
  
  // Check for "venue/music/bar/club {location}" pattern at end of query
  // e.g., "Music venue Boston", "Jazz clubs California"
  // First try to match patterns like "music venue(s) {location}" or "jazz club(s) {location}"
  const venuePatterns = [
    /(?:music\s+)?venues?\s+(.+)$/i,
    /(?:jazz\s+)?clubs?\s+(.+)$/i,
    /(?:live\s+)?music\s+(.+)$/i,
    /bars?\s+(.+)$/i,
    /concert\s+halls?\s+(.+)$/i,
    /theaters?\s+(.+)$/i,
    /theatres?\s+(.+)$/i,
    /lounges?\s+(.+)$/i,
    /nightclubs?\s+(.+)$/i,
  ];
  
  for (const pattern of venuePatterns) {
    const match = lower.match(pattern);
    if (match) {
      const place = match[1].trim();
      
      // Check if it's a state
      if (US_STATES.has(place)) {
        const fullName = US_STATES.get(place);
        return { 
          type: 'state', 
          state: fullName && fullName.length > 2 ? fullName : properCase(place) 
        };
      }
      
      // Check if it's a known city
      if (MAJOR_CITIES.has(place)) {
        return { type: 'city_only', city: properCase(place) };
      }
      
      // Check for multi-word states
      const words = place.split(/\s+/);
      // Check 2-word combinations (e.g., "new york")
      if (words.length >= 2) {
        const twoWords = words.slice(0, 2).join(' ');
        if (US_STATES.has(twoWords)) {
          const fullName = US_STATES.get(twoWords);
          return { 
            type: 'state', 
            state: fullName && fullName.length > 2 ? fullName : properCase(twoWords) 
          };
        }
      }
      // Check 3-word combinations (e.g., "district of columbia")
      if (words.length >= 3) {
        const threeWords = words.slice(0, 3).join(' ');
        if (US_STATES.has(threeWords)) {
          const fullName = US_STATES.get(threeWords);
          return { 
            type: 'state', 
            state: fullName && fullName.length > 2 ? fullName : properCase(threeWords) 
          };
        }
      }
      
      // Check for multi-word cities
      const multiWordCities = [
        'los angeles', 'san francisco', 'san diego', 'san antonio', 'san jose',
        'new orleans', 'las vegas', 'salt lake city', 'des moines', 'oklahoma city',
        'kansas city', 'st louis', 'virginia beach', 'colorado springs', 'fort worth',
        'el paso', 'long beach', 'washington dc'
      ];
      
      for (const cityName of multiWordCities) {
        if (place.startsWith(cityName)) {
          return { type: 'city_only', city: properCase(cityName) };
        }
      }
      
      // Default to city if it's a single word that looks like a place
      if (words.length === 1 && place.length > 2 && /^[a-z]+$/.test(place)) {
        return { type: 'city_only', city: properCase(place) };
      }
      
      // Break after first matching pattern
      break;
    }
  }
  
  // Check for "in <place>" pattern
  const inPattern = /\bin\s+([a-z\s]+?)(?:\s+(?:music|venue|venues|live|bar|bars|club|clubs)|$)/i;
  const inMatch = lower.match(inPattern);
  
  if (inMatch) {
    const place = inMatch[1].trim();
    
    // Check if it's a state
    if (US_STATES.has(place)) {
      const fullName = US_STATES.get(place);
      return { 
        type: 'state', 
        state: fullName && fullName.length > 2 ? fullName : properCase(place) 
      };
    }
    
    // Check if it's a known city
    if (MAJOR_CITIES.has(place)) {
      return { type: 'city_only', city: properCase(place) };
    }
    
    // Check for city, state pattern (e.g., "boise, id")
    const cityStatePattern = /^([^,]+),\s*([a-z]{2}|\w+)$/i;
    const csMatch = place.match(cityStatePattern);
    if (csMatch) {
      const city = properCase(csMatch[1].trim());
      const stateStr = csMatch[2].trim().toLowerCase();
      
      if (US_STATES.has(stateStr)) {
        const fullStateName = US_STATES.get(stateStr);
        return {
          type: 'city_state',
          city: city,
          state: fullStateName && fullStateName.length > 2 ? fullStateName : stateStr
        };
      }
    }
    
    // Default to city if we found a place after "in"
    if (place.length > 2) {
      return { type: 'city_only', city: properCase(place) };
    }
  }
  
  // Check for pattern "{anything} {state}" at the end
  // This handles "Music venues California", "Bars Texas" etc.
  const words = lower.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1];
    const lastTwoWords = words.slice(-2).join(' ');
    const lastThreeWords = words.slice(-3).join(' ');
    
    // Check last word for state abbreviation
    if (US_STATES.has(lastWord)) {
      const fullName = US_STATES.get(lastWord);
      return { 
        type: 'state', 
        state: fullName && fullName.length > 2 ? fullName : properCase(lastWord) 
      };
    }
    
    // Check last two words for states like "new york"
    if (US_STATES.has(lastTwoWords)) {
      const fullName = US_STATES.get(lastTwoWords);
      return { 
        type: 'state', 
        state: fullName && fullName.length > 2 ? fullName : properCase(lastTwoWords) 
      };
    }
    
    // Check last three words for states like "district of columbia"
    if (US_STATES.has(lastThreeWords)) {
      const fullName = US_STATES.get(lastThreeWords);
      return { 
        type: 'state', 
        state: fullName && fullName.length > 2 ? fullName : properCase(lastThreeWords) 
      };
    }
    
    // Check if last word is a known city
    if (MAJOR_CITIES.has(lastWord)) {
      return { type: 'city_only', city: properCase(lastWord) };
    }
    
    // Check if last two words form a known city
    const lastTwoAsCity = lastTwoWords.replace(/[,.]/, '').trim();
    if (MAJOR_CITIES.has(lastTwoAsCity)) {
      return { type: 'city_only', city: properCase(lastTwoAsCity) };
    }
  }
  
  // Fallback: Check for city names anywhere in query (less preferred)
  // Only use this for very specific city names to avoid false positives
  const verySpecificCities = ['manhattan', 'brooklyn', 'queens', 'bronx'];
  for (const city of verySpecificCities) {
    if (lower.includes(city)) {
      // Already handled by NYC_BOROUGH_MAP above, but just in case
      return { type: 'city_only', city: properCase(city) };
    }
  }
  
  return { type: 'none' };
}

export function locationFilters(loc: NormalizedLocation) {
  switch (loc.type) {
    case 'city_state':
      const filters: any[] = [];
      
      // Special handling for NYC
      if (loc.city === 'New York' && loc.state === 'New York') {
        // Include both New York and Brooklyn as primary cities
        filters.push({
          bool: {
            should: [
              { term: { 'city.keyword': 'New York' } },
              { term: { 'city.keyword': 'Brooklyn' } },
            ],
            minimum_should_match: 1
          }
        });
        filters.push({ term: { 'state.keyword': loc.state } });
      } else {
        filters.push({ term: { 'city.keyword': loc.city } });
        if (loc.state) {
          filters.push({ term: { 'state.keyword': loc.state } });
        }
      }
      return filters;
      
    case 'city_only':
      return [{ term: { 'city.keyword': loc.city } }];
      
    case 'state':
      return [{ term: { 'state.keyword': loc.state } }];
      
    default:
      return [];
  }
}

export function getNYCBoroughBoosts(query: string): any[] {
  const lower = query.toLowerCase();
  const boosts: any[] = [];
  
  // If query mentions NYC or New York City, boost Brooklyn slightly lower
  if (lower.includes('new york city') || lower.includes('nyc')) {
    boosts.push(
      { term: { 'city.keyword': { value: 'Brooklyn', boost: 0.8 } } },
      { term: { 'city.keyword': { value: 'Queens', boost: 0.6 } } },
      { term: { 'city.keyword': { value: 'Bronx', boost: 0.6 } } },
      { term: { 'city.keyword': { value: 'Staten Island', boost: 0.5 } } }
    );
  }
  
  return boosts;
}

function properCase(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

// Export additional helpers for testing
export const testHelpers = {
  NYC_BOROUGH_MAP,
  US_STATES,
  MAJOR_CITIES,
};
