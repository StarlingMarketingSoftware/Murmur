// Intelligent applicant→event match scoring with DB-cached results.
//
// One batched gemini-2.5-flash-lite call per event scores all uncached
// applicants; the judgment components (contentRelevance, locationFit,
// formatFit) come from the LLM while the mechanical ones (genreFit,
// submissionQuality) are always computed in TS (deterministicScore.ts /
// genreMatrix.ts) — LLM values for those are never accepted. Results persist
// in ApplicationMatchScore keyed by a sha256 inputHash over every
// score-relevant field + SCORER_VERSION, so re-applies, event edits, venue
// edits, and version bumps all invalidate lazily on the next venue read.
// LLM failures fall back to the deterministic scorer and are NOT persisted,
// so they retry on a later read (bounded by a per-event failure cooldown).
//
// Any change to HYBRID_WEIGHTS, the genre matrix/caps, the deterministic
// bands, or RUBRIC_PROMPT requires a SCORER_VERSION bump.

import { createHash } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { GEMINI_MODEL_OPTIONS } from '@/constants';
import { fetchGemini } from '../gemini';
import {
	computeDeterministicMatchScore,
	type DeterministicBreakdown,
	type MatchScoreInput,
} from './deterministicScore';
import { genreCompatibility, normalizeGenreLabel } from './genreMatrix';

export const SCORER_VERSION = 1;

export type ScoringApplication = {
	id: number;
	genre: string | null;
	area: string | null;
	performingName: string | null;
	bio: string | null;
	videos: { id: number; kind: string; durationSec: number | null }[];
};

export type ScoringEvent = {
	id: number;
	name: string;
	genres: string[];
	size: string | null;
	whenLabel: string | null;
	startsAt: Date | null;
	address: string | null;
	latitude: number | null;
	longitude: number | null;
	pay: string | null;
	details: string | null;
};

// Only fields a scorer actually consumes — anything hashed but unused would
// invalidate every cached score on an irrelevant profile edit.
export type ScoringVenue = {
	businessType: string | null;
	capacityMin: number | null;
	capacityMax: number | null;
	genres: string[];
	city: string | null;
	state: string | null;
	sound: string | null;
	description: string | null;
} | null;

const HYBRID_WEIGHTS = {
	genreFit: 0.4,
	contentRelevance: 0.25,
	locationFit: 0.15,
	formatFit: 0.1,
	submissionQuality: 0.1,
} as const;

const CHUNK_SIZE = 15;
const MAX_CHUNKS = 3;
const LLM_TIMEOUT_MS = 12_000;
const FAILURE_COOLDOWN_MS = 60_000;

// After a full LLM failure for an event, skip Gemini (straight to fallback)
// for a minute instead of hammering it on every poll. Per-lambda memory.
const failureCooldownByEventId = new Map<number, number>();

// Explicit fields only — NOT application.updatedAt (it bumps on status flips
// that don't affect relevance). Re-apply replaces the snapshot fields and the
// ApplicationVideo rows (new ids), so the hash changes naturally.
export const computeInputHash = (
	app: ScoringApplication,
	event: ScoringEvent,
	venue: ScoringVenue
): string =>
	createHash('sha256')
		.update(
			JSON.stringify({
				v: SCORER_VERSION,
				app: {
					genre: app.genre,
					area: app.area,
					performingName: app.performingName,
					bio: app.bio,
				},
				videos: app.videos.map((v) => [v.id, v.kind, v.durationSec]),
				event: {
					name: event.name,
					genres: event.genres,
					size: event.size,
					whenLabel: event.whenLabel,
					startsAt: event.startsAt?.toISOString() ?? null,
					address: event.address,
					latitude: event.latitude,
					longitude: event.longitude,
					pay: event.pay,
					details: event.details,
				},
				venue: venue && {
					businessType: venue.businessType,
					capacityMin: venue.capacityMin,
					capacityMax: venue.capacityMax,
					genres: venue.genres,
					city: venue.city,
					state: venue.state,
					sound: venue.sound,
					description: venue.description,
				},
			})
		)
		.digest('hex');

