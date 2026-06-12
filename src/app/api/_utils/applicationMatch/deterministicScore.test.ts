import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	computeDeterministicMatchScore,
	type MatchScoreInput,
} from './deterministicScore';
import {
	CANONICAL_GENRES,
	genreAffinity,
	genreCompatibility,
	normalizeGenreLabel,
} from './genreMatrix';

const baseInput = (overrides: Partial<MatchScoreInput>): MatchScoreInput => ({
	application: {
		genre: null,
		area: null,
		performingName: null,
		bio: null,
		videos: [],
	},
	event: { genres: [], size: null, address: null, latitude: null, longitude: null },
	venue: null,
	...overrides,
});

test('worked example A: perfect match clamps to 99', () => {
	const longBio =
		'Seattle-based jazz performer with a decade of solo club and listening-room ' +
		'experience across the Pacific Northwest. Repertoire spans standards, bossa ' +
		'nova, and originals tailored to dinner services and cocktail hours. ' +
		'Comfortable reading a room, adjusting volume and energy to the space, and ' +
		'working with in-house sound or fully self-contained. Past residencies ' +
		'include hotel lounges, wine bars, and supper clubs, with repeat private ' +
		'bookings for galas and corporate receptions throughout the region.';
	assert.ok(longBio.length >= 400);
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: 'Jazz',
				area: 'Seattle, Washington',
				performingName: 'Ava Lane',
				bio: longBio,
				videos: [{ durationSec: 180 }, { durationSec: 45 }, { durationSec: null }],
			},
			event: {
				genres: ['Jazz', 'R&B'],
				size: 'Solo',
				address: 'The Crocodile, 2200 2nd Ave, Seattle, WA 98121, USA',
				latitude: null,
				longitude: null,
			},
			venue: { genres: [], city: 'Seattle', state: 'WA' },
		})
	);
	assert.equal(result.total, 99);
	assert.equal(result.capped, false);
	assert.equal(result.components.genre.points, 55);
	assert.equal(result.components.location.points, 20);
});

test('worked example B: partial match lands at 62', () => {
	const bio =
		'Acoustic duo playing warm covers and originals for bars, patios, and private events.';
	assert.ok(bio.length >= 40 && bio.length < 120);
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: 'Folk',
				area: 'Dallas, Texas',
				performingName: 'River & Lane',
				bio,
				videos: [{ durationSec: 45 }],
			},
			event: {
				genres: ['Rock'],
				size: 'Full Band',
				address: "Stubb's, 801 Red River St, Austin, TX 78701, USA",
				latitude: null,
				longitude: null,
			},
			venue: { genres: [], city: 'Austin', state: 'TX' },
		})
	);
	assert.equal(result.total, 62);
	assert.equal(result.capped, false);
});

test('worked example C: genre hard clash caps a stellar application at 35', () => {
	const sentence =
		'Boston emcee with sharp pen game and a deep catalog of crowd-tested sets. ';
	const bio = sentence.repeat(11);
	assert.ok(bio.length >= 400);
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: 'Hip-Hop',
				area: 'Boston, Massachusetts',
				performingName: 'MC Beacon',
				bio,
				videos: [{ durationSec: 120 }, { durationSec: 95 }, { durationSec: 200 }],
			},
			event: {
				genres: ['Classical'],
				size: null,
				address: 'Symphony Hall, 301 Massachusetts Ave, Boston, MA 02115, USA',
				latitude: null,
				longitude: null,
			},
			venue: null,
		})
	);
	assert.equal(result.total, 35);
	assert.equal(result.capped, true);
});

test('genre affinity is symmetric across all concrete pairs', () => {
	const concrete = CANONICAL_GENRES.filter((g) => g !== 'Other');
	for (const a of concrete) {
		for (const b of concrete) {
			assert.equal(
				genreAffinity(a, b),
				genreAffinity(b, a),
				`asymmetric pair: ${a} / ${b}`
			);
		}
	}
});

test('Other and missing-genre rules never hard-cap', () => {
	const otherVsConcrete = genreCompatibility('Other', ['Rock'], []);
	assert.equal(otherVsConcrete.score, 0.5);
	assert.equal(otherVsConcrete.capTotalAt, null);

	const concreteVsOther = genreCompatibility('Jazz', ['Other'], []);
	assert.equal(concreteVsOther.score, 0.75);
	assert.equal(concreteVsOther.capTotalAt, null);

	const missing = genreCompatibility(null, ['Rock'], []);
	assert.equal(missing.score, 0.4);
	assert.equal(missing.constrained, true);
	assert.equal(missing.capTotalAt, null);
});

test('caps are disabled when neither event nor venue lists genres', () => {
	const unconstrained = genreCompatibility('Hip-Hop', [], []);
	assert.equal(unconstrained.score, 0.7);
	assert.equal(unconstrained.constrained, false);
	assert.equal(unconstrained.capTotalAt, null);
});

