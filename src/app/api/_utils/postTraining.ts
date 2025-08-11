export type PostTrainingProfile = {
  active: boolean;
  excludeTerms: string[];
  demoteTerms: string[];
  strictExclude?: boolean;
  requirePositive?: boolean;
  includeCompanyTerms?: string[];
  includeTitleTerms?: string[];
  includeWebsiteTerms?: string[];
  includeIndustryTerms?: string[];
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function getPostTrainingForQuery(rawQuery: string): PostTrainingProfile {
  const q = normalize(rawQuery);
  const isMusicVenue = q.includes('music venue');
  const isWeddingPlanner = q.includes('wedding planner') || q.includes('wedding planners');

  // Music venue specific post-training
  if (isMusicVenue) {
    // Basic, extensible config for excluding/demoting academic institutions
    const excludeTerms = [
      'university',
      'university of',
      'state university',
      'community college',
      'college of',
      'school of music',
      'conservatory',
      'institute of technology',
      'polytechnic',
      'CEO',
      'president',
      'vice president',
      'vice president of',
      'vice president of sales',
      'vice president of marketing',
      'vice president of operations',
      'vice president of finance',
      'director of sales',
      'director of marketing',
      'director of operations',
      'director of finance',
      'director of sales and marketing',
      'director of sales and operations',
      'director of sales and finance',
      'director of sales and marketing and operations',
      'sales director',
      'a&r',
      'a & r',
      'clarinet faculty',
      'clarient faculty',
      'faculty',
      'faculty member',
      'faculty members',
      'faculty member of',
      'faculty members of',
      'faculty member of sales',
      'associate',
      'lawyer',
      'lawyers',
      'lawyer of',
      'lawyers of',
      'lawyer of sales',
      'lawyer of operations',
      'partner',
      'managing partner',
      'law firm',
      'LLP',
      'Drummer/Guitarist/Songwriter/Producer',
      'Songwriter',
      'Drummer',
      'Guitarist',
      'Producer',
      'Band',
      'Bandleader',
      'Bandleader/Drummer',
      'IT manager',
    ];
    const demoteTerms = [
      'college',
      'univ',
      'campus',
      'academy',
      'department of music',
      'music department',
      'school',
    ];
    // Positive signals
    const includeCompanyTerms = [
      'theatre',
      'theater',
      'performing arts center',
      'performing arts',
      'concert hall',
      'music hall',
      'auditorium',
      'amphitheater',
      'amphitheatre',
      'opera house',
      'pavilion',
      'arena',
      'ballroom',
      'civic center',
      'playhouse',
      'house of blues',
      'fillmore',
      'music venue',
      'live music',
    ];
    const includeTitleTerms = [
      'music venue',
      'talent buyer',
      'talent booker',
      'booker',
      'booking',
      'promoter',
      'venue manager',
      'general manager',
      'production manager',
      'production director',
      'events manager',
      'event manager',
      'event coordinator',
      'programming director',
      'director of programming',
      'entertainment director',
      'box office',
      'house manager',
      'stage manager',
      'technical director',
    ];
    const includeWebsiteTerms = [
      'tickets',
      'ticketing',
      'theatre',
      'theater',
      'venue',
      'concert',
      'events',
      'calendar',
      'live',
      'music',
    ];
    const includeIndustryTerms = [
      'performing arts',
      'entertainment',
      'music',
      'live events',
    ];
    return {
      active: true,
      excludeTerms,
      demoteTerms,
      strictExclude: true,
      requirePositive: true,
      includeCompanyTerms,
      includeTitleTerms,
      includeWebsiteTerms,
      includeIndustryTerms,
    };
  }

  // Wedding planner specific post-training
  if (isWeddingPlanner) {
    const excludeTerms = ['weddingwire'];
    const demoteTerms: string[] = [];
    return { active: true, excludeTerms, demoteTerms, strictExclude: true };
  }

  return { active: false, excludeTerms: [], demoteTerms: [] };
}