const RUBRIC_PROMPT = `You score how relevant each musician's application is to a specific event at a specific venue. Respond with JSON ONLY (no markdown fences, no commentary):
{"results":[{"applicationId":<int>,"contentRelevance":<0-100>,"locationFit":<0-100 or null>,"formatFit":<0-100 or null>,"inferredGenre":<"Pop"|"Rock"|"Country"|"Jazz"|"Electronic"|"Classical"|"Hip-Hop"|"Gospel"|"R&B"|"Folk" or null>,"rationale":"<one line, max 90 chars>"}]}
Score every applicant in the input exactly once.

CALIBRATION — use the FULL range; a typical generic application lands at 45-65.

contentRelevance (how well the applicant's bio/material fits this event and venue):
90+ the bio directly addresses this kind of event/venue with concrete relevant experience;
70-89 strong specific fit; 40-69 generic but plausible; 10-39 off-target; below 10 irrelevant or empty bio.

locationFit (the applicant's free-text home area vs the event location):
95 same city or neighborhood; 80 same metro area (~25mi); 60 same state (~100mi);
35 same region (100-300mi); 10 far away (300mi+); null if the area is missing or uninterpretable.

formatFit (does the act's size/format match what the event wants):
90+ explicit evidence of a matching format (e.g. "solo acoustic" for a Solo event);
50 unclear; 15 explicit conflict (e.g. a full band for a Solo event);
null when there is no evidence either way or the event specifies no size.

inferredGenre: ONLY when the applicant's submitted genre is missing or "Other" and their bio or
performing name clearly indicates one of the listed labels; otherwise null.

Never invent facts that are not present in the application text.`;

const llmResultSchema = z.object({
	applicationId: z.number().int(),
	contentRelevance: z.number(),
	locationFit: z.number().nullable().optional(),
	formatFit: z.number().nullable().optional(),
	inferredGenre: z.string().nullable().optional(),
	rationale: z.string().nullable().optional(),
});
type LlmResult = z.infer<typeof llmResultSchema>;

const llmResponseSchema = z.object({ results: z.array(z.unknown()) });

const stripJsonFences = (text: string): string => {
	const trimmed = text.trim();
	const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenced ? fenced[1] : trimmed;
};

const truncate = (value: string | null, max: number): string | null =>
	value && value.length > max ? value.slice(0, max) : value;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const toMatchInput = (
	app: ScoringApplication,
	event: ScoringEvent,
	venue: ScoringVenue
): MatchScoreInput => ({
	application: {
		genre: app.genre,
		area: app.area,
		performingName: app.performingName,
		bio: app.bio,
		videos: app.videos,
	},
	event: {
		genres: event.genres,
		size: event.size,
		address: event.address,
		latitude: event.latitude,
		longitude: event.longitude,
	},
	venue: venue && { genres: venue.genres, city: venue.city, state: venue.state },
});

const buildLlmContent = (
	apps: ScoringApplication[],
	event: ScoringEvent,
	venue: ScoringVenue
): string =>
	JSON.stringify({
		event: {
			name: event.name,
			genres: event.genres,
			size: event.size,
			when: event.whenLabel ?? event.startsAt?.toISOString() ?? null,
			address: event.address,
			pay: event.pay,
			details: truncate(event.details, 800),
		},
		venue: venue && {
			businessType: venue.businessType,
			capacityMin: venue.capacityMin,
			capacityMax: venue.capacityMax,
			genres: venue.genres,
			city: venue.city,
			state: venue.state,
			sound: venue.sound,
			description: truncate(venue.description, 800),
		},
		applicants: apps.map((app) => ({
			applicationId: app.id,
			genre: app.genre,
			area: app.area,
			performingName: app.performingName,
			bio: truncate(app.bio, 1200),
			mediaCount: app.videos.length,
		})),
	});

