import { z } from 'zod';
import prisma from '@/lib/prisma';
import { fetchGemini } from '@/app/api/_utils/gemini';
import { countPersonTitleMatches } from '@/app/api/_utils/vectorDb';
import { GEMINI_MODEL_OPTIONS } from '@/constants';
import { BOOKING_CONTACT_TITLE_PREFIXES } from '@/constants/contactCategories';
import {
	ORG_TYPE_KEYS,
	detectOrgTypeDeterministic,
	type OrgTypeKey,
} from './orgTypeRegistry';

// LLM query understanding for the free-text search hybrid path. Classifies
// the PLACE-STRIPPED query remainder into a target kind + bounded term
// expansions that drive retrieval and ranking. Design invariants:
//   - The LLM NEVER sees place tokens and can never override the deterministic
//     parser's location decisions. Input is {restOfQuery, categories} only.
//   - Intent output may only RELAX behavior downstream (disable hard drops,
//     swap multiplier tables, add retriever clauses) — never add hard filters.
//   - Any LLM failure (timeout / malformed JSON / schema violation) degrades
//     to a deterministic fallback whose `ambiguous` result reproduces current
//     behavior exactly.
//   - The person-title probe (countPersonTitleMatches, run for ANY query
//     length here — the legacy inline probe only ran for ≤2-token queries)
//     is resolved alongside the LLM: probe ≥ threshold forces person-safety
//     downstream no matter what the LLM said. Data beats model.

export const INTENT_PROMPT_VERSION = 3;
// TOTAL ladder budget for one intent resolution (all provider rungs
// combined). Env-tunable. Paid only for NOVEL query strings — the Postgres
// cache is shared across users and permanent per prompt version — so the
// default favors ladder robustness over per-request latency; the
// deterministic fallback keeps search functional whenever the ladder loses.
export const INTENT_LLM_TIMEOUT_MS = (() => {
	const parsed = Number(process.env.SEARCH_QUERY_INTENT_TIMEOUT_MS);
	return Number.isFinite(parsed) && parsed >= 500 ? parsed : 6000;
})();
export const PERSON_TARGET_MATCH_THRESHOLD = 8;


export type QueryIntentInput = {
	restOfQuery: string;
	categories: string[];
};

export type IntentTargetKind =
	| 'person-role'
	| 'org-type'
	| 'venue-category'
	| 'vibe'
	| 'ambiguous';

export type QueryIntent = {
	version: number;
	source: 'llm' | 'llm-cache' | 'fallback';
	targetKind: IntentTargetKind;
	personRole: {
		canonicalRole: string;
		domain: string | null;
		roleSynonyms: string[];
		domainSynonyms: string[];
	} | null;
	orgType: {
		key: OrgTypeKey | null;
		label: string;
		industryTerms: string[];
	} | null;
	expandedPhrases: string[];
	embedText: string;
	localityBias: 'local-first' | 'national' | 'either';
	confidence: number;
};

export type QueryIntentResolution = {
	intent: QueryIntent;
	// Fresh per-request ES probe count (never cached — index counts drift).
	personProbeCount: number;
	tookMs: number;
};

// Single predicate every intent-conditioned behavior gates on. Ambiguous —
// from the LLM or the fallback — means "behave exactly like today".
export const intentIsActionable = (
	intent: QueryIntent | null | undefined
): intent is QueryIntent => !!intent && intent.targetKind !== 'ambiguous';

// A parsed category is "incidental" when the user's actual target is a person
// or org ("coffee roaster" → Coffee Shops attached by the parser). Derived,
// not an LLM field.
export const intentOverridesCategory = (
	intent: QueryIntent | null | undefined,
	categories: readonly string[]
): boolean =>
	categories.length > 0 &&
	intentIsActionable(intent) &&
	(intent.targetKind === 'person-role' || intent.targetKind === 'org-type');

export const normalizeIntentKey = (
	restOfQuery: string,
	categories: readonly string[]
): string =>
	`${restOfQuery.toLowerCase().trim().replace(/\s+/g, ' ')}|${categories
		.slice()
		.sort()
		.join(',')}`;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const trimmedString = (max: number) =>
	z
		.string()
		.transform((s) => s.trim())
		.pipe(z.string().min(1).max(max));

const boundedTerms = (maxItems: number) =>
	z
		.array(z.string())
		.catch([])
		.transform((arr) =>
			Array.from(
				new Set(
					arr
						.map((s) => String(s).trim().toLowerCase())
						.filter((s) => s.length > 0 && s.length <= 40)
						// Terms longer than 4 words are prompt-drift noise.
						.filter((s) => s.split(/\s+/).length <= 4)
				)
			).slice(0, maxItems)
		);

