import type { PostTrainingProfile } from '@/app/api/_utils/postTraining';

declare const __non_webpack_require__: NodeRequire | undefined;

export type VectorEsMatch = {
	id: string;
	score?: number;
	metadata?: Record<string, unknown> | null;
};

type PostTrainingTerms = {
	excludeTerms: string[];
	demoteTerms: string[];
	includeCompanyTerms: string[];
	includeTitleTerms: string[];
	includeWebsiteTerms: string[];
	includeIndustryTerms: string[];
	includeCompanyOrTitleTerms: string[];
	auxCompanyTerms: string[];
	auxTitleTerms: string[];
	auxWebsiteTerms: string[];
	auxIndustryTerms: string[];
	auxCompanyOrTitleTerms: string[];
	requirePositive: boolean;
};

const normalizeTerms = (terms: string[] | undefined): string[] =>
	(terms ?? [])
		.map((term) => term.toLowerCase().trim())
		.filter(Boolean);

const metadataValue = (
	metadata: Record<string, unknown> | null | undefined,
	key: string
): string | null => {
	if (!metadata) return null;
	const value = metadata[key];
	if (value == null) return null;
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		const first = value.find((entry) => entry != null);
		return first == null ? null : String(first);
	}
	return String(value);
};

const containsAny = (text: unknown, terms: string[]): boolean => {
	if (text == null || terms.length === 0) return false;
	const lc = String(text).toLowerCase();
	return terms.some((term) => term.length > 0 && lc.includes(term));
};

const buildPostTrainingTerms = (profile: PostTrainingProfile): PostTrainingTerms => {
	const includeCompanyTerms = normalizeTerms(profile.includeCompanyTerms);
	const includeTitleTerms = normalizeTerms(profile.includeTitleTerms);
	const auxCompanyTerms = normalizeTerms(profile.auxCompanyTerms);
	const auxTitleTerms = normalizeTerms(profile.auxTitleTerms);

	return {
		excludeTerms: normalizeTerms(profile.excludeTerms),
		demoteTerms: normalizeTerms(profile.demoteTerms),
		includeCompanyTerms,
		includeTitleTerms,
		includeWebsiteTerms: normalizeTerms(profile.includeWebsiteTerms),
		includeIndustryTerms: normalizeTerms(profile.includeIndustryTerms),
		includeCompanyOrTitleTerms: [...includeCompanyTerms, ...includeTitleTerms],
		auxCompanyTerms,
		auxTitleTerms,
		auxWebsiteTerms: normalizeTerms(profile.auxWebsiteTerms),
		auxIndustryTerms: normalizeTerms(profile.auxIndustryTerms),
		auxCompanyOrTitleTerms: [...auxCompanyTerms, ...auxTitleTerms],
		requirePositive: Boolean(profile.requirePositive),
	};
};

const passesPositive = (
	metadata: Record<string, unknown> | null | undefined,
	terms: PostTrainingTerms
): boolean => {
	if (!terms.requirePositive) return true;
	return (
		containsAny(metadataValue(metadata, 'company'), terms.includeCompanyTerms) ||
		containsAny(metadataValue(metadata, 'title'), terms.includeTitleTerms) ||
		containsAny(metadataValue(metadata, 'headline'), terms.includeCompanyOrTitleTerms) ||
		containsAny(metadataValue(metadata, 'website'), terms.includeWebsiteTerms) ||
		containsAny(metadataValue(metadata, 'companyIndustry'), terms.includeIndustryTerms) ||
		containsAny(metadataValue(metadata, 'metadata'), terms.includeCompanyOrTitleTerms)
	);
};

const passesAux = (
	metadata: Record<string, unknown> | null | undefined,
	terms: PostTrainingTerms
): boolean => {
	return (
		containsAny(metadataValue(metadata, 'company'), terms.auxCompanyTerms) ||
		containsAny(metadataValue(metadata, 'title'), terms.auxTitleTerms) ||
		containsAny(metadataValue(metadata, 'headline'), terms.auxCompanyOrTitleTerms) ||
		containsAny(metadataValue(metadata, 'website'), terms.auxWebsiteTerms) ||
		containsAny(metadataValue(metadata, 'companyIndustry'), terms.auxIndustryTerms) ||
		containsAny(metadataValue(metadata, 'metadata'), terms.auxCompanyOrTitleTerms)
	);
};

const hasDemoteSignal = (
	metadata: Record<string, unknown> | null | undefined,
	terms: PostTrainingTerms
): boolean => {
	return (
		containsAny(metadataValue(metadata, 'company'), terms.demoteTerms) ||
		containsAny(metadataValue(metadata, 'title'), terms.demoteTerms) ||
		containsAny(metadataValue(metadata, 'headline'), terms.demoteTerms)
	);
};

