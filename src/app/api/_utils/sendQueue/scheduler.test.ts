import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	computeSchedule,
	capDayOf,
	localMinutesOf,
	tzOffsetMinutesAt,
	localWallTimeToUtc,
	nextCapDay,
	DEFAULT_WEIGHT_PROFILE,
	SENDER_REF_TZ,
	WINDOW_START_MIN,
	WINDOW_END_MIN,
	PER_DAY_CAP,
	MIN_GAP_SECONDS,
	type ScheduleInput,
} from './scheduler';

const TZ = SENDER_REF_TZ;

// Deterministic RNG (mulberry32) so every test is reproducible.
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// "now" at a precise ET wall time on a given day.
const etNow = (day: string, wallMin: number) => localWallTimeToUtc(day, wallMin, TZ);

function run(overrides: Partial<ScheduleInput> & { countToSchedule: number; nowInstant: Date }) {
	return computeSchedule({ rng: seeded(42), ...overrides });
}

// ── Timezone helpers ─────────────────────────────────────────────────────────

test('tzOffsetMinutesAt: EST=-300 in winter, EDT=-240 in summer', () => {
	assert.equal(tzOffsetMinutesAt(new Date('2026-01-15T17:00:00Z'), TZ), -300);
	assert.equal(tzOffsetMinutesAt(new Date('2026-07-15T17:00:00Z'), TZ), -240);
});

test('capDayOf uses LOCAL date, not UTC date (late-evening ET rolls back a UTC day)', () => {
	// 2026-06-16T03:30Z = 2026-06-15 23:30 ET
	assert.equal(capDayOf(new Date('2026-06-16T03:30:00Z'), TZ), '2026-06-15');
});

test('localWallTimeToUtc round-trips through localMinutesOf and capDayOf (incl. DST days)', () => {
	for (const day of ['2026-06-15', '2026-03-08', '2026-11-01', '2026-12-31']) {
		for (const min of [WINDOW_START_MIN, 727, 1003, WINDOW_END_MIN - 5]) {
			const utc = localWallTimeToUtc(day, min, TZ);
			assert.equal(capDayOf(utc, TZ), day, `capDay ${day} @${min}`);
			assert.ok(Math.abs(localMinutesOf(utc, TZ) - min) < 1e-6, `min ${day} @${min}`);
		}
	}
});

test('nextCapDay increments calendar dates incl. month/year/DST boundaries', () => {
	assert.equal(nextCapDay('2026-06-15'), '2026-06-16');
	assert.equal(nextCapDay('2026-03-07'), '2026-03-08'); // spring-forward day
	assert.equal(nextCapDay('2026-10-31'), '2026-11-01'); // fall-back day
	assert.equal(nextCapDay('2026-12-31'), '2027-01-01');
});

// ── Shared invariant assertions ──────────────────────────────────────────────

function assertCoreInvariants(
	slots: { scheduledForUtc: Date; capDay: string }[],
	now: Date,
	opts?: { perDayCap?: number; already?: Map<string, number> },
) {
	const cap = opts?.perDayCap ?? PER_DAY_CAP;
	// I1 window bounds + I5 strictly future
	for (const s of slots) {
		const m = localMinutesOf(s.scheduledForUtc, TZ);
		assert.ok(m >= WINDOW_START_MIN && m < WINDOW_END_MIN, `in-window ${m}`);
		assert.ok(s.scheduledForUtc.getTime() > now.getTime(), 'strictly future');
		// I12 capDay consistency
		assert.equal(s.capDay, capDayOf(s.scheduledForUtc, TZ), 'capDay == capDayOf(utc)');
	}
	// I4 sorted + min-gap within a day
	for (let i = 1; i < slots.length; i++) {
		assert.ok(slots[i].scheduledForUtc.getTime() >= slots[i - 1].scheduledForUtc.getTime(), 'non-decreasing');
		if (slots[i].capDay === slots[i - 1].capDay) {
			const gap = (slots[i].scheduledForUtc.getTime() - slots[i - 1].scheduledForUtc.getTime()) / 1000;
			assert.ok(gap >= MIN_GAP_SECONDS - 1e-6, `min-gap ${gap}`);
		}
	}
	// I2 per-day cap (counting pre-existing)
	const perDay = new Map<string, number>();
	for (const s of slots) perDay.set(s.capDay, (perDay.get(s.capDay) ?? 0) + 1);
	for (const [day, n] of perDay) {
		const already = opts?.already?.get(day) ?? 0;
		assert.ok(n + already <= cap, `cap ${day}: ${n}+${already} <= ${cap}`);
	}
}

// ── Counts (I3) ──────────────────────────────────────────────────────────────

test('I3: output length equals countToSchedule for many sizes (incl. 0,1,boundary,large)', () => {
	const now = etNow('2026-06-15', 9 * 60); // before window → full first day
	for (const c of [0, 1, 2, 50, 99, 100, 101, 250, 1000]) {
		const slots = run({ countToSchedule: c, nowInstant: now });
		assert.equal(slots.length, c, `count ${c}`);
		assertCoreInvariants(slots, now);
	}
});

