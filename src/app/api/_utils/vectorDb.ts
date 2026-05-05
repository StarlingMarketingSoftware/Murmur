import { Contact } from '@prisma/client';
import { OpenAI } from 'openai';
import { Client, estypes } from '@elastic/elasticsearch';
import prisma from '@/lib/prisma';
import { fetchOpenRouterEmbedding } from './openrouter';

declare const __non_webpack_require__: NodeRequire | undefined;

type MappingProperty = estypes.MappingProperty;

const VECTOR_DIMENSION = 1536;
const INDEX_NAME = 'contacts';
const QUERY_EMBEDDING_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const QUERY_EMBEDDING_MAX_SIZE = 1000;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENROUTER_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

type QueryEmbeddingCacheEntry = {
	embedding: number[];
	timestamp: number;
};

const queryEmbeddingCache = new Map<string, QueryEmbeddingCacheEntry>();
const queryEmbeddingCacheStats = {
	hits: 0,
	misses: 0,
};

let openai: OpenAI | null = null;

const getOpenAiClient = (): OpenAI => {
	if (!process.env.OPEN_AI_API_KEY) {
		throw new Error('OPEN_AI_API_KEY environment variable is not set');
	}
	if (!openai) {
		openai = new OpenAI({
			apiKey: process.env.OPEN_AI_API_KEY,
			timeout: 15000, // 15s client timeout so embedding calls fail fast
		});
	}
	return openai;
};

const assertVectorDimension = (embedding: number[], source: string): number[] => {
	if (embedding.length !== VECTOR_DIMENSION) {
		throw new Error(
			`${source} returned ${embedding.length}-dimension embedding; expected ${VECTOR_DIMENSION}`
		);
	}
	return embedding;
};

const createTextEmbedding = async (input: string): Promise<number[]> => {
	if (process.env.OPENROUTER_API_KEY) {
		try {
			const embedding = await fetchOpenRouterEmbedding(input, {
				model: OPENROUTER_EMBEDDING_MODEL,
				timeoutMs: 15000,
				dimensions: VECTOR_DIMENSION,
			});
			return assertVectorDimension(embedding, 'OpenRouter');
		} catch (error) {
			if (!process.env.OPEN_AI_API_KEY) {
				throw error;
			}
			console.warn(
				'[vectorDb] OpenRouter embedding failed, falling back to direct OpenAI.',
				error
			);
		}
	}

	const response = await getOpenAiClient().embeddings.create({
		input,
		model: OPENAI_EMBEDDING_MODEL,
	});
	const embedding = response.data[0]?.embedding;
	if (!embedding) {
		throw new Error('Invalid embedding response from OpenAI');
	}
	return assertVectorDimension(embedding, 'OpenAI');
};

const elasticsearch = new Client({
	node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
	// Remove auth for local development
	...(process.env.ELASTICSEARCH_API_KEY && {
		auth: {
			apiKey: process.env.ELASTICSEARCH_API_KEY,
		},
	}),
	// Add timeout configurations for local development
	requestTimeout: 60000, // 60 seconds
	maxRetries: 3,
});

let contactsIndexHasGeoCoordinatesFieldPromise: Promise<boolean> | null = null;
let loggedMissingGeoCoordinatesField = false;

const logMissingGeoCoordinatesFieldOnce = (
	message: string,
	error?: unknown
): void => {
	if (loggedMissingGeoCoordinatesField) return;
	loggedMissingGeoCoordinatesField = true;
	if (error) {
		console.warn(message, error);
		return;
	}
	console.warn(message);
};

const contactsIndexHasGeoCoordinatesField = async (): Promise<boolean> => {
	if (!contactsIndexHasGeoCoordinatesFieldPromise) {
		contactsIndexHasGeoCoordinatesFieldPromise = (async () => {
			try {
				const currentMapping = await elasticsearch.indices.getMapping({
					index: INDEX_NAME,
				});
				const indexMappings = Object.values(currentMapping);
				const hasGeoPoint =
					indexMappings.length > 0 &&
					indexMappings.every(
						(mapping) =>
							mapping.mappings?.properties?.coordinates?.type === 'geo_point'
					);
				if (!hasGeoPoint) {
					logMissingGeoCoordinatesFieldOnce(
						'[vectorDb] contacts index is missing geo_point mapping for `coordinates`; curated ES sampling will skip geo_distance and Prisma will enforce locality.'
					);
				}
				return hasGeoPoint;
			} catch (error) {
				logMissingGeoCoordinatesFieldOnce(
					'[vectorDb] unable to inspect contacts index geo mapping; curated ES sampling will skip geo_distance and Prisma will enforce locality.',
					error
				);
				return false;
			}
		})();
	}
	return contactsIndexHasGeoCoordinatesFieldPromise;
};

interface ContactDocument {
	vector_field: number[];
	contactId: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	company: string | null;
	title: string | null;
	headline: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	address: string | null;
	website: string | null;
	metadata: string | null;
	companyFoundedYear: string | null;
	companyType: string | null;
	companyTechStack: string | null;
	companyKeywords: string | null;
	companyIndustry: string | null;
	location: string | null;
	coordinates?: {
		lat: number;
		lon: number;
	};
}

export const generateContactEmbedding = async (contact: Contact) => {
	const locationString =
		[contact.city, contact.state, contact.country].filter(Boolean).join(', ') || null;

	const contactText = [
		'This is a contact record. Location is especially important for search. the fields are ordered in the order of importance for search.',
		`Location: ${locationString}`,
		locationString ? `This contact is located in ${locationString}.` : '',
		`Address: ${contact.address || ''}`,
		`City: ${contact.city || ''}`,
		`State: ${contact.state || ''}`,
		`Country: ${contact.country || ''}`,
		`Title: ${contact.title || ''}`,
		`Metadata: ${contact.metadata || ''}`,
		`Company Industry: ${contact.companyIndustry || ''}`,
		`Company Type: ${contact.companyType || ''}`,
		`Company Founded Year: ${contact.companyFoundedYear || ''}`,
		`Headline: ${contact.headline || ''}`,
		`Company: ${contact.company || ''}`,
		`Company Keywords: ${(contact.companyKeywords || []).join(', ')}`,
		`Email: ${contact.email || ''}`,
		`Website: ${contact.website || ''}`,
		`Company Tech Stack: ${contact.companyTechStack || ''}`,
		`First Name: ${contact.firstName || ''}`,
		`Last Name: ${contact.lastName || ''}`,
	]
		.filter(Boolean)
		.join('\n');

	return createTextEmbedding(contactText);
};

