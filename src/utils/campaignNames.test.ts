import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	generateCampaignName,
	getCampaignNameCandidates,
	getZodiacForDate,
	resolveUniqueCampaignName,
} from './campaignNames';

// June 12 falls in Gemini (May 21 – Jun 20).
const GEMINI_SEASON = new Date('2026-06-12T12:00:00');

test('getZodiacForDate matches season boundaries', () => {
	assert.equal(getZodiacForDate(GEMINI_SEASON), 'Gemini');
	assert.equal(getZodiacForDate(new Date('2026-12-22T12:00:00')), 'Capricornus');
	assert.equal(getZodiacForDate(new Date('2026-01-19T12:00:00')), 'Capricornus');
	assert.equal(getZodiacForDate(new Date('2026-01-20T12:00:00')), 'Aquarius');
});

test('candidate list starts with the seasonal zodiac and has no duplicates', () => {
	const candidates = getCampaignNameCandidates(GEMINI_SEASON);
	assert.equal(candidates[0], 'Gemini');
	const lower = candidates.map((c) => c.toLowerCase());
	assert.equal(new Set(lower).size, candidates.length);
});

test('generateCampaignName skips taken names case-insensitively', () => {
	assert.equal(generateCampaignName([], GEMINI_SEASON), 'Gemini');
	assert.equal(generateCampaignName(['gemini'], GEMINI_SEASON), 'Lyra');
	assert.equal(generateCampaignName(['Gemini', ' lyra '], GEMINI_SEASON), 'Orion');
});

test('generateCampaignName stays unique through the whole pool', () => {
	const taken: string[] = [];
	const candidates = getCampaignNameCandidates(GEMINI_SEASON);
	for (let i = 0; i < candidates.length; i++) {
		const name = generateCampaignName(taken, GEMINI_SEASON);
		assert.ok(!taken.includes(name), `duplicate generated: ${name}`);
		taken.push(name);
	}
});

test('resolveUniqueCampaignName keeps a free name', () => {
	assert.equal(
		resolveUniqueCampaignName('Gemini', ['Lyra', 'Orion'], GEMINI_SEASON),
		'Gemini'
	);
});

test('hidden archived collision advances to the next constellation, not "Gemini 1"', () => {
	// The client cannot see archived campaigns, so it proposes "Gemini" even
	// though an archived "Gemini" exists server-side.
	const resolved = resolveUniqueCampaignName('Gemini', ['Gemini'], GEMINI_SEASON);
	assert.equal(resolved, 'Lyra');

	const resolvedDeep = resolveUniqueCampaignName(
		'Gemini',
		['Gemini', 'Lyra', 'Orion', 'Ursa'],
		GEMINI_SEASON
	);
	assert.equal(resolvedDeep, 'Cassiopeia');
});

test('user-chosen custom names still get a numeric suffix on collision', () => {
	assert.equal(
		resolveUniqueCampaignName('Summer Tour', ['Summer Tour'], GEMINI_SEASON),
		'Summer Tour 1'
	);
	assert.equal(
		resolveUniqueCampaignName(
			'Summer Tour',
			['Summer Tour', 'Summer Tour 1', 'summer tour 3'],
			GEMINI_SEASON
		),
		'Summer Tour 2'
	);
});

test('full constellation exhaustion falls back to a suffix and never collides', () => {
	const allTaken = getCampaignNameCandidates(GEMINI_SEASON);
	const resolved = resolveUniqueCampaignName('Gemini', allTaken, GEMINI_SEASON);
	assert.equal(resolved, 'Gemini 1');
	assert.ok(!allTaken.map((n) => n.toLowerCase()).includes(resolved.toLowerCase()));
});

test('resolution is whitespace- and case-insensitive', () => {
	assert.equal(
		resolveUniqueCampaignName('  gemini ', ['GEMINI'], GEMINI_SEASON),
		'Lyra'
	);
});
