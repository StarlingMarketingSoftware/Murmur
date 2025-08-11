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
  // Auxiliary, lower-priority inclusion terms used to fill tail (e.g., bars/restaurants)
  auxCompanyTerms?: string[];
  auxTitleTerms?: string[];
  auxWebsiteTerms?: string[];
  auxIndustryTerms?: string[];
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function getPostTrainingForQuery(rawQuery: string): PostTrainingProfile {
  const q = normalize(rawQuery);
  const isMusicVenue = q.startsWith('music venue') || q.startsWith('music venues');
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
      'Director Of Event Technology',
      'Senior Developer',
      'co-founder',
      'youth director',
      'Director, Legal & Paralegal',
      'Director of Operations',
      'Director of Sales',
      'Director of Marketing',
      'Director of Finance',
      'Director of Sales and Marketing',
      'Director of Sales and Operations',
      'Director of Sales and Finance',
      'Director of Sales and Marketing and Operations',
      'paralegal',  
      'Controller',
      'Social Media Specialist',
      'Social Media Analyst',
      'Social Media Strategist',
      'Social Media Manager',
      'Social Media Coordinator',
      'PR Manager',
      'PR Coordinator',
      'PR Specialist',
      'PR Analyst',
      'PR Strategist',
      'PR Manager',
      'PR Coordinator',
      'adjunct faculty',
      'adjunct professor',
      'adjunct professor of music',
      'adjunct professor of musicology',
      'adjunct professor of music theory',
      'adjunct professor of music history',
      'adjunct professor of music composition',
      'director of public safety'
    ];
    const demoteTerms = [
      'college',
      'univ',
      'campus',
      'department of music',
      'music department',
      'school',
      'symphony',
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
    // Auxiliary terms that should be considered to fill results (lower priority than includeCompanyTerms)
    const auxCompanyTerms = [
      'bar',
      'bars',
      'pub',
      'tavern',
      'saloon',
      'lounge',
      'cocktail bar',
      'wine bar',
      'beer garden',
      'brewery',
      'microbrewery',
      'brewpub',
      'taproom',
      'gastropub',
      'restaurant',
      'restaurants',
      'bistro',
      'brasserie',
      'cafe',
      'coffee',
      'coffee shop',
      'coffeehouse',
      'diner',
      'grill',
      'cantina',
      'taqueria',
      'trattoria',
      'pizzeria',
      'bbq',
      'barbecue',
      'steakhouse',
      'oyster bar',
      'speakeasy',
      'nightclub',
      'night club',
      'club',
      'music bar',
      'jazz club',
      'blues club',
      'piano bar',
      'live music bar',
      'karaoke',
      'open mic',
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
    const auxWebsiteTerms = [
      'menu',
      'reservations',
      'happy hour',
      'bar',
      'restaurant',
    ];
    const includeIndustryTerms = [
      'performing arts',
      'entertainment',
      'music',
      'live events',
    ];
    const auxIndustryTerms = [
      'hospitality',
      'food and beverage',
      'restaurants',
      'bars',
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
      auxCompanyTerms,
      auxWebsiteTerms,
      auxIndustryTerms,
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