export const initializeVectorDb = async () => {
	try {
		const indexExists = await elasticsearch.indices.exists({ index: INDEX_NAME });

		if (!indexExists) {
			await elasticsearch.indices.create({
				index: INDEX_NAME,
				settings: {
					analysis: {
						normalizer: {
							lowercase: {
								type: 'custom',
								filter: ['lowercase'],
							},
						},
					},
				},
				mappings: {
					properties: {
						vector_field: {
							type: 'dense_vector',
							dims: VECTOR_DIMENSION,
							index: true,
							similarity: 'cosine',
						},
						contactId: { type: 'keyword' },
						email: { type: 'keyword' },
						firstName: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						lastName: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						company: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						title: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						headline: { type: 'text' },
						city: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						state: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						country: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						address: { type: 'text' },
						location: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						website: { type: 'text' },
						metadata: { type: 'text' },
						companyFoundedYear: { type: 'text' },
						companyType: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						companyTechStack: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						companyKeywords: {
							type: 'text',
							fields: { keyword: { type: 'keyword', normalizer: 'lowercase' } },
						},
						companyIndustry: {
							type: 'text',
							fields: {
								keyword: { type: 'keyword', normalizer: 'lowercase' },
							},
						},
						coordinates: {
							type: 'geo_point',
						},
					},
				},
			});
			console.log('Index created successfully');
		} else {
			console.log('Index already exists');
		}
	} catch (error) {
		console.error('Error initializing Elasticsearch:', error);
		throw error;
	}
};

export const updateWithNewFields = async () => {
	try {
		const currentMapping = await elasticsearch.indices.getMapping({
			index: INDEX_NAME,
		});

		const existingProperties =
			Object.values(currentMapping)[0]?.mappings?.properties || {};

		const newFields = {
			companyType: { type: 'text' },
			companyTechStack: { type: 'text' },
			companyKeywords: { type: 'text' },
			companyIndustry: { type: 'text' },
			coordinates: { type: 'geo_point' },
		};

		const fieldsToUpdate: Record<string, MappingProperty> = {};

		for (const [fieldName, mapping] of Object.entries(newFields)) {
			const existingField = existingProperties[fieldName];

			if (!existingField) {
				fieldsToUpdate[fieldName] = mapping as MappingProperty;
				console.log(`Will add new field: ${fieldName}`);
			} else if (existingField.type !== mapping.type) {
				console.warn(
					`Field ${fieldName} exists with type ${existingField.type}, wanted ${mapping.type}`
				);
			}
		}

		if (Object.keys(fieldsToUpdate).length > 0) {
			const res = await elasticsearch.indices.putMapping({
				index: INDEX_NAME,
				properties: fieldsToUpdate,
			});
			console.log(`Added ${Object.keys(fieldsToUpdate).length} new field mappings`);
			return res;
		} else {
			console.log('All field mappings are already up to date');
		}
		return null;
	} catch (error) {
		console.error('Error ensuring correct mappings:', error);
		throw error;
	}
};

export const upsertContactToVectorDb = async (
	contact: Contact,
	embedding?: number[]
): Promise<string> => {
	let _embedding = embedding;

	if (!_embedding) {
		_embedding = await generateContactEmbedding(contact);
	}

	const id = contact.id.toString();

	await elasticsearch.index<ContactDocument>({
		index: INDEX_NAME,
		id: id,
		document: {
			vector_field: _embedding,
			contactId: contact.id.toString(),
			email: contact.email,
			firstName: contact.firstName || null,
			lastName: contact.lastName || null,
			company: contact.company || null,
			title: contact.title || null,
			headline: contact.headline || null,
			city: contact.city || null,
			state: contact.state || null,
			country: contact.country || null,
			address: contact.address || null,
			website: contact.website || null,
			metadata: contact.metadata || null,
			companyFoundedYear: contact.companyFoundedYear?.toString() || null,
			companyType: contact.companyType || null,
			companyTechStack: contact.companyTechStack?.join(', ') || null,
			companyKeywords: contact.companyKeywords?.join(', ') || null,
			companyIndustry: contact.companyIndustry || null,
			location: [contact.city, contact.state, contact.country].filter(Boolean).join(', '),
			coordinates:
				contact.latitude && contact.longitude
					? {
							lat: contact.latitude,
							lon: contact.longitude,
					  }
					: undefined,
		},
	});

	await prisma.contact.update({
		where: { id: contact.id },
		data: { hasVectorEmbedding: true },
	});

	return id;
};

export const deleteContactFromVectorDb = async (id: string) => {
	await elasticsearch.delete({
		index: INDEX_NAME,
		id: id,
	});
};

export type QueryJson = {
	city: string | null;
	state: string | null;
	country: string | null;
	restOfQuery: string;
};

export type SearchSimilarContactsOptions = {
	penaltyCities?: string[];
	forceCityExactCity?: string;
	forceStateAny?: string[];
	forceCityAny?: string[];
	penaltyTerms?: string[];
	strictPenalty?: boolean;
};

type WasmScoringHitInput = {
	id: string;
	score: number;
	city: string | null;
	state: string | null;
	country: string | null;
	headline: string | null;
	title: string | null;
	company: string | null;
};

type WasmScoringConfig = {
	query_city: string | null;
	query_state: string | null;
	query_country: string | null;
	exact_boost: number;
	fuzzy_boost: number;
	skip_boosts: boolean;
	penalty_cities: string[];
	penalty_terms: string[];
	strict_penalty: boolean;
	limit: number;
};

type WasmScoringOutput = {
	id: string;
	score: number;
};

type WasmScoreHitsFunction = (
	hits: WasmScoringHitInput[],
	config: WasmScoringConfig
) => WasmScoringOutput[];

let cachedNodeWasmScoreHits: WasmScoreHitsFunction | null | undefined;

