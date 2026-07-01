// Side-by-side comparison of two longmix run JSONs (baseline vs fix).
// Usage: node scripts/compare-memory-runs.mjs <baseline.json> <fix.json>

import { readFileSync } from 'node:fs';

const [aFile, bFile] = process.argv.slice(2).filter((x) => !x.startsWith('--'));
if (!aFile || !bFile) {
	console.error('usage: compare-memory-runs.mjs <baseline.json> <fix.json>');
	process.exit(1);
}
const A = JSON.parse(readFileSync(aFile, 'utf8'));
const B = JSON.parse(readFileSync(bFile, 'utf8'));

const mb = (kb) => (kb == null ? '—' : String(Math.round(kb / 1024)));
const pct = (a, b) => (a && b ? ` (${(((b - a) / a) * 100).toFixed(0)}%)` : '');

console.log(`baseline: ${A.label} (${A.startedAt})`);
console.log(`fix:      ${B.label} (${B.startedAt})\n`);
console.log(
	'phase'.padEnd(20) +
		'M_user A→B MB'.padEnd(22) +
		'app A→B'.padEnd(18) +
		'gpuΔ A→B'.padEnd(16) +
		'heap A→B'.padEnd(16) +
		'RQovl A→B'
);
const phases = [...new Set([...A.samples.map((s) => s.phase), ...B.samples.map((s) => s.phase)])];
for (const p of phases) {
	const a = A.samples.find((s) => s.phase === p);
	const b = B.samples.find((s) => s.phase === p);
	if (!a && !b) continue;
	console.log(
		p.padEnd(20) +
			`${mb(a?.mUserKb)}→${mb(b?.mUserKb)}${pct(a?.mUserKb, b?.mUserKb)}`.padEnd(22) +
			`${mb(a?.appFootprintKb)}→${mb(b?.appFootprintKb)}`.padEnd(18) +
			`${mb(a?.gpuDeltaKb)}→${mb(b?.gpuDeltaKb)}`.padEnd(16) +
			`${a?.jsHeapUsedMb ?? '—'}→${b?.jsHeapUsedMb ?? '—'}`.padEnd(16) +
			`${a?.queryCache?.families?.overlay?.count ?? '—'}→${b?.queryCache?.families?.overlay?.count ?? '—'}`
	);
}
console.log(
	`\nGATES  baseline: avg ${A.gate?.avgMUserMb}MB peak ${A.gate?.peakMUserMb}MB | fix: avg ${B.gate?.avgMUserMb}MB peak ${B.gate?.peakMUserMb}MB`
);
const drop = (r, tag) => {
	const before = r.samples.find((s) => s.phase === 'final-idle');
	const after = r.samples.find((s) => s.phase === tag);
	if (!before || !after) return null;
	return { app: before.appFootprintKb - after.appFootprintKb, gpu: before.gpuDeltaKb - after.gpuDeltaKb };
};
for (const [name, r] of [['baseline', A], ['fix', B]]) {
	const d1 = drop(r, 'after-tile-drop');
	const d2 = drop(r, 'after-tile-drop-active');
	if (d1) console.log(`${name} tile-drop recovered: app ${mb(d1.app)}MB gpu ${mb(d1.gpu)}MB; +active: app ${mb(d2?.app)}MB gpu ${mb(d2?.gpu)}MB`);
}
// Worker heaps (fix runs only — added later).
for (const [name, r] of [['baseline', A], ['fix', B]]) {
	const withWorkers = r.samples.filter((s) => s.workers?.length);
	if (withWorkers.length) {
		const last = withWorkers[withWorkers.length - 1];
		console.log(`${name} final worker heaps: ${last.workers.map((w) => `${w.url ?? '?'}:${w.usedMb ?? '?'}MB`).join(' ')}`);
	}
}
// Net counters totals.
const netTotal = (r, cls) =>
	r.samples.reduce((acc, s) => acc + (s.netSincePrev?.[cls]?.count ?? 0), 0);
for (const cls of ['tiles', 'overlay', 'research', 'images', 'geo']) {
	console.log(`net ${cls}: ${netTotal(A, cls)} → ${netTotal(B, cls)}`);
}