const fetchLlmResults = async (
	misses: ScoringApplication[],
	event: ScoringEvent,
	venue: ScoringVenue,
	llmGate?: () => Promise<boolean>
): Promise<Map<number, LlmResult>> => {
	const results = new Map<number, LlmResult>();
	const lastFailure = failureCooldownByEventId.get(event.id);
	if (lastFailure && Date.now() - lastFailure < FAILURE_COOLDOWN_MS) {
		return results;
	}
	// Caller-supplied budget gate (e.g. an AI rate-limit tier) checked only when
	// we are actually about to spend LLM calls; denial = fallback this read.
	if (llmGate && !(await llmGate().catch(() => true))) {
		return results;
	}
	const scored = misses.slice(0, CHUNK_SIZE * MAX_CHUNKS);
	if (scored.length < misses.length) {
		console.warn(
			`[matchScores] event ${event.id}: deferring ${misses.length - scored.length} uncached applicants to a later read`
		);
	}
	const chunks: ScoringApplication[][] = [];
	for (let i = 0; i < scored.length; i += CHUNK_SIZE) {
		chunks.push(scored.slice(i, i + CHUNK_SIZE));
	}
	const outcomes = await Promise.all(
		chunks.map(async (chunk) => {
			try {
				const response = await fetchGemini(
					GEMINI_MODEL_OPTIONS.gemini25FlashLite,
					RUBRIC_PROMPT,
					buildLlmContent(chunk, event, venue),
					{ timeoutMs: LLM_TIMEOUT_MS, maxOutputTokens: 3072, temperature: 0.2 }
				);
				const parsed = llmResponseSchema.safeParse(JSON.parse(stripJsonFences(response)));
				if (!parsed.success) return false;
				const chunkIds = new Set(chunk.map((app) => app.id));
				let validated = 0;
				for (const raw of parsed.data.results) {
					const result = llmResultSchema.safeParse(raw);
					if (!result.success || !chunkIds.has(result.data.applicationId)) continue;
					results.set(result.data.applicationId, result.data);
					validated++;
				}
				// An envelope-valid response with zero usable items must still count
				// as a failure, or the cooldown never engages on model regressions.
				return validated > 0;
			} catch (error) {
				console.error('[matchScores] LLM chunk failed:', error);
				return false;
			}
		})
	);
	if (outcomes.length && outcomes.every((ok) => !ok)) {
		failureCooldownByEventId.set(event.id, Date.now());
		if (failureCooldownByEventId.size > 200) {
			for (const [eventId, ts] of failureCooldownByEventId) {
				if (Date.now() - ts >= FAILURE_COOLDOWN_MS) {
					failureCooldownByEventId.delete(eventId);
				}
			}
		}
	} else {
		failureCooldownByEventId.delete(event.id);
	}
	return results;
};

type CombinedScore = {
	score: number;
	breakdown: {
		version: number;
		method: 'llm';
		components: Record<keyof typeof HYBRID_WEIGHTS, number>;
		weights: typeof HYBRID_WEIGHTS;
		caps: string[];
		inferredGenre: string | null;
		rationale: string | null;
	};
};

const combineLlmScore = (
	app: ScoringApplication,
	event: ScoringEvent,
	venue: ScoringVenue,
	det: DeterministicBreakdown,
	llm: LlmResult
): CombinedScore => {
	const caps: string[] = [];
	const submitted = normalizeGenreLabel(app.genre);
	const compat = genreCompatibility(app.genre, event.genres, venue?.genres ?? []);

	let genreFit = compat.score * 100;
	let capTotalAt = compat.capTotalAt;
	let inferredGenre: string | null = null;

	// The LLM may only fill a genre gap, never override a submitted label. An
	// inferred label is capped at 85 (inference uncertainty) and never hard-caps
	// the total (unknown ≠ measured clash).
	if (!submitted || submitted === 'Other') {
		const inferred = normalizeGenreLabel(llm.inferredGenre ?? null);
		if (inferred && inferred !== 'Other') {
			const inferredCompat = genreCompatibility(
				inferred,
				event.genres,
				venue?.genres ?? []
			);
			genreFit = Math.min(85, inferredCompat.score * 100);
			inferredGenre = inferred;
		}
		capTotalAt = null;
	}

	// Mechanical quality stays deterministic: recombine the bio/media/name
	// points (max 9+6+2=17) onto a 0-100 scale.
	const { bio, media, performingName } = det.components;
	const submissionQuality =
		((bio.points + media.points + performingName.points) / 17) * 100;

	const contentRelevance = clamp(llm.contentRelevance, 0, 100);
	const locationFit = llm.locationFit == null ? 50 : clamp(llm.locationFit, 0, 100);
	const formatFit = llm.formatFit == null ? 50 : clamp(llm.formatFit, 0, 100);

	let raw =
		genreFit * HYBRID_WEIGHTS.genreFit +
		contentRelevance * HYBRID_WEIGHTS.contentRelevance +
		locationFit * HYBRID_WEIGHTS.locationFit +
		formatFit * HYBRID_WEIGHTS.formatFit +
		submissionQuality * HYBRID_WEIGHTS.submissionQuality;

	if (capTotalAt != null && raw > capTotalAt) {
		caps.push(`genre-mismatch:cap${capTotalAt}`);
		raw = capTotalAt;
	}

	return {
		score: clamp(Math.round(raw), 1, 99),
		breakdown: {
			version: SCORER_VERSION,
			method: 'llm',
			components: {
				genreFit: Math.round(genreFit),
				contentRelevance: Math.round(contentRelevance),
				locationFit: Math.round(locationFit),
				formatFit: Math.round(formatFit),
				submissionQuality: Math.round(submissionQuality),
			},
			weights: HYBRID_WEIGHTS,
			caps,
			inferredGenre,
			rationale: llm.rationale ?? null,
		},
	};
};