const getWasmScoreHitsFunction = async (): Promise<WasmScoreHitsFunction | null> => {
	if (process.env.USE_WASM_SCORER !== 'true') return null;
	if (cachedNodeWasmScoreHits !== undefined) return cachedNodeWasmScoreHits;

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
		) as Partial<{ score_hits: unknown }> & { default?: Partial<{ score_hits: unknown }> };
		const maybeModule = (loaded.default ?? loaded) as Partial<{ score_hits: unknown }>;

		if (typeof maybeModule.score_hits !== 'function') {
			console.error('[vectorDb] score_hits export missing from rust-scorer pkg-node');
			cachedNodeWasmScoreHits = null;
			return cachedNodeWasmScoreHits;
		}

		cachedNodeWasmScoreHits = maybeModule.score_hits as WasmScoreHitsFunction;
		return cachedNodeWasmScoreHits;
	} catch (error: unknown) {
		console.error('[vectorDb] failed to load WASM scorer, using TypeScript fallback', error);
		cachedNodeWasmScoreHits = null;
		return cachedNodeWasmScoreHits;
	}
};

export const normalizeQueryEmbeddingKey = (input: string): string => {
	return input.toLowerCase().trim().replace(/\s+/g, ' ');
};

export const getCachedQueryEmbedding = (key: string): number[] | null => {
	if (!key) return null;

	const cached = queryEmbeddingCache.get(key);
	if (!cached) {
		queryEmbeddingCacheStats.misses += 1;
		return null;
	}

	if (Date.now() - cached.timestamp > QUERY_EMBEDDING_CACHE_TTL_MS) {
		queryEmbeddingCache.delete(key);
		queryEmbeddingCacheStats.misses += 1;
		return null;
	}

	// Maintain simple LRU behavior by moving accessed entries to the end.
	queryEmbeddingCache.delete(key);
	queryEmbeddingCache.set(key, cached);
	queryEmbeddingCacheStats.hits += 1;

	return [...cached.embedding];
};

export const setCachedQueryEmbedding = (key: string, embedding: number[]): void => {
	if (!key || embedding.length === 0) return;

	if (queryEmbeddingCache.has(key)) {
		queryEmbeddingCache.delete(key);
	}

	queryEmbeddingCache.set(key, {
		embedding: [...embedding],
		timestamp: Date.now(),
	});

	while (queryEmbeddingCache.size > QUERY_EMBEDDING_MAX_SIZE) {
		const oldestKey = queryEmbeddingCache.keys().next().value;
		if (!oldestKey) break;
		queryEmbeddingCache.delete(oldestKey);
	}
};

export const getQueryEmbeddingCacheStats = () => {
	const totalLookups = queryEmbeddingCacheStats.hits + queryEmbeddingCacheStats.misses;
	return {
		size: queryEmbeddingCache.size,
		hits: queryEmbeddingCacheStats.hits,
		misses: queryEmbeddingCacheStats.misses,
		hitRate: totalLookups === 0 ? 0 : queryEmbeddingCacheStats.hits / totalLookups,
		ttlMs: QUERY_EMBEDDING_CACHE_TTL_MS,
		maxSize: QUERY_EMBEDDING_MAX_SIZE,
	};
};

