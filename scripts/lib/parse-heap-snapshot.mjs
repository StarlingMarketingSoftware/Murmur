// Aggregate a V8 .heapsnapshot by (node type, constructor name) self_size.
// Standalone CLI so heavy JSON.parse never runs inside a measurement run:
//   node --max-old-space-size=8192 scripts/lib/parse-heap-snapshot.mjs <a.heapsnapshot> [<b.heapsnapshot>] [--top 40]
// With two files, prints the per-bucket DELTA (b - a) — the growth attribution.

import { readFileSync } from 'node:fs';

export function aggregateSnapshot(file) {
	const snap = JSON.parse(readFileSync(file, 'utf8'));
	const meta = snap.snapshot.meta;
	const nodeFields = meta.node_fields;
	const nodeTypes = meta.node_types[0];
	const stride = nodeFields.length;
	const typeIdx = nodeFields.indexOf('type');
	const nameIdx = nodeFields.indexOf('name');
	const sizeIdx = nodeFields.indexOf('self_size');
	const detachedIdx = nodeFields.indexOf('detachedness');
	const { nodes, strings } = snap;

	const buckets = new Map();
	const special = {
		stringsBytes: 0,
		stringsCount: 0,
		arrayBufferBytes: 0,
		codeBytes: 0,
		detachedBytes: 0,
		detachedCount: 0,
		totalBytes: 0,
		nodeCount: nodes.length / stride,
	};

	for (let i = 0; i < nodes.length; i += stride) {
		const type = nodeTypes[nodes[i + typeIdx]];
		const name = strings[nodes[i + nameIdx]];
		const size = nodes[i + sizeIdx];
		special.totalBytes += size;
		if (type === 'string' || type === 'concatenated string' || type === 'sliced string') {
			special.stringsBytes += size;
			special.stringsCount += 1;
			continue;
		}
		if (type === 'code') {
			special.codeBytes += size;
			continue;
		}
		// Backing stores are named "system / JSArrayBufferData" in V8 snapshots —
		// match by substring so the actual bytes (not just the wrapper objects) count.
		if (
			name === 'ArrayBuffer' ||
			(typeof name === 'string' && name.includes('JSArrayBufferData')) ||
			type === 'array buffer'
		) {
			special.arrayBufferBytes += size;
		}
		if (detachedIdx >= 0 && nodes[i + detachedIdx] === 2) {
			special.detachedBytes += size;
			special.detachedCount += 1;
		}
		const key = `${type}:${name}`;
		const b = buckets.get(key) ?? { bytes: 0, count: 0 };
		b.bytes += size;
		b.count += 1;
		buckets.set(key, b);
	}
	return { special, buckets };
}

function topEntries(buckets, top) {
	return [...buckets.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, top);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	// Collect file args, skipping flags AND their values (`--top 40`'s "40" must
	// not be mistaken for a second snapshot file).
	const argv = process.argv.slice(2);
	const args = [];
	let top = 40;
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--top') {
			top = Number(argv[++i]);
			continue;
		}
		if (argv[i].startsWith('--')) continue;
		args.push(argv[i]);
	}
	const mb = (b) => (b / 1048576).toFixed(2);
	if (!args.length) {
		console.error('usage: parse-heap-snapshot.mjs <a.heapsnapshot> [<b.heapsnapshot>] [--top 40]');
		process.exit(1);
	}
	const a = aggregateSnapshot(args[0]);
	if (args.length === 1) {
		console.log(`total ${mb(a.special.totalBytes)}MB  nodes ${a.special.nodeCount}`);
		console.log(
			`strings ${mb(a.special.stringsBytes)}MB (${a.special.stringsCount})  arrayBuffers ${mb(a.special.arrayBufferBytes)}MB  code ${mb(a.special.codeBytes)}MB  detached ${mb(a.special.detachedBytes)}MB (${a.special.detachedCount})`
		);
		for (const [k, v] of topEntries(a.buckets, top)) {
			console.log(`${mb(v.bytes).padStart(10)}MB  ${String(v.count).padStart(8)}  ${k}`);
		}
	} else {
		const b = aggregateSnapshot(args[1]);
		console.log(
			`total delta ${mb(b.special.totalBytes - a.special.totalBytes)}MB  strings delta ${mb(b.special.stringsBytes - a.special.stringsBytes)}MB  arrayBuffers delta ${mb(b.special.arrayBufferBytes - a.special.arrayBufferBytes)}MB  detached delta ${mb(b.special.detachedBytes - a.special.detachedBytes)}MB`
		);
		const keys = new Set([...a.buckets.keys(), ...b.buckets.keys()]);
		const deltas = [];
		for (const k of keys) {
			const av = a.buckets.get(k) ?? { bytes: 0, count: 0 };
			const bv = b.buckets.get(k) ?? { bytes: 0, count: 0 };
			deltas.push([k, { bytes: bv.bytes - av.bytes, count: bv.count - av.count }]);
		}
		deltas.sort((x, y) => Math.abs(y[1].bytes) - Math.abs(x[1].bytes));
		for (const [k, v] of deltas.slice(0, top)) {
			console.log(`${mb(v.bytes).padStart(10)}MB  ${String(v.count).padStart(8)}  ${k}`);
		}
	}
}