test('I3 large: count=10000 → exactly 10000 slots, ~100 days, invariants hold', () => {
	const now = etNow('2026-06-15', 9 * 60);
	const slots = run({ countToSchedule: 10000, nowInstant: now });
	assert.equal(slots.length, 10000);
	const days = new Set(slots.map((s) => s.capDay));
	assert.ok(days.size >= 100 && days.size <= 101, `~100 days got ${days.size}`);
	assertCoreInvariants(slots, now);
});

// ── Cap accounting (I2, I8) ──────────────────────────────────────────────────

test('I2: 250 sends never exceed 100 on any capDay', () => {
	const now = etNow('2026-06-15', 9 * 60);
	const slots = run({ countToSchedule: 250, nowInstant: now });
	assertCoreInvariants(slots, now);
	const days = [...new Set(slots.map((s) => s.capDay))];
	assert.equal(days.length, 3, '250/100 → 3 days');
});

test('I2: pre-existing alreadyCount leaves only the remaining capacity on that day', () => {
	const now = etNow('2026-06-15', 9 * 60);
	const today = '2026-06-15';
	const already = new Map([[today, 95]]);
	const slots = run({ countToSchedule: 50, nowInstant: now, alreadyCountByCapDay: already });
	const todayCount = slots.filter((s) => s.capDay === today).length;
	assert.equal(todayCount, 5, '95 already → only 5 today');
	assertCoreInvariants(slots, now, { already });
});

test('I8: a second batch fed the first batch counts fills the next free capacity, not from zero', () => {
	const now = etNow('2026-06-15', 9 * 60);
	const b1 = run({ countToSchedule: 100, nowInstant: now });
	const counts = new Map<string, number>();
	for (const s of b1) counts.set(s.capDay, (counts.get(s.capDay) ?? 0) + 1);
	const b2 = run({ countToSchedule: 100, nowInstant: now, alreadyCountByCapDay: counts });
	// Day fully consumed by batch 1 gets nothing from batch 2.
	for (const [day, n] of counts) {
		if (n >= PER_DAY_CAP) assert.equal(b2.filter((s) => s.capDay === day).length, 0, `full day ${day}`);
	}
	// Union never exceeds the cap on any day.
	const union = new Map(counts);
	for (const s of b2) union.set(s.capDay, (union.get(s.capDay) ?? 0) + 1);
	for (const [day, n] of union) assert.ok(n <= PER_DAY_CAP, `union cap ${day}=${n}`);
});

// ── Day span (I6) ────────────────────────────────────────────────────────────

test('I6: 1000 from window-open → exactly 10 days', () => {
	const now = etNow('2026-06-15', WINDOW_START_MIN - 60); // 10am, before window
	const slots = run({ countToSchedule: 1000, nowInstant: now });
	assert.equal(new Set(slots.map((s) => s.capDay)).size, 10);
	assertCoreInvariants(slots, now);
});

// ── Partial first day & strict-future boundaries (I5) ─────────────────────────

test('partial first day: enqueue mid-window only fills the remaining window today', () => {
	const now = etNow('2026-06-15', 18 * 60); // 6pm ET
	const slots = run({ countToSchedule: 200, nowInstant: now });
	const today = slots.filter((s) => s.capDay === '2026-06-15');
	for (const s of today) assert.ok(localMinutesOf(s.scheduledForUtc, TZ) > 18 * 60, 'after 6pm');
	assert.ok(today.length > 0 && today.length < 100, `partial today=${today.length}`);
	assertCoreInvariants(slots, now);
});

test('enqueue past 8pm rolls entirely to the next day', () => {
	const now = etNow('2026-06-15', 20 * 60 + 30); // 8:30pm ET
	const slots = run({ countToSchedule: 10, nowInstant: now });
	assert.ok(slots.every((s) => s.capDay === '2026-06-16'), 'all tomorrow');
	assertCoreInvariants(slots, now);
});

test('enqueue before 11am fills the same day starting at the window open', () => {
	const now = etNow('2026-06-15', 8 * 60); // 8am ET
	const slots = run({ countToSchedule: 10, nowInstant: now });
	assert.ok(slots.every((s) => s.capDay === '2026-06-15'), 'all today');
	for (const s of slots) assert.ok(localMinutesOf(s.scheduledForUtc, TZ) >= WINDOW_START_MIN);
	assertCoreInvariants(slots, now);
});

test('I5: now exactly on a bucket boundary inside the window → first slot strictly after now', () => {
	const now = etNow('2026-06-15', 12 * 60); // 12:00:00 ET exactly
	const slots = run({ countToSchedule: 5, nowInstant: now });
	assert.ok(slots[0].scheduledForUtc.getTime() > now.getTime(), 'strictly after');
	assert.ok(localMinutesOf(slots[0].scheduledForUtc, TZ) >= 12 * 60 + 5, 'next bucket');
	assertCoreInvariants(slots, now);
});

// ── DST transition days (I7) ─────────────────────────────────────────────────