export const searchSimilarContacts = async (
	queryJson: QueryJson,
	limit: number = 10,
	locationStrategy: 'strict' | 'flexible' | 'broad' = 'flexible',
	options?: SearchSimilarContactsOptions
) => {
	const normalizedQueryEmbeddingKey = normalizeQueryEmbeddingKey(queryJson.restOfQuery);
	const shouldUseQueryEmbeddingCache = normalizedQueryEmbeddingKey.length > 0;
	let queryEmbedding: number[];

	if (shouldUseQueryEmbeddingCache) {
		const cachedEmbedding = getCachedQueryEmbedding(normalizedQueryEmbeddingKey);
		if (cachedEmbedding) {
			console.log('[vectorDb] query embedding cache hit');
			queryEmbedding = cachedEmbedding;
		} else {
			console.log('[vectorDb] query embedding cache miss');
			const embeddingStartMs = Date.now();
			queryEmbedding = await createTextEmbedding(queryJson.restOfQuery);
			setCachedQueryEmbedding(normalizedQueryEmbeddingKey, queryEmbedding);
			console.log(
				`[vectorDb] query embedding generated in ${Date.now() - embeddingStartMs}ms`
			);
		}
	} else {
		queryEmbedding = await createTextEmbedding(queryJson.restOfQuery);
	}

	// Configure location boost strategy for post-processing
	const locationBoosts = {
		strict: { exact: 0.0, fuzzy: 0.0 }, // No post-processing boost for strict (uses filters)
		flexible: { exact: 0.2, fuzzy: 0.1 }, // Moderate location preference
		broad: { exact: 0.1, fuzzy: 0.05 }, // Light location preference
	};
	const boosts = locationBoosts[locationStrategy];

	// Build strict state/city filter for kNN (enforce exact state and exact city or any-of cities)
	const buildStrictStateFilter = () => {
		if (locationStrategy !== 'strict') return undefined;
		const must: Record<string, unknown>[] = [];
		if (options?.forceStateAny && options.forceStateAny.length > 0) {
			must.push({
				bool: {
					should: options.forceStateAny.map((s) => ({
						term: { 'state.keyword': s.toLowerCase() },
					})),
					minimum_should_match: 1,
				},
			});
		} else if (queryJson.state) {
			must.push({ term: { 'state.keyword': queryJson.state.toLowerCase() } });
		}
		if (options?.forceCityExactCity) {
			must.push({ term: { 'city.keyword': options.forceCityExactCity.toLowerCase() } });
		}
		if (options?.forceCityAny && options.forceCityAny.length > 0) {
			must.push({
				bool: {
					should: options.forceCityAny.map((c) => ({
						term: { 'city.keyword': c.toLowerCase() },
					})),
					minimum_should_match: 1,
				},
			});
		}
		if (must.length === 0) return undefined;
		return { bool: { filter: must } } as const;
	};

	const strictStateFilter = buildStrictStateFilter();

	// Pure kNN search - let vector embeddings handle semantic matching
	const kValue =
		options?.penaltyTerms && options.penaltyTerms.length > 0
			? locationStrategy === 'strict'
				? Math.min(limit * 2, 500)
				: Math.min(limit * 6, 500)
			: locationStrategy === 'strict'
			? limit
			: Math.min(limit * 3, 500);

	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		knn: {
			field: 'vector_field',
			query_vector: queryEmbedding,
			k: kValue, // Get more candidates for filtering when we plan to demote results
			// Keep candidate space bounded; large values can stall ES locally
			num_candidates: Math.min(1000, Math.max(kValue * 5, 50)),
			filter: strictStateFilter,
		},
		size: Math.min(limit, 500),
		fields: [
			'contactId',
			'email',
			'firstName.keyword',
			'firstName',
			'lastName.keyword',
			'lastName',
			'company',
			'title',
			'headline',
			'city',
			'state',
			'country',
			'address',
			'website',
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
			'coordinates',
		],
		_source: false,
	});

	// Post-process results with optional location boosts and institutional penalties
	const processResultsWithLocationBoostTs = (
		hits: estypes.SearchHit[]
	): estypes.SearchHit[] => {
		const skipBoosts = locationStrategy === 'strict' || boosts.exact === 0;

		const penalties = new Set((options?.penaltyCities || []).map((c) => c.toLowerCase()));
		const penaltyTerms = new Set(
			(options?.penaltyTerms || []).map((t) => t.toLowerCase())
		);

		return hits
			.map((hit) => {
				let locationBoost = 0;
				if (!skipBoosts) {
					// Check for exact location matches
					if (
						queryJson.state &&
						hit.fields?.state?.[0]?.toLowerCase() === queryJson.state.toLowerCase()
					) {
						locationBoost += boosts.exact;
					}
					if (
						queryJson.city &&
						hit.fields?.city?.[0]?.toLowerCase() === queryJson.city.toLowerCase()
					) {
						locationBoost += boosts.exact;
					}
					if (
						queryJson.country &&
						hit.fields?.country?.[0]?.toLowerCase() === queryJson.country.toLowerCase()
					) {
						locationBoost += boosts.exact;
					}
					// Check for fuzzy location matches
					if (queryJson.state && hit.fields?.state?.[0]) {
						const hitState = hit.fields.state[0].toLowerCase();
						const queryState = queryJson.state.toLowerCase();
						if (
							hitState.includes(queryState.substring(0, 2)) ||
							queryState.includes(hitState.substring(0, 2))
						) {
							locationBoost += boosts.fuzzy;
						}
					}
				}

				// Soft penalties for specific cities (e.g., when query contains "manhattan")
				const hitCity = String(hit.fields?.city?.[0] || '').toLowerCase();
				let penalty = penalties.has(hitCity) ? 0.2 : 0; // small deduction for cities

				// Soft penalty for university/college when query starts with "music venue(s)"
				const headline = String(hit.fields?.headline?.[0] || '').toLowerCase();
				const title = String(hit.fields?.title?.[0] || '').toLowerCase();
				const company = String(hit.fields?.company?.[0] || '').toLowerCase();
				const textBlob = `${headline} ${title} ${company}`;
				for (const term of penaltyTerms) {
					if (!term) continue;
					const exact = new RegExp(
						`(^|\b)${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\b|$)`,
						'i'
					);
					if (exact.test(textBlob)) {
						penalty += options?.strictPenalty ? 0.6 : 0.35; // much stronger in strictPenalty mode
					} else if (textBlob.includes(term)) {
						penalty += options?.strictPenalty ? 0.35 : 0.2; // stronger partial penalty in strictPenalty mode
					}
				}

				// Apply location boost and penalty to score
				const originalScore = hit._score || 0;
				const boostedScore = originalScore + locationBoost - penalty;

				return {
					...hit,
					_score: boostedScore,
				};
			})
			.sort((a, b) => (b._score || 0) - (a._score || 0)) // Re-sort by boosted score
			.slice(0, limit); // Apply final limit
	};

	const getFieldValueAsString = (
		hit: estypes.SearchHit,
		fieldName: string
	): string | null => {
		const fields = hit.fields as Record<string, Array<unknown> | undefined> | undefined;
		const value = fields?.[fieldName]?.[0];
		return value === undefined || value === null ? null : String(value);
	};

	const processResultsWithLocationBoost = async (
		hits: estypes.SearchHit[]
	): Promise<estypes.SearchHit[]> => {
		const scoreHits = await getWasmScoreHitsFunction();
		if (!scoreHits) {
			return processResultsWithLocationBoostTs(hits);
		}

		const serializedHits: WasmScoringHitInput[] = hits.map((hit, index) => ({
			id: String(hit._id ?? `missing-id-${index}`),
			score: hit._score || 0,
			city: getFieldValueAsString(hit, 'city'),
			state: getFieldValueAsString(hit, 'state'),
			country: getFieldValueAsString(hit, 'country'),
			headline: getFieldValueAsString(hit, 'headline'),
			title: getFieldValueAsString(hit, 'title'),
			company: getFieldValueAsString(hit, 'company'),
		}));

		const hitById = new Map<string, estypes.SearchHit>();
		serializedHits.forEach((serializedHit, index) => {
			hitById.set(serializedHit.id, hits[index]);
		});

		try {
			const wasmScoredHits = scoreHits(serializedHits, {
				query_city: queryJson.city,
				query_state: queryJson.state,
				query_country: queryJson.country,
				exact_boost: boosts.exact,
				fuzzy_boost: boosts.fuzzy,
				skip_boosts: locationStrategy === 'strict' || boosts.exact === 0,
				penalty_cities: options?.penaltyCities || [],
				penalty_terms: options?.penaltyTerms || [],
				strict_penalty: Boolean(options?.strictPenalty),
				limit,
			});

			const reconstructedHits: estypes.SearchHit[] = [];
			for (const scoredHit of wasmScoredHits) {
				const originalHit = hitById.get(scoredHit.id);
				if (!originalHit) continue;

				reconstructedHits.push({
					...originalHit,
					_score: scoredHit.score,
				});
			}

			return reconstructedHits;
		} catch (error) {
			console.error('[vectorDb] WASM scoring failed, using TypeScript fallback', error);
			return processResultsWithLocationBoostTs(hits);
		}
	};

	const processedHits = await processResultsWithLocationBoost(results.hits.hits);

	return {
		matches: processedHits.map((hit) => ({
			id: hit._id,
			score: hit._score || 0,
			metadata: {
				contactId: hit.fields?.contactId?.[0],
				email: hit.fields?.email?.[0],
				firstName: hit.fields?.firstName?.[0] || null,
				lastName: hit.fields?.lastName?.[0] || null,
				company: hit.fields?.company?.[0],
				title: hit.fields?.title?.[0],
				headline: hit.fields?.headline?.[0],
				city: hit.fields?.city?.[0],
				state: hit.fields?.state?.[0],
				country: hit.fields?.country?.[0],
				address: hit.fields?.address?.[0],
				website: hit.fields?.website?.[0],
				metadata: hit.fields?.metadata?.[0],
				companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
				companyType: hit.fields?.companyType?.[0],
				companyTechStack: hit.fields?.companyTechStack?.[0],
				companyKeywords: hit.fields?.companyKeywords?.[0],
				companyIndustry: hit.fields?.companyIndustry?.[0],
				location: hit.fields?.location?.[0],
				coordinates: hit.fields?.coordinates?.[0] || null,
			},
		})),
		totalFound: processedHits.length,
		locationStrategy: locationStrategy,
	};
};