export const applyPostTrainingToEsMatchesTs = (
	matches: VectorEsMatch[],
	profile: PostTrainingProfile,
	finalLimit: number
): VectorEsMatch[] => {
	if (!profile.active || matches.length === 0) return matches;
	const terms = buildPostTrainingTerms(profile);

	// Keep hard excludes at the ES stage so hydration and downstream ranking
	// only process relevant candidates.
	const strictlyAllowed = matches.filter((match) => {
		const metadata = match.metadata ?? {};
		return !(
			containsAny(metadataValue(metadata, 'company'), terms.excludeTerms) ||
			containsAny(metadataValue(metadata, 'title'), terms.excludeTerms) ||
			containsAny(metadataValue(metadata, 'headline'), terms.excludeTerms)
		);
	});

	if (!terms.requirePositive) {
		return strictlyAllowed.slice(0, finalLimit);
	}

	const classified = strictlyAllowed.map((match) => {
		const positive = passesPositive(match.metadata, terms);
		const aux = !positive && passesAux(match.metadata, terms);
		return {
			match,
			positive,
			aux,
			demotedPositive: positive && hasDemoteSignal(match.metadata, terms),
		};
	});

	const seen = new Set<string>();
	const keyOf = (match: VectorEsMatch): string =>
		metadataValue(match.metadata, 'contactId') || String(match.id || '');
	const ordered: VectorEsMatch[] = [];
	const pushIfNew = (match: VectorEsMatch) => {
		const key = keyOf(match);
		if (!key || seen.has(key)) return;
		seen.add(key);
		ordered.push(match);
	};

	for (const entry of classified) {
		if (entry.positive) pushIfNew(entry.match);
		if (ordered.length >= finalLimit) break;
	}

	// Preserve existing filler behavior: demoted positives, then aux, then remaining.
	if (ordered.length < finalLimit) {
		for (const entry of classified) {
			if (entry.demotedPositive) pushIfNew(entry.match);
			if (ordered.length >= finalLimit) break;
		}
	}

	if (ordered.length < finalLimit) {
		for (const entry of classified) {
			if (!entry.positive && entry.aux) pushIfNew(entry.match);
			if (ordered.length >= finalLimit) break;
		}
	}

	if (ordered.length < finalLimit) {
		for (const entry of classified) {
			if (!entry.positive && !entry.aux) pushIfNew(entry.match);
			if (ordered.length >= finalLimit) break;
		}
	}

	return ordered.slice(0, finalLimit);
};

type WasmApplyPostTrainingFn = (
	matches: unknown,
	profile: unknown,
	finalLimit: unknown
) => unknown;

let cachedNodeWasmApplyPostTraining: WasmApplyPostTrainingFn | null | undefined;

const getWasmApplyPostTrainingFunction = (): WasmApplyPostTrainingFn | null => {
	if (process.env.USE_WASM_POST_TRAINING !== 'true') return null;
	if (cachedNodeWasmApplyPostTraining !== undefined) return cachedNodeWasmApplyPostTraining;

	try {
		// Use __non_webpack_require__ so webpack does not attempt to bundle or
		// statically analyse the dynamic require call. In Next.js server bundles
		// this global is always available. The eval('require') fallback covers
		// plain Node.js execution outside of webpack.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const dynamicRequire: NodeRequire =
			// eslint-disable-next-line no-underscore-dangle
			(typeof __non_webpack_require__ !== 'undefined'
				? __non_webpack_require__
				: eval('require')) as NodeRequire;

		const loaded = dynamicRequire(
			`${process.cwd()}/rust-scorer/pkg-node`
		) as Partial<{ apply_post_training_to_es_matches: unknown }> & {
			default?: Partial<{ apply_post_training_to_es_matches: unknown }>;
		};
		const maybeModule = (loaded.default ?? loaded) as Partial<{
			apply_post_training_to_es_matches: unknown;
		}>;

		if (typeof maybeModule.apply_post_training_to_es_matches !== 'function') {
			console.error(
				'[postTraining] apply_post_training_to_es_matches export missing from rust-scorer pkg-node'
			);
			cachedNodeWasmApplyPostTraining = null;
			return cachedNodeWasmApplyPostTraining;
		}

		cachedNodeWasmApplyPostTraining =
			maybeModule.apply_post_training_to_es_matches as WasmApplyPostTrainingFn;
		return cachedNodeWasmApplyPostTraining;
	} catch (error: unknown) {
		console.error(
			'[postTraining] failed to load WASM post-training, using TypeScript fallback',
			error
		);
		cachedNodeWasmApplyPostTraining = null;
		return cachedNodeWasmApplyPostTraining;
	}
};

export const applyPostTrainingToEsMatches = (
	matches: VectorEsMatch[],
	profile: PostTrainingProfile,
	finalLimit: number
): VectorEsMatch[] => {
	if (!profile.active || matches.length === 0) return matches;

	const applyWasm = getWasmApplyPostTrainingFunction();
	if (!applyWasm) {
		return applyPostTrainingToEsMatchesTs(matches, profile, finalLimit);
	}

	try {
		const out = applyWasm(matches, profile, finalLimit) as VectorEsMatch[];
		if (!Array.isArray(out)) {
			throw new Error('WASM post-training returned non-array result');
		}
		return out;
	} catch (error: unknown) {
		console.error('[postTraining] WASM post-training failed, using TypeScript fallback', error);
		return applyPostTrainingToEsMatchesTs(matches, profile, finalLimit);
	}
};

