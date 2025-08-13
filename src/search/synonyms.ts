export const VENUE_SYNONYMS = [
  'music venue',
  'venue',
  'venues', 
  'live music',
  'club',
  'clubs',
  'bar',
  'bars',
  'lounge',
  'lounges',
  'performance space',
  'concert hall',
  'theater',
  'theatre',
  'amphitheater',
  'amphitheatre',
  'nightclub',
  'jazz club',
  'blues club',
  'rock club',
  'tavern',
  'pub',
  'saloon',
  'cabaret',
  'speakeasy',
  'auditorium',
  'ballroom',
  'pavilion',
  'arena',
  'civic center',
  'performing arts center',
  'house of blues',
  'fillmore',
];

export const BOOSTED_TERMS = [
  { term: 'music venue', boost: 3.0 },
  { term: 'concert hall', boost: 2.8 },
  { term: 'live music', boost: 2.5 },
  { term: 'venue', boost: 2.0 },
  { term: 'performing arts center', boost: 2.0 },
  { term: 'theater', boost: 1.8 },
  { term: 'theatre', boost: 1.8 },
  { term: 'amphitheater', boost: 1.8 },
  { term: 'club', boost: 1.5 },
  { term: 'nightclub', boost: 1.5 },
  { term: 'jazz club', boost: 1.5 },
  { term: 'blues club', boost: 1.5 },
  { term: 'bar', boost: 1.2 },
  { term: 'lounge', boost: 1.2 },
  { term: 'tavern', boost: 1.0 },
  { term: 'pub', boost: 1.0 },
  { term: 'saloon', boost: 1.0 },
];

// Exclusion terms for filtering out non-venue results
export const EXCLUSIONS = [
  // Wedding/event services (not venues)
  'wedding band agency',
  'wedding planner',
  'wedding photographer',
  'wedding dj',
  'event planner',
  'party planner',
  
  // Equipment/services
  'dj rental',
  'equipment rental',
  'sound equipment',
  'lighting rental',
  'stage rental',
  'audio visual rental',
  
  // Non-venue entertainment
  'karaoke only',
  'karaoke machine rental',
  'mobile dj',
  'dj service',
  'band for hire',
  'musicians for hire',
  'tribute band',
  'cover band',
  
  // Religious/community (unless they host public music events)
  'church service',
  'worship service',
  'sunday school',
  'bible study',
  
  // Educational institutions (unless specifically performance venues)
  'elementary school',
  'middle school', 
  'high school music department',
  'music lessons',
  'music teacher',
  'private lessons',
  'music tutor',
  
  // Corporate/office
  'corporate events only',
  'conference room',
  'meeting space',
  'office space',
  'coworking space',
  
  // Recording/production (not live venues)
  'recording studio only',
  'production studio',
  'rehearsal space only',
  'practice room',
  
  // Other non-venues
  'music store',
  'instrument store',
  'guitar shop',
  'record store',
  'music school administration',
  'ticket broker',
  'booking agency',
  'talent agency',
  'management company',
  'record label',
  'music publisher',
  
  // From existing postTraining.ts - academic positions
  'university president',
  'college president',
  'dean of',
  'professor of music',
  'faculty member',
  'adjunct professor',
  'music department chair',
  'conservatory director',
];

// Terms that indicate a likely venue (positive signals)
export const VENUE_INDICATORS = [
  'live music',
  'live entertainment',
  'concerts',
  'shows',
  'performances',
  'stage',
  'tickets',
  'box office',
  'upcoming events',
  'calendar',
  'tonight',
  'doors open',
  'showtime',
  'admission',
  'cover charge',
  'happy hour',
  'open mic',
  'music calendar',
  'event space',
  'capacity',
  'standing room',
  'seated venue',
  'general admission',
  'vip section',
  'backstage',
  'green room',
  'sound system',
  'lighting rig',
  'dance floor',
];

// Helper function to generate exclusion queries
export function buildExclusionQueries(): any[] {
  return EXCLUSIONS.map(phrase => ({
    bool: {
      should: [
        { match_phrase: { company: phrase } },
        { match_phrase: { headline: phrase } },
        { match_phrase: { metadata: phrase } },
        { match_phrase: { title: phrase } },
      ],
      minimum_should_match: 1
    }
  }));
}

// Helper function to generate positive indicator boosts
export function buildVenueIndicatorBoosts(): any[] {
  return VENUE_INDICATORS.map(phrase => ({
    multi_match: {
      query: phrase,
      fields: ['company^2', 'headline^1.5', 'metadata', 'website'],
      type: 'phrase',
      boost: 0.5
    }
  }));
}