export const searchContactsByLocation = async (
	latitude: number,
	longitude: number,
	distanceKm: number = 50,
	limit: number = 10
) => {
	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		query: {
			geo_distance: {
				distance: `${distanceKm}km`,
				coordinates: {
					lat: latitude,
					lon: longitude,
				},
			},
		},
		size: limit,
		sort: [
			{
				geo_distance: {
					order: 'asc',
					unit: 'km',
					mode: 'min',
					distance_type: 'arc',
					coordinates: {
						lat: latitude,
						lon: longitude,
					},
				},
			},
		],
		fields: [
			'contactId',
			'email',
			'firstName.keyword',
			'firstName',
			'lastName.keyword',
			'lastName',
			'company',
			'title',
			'headline',
			'city',
			'state',
			'country',
			'address',
			'website',
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
			'coordinates',
		],
		_source: false,
	});

	return {
		matches: results.hits.hits.map((hit) => ({
			id: hit._id,
			score: hit._score || 0,
			metadata: {
				contactId: hit.fields?.contactId[0],
				email: hit.fields?.email[0],
				firstName: hit.fields?.firstName[0],
				lastName: hit.fields?.lastName[0],
				company: hit.fields?.company[0],
				title: hit.fields?.title[0],
				headline: hit.fields?.headline[0],
				city: hit.fields?.city[0],
				state: hit.fields?.state[0],
				country: hit.fields?.country[0],
				address: hit.fields?.address[0],
				website: hit.fields?.website[0],
				metadata: hit.fields?.metadata[0],
				companyType: hit.fields?.companyType?.[0],
				companyTechStack: hit.fields?.companyTechStack?.[0],
				companyKeywords: hit.fields?.companyKeywords?.[0],
				companyIndustry: hit.fields?.companyIndustry?.[0],
				companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
				location: hit.fields?.location?.[0],
				coordinates: hit.fields?.coordinates?.[0] || null,
			},
		})),
		totalFound: results.hits.hits.length,
		distanceKm,
	};
};

// Lexical (BM25) full-text search across the contact text fields. This is
// the keyword-side counterpart to the kNN retriever in `searchSimilarContacts`
// — kNN handles semantic intent ("places that feel like a basement jazz club"),
// lexical handles exact and near-exact word matches ("austin", "vegan",
// "Spotted Pig"). Used by the free-text bottom-box search in
// /api/contacts/search to feed candidates into rank fusion.
//
// Boosts mirror what carries the most discriminative signal in this dataset:
// title and company name dominate; companyKeywords and headline contribute;
// metadata is broad context only. City/state, when supplied, are added as
// soft `should` boosts on `.keyword` so an exact place match outranks
// semantic-only matches without filtering anything out.
export type LexicalSearchOptions = {
	queryText: string;
	limit?: number;
	titlePrefixes?: readonly string[]; // optional category prefix bias (not a hard filter)
	city?: string | null;
	state?: string | null;
	country?: string | null;
	center?: { lat: number; lon: number } | null;
	radiusKm?: number | null;
	// When set, results are HARD-filtered to documents whose state.keyword
	// matches one of these values (lowercased). Use when the user typed an
	// explicit state — they don't want results in other states no matter how
	// strong the semantic match is.
	enforcedStateValues?: readonly string[] | null;
	// Tightens the multi_match for short, noun-led queries (e.g. "deli",
	// "bookstore", "italian deli"). Drops headline/metadata/address from the
	// field list — those are the main source of person-row leakage where a
	// blurb mentions the noun in passing — and disables fuzziness so a 4-letter
	// token like "deli" can't edit-distance-1 match surnames like "Dell".
	shortQueryMode?: boolean;
	// Widest-possible no-fuzziness retrieval. Used by the search route's
	// national-fallback stage when the index has no in-domain rows for the
	// user's noun and we need to find ANY contact whose text fields literally
	// contain the token — including headline, metadata, address, and the
	// company-meta fields that shortQueryMode deliberately excludes. Includes
	// a `phrase_prefix` pass so "plumber" matches tokens like "plumbers"
	// without the false-positive risk of fuzziness ("plumber" → "lumber").
	// Takes precedence over shortQueryMode when both are set.
	literalSweepMode?: boolean;
};

