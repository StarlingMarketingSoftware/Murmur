import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import type { PostTrainingProfile } from '@/app/api/_utils/postTraining';
import {
	applyPostTrainingToEsMatchesTs,
	type VectorEsMatch,
} from '@/app/api/_utils/postTrainingApplyToEsMatches';

type WasmApplyPostTraining = (
	matches: unknown,
	profile: unknown,
	finalLimit: unknown
) => unknown;

function getWasmApplyFn(): WasmApplyPostTraining {
	const require = createRequire(import.meta.url);
	const loaded = require(`${process.cwd()}/rust-scorer/pkg-node`) as
		| { apply_post_training_to_es_matches?: unknown; default?: unknown }
		| unknown;
	const maybeModule = (loaded as any).default ?? loaded;
	const fn = (maybeModule as any)?.apply_post_training_to_es_matches;
	assert.equal(
		typeof fn,
		'function',
		'Missing WASM export apply_post_training_to_es_matches. Did you run `npm run build:wasm:node`?'
	);
	return fn as WasmApplyPostTraining;
}

function json(x: unknown): string {
	return JSON.stringify(x);
}

function m(
	id: string,
	metadata?: Record<string, unknown> | null,
	extra?: Record<string, unknown>
): VectorEsMatch {
	return {
		id,
		...(metadata !== undefined ? { metadata } : {}),
		...(extra ?? {}),
	};
}

function runFixture(name: string, input: {
	matches: VectorEsMatch[];
	profile: PostTrainingProfile;
	finalLimit: number;
}): void {
	const wasmApply = getWasmApplyFn();

	const tsOut = applyPostTrainingToEsMatchesTs(input.matches, input.profile, input.finalLimit);
	const wasmOut = wasmApply(input.matches, input.profile, input.finalLimit);

	const tsJson = json(tsOut);
	const wasmJson = json(wasmOut);
	assert.equal(wasmJson, tsJson, `Mismatch for fixture: ${name}`);
}

