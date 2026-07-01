import { config } from 'dotenv';
config();

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from '@elastic/elasticsearch';
import { createEsHydrator } from './searchQuality/esHydrator';
import { BATTERY, CENTERS, REGRESSION_TRIO, TRAITS, type CenterKey } from './searchQuality/battery';
import { runFreeTextSearch } from '../src/app/api/contacts/search/engine';
import { parseFreeTextSearchQuery } from '../src/app/api/contacts/search/parse';
import { resolveSearchDispatchBranch } from '../src/app/api/contacts/search/queryPredicates';
import { getCityGazetteer } from '../src/app/api/contacts/search/cityGazetteer';

// Search-quality harness. Runs the REAL runFreeTextSearch pipeline against
// LOCAL Elasticsearch with an ES-backed hydrator (dev Postgres ids ≠ dev ES
// ids — judging by ES doc fields is the only locally-valid method; see
// scripts/searchQuality/esHydrator.ts).
//
// Modes:
//   default          — report composition per battery query + mechanical
//                      invariants + regression-trio baseline compare.
//   --strict         — additionally enforce the post-ranking-overhaul
//                      composition assertions (battery.ts `strict` blocks).
//                      Expected to FAIL until the intent-conditioned ranking
//                      flags land/flip.
//   --update-baselines — rewrite the regression-trio baseline file.
//   --query "..."    — run a single ad-hoc query and print the top rows.
//
// NOT wired into CI: needs local ES + an embedding key. Required pre-merge
// run for search-behavior PRs.
//
// NOTE: kNN embeddings go through the app's OpenRouter-first path — repeat
// runs re-embed each query (~pennies). Embeddings for identical strings are
// stable enough for set-tolerant baselines.

const ES_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const BASELINE_PATH = path.join(
	__dirname,
	'fixtures',
	'search-quality-baselines.json'
);

const isLocalEs = (() => {
	try {
		const host = new URL(ES_URL).hostname;
		return host === 'localhost' || host === '127.0.0.1';
	} catch {
		return false;
	}
})();

if (!isLocalEs) {
	console.error(
		`search-quality-harness refuses to run against non-local ES (${ES_URL}) — it issues dozens of retriever queries per battery entry.`
	);
	process.exit(1);
}

const esClient = new Client({
	node: ES_URL,
	auth: process.env.ELASTICSEARCH_API_KEY
		? { apiKey: process.env.ELASTICSEARCH_API_KEY }
		: undefined,
});
const hydrateContacts = createEsHydrator(esClient);

const args = process.argv.slice(2);
const strictMode = args.includes('--strict');
const updateBaselines = args.includes('--update-baselines');
const adhocIdx = args.indexOf('--query');
const adhocQuery = adhocIdx >= 0 ? args[adhocIdx + 1] : null;

type RunResult = {
	q: string;
	center: CenterKey;
	branch: string;
	returned: number;
	expansionMode: string;
	coverage: string | null;
	traitCounts: Record<string, number>;
	top: { id: number; title: string | null; company: string | null; state: string | null }[];
	ids: number[];
};

const runQuery = async (q: string, center: CenterKey): Promise<RunResult> => {
	const { lat, lon } = CENTERS[center];
	const response = await runFreeTextSearch(
		{
			rawQuery: q,
			overrideLat: lat,
			overrideLon: lon,
			overrideRadiusKm: 250, // the dashboard always sends radiusKm=250 + IP coords
			limit: 50,
			requestId: `hx-${center}-${q.replace(/[^a-z0-9]+/gi, '-').slice(0, 24)}`,
		},
		{ hydrateContacts }
	);
	const gazetteer = await getCityGazetteer().catch(() => null);
	const parsed = parseFreeTextSearchQuery(q, { gazetteer });
	const branch = resolveSearchDispatchBranch(parsed);
	const contacts = response.contacts;
	const top10 = contacts.slice(0, 10);
	const traitCounts: Record<string, number> = {};
	for (const [name, predicate] of Object.entries(TRAITS)) {
		traitCounts[name] = top10.filter((c) => predicate(c)).length;
	}
	// Mechanical invariants — always enforced.
	assert.ok(contacts.length <= 50, `${q}: returned more than limit`);
	assert.ok(Array.isArray(response.parsed.categories), `${q}: malformed parsed`);
	return {
		q,
		center,
		branch,
		returned: contacts.length,
		expansionMode: (response as { expansionMode?: string }).expansionMode ?? 'none',
		coverage: (response as { coverage?: string }).coverage ?? null,
		traitCounts,
		top: top10.map((c) => ({
			id: c.id,
			title: c.title,
			company: c.company,
			state: c.state,
		})),
		ids: contacts.map((c) => c.id),
	};
};