export const lexicalSearchContacts = async (options: LexicalSearchOptions) => {
	const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));
	const queryText = options.queryText.trim();
	const canUseGeoDistance =
		options.center && options.radiusKm
			? await contactsIndexHasGeoCoordinatesField()
			: false;

	const should: Record<string, unknown>[] = [];

	// Multi-field match on the substantive query text. Boost weights chosen so
	// title and company dominate; headline and keywords contribute meaningfully;
	// metadata is broad context.
	if (queryText) {
		if (options.literalSweepMode) {
			// Widest-possible no-fuzziness sweep across every text field that
			// could plausibly mention the user's noun. fuzziness=0 keeps
			// "plumber" from drifting to "lumber"; the phrase_prefix pass adds
			// morphological tolerance ("plumber" → "plumbers"/"plumbery") without
			// the false-positive risk fuzziness brings.
			should.push({
				multi_match: {
					query: queryText,
					type: 'best_fields',
					fields: [
						'title^6',
						'company^4',
						'headline^3',
						'companyKeywords^2',
						'companyIndustry^2',
						'companyType^2',
						'metadata',
						'address',
					],
					operator: 'or',
					fuzziness: 0,
				},
			});
			should.push({
				multi_match: {
					query: queryText,
					type: 'phrase',
					fields: ['title^8', 'company^6', 'headline^4'],
					slop: 2,
				},
			});
			should.push({
				multi_match: {
					query: queryText,
					type: 'phrase_prefix',
					fields: ['title^4', 'company^3', 'headline^2'],
				},
			});
		} else if (options.shortQueryMode) {
			// Short noun-led queries: keep only the high-signal fields. Headline
			// and metadata are dropped because they leak person rows whose blurbs
			// happen to mention the noun ("communications director who blogged
			// about delis"). Fuzziness disabled because edit-distance 1 on a
			// 4-letter token matches surnames like "Dell" against "deli".
			should.push({
				multi_match: {
					query: queryText,
					type: 'best_fields',
					fields: [
						'title^6',
						'company^4',
						'companyKeywords^1',
						'companyIndustry',
						'companyType',
					],
					operator: 'or',
					fuzziness: 0,
				},
			});
			// Phrase match on title/company only — useful for 2-token noun
			// queries like "italian deli" where the in-order phrase is the
			// strongest signal.
			should.push({
				multi_match: {
					query: queryText,
					type: 'phrase',
					fields: ['title^8', 'company^5'],
					slop: 1,
				},
			});
		} else {
			should.push({
				multi_match: {
					query: queryText,
					type: 'best_fields',
					fields: [
						'title^4',
						'company^3',
						'headline^2',
						'companyKeywords^2',
						'companyIndustry',
						'companyType',
						'metadata',
						'address',
						'location',
					],
					operator: 'or',
					fuzziness: 'AUTO',
				},
			});
			// Phrase match for queries containing multi-word concepts ("live
			// music", "wedding planners"). Cheap insurance — overlaps with
			// multi_match but strongly rewards the in-order phrase appearing in
			// the title or company.
			should.push({
				multi_match: {
					query: queryText,
					type: 'phrase',
					fields: ['title^6', 'company^4', 'headline^3', 'metadata'],
					slop: 2,
				},
			});
		}
	}

	if (options.city) {
		should.push({
			term: {
				'city.keyword': { value: options.city.toLowerCase(), boost: 6 },
			},
		});
	}
	if (options.state) {
		should.push({
			term: {
				'state.keyword': { value: options.state.toLowerCase(), boost: 4 },
			},
		});
	}
	if (options.country) {
		should.push({
			term: {
				'country.keyword': { value: options.country.toLowerCase(), boost: 1.5 },
			},
		});
	}

	// Title-prefix bias when a category was parsed. Not a hard filter — we want
	// "music venues in austin" to lean toward Music Venues canonical rows but
	// still surface a great non-prefixed venue if relevance dominates.
	if (options.titlePrefixes && options.titlePrefixes.length > 0) {
		for (const prefix of options.titlePrefixes) {
			const lc = prefix.trim().toLowerCase();
			if (!lc) continue;
			should.push({
				prefix: {
					'title.keyword': { value: lc, case_insensitive: true, boost: 5 },
				},
			});
		}
	}

	const filter: Record<string, unknown>[] = [];
	if (options.center && options.radiusKm && canUseGeoDistance) {
		filter.push({
			geo_distance: {
				distance: `${Math.max(1, options.radiusKm)}km`,
				coordinates: { lat: options.center.lat, lon: options.center.lon },
			},
		});
	}
	if (options.enforcedStateValues && options.enforcedStateValues.length > 0) {
		// Permissive state filter — `state.keyword` exact match catches the clean
		// case ("arkansas" / "ar"), `prefix` catches comma-suffixed dirty values
		// ("arkansas, usa"), and a `match_phrase` on title catches canonical
		// "Restaurants Arkansas" rows whose state field is null.
		const stateClauses: Record<string, unknown>[] = [];
		for (const v of options.enforcedStateValues) {
			const lc = v.toLowerCase();
			stateClauses.push({ term: { 'state.keyword': { value: lc } } });
			stateClauses.push({
				prefix: { 'state.keyword': { value: lc, case_insensitive: true } },
			});
			stateClauses.push({ match_phrase: { state: v } });
			stateClauses.push({ match_phrase: { title: v } });
		}
		filter.push({ bool: { should: stateClauses, minimum_should_match: 1 } });
	}

	if (should.length === 0) {
		return { matches: [], totalFound: 0 };
	}

	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		size: limit,
		query: {
			bool: {
				should,
				minimum_should_match: 1,
				filter,
			},
		},
		fields: [
			'contactId',
			'email',
			'firstName',
			'lastName',
			'company',
			'title',
			'headline',
			'city',
			'state',
			'country',
			'address',
			'website',
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
			'coordinates',
		],
		_source: false,
	});

	const matches = results.hits.hits.map((hit) => ({
		id: hit._id,
		score: hit._score || 0,
		metadata: {
			contactId: hit.fields?.contactId?.[0],
			email: hit.fields?.email?.[0],
			firstName: hit.fields?.firstName?.[0] ?? null,
			lastName: hit.fields?.lastName?.[0] ?? null,
			company: hit.fields?.company?.[0],
			title: hit.fields?.title?.[0],
			headline: hit.fields?.headline?.[0],
			city: hit.fields?.city?.[0],
			state: hit.fields?.state?.[0],
			country: hit.fields?.country?.[0],
			address: hit.fields?.address?.[0],
			website: hit.fields?.website?.[0],
			metadata: hit.fields?.metadata?.[0],
			companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
			companyType: hit.fields?.companyType?.[0],
			companyTechStack: hit.fields?.companyTechStack?.[0],
			companyKeywords: hit.fields?.companyKeywords?.[0],
			companyIndustry: hit.fields?.companyIndustry?.[0],
			location: hit.fields?.location?.[0],
			coordinates: hit.fields?.coordinates?.[0] || null,
		},
	}));

	return { matches, totalFound: matches.length };
};

