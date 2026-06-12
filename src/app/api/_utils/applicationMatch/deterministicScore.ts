// Deterministic applicant→event match scorer.
//
// Pure on its inputs (no prisma/fetch/env) so it can run inline in the GET
// route with zero added latency. It serves three roles for matchScores.ts:
// the always-available fallback when the Gemini call fails, the source of the
// mechanical components (genre, submission quality) the LLM is never trusted
// with, and a benchmark for the hybrid scorer. Weight/band/cap changes require
// a SCORER_VERSION bump in matchScores.ts.
//
// The venue's own ApplicationVideoRating stars are deliberately NOT an input:
// they are the same viewer's subjective post-hoc opinion, displayed adjacent
// to the badge — folding them in would double-count and make the match %
// move when the venue clicks a star.

import {
	extractUsStateNameFromText,
	getNearestUsStateNameForPoint,
	getNearestUsStateNames,
	normalizeUsStateName,
} from '@/utils/usStates';
import { genreCompatibility } from './genreMatrix';

export type MatchScoreInput = {
	application: {
		genre: string | null;
		area: string | null;
		performingName: string | null;
		bio: string | null;
		videos: { durationSec: number | null }[];
	};
	event: {
		genres: string[];
		size: string | null;
		address: string | null;
		latitude: number | null;
		longitude: number | null;
	};
	venue: { genres: string[]; city: string | null; state: string | null } | null;
};

export type MatchComponent = {
	score: number; // 0-1 subscore
	points: number; // score × weight
	weight: number;
	reason: string;
};

export type DeterministicBreakdown = {
	total: number; // 1-99 integer, post-cap
	capped: boolean; // true when a genre hard cap reduced the total
	components: {
		genre: MatchComponent;
		location: MatchComponent;
		bio: MatchComponent;
		media: MatchComponent;
		performingName: MatchComponent;
		size: MatchComponent;
	};
};

const WEIGHTS = { genre: 55, location: 20, bio: 9, media: 6, performingName: 2, size: 8 };

const normalizeCityToken = (value: string): string =>
	value
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^the\s+/, '');

// "Seattle, Washington" → "seattle"; "Brooklyn New York" → "brooklyn".
const extractApplicantCity = (area: string): string | null => {
	const hadComma = area.includes(',');
	let candidate = area.split(',')[0]?.trim() ?? '';
	if (!hadComma) {
		const words = candidate.split(/\s+/).filter(Boolean);
		if (words.length >= 3 && normalizeUsStateName(words.slice(-2).join(' '))) {
			candidate = words.slice(0, -2).join(' ');
		} else if (words.length >= 2 && normalizeUsStateName(words[words.length - 1])) {
			candidate = words.slice(0, -1).join(' ');
		}
	}
	// A bare state ("Washington") is not a city — but only in the no-comma form;
	// "New York, NY" legitimately names a city that shares a state's name.
	if (!candidate || (!hadComma && normalizeUsStateName(candidate))) return null;
	return normalizeCityToken(candidate) || null;
};

