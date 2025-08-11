export type PostTrainingProfile = {
  active: boolean;
  excludeTerms: string[];
  demoteTerms: string[];
  strictExclude?: boolean;
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function getPostTrainingForQuery(rawQuery: string): PostTrainingProfile {
  const q = normalize(rawQuery);
  const isMusicVenue = q.startsWith('music venue') || q.startsWith('music venues');

  if (!isMusicVenue) {
    return { active: false, excludeTerms: [], demoteTerms: [] };
  }

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
  ];
  const demoteTerms = [
    'college',
    'univ',
    'campus',
    'academy',
    'department of music',
    'music department',
  ];

  return { active: true, excludeTerms, demoteTerms, strictExclude: true };
}


