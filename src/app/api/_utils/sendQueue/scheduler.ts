// Pure, deterministic scheduler for the intelligent async email send queue.
//
// Given a count of cold emails to send (plus what's already scheduled per day),
// it produces evenly-but-randomly spread UTC send instants inside a single
// daytime window — v1: 11:00am–8:00pm Eastern (= 8am–5pm Pacific), which keeps
// every US-continental recipient inside business hours — biased toward lunch and
// late-afternoon, capped at 100/sender/day, with a minimum gap between sends.
//
// Zero I/O, zero Prisma: clock + RNG are injected so the whole thing is unit-
// testable and adversarially verifiable. All the correctness lives here.

export const SENDER_REF_TZ = 'America/New_York';
export const WINDOW_START_MIN = 11 * 60; // 11:00am ET, minutes from local midnight
export const WINDOW_END_MIN = 20 * 60; // 8:00pm ET (exclusive)
export const PER_DAY_CAP = 100;
export const MIN_GAP_SECONDS = 90;
export const BUCKET_MINUTES = 5;

export type WeightBand = { startMin: number; endMin: number; weight: number };
export type WeightProfile = { version: number; bucketMinutes: number; bands: WeightBand[] };

// Tunable density curve (minutes-from-ET-midnight → relative weight). Low at the
// 11am/8pm edges, a lunch peak (~12–1:30pm ET = late-morning out west) and a
// secondary late-afternoon lift (~4:30–6pm ET = midday Pacific). Bump `version`
// when retuning; it is stamped onto each schedule for forensics.
export const DEFAULT_WEIGHT_PROFILE: WeightProfile = {
	version: 1,
	bucketMinutes: BUCKET_MINUTES,
	bands: [
		{ startMin: 660, endMin: 720, weight: 1.4 }, // 11:00–12:00  ramp in
		{ startMin: 720, endMin: 780, weight: 3.2 }, // 12:00–1:00   ← lunch peak
		{ startMin: 780, endMin: 810, weight: 2.4 }, // 1:00–1:30    lunch tail
		{ startMin: 810, endMin: 930, weight: 1.5 }, // 1:30–3:30    afternoon dip
		{ startMin: 930, endMin: 990, weight: 2.2 }, // 3:30–4:30    mid-afternoon
		{ startMin: 990, endMin: 1080, weight: 3.0 }, // 4:30–6:00   ← after-work peak
		{ startMin: 1080, endMin: 1140, weight: 1.8 }, // 6:00–7:00  evening taper
		{ startMin: 1140, endMin: 1200, weight: 1.1 }, // 7:00–8:00  low at the edge
	],
};

export type ScheduleInput = {
	countToSchedule: number;
	nowInstant: Date; // UTC "now"
	tz?: string; // sender reference tz (default ET)
	perDayCap?: number;
	windowStartMin?: number;
	windowEndMin?: number;
	weightProfile?: WeightProfile;
	minGapSeconds?: number;
	// capDay ('YYYY-MM-DD' in `tz`) → count of slot-consuming rows already on that day.
	alreadyCountByCapDay?: Map<string, number>;
	rng?: () => number; // [0,1); inject a seeded RNG in tests
};

export type ScheduledSlot = { scheduledForUtc: Date; capDay: string };

// ── Intl-based timezone helpers (no IANA tz library available) ───────────────