type PersistRow = {
	applicationId: number;
	score: number;
	breakdown: CombinedScore['breakdown'];
	inputHash: string;
};

const persistScore = async (row: PersistRow, eventId: number, venueUserId: string) => {
	const data = {
		score: row.score,
		breakdown: row.breakdown,
		inputHash: row.inputHash,
		scorerVersion: SCORER_VERSION,
		eventId,
		venueUserId,
	};
	try {
		await prisma.applicationMatchScore.upsert({
			where: { applicationId: row.applicationId },
			create: { applicationId: row.applicationId, ...data },
			update: data,
		});
	} catch (error) {
		// Two concurrent GETs can race the initial insert (P2002); the content is
		// identical (same inputHash), so retry once as a plain update.
		if ((error as { code?: string })?.code === 'P2002') {
			await prisma.applicationMatchScore
				.update({ where: { applicationId: row.applicationId }, data })
				.catch(() => undefined);
		} else {
			console.error('[matchScores] persist failed:', error);
		}
	}
};

// The one function the route calls. Never throws; applications it could not
// score are simply absent from the returned map (→ matchPercent null).
export const getMatchScores = async (
	applications: ScoringApplication[],
	event: ScoringEvent,
	venue: ScoringVenue,
	venueUserId: string,
	options?: { llmGate?: () => Promise<boolean> }
): Promise<Map<number, number>> => {
	const scores = new Map<number, number>();
	if (!applications.length) return scores;
	try {
		const hashById = new Map(
			applications.map((app) => [app.id, computeInputHash(app, event, venue)])
		);
		const cached = await prisma.applicationMatchScore.findMany({
			where: { applicationId: { in: applications.map((app) => app.id) } },
			select: { applicationId: true, score: true, inputHash: true },
		});
		const cachedById = new Map(cached.map((row) => [row.applicationId, row]));

		const misses: ScoringApplication[] = [];
		for (const app of applications) {
			const row = cachedById.get(app.id);
			if (row && row.inputHash === hashById.get(app.id)) {
				scores.set(app.id, row.score);
			} else {
				misses.push(app);
			}
		}
		if (!misses.length) return scores;

		const detById = new Map(
			misses.map((app) => [
				app.id,
				computeDeterministicMatchScore(toMatchInput(app, event, venue)),
			])
		);
		const llmResults = await fetchLlmResults(misses, event, venue, options?.llmGate);

		const toPersist: PersistRow[] = [];
		for (const app of misses) {
			const det = detById.get(app.id) as DeterministicBreakdown;
			const llm = llmResults.get(app.id);
			if (llm) {
				const combined = combineLlmScore(app, event, venue, det, llm);
				scores.set(app.id, combined.score);
				toPersist.push({
					applicationId: app.id,
					score: combined.score,
					breakdown: combined.breakdown,
					inputHash: hashById.get(app.id) as string,
				});
			} else {
				// Deterministic fallback — intentionally unpersisted so the LLM
				// retries on a later read.
				scores.set(app.id, det.total);
			}
		}
		if (toPersist.length) {
			await Promise.allSettled(
				toPersist.map((row) => persistScore(row, event.id, venueUserId))
			);
		}
		return scores;
	} catch (error) {
		console.error('[matchScores] scoring failed:', error);
		return scores;
	}
};