function mulberry32(seed: number): () => number {
	return () => {
		let t = (seed += 0x6d2b79f5);
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(rng: () => number, arr: T[]): T {
	return arr[Math.floor(rng() * arr.length)]!;
}

function maybe<T>(rng: () => number, value: T): T | undefined {
	return rng() < 0.5 ? undefined : value;
}

function randInt(rng: () => number, min: number, maxInclusive: number): number {
	return Math.floor(rng() * (maxInclusive - min + 1)) + min;
}

function randWord(rng: () => number): string {
	const parts = ['coffee', 'radio', 'bar', 'owner', 'marketing', 'acme', 'beta', 'gamma', 'café'];
	const n = randInt(rng, 0, 3);
	const out: string[] = [];
	for (let i = 0; i < n; i++) out.push(pick(rng, parts));
	return out.join(' ');
}

function randTerms(rng: () => number): string[] {
	const count = randInt(rng, 0, 4);
	const out: string[] = [];
	for (let i = 0; i < count; i++) out.push(randWord(rng));
	return out;
}

function randValue(rng: () => number): unknown {
	const kind = randInt(rng, 0, 5);
	switch (kind) {
		case 0:
			return randWord(rng);
		case 1:
			return randInt(rng, 0, 5);
		case 2:
			return rng() < 0.5;
		case 3:
			return null;
		case 4:
			return [maybe(rng, randWord(rng)), null, maybe(rng, randInt(rng, 0, 5))];
		default:
			return undefined;
	}
}

function fuzzOnce(rng: () => number, idx: number): void {
	const matchesCount = randInt(rng, 0, 50);
	const matches: VectorEsMatch[] = [];
	for (let i = 0; i < matchesCount; i++) {
		const id = rng() < 0.1 ? '' : `id-${randInt(rng, 0, 15)}`;
		const includeMetadata = rng() < 0.8;
		const metadata =
			!includeMetadata
				? undefined
				: rng() < 0.05
				? null
				: {
						contactId: rng() < 0.7 ? randInt(rng, 0, 10) : randValue(rng),
						company: randValue(rng),
						title: randValue(rng),
						headline: randValue(rng),
						website: randValue(rng),
						companyIndustry: randValue(rng),
						metadata: randValue(rng),
				  };
		matches.push(m(id, metadata as any, rng() < 0.2 ? { extraField: randWord(rng) } : undefined));
	}

	const profile: PostTrainingProfile = {
		active: true,
		excludeTerms: randTerms(rng),
		demoteTerms: randTerms(rng),
		requirePositive: rng() < 0.6,
		includeCompanyTerms: randTerms(rng),
		includeTitleTerms: randTerms(rng),
		includeWebsiteTerms: randTerms(rng),
		includeIndustryTerms: randTerms(rng),
		auxCompanyTerms: randTerms(rng),
		auxTitleTerms: randTerms(rng),
		auxWebsiteTerms: randTerms(rng),
		auxIndustryTerms: randTerms(rng),
	};

	const finalLimit = randInt(rng, 0, 25);

	const wasmApply = getWasmApplyFn();
	const tsOut = applyPostTrainingToEsMatchesTs(matches, profile, finalLimit);
	const wasmOut = wasmApply(matches, profile, finalLimit);

	const tsJson = json(tsOut);
	const wasmJson = json(wasmOut);
	if (wasmJson !== tsJson) {
		console.error('Fuzz mismatch at iteration', idx);
		console.error('profile', profile);
		console.error('finalLimit', finalLimit);
		console.error('matches', matches);
		console.error('tsOut', tsOut);
		console.error('wasmOut', wasmOut);
		throw new Error('Fuzz mismatch');
	}
}

function main(): void {
	// Representative fixtures
	runFixture('inactive profile passthrough', {
		matches: [
			m('a', { company: 'Radio Coffee', title: 'Owner', headline: 'Hello', contactId: 1 }),
			m('b', { company: 'Acme', title: 'CEO', headline: 'World', contactId: 2 }),
		],
		profile: { active: false, excludeTerms: ['radio'], demoteTerms: [] },
		finalLimit: 10,
	});

	runFixture('empty matches passthrough', {
		matches: [],
		profile: { active: true, excludeTerms: ['radio'], demoteTerms: [], requirePositive: true },
		finalLimit: 10,
	});

	runFixture('hard excludes only company/title/headline', {
		matches: [
			m('1', { company: 'College Radio Station', title: 'DJ', headline: '', contactId: 1 }),
			m('2', { company: 'Acme Coffee', title: 'Owner', headline: 'café', contactId: 2 }),
			m('3', { company: 'Acme', title: 'Radio Host', headline: 'Hello', contactId: 3 }),
		],
		profile: { active: true, excludeTerms: ['radio'], demoteTerms: [] },
		finalLimit: 10,
	});

	runFixture('requirePositive false => only hard-exclude + slice', {
		matches: [
			m('1', { company: 'Acme Coffee', title: 'Owner', headline: 'Hello', contactId: 1 }),
			m('2', { company: 'Beta Bar', title: 'Manager', headline: 'World', contactId: 2 }),
			m('3', { company: 'Gamma', title: 'Marketing', headline: 'Hello', contactId: 3 }),
		],
		profile: { active: true, excludeTerms: [], demoteTerms: [], requirePositive: false },
		finalLimit: 2,
	});

	runFixture('requirePositive true ordering + dedupe by contactId', {
		matches: [
			m('m1', { contactId: 'c1', company: 'Acme Coffee', title: 'Owner', headline: '' }),
			m('m2', { contactId: 'c2', company: 'Beta Bar', title: 'Manager', headline: '' }),
			m('m3', { contactId: 'c1', company: 'Acme Coffee', title: 'Owner', headline: 'dup' }),
			m('m4', null),
		],
		profile: {
			active: true,
			excludeTerms: [],
			demoteTerms: ['marketing'],
			requirePositive: true,
			includeCompanyTerms: ['coffee'],
			includeTitleTerms: ['owner'],
			auxCompanyTerms: ['bar'],
		},
		finalLimit: 10,
	});

	runFixture('metadataValue array semantics', {
		matches: [
			m('x', {
				contactId: 1,
				company: [undefined, null, 'Gamma 123'],
				title: [null, 'CEO'],
				headline: [undefined, ''],
			}),
		],
		profile: {
			active: true,
			excludeTerms: [],
			demoteTerms: [],
			requirePositive: true,
			includeCompanyTerms: ['123'],
		},
		finalLimit: 10,
	});

	runFixture('dedupe fallback to id when no contactId', {
		matches: [
			m('dup', { company: 'Acme Coffee', title: 'Owner', headline: 'Hello' }),
			m('dup', { company: 'Acme Coffee', title: 'Owner', headline: 'Hello again' }),
		],
		profile: {
			active: true,
			excludeTerms: [],
			demoteTerms: [],
			requirePositive: true,
			includeCompanyTerms: ['coffee'],
		},
		finalLimit: 10,
	});

	runFixture('empty key drops match in requirePositive mode', {
		matches: [m('', { company: 'Acme Coffee', title: 'Owner' }), m('ok', { company: 'Acme Coffee' })],
		profile: {
			active: true,
			excludeTerms: [],
			demoteTerms: [],
			requirePositive: true,
			includeCompanyTerms: ['coffee'],
		},
		finalLimit: 10,
	});

	// Fuzz parity (keep small enough for CI/local runs)
	const seed = Number(process.env.SEED ?? 12345);
	const iterations = Number(process.env.ITERATIONS ?? 200);
	const rng = mulberry32(seed);

	for (let i = 0; i < iterations; i++) {
		fuzzOnce(rng, i);
	}

	console.log(`post-training parity OK (fixtures + ${iterations} fuzz cases, seed=${seed})`);
}

main();