test('venue genres stand in when the event lists none', () => {
	const viaVenue = genreCompatibility('Gospel', [], ['R&B']);
	assert.equal(viaVenue.score, 0.75);
	assert.equal(viaVenue.matchedGenre, 'R&B');
});

test('genre label normalization handles aliases and unknowns', () => {
	assert.equal(normalizeGenreLabel('rap'), 'Hip-Hop');
	assert.equal(normalizeGenreLabel('hip hop'), 'Hip-Hop');
	assert.equal(normalizeGenreLabel('R&B'), 'R&B');
	assert.equal(normalizeGenreLabel('EDM'), 'Electronic');
	assert.equal(normalizeGenreLabel('death metal'), 'Other');
	assert.equal(normalizeGenreLabel('  '), null);
});

test('prototype-property genre strings cannot poison the alias lookup', () => {
	assert.equal(normalizeGenreLabel('Constructor'), 'Other');
	assert.equal(normalizeGenreLabel('toString'), 'Other');
	const compat = genreCompatibility('Constructor', ['Rock'], []);
	assert.equal(compat.score, 0.5);
	assert.equal(compat.capTotalAt, null);
});

test('same city name in a different state is not a city match', () => {
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: 'Portland, Oregon',
				performingName: null,
				bio: null,
				videos: [],
			},
			event: {
				genres: [],
				size: null,
				address: 'Blue, 650A Congress St, Portland, ME 04101, USA',
				latitude: null,
				longitude: null,
			},
			venue: null,
		})
	);
	assert.equal(result.components.location.score, 0.25);
});

test('"husband" in a bio is not a band-format signal', () => {
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: null,
				performingName: null,
				bio: 'My husband and I write quiet songs together at home.',
				videos: [],
			},
			event: { genres: [], size: 'Full Band', address: null, latitude: null, longitude: null },
			venue: null,
		})
	);
	assert.equal(result.components.size.score, 0.6);
});

test('"one-man band" reads as solo, not band', () => {
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: null,
				performingName: null,
				bio: 'I perform as a one-man band with loop pedals and percussion rigs.',
				videos: [],
			},
			event: { genres: [], size: 'Solo', address: null, latitude: null, longitude: null },
			venue: null,
		})
	);
	assert.equal(result.components.size.score, 1);
});

test('fully hyphenated "one-man-band" also reads as solo', () => {
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: null,
				performingName: null,
				bio: 'I tour as a one-man-band with loop pedals.',
				videos: [],
			},
			event: { genres: [], size: 'Solo', address: null, latitude: null, longitude: null },
			venue: null,
		})
	);
	assert.equal(result.components.size.score, 1);
});

test('"New York, NY" gets the same-city tier against an NYC event', () => {
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: 'New York, NY',
				performingName: null,
				bio: null,
				videos: [],
			},
			event: {
				genres: [],
				size: null,
				address: 'Mercury Lounge, 217 E Houston St, New York, NY 10002, USA',
				latitude: null,
				longitude: null,
			},
			venue: null,
		})
	);
	assert.equal(result.components.location.score, 1);
});

test('Washington DC is its own region, neighboring MD/VA', () => {
	const dcEvent = {
		genres: [],
		size: null,
		address: '9:30 Club, 815 V St NW, Washington, DC 20001, USA',
		latitude: null,
		longitude: null,
	};
	const sameCity = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: 'Washington, DC',
				performingName: null,
				bio: null,
				videos: [],
			},
			event: dcEvent,
			venue: null,
		})
	);
	assert.equal(sameCity.components.location.score, 1);

	const neighbor = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: 'Washington, DC',
				performingName: null,
				bio: null,
				videos: [],
			},
			event: {
				genres: [],
				size: null,
				address: 'The Birchmere, 3701 Mount Vernon Ave, Alexandria, VA 22305, USA',
				latitude: null,
				longitude: null,
			},
			venue: null,
		})
	);
	assert.equal(neighbor.components.location.score, 0.5);

	// And a DC applicant is NOT "same state" as a Seattle event.
	const farAway = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: 'Washington, DC',
				performingName: null,
				bio: null,
				videos: [],
			},
			event: {
				genres: [],
				size: null,
				address: 'The Crocodile, 2200 2nd Ave, Seattle, WA 98121, USA',
				latitude: null,
				longitude: null,
			},
			venue: null,
		})
	);
	assert.equal(farAway.components.location.score, 0.25);
});

test('unknown YouTube durations are never penalized', () => {
	const result = computeDeterministicMatchScore(
		baseInput({
			application: {
				genre: null,
				area: null,
				performingName: null,
				bio: null,
				videos: [{ durationSec: null }, { durationSec: null }],
			},
			event: { genres: [], size: null, address: null, latitude: null, longitude: null },
			venue: null,
		})
	);
	assert.equal(result.components.media.score, 0.85);
});