// Pure title-prefix retriever for free-text search when a category was parsed
// from the user's query. Returns the highest-quality (canonical-shaped) rows
// in that category by leaning on a function_score that weights canonical
// title shape and full address data, with optional geo_distance filtering.
// No randomness — quality, not vibe rotation.
export const titlePrefixSearchContacts = async (options: {
	titlePrefixes: readonly string[];
	limit?: number;
	center?: { lat: number; lon: number } | null;
	radiusKm?: number | null;
	enforcedStateValues?: readonly string[] | null;
}) => {
	const limit = Math.max(1, Math.min(options.limit ?? 200, 1000));
	const canUseGeoDistance =
		options.center && options.radiusKm
			? await contactsIndexHasGeoCoordinatesField()
			: false;

	const titleClauses: Record<string, unknown>[] = [];
	for (const prefix of options.titlePrefixes) {
		const lc = prefix.trim().toLowerCase();
		if (!lc) continue;
		titleClauses.push({
			prefix: { 'title.keyword': { value: lc, case_insensitive: true } },
		});
		titleClauses.push({ match_phrase_prefix: { title: prefix.trim() } });
	}
	if (titleClauses.length === 0) return { matches: [], totalFound: 0 };

	const filter: Record<string, unknown>[] = [
		{ bool: { should: titleClauses, minimum_should_match: 1 } },
	];
	if (options.center && options.radiusKm && canUseGeoDistance) {
		filter.push({
			geo_distance: {
				distance: `${Math.max(1, options.radiusKm)}km`,
				coordinates: { lat: options.center.lat, lon: options.center.lon },
			},
		});
	}
	if (options.enforcedStateValues && options.enforcedStateValues.length > 0) {
		const stateClauses: Record<string, unknown>[] = [];
		for (const v of options.enforcedStateValues) {
			const lc = v.toLowerCase();
			stateClauses.push({ term: { 'state.keyword': { value: lc } } });
			stateClauses.push({
				prefix: { 'state.keyword': { value: lc, case_insensitive: true } },
			});
			stateClauses.push({ match_phrase: { state: v } });
			stateClauses.push({ match_phrase: { title: v } });
		}
		filter.push({ bool: { should: stateClauses, minimum_should_match: 1 } });
	}

	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		size: limit,
		query: { bool: { filter } },
		fields: [
			'contactId',
			'email',
			'firstName',
			'lastName',
			'company',
			'title',
			'headline',
			'city',
			'state',
			'country',
			'address',
			'website',
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
			'coordinates',
		],
		_source: false,
	});

	const matches = results.hits.hits.map((hit) => ({
		id: hit._id,
		score: hit._score || 0,
		metadata: {
			contactId: hit.fields?.contactId?.[0],
			email: hit.fields?.email?.[0],
			firstName: hit.fields?.firstName?.[0] ?? null,
			lastName: hit.fields?.lastName?.[0] ?? null,
			company: hit.fields?.company?.[0],
			title: hit.fields?.title?.[0],
			headline: hit.fields?.headline?.[0],
			city: hit.fields?.city?.[0],
			state: hit.fields?.state?.[0],
			country: hit.fields?.country?.[0],
			address: hit.fields?.address?.[0],
			website: hit.fields?.website?.[0],
			metadata: hit.fields?.metadata?.[0],
			companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
			companyType: hit.fields?.companyType?.[0],
			companyTechStack: hit.fields?.companyTechStack?.[0],
			companyKeywords: hit.fields?.companyKeywords?.[0],
			companyIndustry: hit.fields?.companyIndustry?.[0],
			location: hit.fields?.location?.[0],
			coordinates: hit.fields?.coordinates?.[0] || null,
		},
	}));

	return { matches, totalFound: matches.length };
};

// Curated random sampler: pulls contacts whose title begins with one of the given
// prefixes, optionally biased toward a geographic centroid, and shuffles them via
// ES `random_score` so each call returns a different set. Uses no embeddings —
// pure Elasticsearch, no OpenAI.
//
// Live music boost: the candidate pool is also biased toward rows whose
// title/headline/metadata/companyKeywords mention live music, concerts, gigs,
// show/set times, or related performance signals. This is layered on top of
// the random_score so each click still varies, but live-music-mentioning rows
// are over-represented in the returned candidate pool that feeds the in-memory
// distribution pipeline. See `LIVE_MUSIC_TERMS` below for the full vocabulary.
export type CuratedSamplerOptions = {
	titlePrefixes: string[];
	limit?: number;
	candidatePool?: number;
	center?: { lat: number; lon: number } | null;
	radiusKm?: number;
	seed?: number;
};

// Vocabulary used to detect live-music intent in a contact's text fields. Kept
// in one place so the ES sampler boost and the in-memory tier in
// curated-search/distribution.ts can stay in sync. Strong terms (an explicit
// "live music" / "music venue" / "concert venue" mention) get a much larger
// boost than weaker hints ("performance", "stage", "shows").
const LIVE_MUSIC_STRONG_TERMS = [
	'live music',
	'live-music',
	'music venue',
	'music venues',
	'concert venue',
	'concert hall',
	'music hall',
	'live performance',
	'live performances',
	'show times',
	'showtimes',
	'set times',
	'tour dates',
	'live entertainment',
	'live shows',
	'live acts',
	'live bands',
] as const;

const LIVE_MUSIC_WEAK_TERMS = [
	'concert',
	'concerts',
	'gig',
	'gigs',
	'jazz',
	'blues',
	'band',
	'bands',
	'open mic',
	'singer-songwriter',
	'songwriter',
	'performance',
	'performances',
	'stage',
	'shows',
	'performing arts',
	'touring',
] as const;

