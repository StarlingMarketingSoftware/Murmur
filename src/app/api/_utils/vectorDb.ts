import { Contact } from '@prisma/client';
import { OpenAI } from 'openai';
import { Client, estypes } from '@elastic/elasticsearch';
import prisma from '@/lib/prisma';

type MappingProperty = estypes.MappingProperty;

const VECTOR_DIMENSION = 1536;
const INDEX_NAME = 'contacts';
const QUERY_EMBEDDING_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const QUERY_EMBEDDING_MAX_SIZE = 1000;

type QueryEmbeddingCacheEntry = {
	embedding: number[];
	timestamp: number;
};

const queryEmbeddingCache = new Map<string, QueryEmbeddingCacheEntry>();
const queryEmbeddingCacheStats = {
	hits: 0,
	misses: 0,
};

const openai = new OpenAI({
	apiKey: process.env.OPEN_AI_API_KEY!,
	timeout: 15000, // 15s client timeout so embedding calls fail fast
});

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

	const response = await openai.embeddings.create({
		input: contactText,
		model: 'text-embedding-3-small',
	});

	return response.data[0].embedding;
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

		const existingProperties = currentMapping[INDEX_NAME]?.mappings?.properties || {};

		const newFields = {
			companyType: { type: 'text' },
			companyTechStack: { type: 'text' },
			companyKeywords: { type: 'text' },
			companyIndustry: { type: 'text' },
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

let wasmScoreHitsPromise: Promise<WasmScoreHitsFunction | null> | null = null;

const getWasmScoreHitsFunction = async (): Promise<WasmScoreHitsFunction | null> => {
	if (process.env.USE_WASM_SCORER !== 'true') return null;
	if (!wasmScoreHitsPromise) {
		wasmScoreHitsPromise = import('../../../../rust-scorer/pkg-node')
			.catch(() => import('../../../../rust-scorer/pkg'))
			.then((module) => {
				const maybeScoreHits =
					(module as { score_hits?: unknown }).score_hits ||
					(module as { default?: { score_hits?: unknown } }).default?.score_hits;
				if (typeof maybeScoreHits !== 'function') {
					console.error('[vectorDb] score_hits export missing from rust-scorer pkg');
					return null;
				}
				return maybeScoreHits as WasmScoreHitsFunction;
			})
			.catch((error: unknown) => {
				console.error('[vectorDb] failed to load WASM scorer, using TypeScript fallback', error);
				return null;
			});
	}

	return wasmScoreHitsPromise;
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
			const response = await openai.embeddings.create({
				input: queryJson.restOfQuery,
				model: 'text-embedding-3-small',
			});
			queryEmbedding = response.data[0].embedding;
			setCachedQueryEmbedding(normalizedQueryEmbeddingKey, queryEmbedding);
			console.log(
				`[vectorDb] query embedding generated in ${Date.now() - embeddingStartMs}ms`
			);
		}
	} else {
		const response = await openai.embeddings.create({
			input: queryJson.restOfQuery,
			model: 'text-embedding-3-small',
		});
		queryEmbedding = response.data[0].embedding;
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
