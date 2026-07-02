// Parse a Chrome memory-infra trace (as captured by memharness.memoryInfraDump)
// into a per-process allocator table. Answers "JS heap vs canvas backing stores
// vs decoded images vs WebGL buffers" — the split ps/rss can't see.
//
// CLI: node scripts/lib/parse-memory-infra.mjs <events.json> [--min-mb 5]

import { readFileSync } from 'node:fs';

// Allocator paths are hierarchical and parents usually carry their own `size`
// attr that already aggregates children — so summarize at the top level, with
// a curated set of informative second-level breakouts.
const SECOND_LEVEL_OF_INTEREST = new Set([
	'v8/main',
	'v8/workers',
	'malloc/allocated_objects',
	'web_cache/Image_resources',
	'web_cache/Encoded_size_duplicated_in_data_urls',
	'canvas/ResourceProvider',
	'cc/tile_memory',
	'gpu/gl',
	'gpu/shared_images',
	'gpu/gr_shader_cache',
	'gpu/transfer_cache',
	'skia/gpu_resources',
	'skia/sk_glyph_cache',
	'blink_gc/main',
	'partition_alloc/allocated_objects',
]);

function attrBytes(dump) {
	const attrs = dump && dump.attrs;
	if (!attrs) return null;
	const a = attrs.effective_size ?? attrs.size;
	if (!a) return null;
	const v = a.value;
	if (typeof v === 'number') return v;
	if (typeof v === 'string') return parseInt(v, 16);
	return null;
}

export function summarizeMemoryInfra(events) {
	const processNames = new Map();
	const processLabels = new Map();
	const perPid = new Map();

	for (const e of events) {
		if (e.cat === '__metadata' && e.name === 'process_name') {
			processNames.set(e.pid, e.args?.name);
		}
		if (e.cat === '__metadata' && e.name === 'process_labels') {
			processLabels.set(e.pid, e.args?.labels);
		}
		if (e.ph !== 'v') continue;
		const allocators = e.args?.dumps?.allocators;
		const totals = e.args?.dumps?.process_totals;
		// A trace can contain several dumps per pid (periodic + explicit). Each 'v'
		// event is one complete dump for one process — never sum across them; keep
		// exactly one per pid, preferring detailed dumps, then the latest timestamp.
		const isDetailed = (e.args?.dumps?.level_of_detail ?? 'detailed') === 'detailed';
		const prev = perPid.get(e.pid);
		if (prev) {
			if (prev.isDetailed && !isDetailed) continue;
			if (prev.isDetailed === isDetailed && (e.ts ?? 0) < prev.ts) continue;
		}
		const entry = { topLevel: {}, detail: {}, totals: {}, isDetailed, ts: e.ts ?? 0 };
		if (totals) {
			entry.totals.residentBytes =
				typeof totals.resident_set_bytes === 'string'
					? parseInt(totals.resident_set_bytes, 16)
					: (totals.resident_set_bytes ?? null);
			if (totals.private_footprint_bytes !== undefined) {
				entry.totals.privateFootprintBytes =
					typeof totals.private_footprint_bytes === 'string'
						? parseInt(totals.private_footprint_bytes, 16)
						: totals.private_footprint_bytes;
			}
		}
		if (allocators) {
			for (const [p, dump] of Object.entries(allocators)) {
				const bytes = attrBytes(dump);
				if (bytes === null) continue;
				const segs = p.split('/');
				if (segs.length === 1) entry.topLevel[p] = (entry.topLevel[p] ?? 0) + bytes;
				const two = segs.slice(0, 2).join('/');
				if (segs.length === 2 && SECOND_LEVEL_OF_INTEREST.has(two)) {
					entry.detail[two] = (entry.detail[two] ?? 0) + bytes;
				}
			}
		}
		perPid.set(e.pid, entry);
	}

	const rows = [];
	for (const [pid, entry] of perPid) {
		rows.push({
			pid,
			name: processNames.get(pid) ?? null,
			labels: processLabels.get(pid) ?? null,
			totals: entry.totals,
			topLevel: entry.topLevel,
			detail: entry.detail,
		});
	}
	rows.sort((a, b) => (b.totals.privateFootprintBytes ?? b.totals.residentBytes ?? 0) - (a.totals.privateFootprintBytes ?? a.totals.residentBytes ?? 0));
	return rows;
}

export function formatSummary(rows, { minMb = 5 } = {}) {
	const mb = (b) => (b / 1048576).toFixed(1);
	const lines = [];
	for (const r of rows) {
		const foot = r.totals.privateFootprintBytes ?? r.totals.residentBytes;
		lines.push(
			`pid ${r.pid} ${r.name ?? '?'}${r.labels ? ` [${r.labels}]` : ''} — footprint ${foot ? mb(foot) : '?'}MB`
		);
		const entries = [
			...Object.entries(r.topLevel).map(([k, v]) => [k, v]),
			...Object.entries(r.detail).map(([k, v]) => [`  ${k}`, v]),
		]
			.filter(([, v]) => v >= minMb * 1048576)
			.sort((a, b) => b[1] - a[1]);
		for (const [k, v] of entries) lines.push(`    ${k.trim().padEnd(42)} ${mb(v).padStart(9)}MB`);
	}
	return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const file = process.argv[2];
	if (!file) {
		console.error('usage: node scripts/lib/parse-memory-infra.mjs <events.json> [--min-mb 5]');
		process.exit(1);
	}
	const minIdx = process.argv.indexOf('--min-mb');
	const minMb = minIdx >= 0 ? Number(process.argv[minIdx + 1]) : 5;
	const events = JSON.parse(readFileSync(file, 'utf8'));
	console.log(formatSummary(summarizeMemoryInfra(events), { minMb }));
}