const llmIntentSchema = z.object({
	targetKind: z.enum([
		'person-role',
		'org-type',
		'venue-category',
		'vibe',
		'ambiguous',
	]),
	personRole: z
		.object({
			canonicalRole: trimmedString(60),
			domain: z
				.string()
				.nullish()
				.transform((s) => {
					const t = (s ?? '').trim();
					return t.length > 0 && t.length <= 40 ? t.toLowerCase() : null;
				}),
			roleSynonyms: boundedTerms(4),
			domainSynonyms: boundedTerms(4),
		})
		.nullish()
		.transform((v) => v ?? null),
	orgType: z
		.object({
			key: z
				.string()
				.nullish()
				.transform((k) =>
					ORG_TYPE_KEYS.includes(k as OrgTypeKey) ? (k as OrgTypeKey) : null
				),
			label: trimmedString(60),
			industryTerms: boundedTerms(5),
		})
		.nullish()
		.transform((v) => v ?? null),
	expandedPhrases: boundedTerms(4).default([]),
	embedText: z
		.string()
		.catch('')
		.transform((s) => s.trim().slice(0, 120)),
	localityBias: z
		.enum(['local-first', 'national', 'either'])
		.catch('either'),
	confidence: z
		.number()
		.catch(0.5)
		.transform((n) => Math.max(0, Math.min(1, n))),
});

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You classify search queries for a music-industry contact database (venues, promoters, professors, journalists, record labels, radio, magazines, booking agents, managers). Place names have ALREADY been removed from the query — never guess locations. The input is JSON: {"restOfQuery": string, "categories": string[]} where categories are venue categories a keyword parser attached (possibly incidentally).

Return ONLY a minified JSON object with these keys:
"targetKind": one of
  "person-role"  — the user wants people with a job/role/profession,
  "org-type"     — the user wants organizations/companies of a kind (or the people who work at them),
  "venue-category" — the user wants physical venues/businesses: music venues, restaurants, coffee shops, breweries, wineries, distilleries, cideries, festivals, bars, wedding venues/planners,
  "vibe"         — mood/genre/scene descriptions with no concrete role or org type,
  "ambiguous"    — none of the above fits.
