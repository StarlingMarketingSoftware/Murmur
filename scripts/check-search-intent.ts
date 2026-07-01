import { config } from 'dotenv';
config();

import assert from 'node:assert/strict';
import {
	deriveDeterministicIntent,
	getQueryIntent,
	intentIsActionable,
	intentOverridesCategory,
	normalizeIntentKey,
	parseLlmIntent,
} from '../src/app/api/contacts/search/queryUnderstanding';

// CI-deterministic checks for the query-understanding layer: recorded LLM
// outputs, malformed-output fallback, timeout fallback, cache-key
// normalization. NO network, NO Elasticsearch, NO real LLM — the llmFetch and
// probeFn seams are injected. (Note: importing queryUnderstanding constructs
// the Prisma client, but skipCaches keeps every code path DB-free.)

const run = async () => {
	// ------------------------------------------------------------------
	// parseLlmIntent: recorded good outputs
	// ------------------------------------------------------------------
	{
		const raw = JSON.stringify({
			targetKind: 'person-role',
			personRole: {
				canonicalRole: 'professor',
				domain: 'Music',
				roleSynonyms: ['Faculty', 'lecturer', 'instructor', 'professor emeritus', 'EXTRA-BEYOND-CAP'],
				domainSynonyms: ['musicology', 'music theory'],
			},
			orgType: null,
			expandedPhrases: ['professor of music', 'music professor'],
			embedText: 'professor of music, university music faculty',
			localityBias: 'either',
			confidence: 0.95,
		});
		const intent = parseLlmIntent(raw, {
			restOfQuery: 'professor of music',
			categories: [],
		});
		assert.ok(intent, 'valid person-role output parses');
		assert.equal(intent.targetKind, 'person-role');
		assert.equal(intent.personRole?.canonicalRole, 'professor');
		assert.equal(intent.personRole?.domain, 'music', 'domain lowercased');
		assert.equal(
			intent.personRole?.roleSynonyms.length,
			4,
			'role synonyms capped at 4'
		);
		assert.ok(intentIsActionable(intent));
		assert.equal(intent.source, 'llm');
	}

	{
		const raw = JSON.stringify({
			targetKind: 'org-type',
			personRole: null,
			orgType: {
				key: 'record-label',
				label: 'record label',
				industryTerms: ['record label', 'records', 'music'],
			},
			expandedPhrases: ['record label', 'record labels'],
			embedText: 'record label, independent music label, A&R',
			localityBias: 'national',
			confidence: 0.95,
		});
		const intent = parseLlmIntent(raw, {
			restOfQuery: 'record label',
			categories: [],
		});
		assert.ok(intent);
		assert.equal(intent.targetKind, 'org-type');
		assert.equal(intent.orgType?.key, 'record-label');
		assert.equal(intent.localityBias, 'national');
	}

	// Unknown org key coerces to null (generic org), not a failure.
	{
		const raw = JSON.stringify({
			targetKind: 'org-type',
			orgType: {
				key: 'made-up-vertical',
				label: 'coffee roaster',
				industryTerms: ['coffee', 'roastery'],
			},
			expandedPhrases: ['coffee roaster'],
			embedText: 'coffee roaster, roastery',
			localityBias: 'local-first',
			confidence: 0.8,
		});
		const intent = parseLlmIntent(raw, {
			restOfQuery: 'roaster',
			categories: ['Coffee Shops'],
		});
		assert.ok(intent);
		assert.equal(intent.orgType?.key, null, 'unknown org key coerced to null');
		assert.equal(intent.orgType?.label, 'coffee roaster');
		assert.ok(
			intentOverridesCategory(intent, ['Coffee Shops']),
			'org-type intent overrides the incidental parsed category'
		);
	}

	// Bad enum / cross-field incoherence / malformed JSON → null.
	assert.equal(
		parseLlmIntent(
			JSON.stringify({ targetKind: 'nonsense', embedText: 'x' }),
			{ restOfQuery: 'x', categories: [] }
		),
		null,
		'unknown targetKind rejected'
	);
	assert.equal(
		parseLlmIntent(
			JSON.stringify({ targetKind: 'person-role', personRole: null, embedText: 'x' }),
			{ restOfQuery: 'x', categories: [] }
		),
		null,
		'person-role without personRole payload rejected'
	);
	assert.equal(
		parseLlmIntent('{not json', { restOfQuery: 'x', categories: [] }),
		null,
		'malformed JSON rejected'
	);

	// Vibe/venue targets do not override categories.
	{
		const raw = JSON.stringify({
			targetKind: 'venue-category',
			expandedPhrases: ['italian deli'],
			embedText: 'italian deli, delicatessen',
			localityBias: 'local-first',
			confidence: 0.85,
		});
		const intent = parseLlmIntent(raw, {
			restOfQuery: 'italian deli',
			categories: [],
		});
		assert.ok(intent);
		assert.ok(intentIsActionable(intent));
		assert.equal(intentOverridesCategory(intent, ['Restaurants']), false);
	}

	// ------------------------------------------------------------------
	// deriveDeterministicIntent (fallback)
	// ------------------------------------------------------------------
	{
		const org = deriveDeterministicIntent(
			{ restOfQuery: 'record labels', categories: [] },
			0
		);
		assert.equal(org.targetKind, 'org-type');
		assert.equal(org.orgType?.key, 'record-label');
		assert.equal(org.source, 'fallback');
		assert.ok(intentIsActionable(org));

		const person = deriveDeterministicIntent(
			{ restOfQuery: 'professor', categories: [] },
			4974
		);
		assert.equal(person.targetKind, 'person-role');
		assert.equal(person.personRole?.canonicalRole, 'professor');

		const belowThreshold = deriveDeterministicIntent(
			{ restOfQuery: 'deli', categories: [] },
			2
		);
		assert.equal(belowThreshold.targetKind, 'ambiguous');
		assert.equal(
			intentIsActionable(belowThreshold),
			false,
			'ambiguous fallback is NOT actionable — downstream behaves like today'
		);
	}

	// ------------------------------------------------------------------
	// getQueryIntent orchestration with injected seams (no network/caches)
	// ------------------------------------------------------------------
	{
		// LLM timeout → deterministic fallback via the probe.
		const timeoutResolution = await getQueryIntent(
			{ restOfQuery: 'janitor', categories: [] },
			{
				skipCaches: true,
				probeFn: async () => 1,
				llmFetch: async () => {
					throw new Error('simulated timeout');
				},
			}
		);
		assert.equal(timeoutResolution.intent.source, 'fallback');
		assert.equal(timeoutResolution.intent.targetKind, 'ambiguous');
		assert.equal(timeoutResolution.personProbeCount, 1);

		// LLM garbage → fallback; probe ≥ threshold → person-role fallback.
		const garbageResolution = await getQueryIntent(
			{ restOfQuery: 'professor', categories: [] },
			{
				skipCaches: true,
				probeFn: async () => 4974,
				llmFetch: async () => ({
					raw: 'certainly! here is some prose, not JSON',
					model: 'test-model',
				}),
			}
		);
		assert.equal(garbageResolution.intent.source, 'fallback');
		assert.equal(garbageResolution.intent.targetKind, 'person-role');

		// Healthy LLM output rides through — fenced/wrapped JSON tolerated
		// (the Gemini rung has no json_object mode).
		const healthyResolution = await getQueryIntent(
			{ restOfQuery: 'music magazine', categories: [] },
			{
				skipCaches: true,
				probeFn: async () => 0,
				llmFetch: async () => ({
					raw:
						'```json\n' +
						JSON.stringify({
							targetKind: 'org-type',
							orgType: {
								key: 'magazine-press',
								label: 'music magazine',
								industryTerms: ['magazine', 'publishing'],
							},
							expandedPhrases: ['music magazine'],
							embedText: 'music magazine, music journalism',
							localityBias: 'national',
							confidence: 0.9,
						}) +
						'\n```',
					model: 'test-model',
				}),
			}
		);
		assert.equal(healthyResolution.intent.source, 'llm');
		assert.equal(healthyResolution.intent.orgType?.key, 'magazine-press');
	}

	// ------------------------------------------------------------------
	// Cache-key normalization
	// ------------------------------------------------------------------
	assert.equal(
		normalizeIntentKey('  Professor   of MUSIC ', []),
		normalizeIntentKey('professor of music', [])
	);
	assert.equal(
		normalizeIntentKey('roaster', ['Coffee Shops']),
		'roaster|Coffee Shops'
	);
	assert.notEqual(
		normalizeIntentKey('roaster', ['Coffee Shops']),
		normalizeIntentKey('roaster', [])
	);

	console.log('search-intent checks passed');
};

void run().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	}
);
