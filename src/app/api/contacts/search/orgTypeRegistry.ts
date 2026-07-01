// First-class music-industry org types for free-text search. Each recipe
// serves triple duty:
//   1. LLM vocabulary — the query-understanding prompt lists these keys so
//      the model maps queries onto them.
//   2. Deterministic fallback detection — `detect` regexes classify a query
//      when the LLM is unavailable.
//   3. ES retrieval — `esShould` clauses power a dedicated org-type retriever
//      (recall insurance beyond the structured lexical clauses).
//
// Clause design is DATA-verified against the production-mirror index
// (2026-07): "record label" lives in companyIndustry (87 phrase matches) and
// company names ("... Records"), NOT in title (4). Magazines live in company
// (211) vs title (8). Radio has canonical "Radio Stations <State>" title rows
// plus companyIndustry broadcasting/radio. All clauses use ANALYZED
// match/match_phrase — companyIndustry is comma-joined free text and its
// .keyword sub-field cannot be trusted across index generations (mapping
// drift); title.keyword prefix is safe (bootstrapped with the index).

export type OrgTypeKey =
	| 'record-label'
	| 'magazine-press'
	| 'radio'
	| 'artist-management'
	| 'booking-agency'
	| 'pr';

export type OrgTypeRecipe = {
	key: OrgTypeKey;
	label: string;
	// Deterministic detection on restOfQuery (fallback path — the LLM handles
	// phrasing variety when available).
	detect: RegExp;
	// Vocabulary hints fed to the LLM prompt and used as lexical org terms.
	industryTerms: string[];
	// ES should-clauses for the dedicated org retriever.
	esShould: Record<string, unknown>[];
};

export const ORG_TYPE_RECIPES: readonly OrgTypeRecipe[] = [
	{
		key: 'record-label',
		label: 'record label',
		detect: /\brecord (label|labels|company|companies)\b|\bindie label\b|\brecord co\b/i,
		industryTerms: ['record label', 'records', 'music'],
		esShould: [
			{ match_phrase: { companyIndustry: 'record label' } },
			{ match_phrase: { headline: 'record label' } },
			{ match_phrase: { metadata: 'record label' } },
			{ match_phrase: { title: 'record label' } },
			{ match: { company: { query: 'records', operator: 'and', boost: 0.6 } } },
			{
				prefix: {
					'title.keyword': { value: 'a&r', case_insensitive: true },
				},
			},
		],
	},
	{
		key: 'magazine-press',
		label: 'magazine',
		detect: /\bmagazines?\b|\bmusic (press|journalism|media)\b|\bzines?\b/i,
		industryTerms: ['magazine', 'publishing', 'music media', 'press'],
		esShould: [
			{ match: { company: 'magazine' } },
			{ match_phrase: { companyIndustry: 'publishing' } },
			{ match_phrase: { companyIndustry: 'music media' } },
			{ match_phrase: { companyIndustry: 'magazine' } },
			{ match_phrase: { headline: 'music journalist' } },
			{ match_phrase: { metadata: 'magazine' } },
		],
	},
	{
		key: 'radio',
		label: 'radio station',
		detect: /\bradio( stations?)?\b|\bbroadcast(ers?|ing)\b|\bcollege radio\b/i,
		industryTerms: ['radio', 'broadcasting', 'radio station'],
		esShould: [
			{
				prefix: {
					'title.keyword': { value: 'radio station', case_insensitive: true },
				},
			},
			{ match_phrase: { company: 'radio' } },
			{ match_phrase: { companyIndustry: 'broadcasting' } },
			{ match_phrase: { companyIndustry: 'radio' } },
			{ match_phrase: { headline: 'radio station' } },
		],
	},
	{
		key: 'artist-management',
		label: 'artist management',
		detect: /\bartist manage(ment|r|rs)\b|\btalent management\b|\bband manager\b|\bmusic manager\b/i,
		industryTerms: ['artist management', 'talent management', 'management'],
		esShould: [
			{ match_phrase: { companyIndustry: 'artist management' } },
			{ match_phrase: { companyIndustry: 'talent management' } },
			{ match_phrase: { title: 'artist manager' } },
			{ match_phrase: { headline: 'artist management' } },
			{ match_phrase: { company: 'management' } },
		],
	},
	{
		key: 'booking-agency',
		label: 'booking agency',
		detect: /\bbooking (agenc(y|ies)|agents?)\b|\btalent (buyer|buyers|agenc(y|ies))\b/i,
		industryTerms: ['booking agency', 'booking agent', 'talent buyer', 'talent agency'],
		esShould: [
			{ match_phrase: { title: 'booking agent' } },
			{ match_phrase: { title: 'talent buyer' } },
			{ match_phrase: { headline: 'booking agent' } },
			{ match_phrase: { headline: 'talent buyer' } },
			{ match_phrase: { companyIndustry: 'booking' } },
			{ match_phrase: { company: 'booking' } },
			{ match_phrase: { companyIndustry: 'talent agency' } },
		],
	},
	{
		key: 'pr',
		label: 'public relations',
		detect: /\bpublic relations\b|\bpublicists?\b|\bmusic pr\b|\bpr (firm|agency|agencies)\b/i,
		industryTerms: ['public relations', 'publicist', 'pr'],
		esShould: [
			{ match_phrase: { companyIndustry: 'public relations' } },
			{ match_phrase: { title: 'publicist' } },
			{ match_phrase: { headline: 'publicist' } },
			{ match_phrase: { headline: 'public relations' } },
			{ match_phrase: { company: 'public relations' } },
		],
	},
];

export const ORG_TYPE_KEYS: readonly OrgTypeKey[] = ORG_TYPE_RECIPES.map(
	(r) => r.key
);

export const orgTypeRecipeByKey = (
	key: string | null | undefined
): OrgTypeRecipe | null =>
	ORG_TYPE_RECIPES.find((r) => r.key === key) ?? null;

export const detectOrgTypeDeterministic = (
	restOfQuery: string
): OrgTypeRecipe | null => {
	const q = restOfQuery.trim();
	if (!q) return null;
	return ORG_TYPE_RECIPES.find((r) => r.detect.test(q)) ?? null;
};