"personRole": null, or {"canonicalRole": string, "domain": string or null (subject/industry qualifier like "music" or "history"), "roleSynonyms": up to 4 common job-title variants, "domainSynonyms": up to 4}.
"orgType": null, or {"key": one of ${JSON.stringify(ORG_TYPE_KEYS)} or null when no key fits, "label": string, "industryTerms": up to 5 words/phrases likely to appear in such a company's industry description or name}.
"expandedPhrases": up to 4 full-phrase variants of the query as they would appear in a job title or company field — reorderings and inflections of the ORIGINAL query words only ("professor of music" → "music professor"), NEVER synonyms (those belong in roleSynonyms/industryTerms; expanded phrases receive the strongest exact-match ranking boost and must stay faithful to what the user typed).
"embedText": a rewrite of the query (max 120 chars) optimized for semantic embedding search: expand abbreviations, add the 2-3 most defining synonyms. No locations.
"localityBias": "local-first" when this is a service people hire nearby (photographer, wedding planner, venue, plumber), "national" when inventory concentrates in a few cities and searchers expect nationwide results (record labels, magazines, A&R, music supervisors), else "either".
"confidence": 0..1.

Be conservative with synonyms — near-synonyms only, never loosely related roles. ALWAYS include the practice/industry noun form of a trade or role when it differs from the role word (plumber → "plumbing", electrician → "electrical", janitor → "custodial", carpenter → "carpentry") — company names and industry fields carry that form, not the person noun.

Examples:
{"restOfQuery":"professor of music","categories":[]} -> {"targetKind":"person-role","personRole":{"canonicalRole":"professor","domain":"music","roleSynonyms":["faculty","lecturer","instructor"],"domainSynonyms":["musicology","music theory"]},"orgType":null,"expandedPhrases":["professor of music","music professor"],"embedText":"professor of music, university music faculty, music department","localityBias":"either","confidence":0.95}
{"restOfQuery":"record labels","categories":[]} -> {"targetKind":"org-type","personRole":null,"orgType":{"key":"record-label","label":"record label","industryTerms":["record label","records","music"]},"expandedPhrases":["record label","record labels"],"embedText":"record label, independent music label, A&R","localityBias":"national","confidence":0.95}
{"restOfQuery":"A&R","categories":[]} -> {"targetKind":"person-role","personRole":{"canonicalRole":"A&R","domain":"music","roleSynonyms":["a&r manager","artists and repertoire","talent scout"],"domainSynonyms":["record label"]},"orgType":{"key":"record-label","label":"record label","industryTerms":["record label","music"]},"expandedPhrases":["a&r","a&r manager"],"embedText":"A&R artists and repertoire record label talent scout","localityBias":"national","confidence":0.9}
{"restOfQuery":"manager","categories":["Restaurants"]} -> {"targetKind":"person-role","personRole":{"canonicalRole":"restaurant manager","domain":"hospitality","roleSynonyms":["general manager","food and beverage manager"],"domainSynonyms":["restaurants"]},"orgType":null,"expandedPhrases":["restaurant manager"],"embedText":"restaurant manager hospitality general manager","localityBias":"local-first","confidence":0.85}
{"restOfQuery":"roaster","categories":["Coffee Shops"]} -> {"targetKind":"org-type","personRole":null,"orgType":{"key":null,"label":"coffee roaster","industryTerms":["coffee","roastery","coffee roasting"]},"expandedPhrases":["coffee roaster","roastery"],"embedText":"coffee roaster, coffee roasting company, roastery","localityBias":"local-first","confidence":0.8}
{"restOfQuery":"janitor","categories":[]} -> {"targetKind":"person-role","personRole":{"canonicalRole":"janitor","domain":"facilities","roleSynonyms":["custodian","custodial","facilities"],"domainSynonyms":[]},"orgType":null,"expandedPhrases":["janitor","custodian"],"embedText":"janitor custodian custodial facilities staff","localityBias":"local-first","confidence":0.9}
{"restOfQuery":"plumber","categories":[]} -> {"targetKind":"person-role","personRole":{"canonicalRole":"plumber","domain":"plumbing","roleSynonyms":["plumbing","plumbing contractor","pipefitter"],"domainSynonyms":[]},"orgType":null,"expandedPhrases":["plumber","plumbing"],"embedText":"plumber plumbing contractor pipefitting services","localityBias":"local-first","confidence":0.9}
{"restOfQuery":"music magazine","categories":[]} -> {"targetKind":"org-type","personRole":null,"orgType":{"key":"magazine-press","label":"music magazine","industryTerms":["magazine","publishing","music media","press"]},"expandedPhrases":["music magazine","music publication"],"embedText":"music magazine, music journalism, music press editor","localityBias":"national","confidence":0.9}
{"restOfQuery":"wedding photographer","categories":[]} -> {"targetKind":"person-role","personRole":{"canonicalRole":"wedding photographer","domain":"weddings","roleSynonyms":["photographer","photography studio"],"domainSynonyms":["events"]},"orgType":null,"expandedPhrases":["wedding photographer","wedding photography"],"embedText":"wedding photographer, wedding photography studio","localityBias":"local-first","confidence":0.9}
{"restOfQuery":"italian deli","categories":[]} -> {"targetKind":"venue-category","personRole":null,"orgType":null,"expandedPhrases":["italian deli","deli"],"embedText":"italian deli, delicatessen, italian food shop","localityBias":"local-first","confidence":0.85}
{"restOfQuery":"places that feel like a basement jazz club","categories":[]} -> {"targetKind":"vibe","personRole":null,"orgType":null,"expandedPhrases":[],"embedText":"intimate basement jazz club live music venue","localityBias":"local-first","confidence":0.7}`;

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

const LRU_MAX_ENTRIES = 2000;
const LRU_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const FALLBACK_LRU_TTL_MS = 5 * 60 * 1000; // retry the LLM soon after failures
const PG_READ_TIMEOUT_MS = 300;

const intentLruCache = new Map<
	string,
	{ intent: QueryIntent; expiresAt: number }
>();

const lruGet = (key: string): QueryIntent | null => {
	const entry = intentLruCache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		intentLruCache.delete(key);
		return null;
	}
	// Delete-and-reinsert keeps insertion order ≈ recency for eviction.
	intentLruCache.delete(key);
	intentLruCache.set(key, entry);
	return entry.intent;
};

const lruSet = (key: string, intent: QueryIntent, ttlMs: number): void => {
	if (intentLruCache.size >= LRU_MAX_ENTRIES) {
		const oldest = intentLruCache.keys().next().value;
		if (oldest !== undefined) intentLruCache.delete(oldest);
	}
	intentLruCache.set(key, { intent, expiresAt: Date.now() + ttlMs });
};

// ---------------------------------------------------------------------------
// Deterministic fallback
// ---------------------------------------------------------------------------

export const deriveDeterministicIntent = (
	input: QueryIntentInput,
	personProbeCount: number
): QueryIntent => {
	const rest = input.restOfQuery.trim();
	const orgRecipe = detectOrgTypeDeterministic(rest);
	if (orgRecipe) {
		return {
			version: INTENT_PROMPT_VERSION,
			source: 'fallback',
			targetKind: 'org-type',
			personRole: null,
			orgType: {
				key: orgRecipe.key,
				label: orgRecipe.label,
				industryTerms: [...orgRecipe.industryTerms],
			},
			expandedPhrases: [rest.toLowerCase()],
			embedText: rest,
			localityBias: 'national',
			confidence: 0.6,
		};
	}
	if (personProbeCount >= PERSON_TARGET_MATCH_THRESHOLD) {
		return {
			version: INTENT_PROMPT_VERSION,
			source: 'fallback',
			targetKind: 'person-role',
			personRole: {
				canonicalRole: rest.toLowerCase(),
				domain: null,
				roleSynonyms: [],
				domainSynonyms: [],
			},
			orgType: null,
			expandedPhrases: [rest.toLowerCase()],
			embedText: rest,
			localityBias: 'either',
			confidence: 0.55,
		};
	}
	// Ambiguous fallback — downstream behaves exactly like today.
	return {
		version: INTENT_PROMPT_VERSION,
		source: 'fallback',
		targetKind: 'ambiguous',
		personRole: null,
		orgType: null,
		expandedPhrases: [],
		embedText: rest,
		localityBias: 'either',
		confidence: 0,
	};
};

// ---------------------------------------------------------------------------
// LLM parse + reconciliation
// ---------------------------------------------------------------------------

// Tolerant JSON extraction: json_object-mode models return bare JSON, but the
// Gemini rung (no response_format support in the wrapper) and some OpenRouter
// models fence or preface their output. Take the outermost {...} span.
const extractJsonObject = (raw: string): string => {
	const start = raw.indexOf('{');
	const end = raw.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) return raw;
	return raw.slice(start, end + 1);
};

export const parseLlmIntent = (
	raw: string,
	input: QueryIntentInput
): QueryIntent | null => {
	let json: unknown;
	try {
		json = JSON.parse(extractJsonObject(raw));
	} catch {
		return null;
	}
	const result = llmIntentSchema.safeParse(json);
	if (!result.success) return null;
	const parsed = result.data;
	// Cross-field coherence: a person-role result needs a personRole payload,
	// an org-type result needs an orgType payload. Anything else → not
	// trustworthy → caller falls back.
	if (parsed.targetKind === 'person-role' && !parsed.personRole) return null;
	if (parsed.targetKind === 'org-type' && !parsed.orgType) return null;
	// Deterministic faithfulness guard on expandedPhrases: they receive the
	// strongest exact-match ranking boost, so every phrase must share at
	// least one substantive token with the user's words — LLM synonym leaks
	// ("faculty member" for "professor") demote to roleSynonym strength by
	// being dropped here. Skipped when there's no query context (cache
	// re-validation passes restOfQuery='').
	const queryTokens = new Set(
		input.restOfQuery
			.toLowerCase()
			.split(/[^a-z0-9&]+/)
			.filter((t) => t.length >= 3 || t.includes('&'))
	);
	const expandedPhrases =
		queryTokens.size > 0
			? parsed.expandedPhrases.filter((phrase) =>
					phrase
						.split(/[^a-z0-9&]+/)
						.some((t) => queryTokens.has(t))
			  )
			: parsed.expandedPhrases;
	return {
		version: INTENT_PROMPT_VERSION,
		source: 'llm',
		targetKind: parsed.targetKind,
		personRole: parsed.personRole,
		orgType: parsed.orgType,
		expandedPhrases,
		embedText: parsed.embedText || input.restOfQuery,
		localityBias: parsed.localityBias,
		confidence: parsed.confidence,
	};
};

type LlmFetchResult = { raw: string; model: string };
type LlmFetch = (system: string, user: string) => Promise<LlmFetchResult>;

// Provider ladder: OpenRouter models in order (DeepSeek first — cheapest
// capable model for this classification job; env-overridable via
// SEARCH_INTENT_OPENROUTER_MODELS so the rotation can change without a code
// edit), then DIRECT Gemini as the last resort (separate provider path — an
// OpenRouter outage can't take out the whole ladder).
//
// Budget discipline: each rung is CAPPED (primary gets the most room — the
// full ~350-token completion on DeepSeek takes 2-4s; later rungs are fast
// models) so a hung rung can never eat the whole ladder — measured live:
// deepseek-v3.2 ~1.4-4s, gemini-2.5-flash-lite ~0.5s.
const DEFAULT_OPENROUTER_INTENT_MODELS = [
	'deepseek/deepseek-v3.2',
	'google/gemini-2.5-flash-lite',
] as const;
const MIN_ATTEMPT_BUDGET_MS = 800;
const PRIMARY_ATTEMPT_CAP_MS = 3500;
const SECONDARY_ATTEMPT_CAP_MS = 1500;

const openRouterIntentModels = (): string[] => {
	const fromEnv = (process.env.SEARCH_INTENT_OPENROUTER_MODELS ?? '')
		.split(',')
		.map((m) => m.trim())
		.filter(Boolean);
	return fromEnv.length > 0 ? fromEnv : [...DEFAULT_OPENROUTER_INTENT_MODELS];
};

const fetchOpenRouterJson = async (
	model: string,
	system: string,
	user: string,
	timeoutMs: number
): Promise<string> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user },
				],
				temperature: 0,
				max_tokens: 350,
				response_format: { type: 'json_object' },
			}),
			signal: controller.signal,
		});
		const res = (await response.json()) as {
			error?: { message?: string };
			choices?: { message?: { content?: string } }[];
		};
		if (!response.ok) {
			throw new Error(res.error?.message || `OpenRouter ${model} request failed`);
		}
		const content = res.choices?.[0]?.message?.content;
		if (!content) throw new Error(`OpenRouter ${model} response empty`);
		return content;
	} finally {
		clearTimeout(timeoutId);
	}
};

const defaultLlmFetch: LlmFetch = async (system, user) => {
	const deadline = Date.now() + INTENT_LLM_TIMEOUT_MS;
	const remaining = (): number => deadline - Date.now();
	let lastError: unknown = new Error('no intent provider configured');

	if (process.env.OPENROUTER_API_KEY) {
		const models = openRouterIntentModels();
		for (let i = 0; i < models.length; i++) {
			const model = models[i];
			// Per-rung cap: a hung primary must leave room for the later rungs
			// AND the direct-Gemini floor — never let one rung eat the ladder.
			const budget = Math.min(
				remaining() - MIN_ATTEMPT_BUDGET_MS,
				i === 0 ? PRIMARY_ATTEMPT_CAP_MS : SECONDARY_ATTEMPT_CAP_MS
			);
			if (budget < MIN_ATTEMPT_BUDGET_MS) break;
			try {
				const raw = await fetchOpenRouterJson(model, system, user, budget);
				return { raw, model };
			} catch (error) {
				lastError = error;
				console.warn(
					`[query-intent] OpenRouter ${model} failed; trying next rung`,
					error instanceof Error ? error.message : error
				);
			}
		}
	}

	// Final rung: direct Gemini. No json_object mode on this wrapper — the
	// prompt demands bare JSON and parseLlmIntent tolerates fenced/wrapped
	// output.
	const geminiBudget = remaining();
	if (process.env.GEMINI_API_KEY && geminiBudget >= MIN_ATTEMPT_BUDGET_MS) {
		const model = GEMINI_MODEL_OPTIONS.gemini25FlashLite;
		try {
			const raw = await fetchGemini(model, system, user, {
				timeoutMs: geminiBudget,
				temperature: 0,
				maxOutputTokens: 350,
			});
			return { raw, model };
		} catch (error) {
			lastError = error;
		}
	}
	throw lastError;
};

const defaultProbe = async (restOfQuery: string): Promise<number> => {
	try {
		return await countPersonTitleMatches(
			restOfQuery,
			BOOKING_CONTACT_TITLE_PREFIXES
		);
	} catch {
		return 0;
	}
};

const readPersistentIntent = async (
	queryKey: string
): Promise<QueryIntent | null> => {
	try {
		const row = await Promise.race([
			prisma.searchQueryIntent.findUnique({
				where: {
					queryKey_promptVersion: {
						queryKey,
						promptVersion: INTENT_PROMPT_VERSION,
					},
				},
			}),
			new Promise<null>((resolve) =>
				setTimeout(() => resolve(null), PG_READ_TIMEOUT_MS)
			),
		]);
		if (!row) return null;
		// Re-validate through the same schema — a poisoned/stale row must not
		// bypass validation just because it came from the cache.
		const revalidated = parseLlmIntent(
			JSON.stringify(row.intent),
			{ restOfQuery: '', categories: [] }
		);
		if (!revalidated) return null;
		// Fire-and-forget usage bookkeeping.
		void prisma.searchQueryIntent
			.update({
				where: { id: row.id },
				data: { hitCount: { increment: 1 }, lastUsedAt: new Date() },
			})
			.catch(() => undefined);
		return { ...revalidated, source: 'llm-cache' };
	} catch {
		return null;
	}
};

const writePersistentIntent = (
	queryKey: string,
	intent: QueryIntent,
	model: string
): void => {
	// Strip source before persisting — it's a per-resolution attribute.
	const { source: _source, ...persistable } = intent;
	void prisma.searchQueryIntent
		.upsert({
			where: {
				queryKey_promptVersion: {
					queryKey,
					promptVersion: INTENT_PROMPT_VERSION,
				},
			},
			create: {
				queryKey,
				promptVersion: INTENT_PROMPT_VERSION,
				intent: persistable,
				model,
			},
			update: {
				intent: persistable,
				model,
				lastUsedAt: new Date(),
			},
		})
		.catch(() => undefined);
};

export type GetQueryIntentOptions = {
	requestId?: string;
	// Test seams — the check script injects a recorded LLM + a fixed probe and
	// disables the caches so CI is deterministic and network-free.
	llmFetch?: LlmFetch;
	probeFn?: (restOfQuery: string) => Promise<number>;
	skipCaches?: boolean;
};

export const getQueryIntent = async (
	input: QueryIntentInput,
	options?: GetQueryIntentOptions
): Promise<QueryIntentResolution> => {
	const startedAt = Date.now();
	const requestId = options?.requestId ?? 'intent';
	const probeFn = options?.probeFn ?? defaultProbe;
	const llmFetch = options?.llmFetch ?? defaultLlmFetch;
	const queryKey = normalizeIntentKey(input.restOfQuery, input.categories);
	const lruKey = `${queryKey}|v${INTENT_PROMPT_VERSION}`;

	// The probe is always fresh — it feeds person-safety reconciliation and
	// the shadow logs, and index counts drift so it must never be cached with
	// the intent.
	const probePromise = probeFn(input.restOfQuery);

	if (!options?.skipCaches) {
		const cached = lruGet(lruKey);
		if (cached) {
			return {
				intent: cached,
				personProbeCount: await probePromise,
				tookMs: Date.now() - startedAt,
			};
		}
		const persisted = await readPersistentIntent(queryKey);
		if (persisted) {
			lruSet(lruKey, persisted, LRU_TTL_MS);
			return {
				intent: persisted,
				personProbeCount: await probePromise,
				tookMs: Date.now() - startedAt,
			};
		}
	}

	let intent: QueryIntent | null = null;
	let resolvedModel = 'unknown';
	try {
		const { raw, model } = await llmFetch(SYSTEM_PROMPT, JSON.stringify(input));
		resolvedModel = model;
		intent = parseLlmIntent(raw, input);
		if (!intent) {
			console.warn(
				`[query-intent][${requestId}] ${model} returned unusable output for "${input.restOfQuery}" — falling back`
			);
		}
	} catch (error) {
		console.warn(
			`[query-intent][${requestId}] LLM ladder exhausted for "${input.restOfQuery}" — falling back`,
			error instanceof Error ? error.message : error
		);
	}

	const personProbeCount = await probePromise;

	if (intent) {
		if (!options?.skipCaches) {
			lruSet(lruKey, intent, LRU_TTL_MS);
			writePersistentIntent(queryKey, intent, resolvedModel);
		}
		return { intent, personProbeCount, tookMs: Date.now() - startedAt };
	}

	const fallback = deriveDeterministicIntent(input, personProbeCount);
	if (!options?.skipCaches) {
		// Memory-only, short TTL: fallback quality is probe-dependent and the
		// LLM should be retried soon. NEVER persisted to Postgres.
		lruSet(lruKey, fallback, FALLBACK_LRU_TTL_MS);
	}
	return { intent: fallback, personProbeCount, tookMs: Date.now() - startedAt };
};