// Google Places format: "The Crocodile, 2200 2nd Ave, Seattle, WA 98121, USA" —
// the city is the segment right before the "ST 12345" one.
const extractEventCity = (
	address: string | null,
	venueCity: string | null
): string | null => {
	const segments = (address ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	for (let i = 1; i < segments.length; i++) {
		if (/^[A-Z]{2}\s+\d{5}/.test(segments[i])) {
			const city = normalizeCityToken(segments[i - 1]);
			if (city) return city;
		}
	}
	return venueCity ? normalizeCityToken(venueCity) || null : null;
};

// "Seattle, WA 98121" defeats the trailing-window state extractor (the zip is
// the trailing token) — drop zips so "WA" survives as its own trailing token.
const stripZipCodes = (text: string | null): string | null =>
	text ? text.replace(/\b\d{5}(?:-\d{4})?\b/g, ' ') : text;

// usStates.ts only knows the 50 states, so "Washington, DC" would parse as
// Washington STATE (a different-region miss for the same metro). Treat DC as
// its own pseudo-state with MD/VA as neighbors.
const DC_NAME = 'District of Columbia';
const DC_NEIGHBORS = ['Maryland', 'Virginia'];
const DC_PATTERN = /\b(?:d\.?c\.?|district of columbia)\b/i;

const stateFromText = (text: string | null): string | null => {
	if (!text) return null;
	if (DC_PATTERN.test(text)) return DC_NAME;
	return extractUsStateNameFromText(text);
};

const statesAreNeighbors = (eventState: string, applicantState: string): boolean => {
	if (eventState === DC_NAME) return DC_NEIGHBORS.includes(applicantState);
	if (applicantState === DC_NAME) return DC_NEIGHBORS.includes(eventState);
	return getNearestUsStateNames(eventState, 4).includes(applicantState);
};

const scoreLocation = (input: MatchScoreInput): { score: number; reason: string } => {
	const area = input.application.area?.trim() ?? '';
	if (!area) return { score: 0.4, reason: 'No area provided' };

	const applicantState = stateFromText(area);
	const eventState =
		stateFromText(stripZipCodes(input.event.address)) ??
		stateFromText(input.venue?.state ?? null) ??
		(input.event.latitude != null && input.event.longitude != null
			? getNearestUsStateNameForPoint(input.event.latitude, input.event.longitude)
			: null);

	if (!applicantState || !eventState) {
		// Parse failure is not the applicant's fault — mild neutral.
		return { score: 0.55, reason: 'Location could not be compared' };
	}
	if (applicantState === eventState) {
		// Same-city requires same-state first (Portland OR vs Portland ME).
		const applicantCity = extractApplicantCity(area);
		const eventCity = extractEventCity(input.event.address, input.venue?.city ?? null);
		if (applicantCity && eventCity && applicantCity === eventCity) {
			return { score: 1, reason: 'Same city as the event' };
		}
		return { score: 0.75, reason: `Same state (${eventState})` };
	}
	if (statesAreNeighbors(eventState, applicantState)) {
		return { score: 0.5, reason: `Neighboring state (${applicantState})` };
	}
	return { score: 0.25, reason: `Different region (${applicantState} vs ${eventState})` };
};

const scoreBio = (bio: string | null): { score: number; reason: string } => {
	const text = (bio ?? '').replace(/\s+/g, ' ').trim();
	if (!text) return { score: 0, reason: 'No bio' };
	const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
	if (uniqueWords < 8 || /(.)\1{19,}/.test(text)) {
		return { score: 0.25, reason: 'Bio lacks substance' };
	}
	if (text.length < 40) return { score: 0.25, reason: 'Very short bio' };
	if (text.length < 120) return { score: 0.55, reason: 'Short bio' };
	if (text.length < 400) return { score: 0.85, reason: 'Solid bio' };
	return { score: 1, reason: 'Detailed bio' };
};

const scoreMedia = (
	videos: { durationSec: number | null }[]
): { score: number; reason: string } => {
	const count = videos.length;
	if (!count) return { score: 0, reason: 'No media submitted' };
	let score = count === 1 ? 0.6 : count === 2 ? 0.85 : 1;
	// YouTube items have durationSec null — unknown is never penalized.
	const known = videos.filter((v) => v.durationSec != null);
	if (known.some((v) => (v.durationSec as number) >= 60)) {
		score += 0.1;
	} else if (known.length && known.every((v) => (v.durationSec as number) < 20)) {
		score -= 0.15;
	}
	return {
		score: Math.min(1, Math.max(0, score)),
		reason: `${count} media item${count === 1 ? '' : 's'}`,
	};
};

const SIZE_PATTERNS: Array<{ ordinal: number; pattern: RegExp }> = [
	{
		ordinal: 1,
		pattern: /\b(?:solo|soloist|singer[- ]songwriter|one[- ](?:man|woman)[- ]band|acoustic set)\b/g,
	},
	{ ordinal: 2, pattern: /\b(?:duo|duet)\b/g },
	{ ordinal: 3, pattern: /\b(?:trio|(?:3|three)[- ]piece)\b/g },
	{
		ordinal: 4,
		pattern:
			/\b(?:band|group|ensemble|orchestra|collective|(?:4|four|5|five|6|six)[- ]piece|quartet|quintet)\b/g,
	},
];

const eventSizeOrdinal = (size: string | null): number | null => {
	const value = (size ?? '').toLowerCase();
	if (/solo/.test(value)) return 1;
	if (/duo/.test(value)) return 2;
	if (/trio/.test(value)) return 3;
	if (/band|group/.test(value)) return 4;
	return null;
};

const detectApplicantSizeOrdinal = (input: MatchScoreInput): number | null => {
	// "one-man band" is a SOLO signal — strip it before the BAND pattern runs.
	const clean = (text: string) =>
		text.toLowerCase().replace(/one[- ](?:man|woman)[- ]band/g, ' ');
	const name = clean(input.application.performingName ?? '');
	const bio = clean(input.application.bio ?? '');
	const nameRaw = (input.application.performingName ?? '').toLowerCase();
	const bioRaw = (input.application.bio ?? '').toLowerCase();
	const counts = SIZE_PATTERNS.map(({ ordinal, pattern }) => {
		// SOLO matches against the raw text (it claims "one-man band" itself);
		// the rest see the cleaned text. performingName hits count double —
		// "The Midnight Trio" beats a bio aside.
		const forName = ordinal === 1 ? nameRaw : name;
		const forBio = ordinal === 1 ? bioRaw : bio;
		return {
			ordinal,
			hits:
				(forName.match(pattern)?.length ?? 0) * 2 + (forBio.match(pattern)?.length ?? 0),
		};
	}).filter((c) => c.hits > 0);
	if (!counts.length) return null;
	counts.sort((a, b) => b.hits - a.hits);
	if (counts.length > 1 && counts[0].hits === counts[1].hits) return null;
	return counts[0].ordinal;
};

const scoreSize = (input: MatchScoreInput): { score: number; reason: string } => {
	const eventOrdinal = eventSizeOrdinal(input.event.size);
	const applicantOrdinal = detectApplicantSizeOrdinal(input);
	if (eventOrdinal == null || applicantOrdinal == null) {
		return { score: 0.6, reason: 'No format evidence' };
	}
	const distance = Math.abs(eventOrdinal - applicantOrdinal);
	return {
		score: Math.max(0.2, 1 - 0.27 * distance),
		reason: distance === 0 ? 'Format matches the event size' : 'Format differs from the event size',
	};
};

export const computeDeterministicMatchScore = (
	input: MatchScoreInput
): DeterministicBreakdown => {
	const genre = genreCompatibility(
		input.application.genre,
		input.event.genres,
		input.venue?.genres ?? []
	);
	const location = scoreLocation(input);
	const bio = scoreBio(input.application.bio);
	const media = scoreMedia(input.application.videos);
	const hasName = Boolean(input.application.performingName?.trim());
	const size = scoreSize(input);

	const component = (score: number, weight: number, reason: string): MatchComponent => ({
		score,
		weight,
		points: score * weight,
		reason,
	});

	const genreReason = genre.matchedGenre
		? `Closest event genre: ${genre.matchedGenre}`
		: genre.constrained
			? 'No genre submitted'
			: 'Event and venue list no genres';

	const components = {
		genre: component(genre.score, WEIGHTS.genre, genreReason),
		location: component(location.score, WEIGHTS.location, location.reason),
		bio: component(bio.score, WEIGHTS.bio, bio.reason),
		media: component(media.score, WEIGHTS.media, media.reason),
		performingName: component(
			hasName ? 1 : 0,
			WEIGHTS.performingName,
			hasName ? 'Performing name provided' : 'No performing name'
		),
		size: component(size.score, WEIGHTS.size, size.reason),
	};

	const raw = Object.values(components).reduce((sum, c) => sum + c.points, 0);
	const capped = genre.capTotalAt != null && raw > genre.capTotalAt;
	const total = Math.min(
		99,
		Math.max(1, Math.round(capped ? (genre.capTotalAt as number) : raw))
	);
	return { total, capped, components };
};