test('I7 spring-forward: schedule spanning 2026-03-08 stays in-window with correct EST/EDT offsets', () => {
	const now = etNow('2026-03-07', 9 * 60);
	const slots = run({ countToSchedule: 300, nowInstant: now }); // 3 days, spans 3/7→3/9
	assertCoreInvariants(slots, now);
	const before = slots.find((s) => s.capDay === '2026-03-07')!;
	const after = slots.find((s) => s.capDay === '2026-03-09')!;
	assert.equal(tzOffsetMinutesAt(before.scheduledForUtc, TZ), -300, 'EST before');
	assert.equal(tzOffsetMinutesAt(after.scheduledForUtc, TZ), -240, 'EDT after');
});

test('I7 fall-back: schedule spanning 2026-11-01 stays in-window with correct EDT/EST offsets', () => {
	const now = etNow('2026-10-31', 9 * 60);
	const slots = run({ countToSchedule: 300, nowInstant: now });
	assertCoreInvariants(slots, now);
	const before = slots.find((s) => s.capDay === '2026-10-31')!;
	const after = slots.find((s) => s.capDay === '2026-11-02')!;
	assert.equal(tzOffsetMinutesAt(before.scheduledForUtc, TZ), -240, 'EDT before');
	assert.equal(tzOffsetMinutesAt(after.scheduledForUtc, TZ), -300, 'EST after');
});

// ── Determinism (I9) ─────────────────────────────────────────────────────────

test('I9: same seed → identical output; different seed → still valid', () => {
	const now = etNow('2026-06-15', 9 * 60);
	const a = computeSchedule({ countToSchedule: 100, nowInstant: now, rng: seeded(7) });
	const b = computeSchedule({ countToSchedule: 100, nowInstant: now, rng: seeded(7) });
	assert.deepEqual(
		a.map((s) => s.scheduledForUtc.getTime()),
		b.map((s) => s.scheduledForUtc.getTime()),
	);
	const c = computeSchedule({ countToSchedule: 100, nowInstant: now, rng: seeded(999) });
	assertCoreInvariants(c, now);
});

// ── Zero-weight fallback (I11) ───────────────────────────────────────────────

test('I11: an all-zero weight profile falls back to uniform — valid, no NaN', () => {
	const now = etNow('2026-06-15', 9 * 60);
	const zeroProfile = {
		version: 0,
		bucketMinutes: 5,
		bands: [{ startMin: WINDOW_START_MIN, endMin: WINDOW_END_MIN, weight: 0 }],
	};
	const slots = run({ countToSchedule: 50, nowInstant: now, weightProfile: zeroProfile });
	assert.equal(slots.length, 50);
	for (const s of slots) assert.ok(!Number.isNaN(s.scheduledForUtc.getTime()), 'no NaN');
	assertCoreInvariants(slots, now);
});

// ── Band bias (I10) ──────────────────────────────────────────────────────────

test('I10: default profile concentrates sends in the lunch & after-work peaks vs the edges', () => {
	const now = etNow('2026-06-15', 8 * 60); // before window → exactly 100 on a full day
	const slots = run({ countToSchedule: 100, nowInstant: now });
	const inBand = (lo: number, hi: number) =>
		slots.filter((s) => {
			const m = localMinutesOf(s.scheduledForUtc, TZ);
			return m >= lo && m < hi;
		}).length;
	const lunch = inBand(720, 810); // 12:00–1:30pm (weights 3.2/2.4)
	const afterWork = inBand(990, 1080); // 4:30–6:00pm (weight 3.0)
	const morningEdge = inBand(660, 720); // 11:00–12:00 (weight 1.4)
	const eveningEdge = inBand(1140, 1200); // 7:00–8:00 (weight 1.1)
	assert.ok(lunch > morningEdge, `lunch ${lunch} > morningEdge ${morningEdge}`);
	assert.ok(afterWork > eveningEdge, `afterWork ${afterWork} > eveningEdge ${eveningEdge}`);
	assert.equal(DEFAULT_WEIGHT_PROFILE.version, 1);
});

// ── Min-gap stress (R1 D4): tight gap must reduce per-day count, never overflow ──

test('R1-D4: a large min-gap reduces nToday and never violates window/gap', () => {
	const now = etNow('2026-06-15', 8 * 60);
	// 600s gap over a 540-min window = 32400s → floor(32400/600)+1 = 55 max/day.
	const slots = computeSchedule({ countToSchedule: 100, nowInstant: now, minGapSeconds: 600, rng: seeded(3) });
	assert.equal(slots.length, 100);
	const firstDay = slots.filter((s) => s.capDay === '2026-06-15').length;
	assert.ok(firstDay <= 55, `gap-limited first day ${firstDay} <= 55`);
	assertCoreInvariants(slots, now);
	// explicit gap check across the whole first day
	const day0 = slots.filter((s) => s.capDay === '2026-06-15');
	for (let i = 1; i < day0.length; i++) {
		const gap = (day0[i].scheduledForUtc.getTime() - day0[i - 1].scheduledForUtc.getTime()) / 1000;
		assert.ok(gap >= 600 - 1e-6, `600s gap held ${gap}`);
	}
});