export const sampleContactsByCategory = async (options: CuratedSamplerOptions) => {
	const limit = Math.max(1, Math.min(options.limit ?? 50, 2500));
	const candidatePool = Math.max(limit, Math.min(options.candidatePool ?? 400, 2500));
	const seed = options.seed ?? Date.now();
	const canUseGeoDistance = options.center
		? await contactsIndexHasGeoCoordinatesField()
		: false;

	const titleClauses: Record<string, unknown>[] = [];
	for (const prefix of options.titlePrefixes) {
		const lc = prefix.trim().toLowerCase();
		if (!lc) continue;
		// case_insensitive matches whether or not the keyword normalizer is applied
		// to the search term — robust against mapping drift.
		titleClauses.push({
			prefix: { 'title.keyword': { value: lc, case_insensitive: true } },
		});
		// Fall-back match against the analyzed text field too, in case some titles
		// landed without the keyword sub-field populated.
		titleClauses.push({
			match_phrase_prefix: { title: prefix.trim() },
		});
	}

	const filter: Record<string, unknown>[] = [];
	if (titleClauses.length > 0) {
		filter.push({ bool: { should: titleClauses, minimum_should_match: 1 } });
	}

	if (options.center && canUseGeoDistance) {
		filter.push({
			geo_distance: {
				distance: `${Math.max(1, options.radiusKm ?? 250)}km`,
				coordinates: {
					lat: options.center.lat,
					lon: options.center.lon,
				},
			},
		});
	}

	const baseQuery =
		filter.length > 0 ? { bool: { filter } } : { match_all: {} };

	// Live music boost functions. Each `filter` clause matches a live-music
	// signal in one of the searchable text fields (title/headline/metadata/
	// companyKeywords/companyIndustry/companyType). When a doc matches, its
	// `weight` multiplier is added to the random score via `score_mode: sum` —
	// so a row with several live-music hits across multiple fields lifts much
	// higher than one with a single weak hit, while non-music rows keep their
	// raw random score.
	//
	// The `match_phrase` clauses are intentionally `match_phrase` rather than
	// `match` so multi-word phrases like "live music" don't fire on the
	// individual tokens "live" and "music" appearing anywhere in the doc.
	const liveMusicFunctions: Record<string, unknown>[] = [];
	const SEARCHABLE_TEXT_FIELDS = [
		'title',
		'headline',
		'metadata',
		'companyKeywords',
		'companyIndustry',
		'companyType',
		'company',
	] as const;
	const STRONG_WEIGHT = 6;
	const WEAK_WEIGHT = 1.5;
	for (const term of LIVE_MUSIC_STRONG_TERMS) {
		for (const field of SEARCHABLE_TEXT_FIELDS) {
			liveMusicFunctions.push({
				filter: { match_phrase: { [field]: term } },
				weight: STRONG_WEIGHT,
			});
		}
	}
	for (const term of LIVE_MUSIC_WEAK_TERMS) {
		for (const field of SEARCHABLE_TEXT_FIELDS) {
			liveMusicFunctions.push({
				filter: { match_phrase: { [field]: term } },
				weight: WEAK_WEIGHT,
			});
		}
	}

	// Layering:
	//  - random_score establishes a per-call randomized baseline in [0,1).
	//  - live-music weight functions add fixed bonuses (sum) when any field
	//    contains a live-music phrase. A non-music row keeps its [0,1) score;
	//    a row with one strong hit jumps to ~6+, a row with multiple hits jumps
	//    higher, so live-music rows reliably sort above non-music rows in the
	//    candidate pool while still varying per click within their own group.
	const results = await elasticsearch.search<ContactDocument>({
		index: INDEX_NAME,
		size: Math.min(candidatePool, 2500),
		query: {
			function_score: {
				query: baseQuery,
				functions: [
					{ random_score: { seed, field: '_seq_no' } },
					...liveMusicFunctions,
				],
				score_mode: 'sum',
				boost_mode: 'replace',
			},
		},
		fields: [
			'contactId',
			'email',
			'firstName',
			'lastName',
			'company',
			'title',
			'headline',
			'city',
			'state',
			'country',
			'address',
			'website',
			'metadata',
			'companyFoundedYear',
			'companyType',
			'companyTechStack',
			'companyKeywords',
			'companyIndustry',
			'location',
			'coordinates',
		],
		_source: false,
	});

	const matches = results.hits.hits.slice(0, limit).map((hit) => ({
		id: hit._id,
		score: hit._score || 0,
		metadata: {
			contactId: hit.fields?.contactId?.[0],
			email: hit.fields?.email?.[0],
			firstName: hit.fields?.firstName?.[0] ?? null,
			lastName: hit.fields?.lastName?.[0] ?? null,
			company: hit.fields?.company?.[0],
			title: hit.fields?.title?.[0],
			headline: hit.fields?.headline?.[0],
			city: hit.fields?.city?.[0],
			state: hit.fields?.state?.[0],
			country: hit.fields?.country?.[0],
			address: hit.fields?.address?.[0],
			website: hit.fields?.website?.[0],
			metadata: hit.fields?.metadata?.[0],
			companyFoundedYear: hit.fields?.companyFoundedYear?.[0],
			companyType: hit.fields?.companyType?.[0],
			companyTechStack: hit.fields?.companyTechStack?.[0],
			companyKeywords: hit.fields?.companyKeywords?.[0],
			companyIndustry: hit.fields?.companyIndustry?.[0],
			location: hit.fields?.location?.[0],
			coordinates: hit.fields?.coordinates?.[0] || null,
		},
	}));

	return {
		matches,
		totalFound: matches.length,
		seed,
	};
};

// Cheap count of person-shaped (non-canonical-venue) docs whose `title`
// lexically matches the query. Used by the search route to detect when a
// short noun-led query like "professor" or "janitor" is actually a role —
// the noun-led person/loose hard-drop in scoring is too aggressive for
// those, so the route relaxes it when this count crosses a threshold. We
// exclude canonical venue titles via must_not prefix on `title.keyword`
// because docs like "Music Venues Pennsylvania" would otherwise muddy the
// signal whenever the query token coincidentally appears in metadata-derived
// title text. `operator: and` keeps multi-token queries strict.
export const countPersonTitleMatches = async (
	queryText: string,
	venueTitlePrefixes: readonly string[]
): Promise<number> => {
	const cleaned = queryText.trim();
	if (cleaned.length === 0) return 0;

	const mustNot = venueTitlePrefixes
		.map((p) => p.trim().toLowerCase())
		.filter((p) => p.length > 0)
		.map((p) => ({
			prefix: { 'title.keyword': { value: p, case_insensitive: true } },
		}));

	const result = await elasticsearch.count({
		index: INDEX_NAME,
		query: {
			bool: {
				must: [
					{
						match: {
							title: { query: cleaned, operator: 'and' },
						},
					},
				],
				must_not: mustNot,
			},
		},
	});
	return typeof result.count === 'number' ? result.count : 0;
};

// Debug function - only use in development
export const debugElasticsearch = async () => {
	if (process.env.NODE_ENV === 'production') {
		return { error: 'Debug function disabled in production' };
	}
	try {
		// Check if index exists
		const indexExists = await elasticsearch.indices.exists({ index: INDEX_NAME });
		console.log(`Index '${INDEX_NAME}' exists:`, indexExists);

		if (indexExists) {
			// Get document count
			const count = await elasticsearch.count({ index: INDEX_NAME });
			console.log(`Document count in '${INDEX_NAME}':`, count.count);

			// Get a sample document
			const sample = await elasticsearch.search({
				index: INDEX_NAME,
				size: 1,
				_source: true,
			});
			console.log('Sample document:', JSON.stringify(sample.hits.hits[0], null, 2));
		}

		return { indexExists, status: 'ok' };
	} catch (error) {
		const err = error as Error;
		console.error('Elasticsearch debug error:', err);
		return { error: err.message };
	}
};
