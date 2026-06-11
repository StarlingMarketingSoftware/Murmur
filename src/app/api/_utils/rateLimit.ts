import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { auth } from '@clerk/nextjs/server';
import type { NextRequest, NextResponse } from 'next/server';
import { apiTooManyRequests } from './api';

/**
 * Per-route API rate limiting backed by Upstash Redis sliding windows.
 *
 * Fail-open by design: if UPSTASH_REDIS_REST_URL/TOKEN are unset (local dev),
 * if Redis is slow (>1s), or if the check throws, the request is allowed.
 * Rate limiting is a cost/abuse backstop here, never an availability risk.
 *
 * Keying:
 * - `user` rules key on the Clerk userId (falling back to `anon:<ip>` when no
 *   session exists), so limits follow the account, not the network.
 * - `ip` rules key on the client IP — used for public webhooks where there is
 *   no session, and as an extra circuit-breaker where explicitly configured.
 * - The `public-unauth` tier is IP-only and never resolves the Clerk session.
 */

export type RateLimitTier =
	| 'ai-expensive'
	| 'ai-burst-guard'
	| 'search-heavy'
	| 'paid-external'
	| 'mutation'
	| 'read-cheap'
	| 'public-unauth';

export interface RateLimitRule {
	tokens: number;
	window: Duration;
}

interface TierRules {
	user?: RateLimitRule[];
	ip?: RateLimitRule[];
}

// Defaults are sized ≥3x above the heaviest legitimate client flows:
// - ai-expensive: client-loop drafting ≈ 20–60 OpenRouter/Gemini calls/min incl. retries
// - ai-burst-guard: one /api/drafts/generate call covers up to 500 contacts
// - search-heavy: map overlay ≈ 4 queries/moveend × ~15 idles/min
// - paid-external: send loop hard ceiling ≈ 171 Mailgun POSTs/min (350ms dwell floor)
// - mutation: per-draft email persists during stream generation, up to ~300/min
// - read-cheap: campaign refetch per sent email + polling hooks
const TIER_DEFAULTS: Record<RateLimitTier, TierRules> = {
	'ai-expensive': {
		user: [
			{ tokens: 120, window: '60 s' },
			{ tokens: 2000, window: '3600 s' },
		],
	},
	'ai-burst-guard': {
		user: [
			{ tokens: 10, window: '60 s' },
			{ tokens: 100, window: '3600 s' },
		],
	},
	'search-heavy': {
		user: [
			{ tokens: 180, window: '60 s' },
			{ tokens: 3000, window: '3600 s' },
		],
	},
	'paid-external': {
		user: [
			{ tokens: 200, window: '60 s' },
			{ tokens: 2500, window: '3600 s' },
		],
	},
	mutation: {
		user: [
			{ tokens: 300, window: '60 s' },
			{ tokens: 6000, window: '3600 s' },
		],
	},
	'read-cheap': {
		user: [{ tokens: 600, window: '60 s' }],
	},
	'public-unauth': {
		ip: [{ tokens: 120, window: '60 s' }],
	},
};

// Upstash answers fast when healthy; anything slower than this and the
// library resolves success (fail-open) rather than stalling the request.
const UPSTASH_TIMEOUT_MS = 1000;

let redis: Redis | null = null;
let redisInitialized = false;
let warnedDisabled = false;

const getRedis = (): Redis | null => {
	if (redisInitialized) return redis;
	redisInitialized = true;
	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) {
		if (!warnedDisabled) {
			warnedDisabled = true;
			console.warn(
				'[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set — API rate limiting is DISABLED (fail-open).'
			);
		}
		return null;
	}
	redis = new Redis({ url, token });
	return redis;
};

// One Ratelimit instance per routeKey+scope+rule for the lambda's lifetime. The
// rule is baked into the cache key AND the Redis prefix so tuning a tier (or a
// per-route override) never mixes counts across different sliding windows.
const limiters = new Map<string, Ratelimit>();

const getLimiter = (
	r: Redis,
	routeKey: string,
	scope: 'user' | 'ip',
	rule: RateLimitRule
): Ratelimit => {
	const key = `${routeKey}:${scope}:${rule.tokens}:${rule.window}`;
	let limiter = limiters.get(key);
	if (!limiter) {
		limiter = new Ratelimit({
			redis: r,
			limiter: Ratelimit.slidingWindow(rule.tokens, rule.window),
			prefix: `mrl:${key}`,
			analytics: false,
			timeout: UPSTASH_TIMEOUT_MS,
		});
		limiters.set(key, limiter);
	}
	return limiter;
};

// On Vercel these headers are set/overwritten at the edge and cannot be spoofed
// by the client; x-real-ip is the single-value primary, the *-forwarded-for
// variants cover any fronting proxy. Localhost fallback only matters in dev,
// where the Upstash env vars are absent anyway.
const getClientIp = (headers: Headers): string =>
	headers.get('x-real-ip')?.trim() ||
	headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
	headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
	'127.0.0.1';

export async function withRateLimit(
	req: NextRequest | Request,
	tier: RateLimitTier,
	routeKey: string,
	overrides?: { user?: RateLimitRule[]; ip?: RateLimitRule[] }
): Promise<NextResponse | null> {
	const r = getRedis();
	if (!r) return null;

	const userRules = overrides?.user ?? TIER_DEFAULTS[tier].user;
	const ipRules = overrides?.ip ?? TIER_DEFAULTS[tier].ip;

	try {
		const checks: Array<Promise<{ success: boolean; reset: number }>> = [];

		if (ipRules?.length) {
			const ip = getClientIp(req.headers);
			for (const rule of ipRules) {
				checks.push(getLimiter(r, routeKey, 'ip', rule).limit(ip));
			}
		}

		if (userRules?.length) {
			let userId: string | null = null;
			try {
				({ userId } = await auth());
			} catch {
				// Outside a Clerk request context (tests/scripts) — key on IP instead.
			}
			const identity = userId ?? `anon:${getClientIp(req.headers)}`;
			for (const rule of userRules) {
				checks.push(getLimiter(r, routeKey, 'user', rule).limit(identity));
			}
		}

		if (!checks.length) return null;

		const results = await Promise.all(checks);
		const blocked = results.filter((res) => !res.success);
		if (!blocked.length) return null;

		const retryAfter = Math.max(
			1,
			...blocked.map((res) => Math.ceil((res.reset - Date.now()) / 1000))
		);
		return apiTooManyRequests(
			`Rate limit exceeded (${routeKey}). Please try again in ${retryAfter}s.`,
			retryAfter
		);
	} catch (error) {
		// Redis outage or network error — never let rate limiting take the API down.
		console.warn(`[rateLimit] check failed for ${routeKey}; allowing request`, error);
		return null;
	}
}