const _formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
	let f = _formatterCache.get(tz);
	if (!f) {
		f = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
		_formatterCache.set(tz, f);
	}
	return f;
}

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };
function partsInTz(utc: Date, tz: string): LocalParts {
	const map: Record<string, string> = {};
	for (const p of formatter(tz).formatToParts(utc)) {
		if (p.type !== 'literal') map[p.type] = p.value;
	}
	return {
		year: Number(map.year),
		month: Number(map.month),
		day: Number(map.day),
		// Intl can emit '24' for midnight under h23 in some engines; normalize to 0.
		hour: Number(map.hour) % 24,
		minute: Number(map.minute),
		second: Number(map.second),
	};
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day ('YYYY-MM-DD') of a UTC instant in `tz`. The canonical capDay. */
export function capDayOf(utc: Date, tz: string = SENDER_REF_TZ): string {
	const p = partsInTz(utc, tz);
	return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes from local midnight of a UTC instant in `tz`. */
export function localMinutesOf(utc: Date, tz: string = SENDER_REF_TZ): number {
	const p = partsInTz(utc, tz);
	return p.hour * 60 + p.minute + p.second / 60;
}

/** Offset (minutes) that `tz` has at a given UTC instant: localWall − utc. */
export function tzOffsetMinutesAt(utc: Date, tz: string = SENDER_REF_TZ): number {
	const p = partsInTz(utc, tz);
	const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
	return Math.round((asIfUtc - utc.getTime()) / 60000);
}

/**
 * UTC instant whose wall-clock in `tz` on calendar day `localDay` is `wallMinutes`
 * (fractional minutes allowed). DST-correct via the standard two-step offset
 * inversion. Our windows (11am–8pm) never touch the 2am DST gap, so this is exact.
 */
export function localWallTimeToUtc(localDay: string, wallMinutes: number, tz: string = SENDER_REF_TZ): Date {
	const [y, mo, d] = localDay.split('-').map(Number);
	const totalSec = Math.round(wallMinutes * 60);
	const h = Math.floor(totalSec / 3600);
	const mi = Math.floor((totalSec % 3600) / 60);
	const s = totalSec % 60;
	const naiveUtc = Date.UTC(y, mo - 1, d, h, mi, s);
	const off1 = tzOffsetMinutesAt(new Date(naiveUtc), tz);
	let guess = naiveUtc - off1 * 60000;
	const off2 = tzOffsetMinutesAt(new Date(guess), tz);
	if (off2 !== off1) guess = naiveUtc - off2 * 60000;
	return new Date(guess);
}

/** Next calendar day label. Pure date arithmetic on the 'YYYY-MM-DD' string (no tz/DST). */
export function nextCapDay(localDay: string): string {
	const [y, mo, d] = localDay.split('-').map(Number);
	const dt = new Date(Date.UTC(y, mo - 1, d));
	dt.setUTCDate(dt.getUTCDate() + 1);
	return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

const ceilToBucket = (min: number, bucket: number) => Math.ceil(min / bucket) * bucket;

// ── CDF over the (possibly restricted) window ────────────────────────────────

type Bucket = { startMin: number; weight: number };

function weightAt(profile: WeightProfile, minute: number): number {
	for (const b of profile.bands) {
		if (minute >= b.startMin && minute < b.endMin) return Math.max(0, b.weight);
	}
	return 0;
}

/** Inverse-CDF sampler restricted to [startMin, endMin). Returns a bucket-start minute. */
function makeInverter(
	profile: WeightProfile,
	startMin: number,
	endMin: number,
	bucketMin: number,
): (u: number) => number {
	const buckets: Bucket[] = [];
	for (let m = startMin; m < endMin; m += bucketMin) {
		const mid = m + bucketMin / 2;
		buckets.push({ startMin: m, weight: weightAt(profile, mid) });
	}
	let total = buckets.reduce((s, b) => s + b.weight, 0);
	// Empty/zero-weight (globally or in this restricted sub-window) → uniform.
	const uniform = total <= 0;
	const eff = buckets.map((b) => (uniform ? 1 : b.weight));
	total = uniform ? buckets.length : total;
	const cum: number[] = [];
	let acc = 0;
	for (const w of eff) {
		acc += w;
		cum.push(acc);
	}
	return (u: number) => {
		const target = u * total; // u ∈ [0,1)
		for (let i = 0; i < cum.length; i++) if (target < cum[i]) return buckets[i].startMin;
		return buckets[buckets.length - 1].startMin;
	};
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Compute UTC send instants for `countToSchedule` cold emails. Output length is
 * exactly `countToSchedule`, globally non-decreasing, every slot inside the local
 * window, ≤ perDayCap per capDay (counting `alreadyCountByCapDay`), ≥ minGap
 * apart within a day, strictly after `nowInstant`, and `capDay === capDayOf(utc)`.
 */
export function computeSchedule(input: ScheduleInput): ScheduledSlot[] {
	const {
		countToSchedule,
		nowInstant,
		tz = SENDER_REF_TZ,
		perDayCap = PER_DAY_CAP,
		windowStartMin = WINDOW_START_MIN,
		windowEndMin = WINDOW_END_MIN,
		weightProfile = DEFAULT_WEIGHT_PROFILE,
		minGapSeconds = MIN_GAP_SECONDS,
		alreadyCountByCapDay,
		rng = Math.random,
	} = input;

	if (!Number.isFinite(countToSchedule) || countToSchedule <= 0) return [];
	if (windowStartMin >= windowEndMin) throw new Error('windowStartMin must be < windowEndMin');
	if (perDayCap < 1) throw new Error('perDayCap must be >= 1');
	if (minGapSeconds < 0) throw new Error('minGapSeconds must be >= 0');

	const bucketMin = weightProfile.bucketMinutes || BUCKET_MINUTES;
	const out: ScheduledSlot[] = [];
	let remaining = countToSchedule;

	// First usable day = the LOCAL date of "now" in tz (never the UTC date).
	let capDay = capDayOf(nowInstant, tz);
	const nowLocalMin = localMinutesOf(nowInstant, tz);
	// Strict-future floor for the first day: next bucket strictly after now.
	let firstDayFloor = Math.max(windowStartMin, ceilToBucket(Math.floor(nowLocalMin) + 1, bucketMin));

	let guard = 0;
	while (remaining > 0) {
		if (++guard > 100000) throw new Error('computeSchedule: day loop did not converge');

		const isFirstDay = capDay === capDayOf(nowInstant, tz) && out.length === 0 && firstDayFloor > windowStartMin;
		const dayStartMin = isFirstDay ? firstDayFloor : windowStartMin;
		const dayEndMin = windowEndMin;

		// Today already past the window (or < 1 bucket left) → roll to next day.
		if (dayStartMin >= dayEndMin) {
			capDay = nextCapDay(capDay);
			firstDayFloor = windowStartMin;
			continue;
		}

		const already = alreadyCountByCapDay?.get(capDay) ?? 0;
		const capLeft = Math.max(0, perDayCap - already);
		// Effective window in seconds-from-local-midnight; dayEndSec sits 1s before the
		// exclusive 8pm edge so slots stay strictly inside the window. gapCapacity is
		// derived from the SAME effective window the min-gap clamp uses, so feasibility
		// and the clamp can never disagree (no slot squeezed below dayStart).
		const dayStartSec = dayStartMin * 60;
		const dayEndSec = dayEndMin * 60 - 1;
		const effWindowSec = dayEndSec - dayStartSec;
		const gapCapacity = minGapSeconds > 0 ? Math.floor(effWindowSec / minGapSeconds) + 1 : Infinity;
		const nToday = Math.min(remaining, capLeft, gapCapacity);

		if (nToday <= 0) {
			capDay = nextCapDay(capDay);
			firstDayFloor = windowStartMin;
			continue;
		}

		// Stratified inverse-CDF draw, restricted+renormalized to this day's sub-window.
		const invert = makeInverter(weightProfile, dayStartMin, dayEndMin, bucketMin);
		const localMins: number[] = [];
		for (let i = 0; i < nToday; i++) {
			const u = (i + rng()) / nToday; // monotonic in i → output sorted before gap pass
			localMins.push(invert(u));
		}

		// Min-gap enforcement that respects BOTH window bounds. Work in seconds from
		// local midnight. Forward pass = lower bound (lo + i·gap); upper clamp =
		// hi − (n−1−i)·gap pulls any tail that clustered near 8pm back inside the
		// window. Feasibility (nToday ≤ gapCapacity) makes the two bounds compatible,
		// so the result is sorted, ≥ minGap apart, and strictly inside [dayStart, 8pm).
		const gapSec = minGapSeconds;
		const n = localMins.length;
		const t: number[] = new Array(n);
		let prevSec = dayStartSec - gapSec;
		for (let i = 0; i < n; i++) {
			let ti = localMins[i] * 60;
			if (ti < prevSec + gapSec) ti = prevSec + gapSec;
			if (ti < dayStartSec) ti = dayStartSec;
			t[i] = ti;
			prevSec = ti;
		}
		for (let i = n - 1; i >= 0; i--) {
			const upper = dayEndSec - (n - 1 - i) * gapSec;
			if (t[i] > upper) t[i] = upper;
		}
		for (let i = 0; i < n; i++) {
			const utc = localWallTimeToUtc(capDay, t[i] / 60, tz);
			out.push({ scheduledForUtc: utc, capDay });
		}

		remaining -= nToday;
		capDay = nextCapDay(capDay);
		firstDayFloor = windowStartMin;
	}

	return out;
}
