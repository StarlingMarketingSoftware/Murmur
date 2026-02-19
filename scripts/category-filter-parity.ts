import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { filterItemsByTitlePrefixesTs } from '@/utils/categoryFilterWasm';

type WasmFilterItemsByTitlePrefixes = (
	items: unknown,
	prefixes: unknown,
	keepNullTitles: boolean
) => unknown;

function getWasmFilterFn(): WasmFilterItemsByTitlePrefixes {
	const require = createRequire(import.meta.url);
	const loaded = require(`${process.cwd()}/rust-scorer/pkg-node`) as
		| { filter_items_by_title_prefixes?: unknown; default?: unknown }
		| unknown;
	const maybeModule = (loaded as any).default ?? loaded;
	const fn = (maybeModule as any)?.filter_items_by_title_prefixes;
	assert.equal(
		typeof fn,
		'function',
		'Missing WASM export filter_items_by_title_prefixes. Did you run `npm run build:wasm:node`?'
	);
	return fn as WasmFilterItemsByTitlePrefixes;
}

function json(x: unknown): string {
	return JSON.stringify(x);
}

function runFixture(name: string, input: {
	items: unknown[];
	prefixes: string[];
	keepNullTitles: boolean;
}): void {
	const wasmFilter = getWasmFilterFn();
	const tsOut = filterItemsByTitlePrefixesTs(input.items, input.prefixes, {
		keepNullTitles: input.keepNullTitles,
	});
	const wasmOut = wasmFilter(input.items, input.prefixes, input.keepNullTitles);

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

function randInt(rng: () => number, min: number, maxInclusive: number): number {
	return Math.floor(rng() * (maxInclusive - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
	return arr[Math.floor(rng() * arr.length)]!;
}

function maybe<T>(rng: () => number, value: T): T | undefined {
	return rng() < 0.5 ? undefined : value;
}

function randWord(rng: () => number): string {
	const parts = [
		'Wineries',
		'Coffee Shops',
		'Music Venues',
		'Festivals',
		'Radio Stations',
		'owner',
		'marketing',
		'acme',
		'CA',
		'NY',
		'  ',
		'café',
	];
	const n = randInt(rng, 0, 4);
	const out: string[] = [];
	for (let i = 0; i < n; i++) out.push(pick(rng, parts));
	return out.join(rng() < 0.3 ? '   ' : ' ');
}

function randStringish(rng: () => number): string {
	const base = randWord(rng);
	const withCase = rng() < 0.5 ? base.toUpperCase() : base.toLowerCase();
	return rng() < 0.4 ? `  ${withCase}  ` : withCase;
}

function randTitleValue(rng: () => number): unknown {
	const kind = randInt(rng, 0, 6);
	switch (kind) {
		case 0:
			return randStringish(rng);
		case 1:
			return '';
		case 2:
			return '   ';
		case 3:
			return null;
		case 4:
			return undefined;
		case 5:
			return [maybe(rng, randStringish(rng)), null, maybe(rng, randStringish(rng))];
		default:
			return randInt(rng, -2, 5);
	}
}

function fuzzOnce(rng: () => number, idx: number): void {
	const itemsCount = randInt(rng, 0, 200);
	const items: any[] = [];

	for (let i = 0; i < itemsCount; i++) {
		const kind = randInt(rng, 0, 2);
		const base: any = { id: `item-${idx}-${i}` };

		if (kind === 0) {
			// Contact-like: title directly.
			base.title = randTitleValue(rng);
		} else if (kind === 1) {
			// ES-match-like: metadata.title.
			base.metadata = rng() < 0.1 ? null : { title: randTitleValue(rng) };
		} else {
			// Mixed: sometimes both.
			if (rng() < 0.7) base.title = randTitleValue(rng);
			base.metadata = rng() < 0.2 ? null : { title: randTitleValue(rng) };
		}

		items.push(base);
	}

	const prefixesCount = randInt(rng, 0, 8);
	const prefixes: string[] = [];
	for (let i = 0; i < prefixesCount; i++) {
		prefixes.push(randStringish(rng));
	}
	// Sprinkle some empty prefixes to ensure they are ignored.
	if (rng() < 0.3) prefixes.push('');
	if (rng() < 0.3) prefixes.push('   ');

	const keepNullTitles = rng() < 0.5;

	const wasmFilter = getWasmFilterFn();
	const tsOut = filterItemsByTitlePrefixesTs(items, prefixes, { keepNullTitles });
	const wasmOut = wasmFilter(items, prefixes, keepNullTitles);

	const tsJson = json(tsOut);
	const wasmJson = json(wasmOut);
	if (wasmJson !== tsJson) {
		console.error('Fuzz mismatch at iteration', idx);
		console.error('keepNullTitles', keepNullTitles);
		console.error('prefixes', prefixes);
		console.error('items', items);
		console.error('tsOut', tsOut);
		console.error('wasmOut', wasmOut);
		throw new Error('Fuzz mismatch');
	}
}

function main(): void {
	// Hand-written fixtures (edge cases + ordering)
	runFixture('basic contact title match (case-insensitive, trim)', {
		items: [
			{ id: 1, title: '  WINERIES California' },
			{ id: 2, title: 'Coffee Shops Oregon' },
			{ id: 3, title: 'Awesome Wineries (should NOT match)' },
		],
		prefixes: [' wineries '],
		keepNullTitles: false,
	});

	runFixture('multiple prefixes keep either', {
		items: [
			{ id: 1, title: 'Music Venues Maine' },
			{ id: 2, title: 'Coffee Shops Maine' },
			{ id: 3, title: 'Wineries Maine' },
		],
		prefixes: ['coffee shops', 'wineries'],
		keepNullTitles: false,
	});

	runFixture('missing titles kept when keepNullTitles=true', {
		items: [
			{ id: 1, title: null },
			{ id: 2, metadata: null },
			{ id: 3, metadata: { title: undefined } },
			{ id: 4, title: 'Wineries CA' },
		],
		prefixes: ['wineries'],
		keepNullTitles: true,
	});

	runFixture('missing titles dropped when keepNullTitles=false', {
		items: [
			{ id: 1, title: null },
			{ id: 2 },
			{ id: 3, metadata: { title: undefined } },
			{ id: 4, title: 'Wineries CA' },
		],
		prefixes: ['wineries'],
		keepNullTitles: false,
	});

	runFixture('metadata.title array semantics (first non-null entry)', {
		items: [
			{ id: 1, metadata: { title: [null, 'Wineries CA'] } },
			{ id: 2, metadata: { title: [undefined, null, 'Coffee Shops CA'] } },
			{ id: 3, metadata: { title: [null, '  WINERIES NY'] } },
		],
		prefixes: ['wineries'],
		keepNullTitles: false,
	});

	runFixture('direct title empty falls back to metadata.title', {
		items: [
			{ id: 1, title: '   ', metadata: { title: 'Wineries CA' } },
			{ id: 2, title: '', metadata: { title: 'Coffee Shops CA' } },
		],
		prefixes: ['wineries'],
		keepNullTitles: false,
	});

	runFixture('no usable prefixes => no filter (returns all)', {
		items: [{ id: 1, title: 'Wineries CA' }, { id: 2, title: null }],
		prefixes: ['   ', ''],
		keepNullTitles: false,
	});

	// Fuzz parity (keep small enough for CI/local runs)
	const seed = Number(process.env.SEED ?? 12345);
	const iterations = Number(process.env.ITERATIONS ?? 250);
	const rng = mulberry32(seed);

	for (let i = 0; i < iterations; i++) {
		fuzzOnce(rng, i);
	}

	console.log(`category-filter parity OK (fixtures + ${iterations} fuzz cases, seed=${seed})`);
}

main();