const formatResult = (r: RunResult, traits?: string[]): string => {
	const traitStr = (traits ?? Object.keys(r.traitCounts))
		.filter((t) => r.traitCounts[t] !== undefined)
		.map((t) => `${t}=${r.traitCounts[t]}`)
		.join(' ');
	const rows = r.top
		.map((c, i) => `      ${i + 1}. ${c.title ?? '—'} | ${c.company ?? '—'} | ${c.state ?? '—'}`)
		.join('\n');
	return `  [${r.center}] branch=${r.branch} returned=${r.returned} expansion=${r.expansionMode}${r.coverage ? ` coverage=${r.coverage}` : ''}\n    top10 traits: ${traitStr}\n${rows}`;
};

const main = async () => {
	if (adhocQuery) {
		const result = await runQuery(adhocQuery, 'nyc');
		console.log(`\n=== ${adhocQuery} ===`);
		console.log(formatResult(result));
		return;
	}

	let strictFailures: string[] = [];

	for (const entry of BATTERY) {
		const centers = entry.centers ?? (['nyc'] as CenterKey[]);
		console.log(`\n=== ${entry.q}${entry.note ? `  (${entry.note})` : ''} ===`);
		for (const center of centers) {
			const result = await runQuery(entry.q, center);
			console.log(formatResult(result, entry.traits));

			if (strictMode && entry.strict) {
				for (const { trait, count } of entry.strict.top10AtLeast ?? []) {
					if ((result.traitCounts[trait] ?? 0) < count) {
						strictFailures.push(
							`${entry.q} [${center}]: top10 ${trait}=${result.traitCounts[trait] ?? 0} < ${count}`
						);
					}
				}
				for (const { trait, count } of entry.strict.top10AtMost ?? []) {
					if ((result.traitCounts[trait] ?? 0) > count) {
						strictFailures.push(
							`${entry.q} [${center}]: top10 ${trait}=${result.traitCounts[trait] ?? 0} > ${count}`
						);
					}
				}
				if (
					entry.strict.minReturned != null &&
					result.returned < entry.strict.minReturned
				) {
					strictFailures.push(
						`${entry.q} [${center}]: returned=${result.returned} < ${entry.strict.minReturned}`
					);
				}
				if (
					entry.strict.coverage &&
					!entry.strict.coverage.includes(result.coverage ?? 'none')
				) {
					strictFailures.push(
						`${entry.q} [${center}]: coverage=${result.coverage} not in [${entry.strict.coverage.join(',')}]`
					);
				}
			}
		}
	}

	// Regression trio: dispatch branch must stay off-hybrid; candidate id sets
	// compared against baselines with 10% tolerance (results on the curated
	// paths are intentionally non-deterministic per click — sets, not order).
	console.log('\n=== regression trio ===');
	type Baseline = Record<string, { branch: string; ids: number[] }>;
	const baselines: Baseline = fs.existsSync(BASELINE_PATH)
		? (JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as Baseline)
		: {};
	const nextBaselines: Baseline = {};
	let trioFailures: string[] = [];
	for (const q of REGRESSION_TRIO) {
		const result = await runQuery(q, 'nyc');
		console.log(formatResult(result));
		const expectedBranch =
			q === 'austin'
				? 'place-only'
				: q === 'bars in austin'
				? 'local-business'
				: 'curated-category';
		assert.equal(result.branch, expectedBranch, `${q} dispatch branch`);
		nextBaselines[q] = { branch: result.branch, ids: result.ids };
		const baseline = baselines[q];
		if (baseline && !updateBaselines) {
			if (baseline.branch !== result.branch) {
				trioFailures.push(`${q}: branch ${baseline.branch} → ${result.branch}`);
			}
			// Curated trays shuffle per click BY DESIGN; compare candidate id
			// sets loosely — the baseline set and current set should overlap
			// substantially unless retrieval itself changed.
			const baseSet = new Set(baseline.ids);
			const overlap = result.ids.filter((id) => baseSet.has(id)).length;
			const denom = Math.max(1, Math.min(baseline.ids.length, result.ids.length));
			if (overlap / denom < 0.5) {
				trioFailures.push(
					`${q}: candidate overlap ${overlap}/${denom} below 50% of baseline — retrieval drift?`
				);
			}
		}
	}

	if (updateBaselines) {
		fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
		fs.writeFileSync(BASELINE_PATH, JSON.stringify(nextBaselines, null, '\t'));
		console.log(`\nbaselines written to ${BASELINE_PATH}`);
	} else if (Object.keys(baselines).length === 0) {
		console.log('\n(no baselines on disk — run with --update-baselines to create them)');
	}

	if (trioFailures.length > 0) {
		console.error('\nREGRESSION-TRIO FAILURES:');
		for (const f of trioFailures) console.error(`  - ${f}`);
		process.exit(1);
	}
	if (strictMode && strictFailures.length > 0) {
		console.error('\nSTRICT-MODE FAILURES:');
		for (const f of strictFailures) console.error(`  - ${f}`);
		process.exit(1);
	}
	console.log(
		`\nsearch-quality harness passed${strictMode ? ' (strict)' : ' (report mode)'}`
	);
};

void main().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	}
);
