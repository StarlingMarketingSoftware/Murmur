import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildCompactOverlayLabel,
	isConnectorToken,
	COMPACT_OVERLAY_LABEL_MAX_WORDS,
	shrinkCompactOverlayLabelToFit,
} from './compactOverlayLabel';

// --- the core bug: never end on a dangling connector -------------------------

test('ampersand name is not cut to "Washington &"', () => {
	assert.equal(
		buildCompactOverlayLabel('Washington & Jefferson College'),
		'Washington & Jefferson'
	);
});

test('"and" between words is bridged, not left dangling', () => {
	assert.equal(buildCompactOverlayLabel('Lewis and Clark College'), 'Lewis and Clark');
});

test('joining preposition "of" is bridged', () => {
	assert.equal(buildCompactOverlayLabel('University of Pittsburgh'), 'University of Pittsburgh');
});

test('dash connectors are bridged instead of left dangling', () => {
	assert.equal(buildCompactOverlayLabel('Arts — Culture Center'), 'Arts — Culture');
	assert.equal(buildCompactOverlayLabel('Arts – Culture Center'), 'Arts – Culture');
	assert.equal(buildCompactOverlayLabel('Arts - Culture Center'), 'Arts - Culture');
});

test('and/or connector is bridged', () => {
	assert.equal(buildCompactOverlayLabel('Food and/or Drink Festival'), 'Food and/or Drink');
});

test('a label never ends on a conjunction even with many words', () => {
	const cases = [
		'Smith and Sons Hardware and Supply',
		'Beaver Brewing and Taproom',
		'Crate & Barrel & More',
		'Food / Drink / Fun',
		'Arts — Culture — Ideas',
		'Food and/or Drink and/or Fun',
	];
	for (const c of cases) {
		const label = buildCompactOverlayLabel(c);
		const lastToken = label.split(/\s+/).pop() ?? '';
		assert.equal(
			isConnectorToken(lastToken),
			false,
			`"${c}" -> "${label}" ends on a connector`
		);
		assert.doesNotMatch(label, /[&+/,;:-]$/u, `"${c}" -> "${label}" ends on a symbol`);
	}
});

// --- significant-word budget -------------------------------------------------

test('keeps first two significant words by default', () => {
	assert.equal(buildCompactOverlayLabel('Columbus Arts Festival Downtown'), 'Columbus Arts');
});

test('connector between words does not consume the word budget', () => {
	// "Washington" + "Jefferson" are the two significant words; "&" is bridged.
	assert.equal(
		buildCompactOverlayLabel('Washington & Jefferson College of Law'),
		'Washington & Jefferson'
	);
});

test('respects a custom significant-word budget', () => {
	assert.equal(buildCompactOverlayLabel('Cave Ridge Music Hall', 1), 'Cave');
	assert.equal(
		buildCompactOverlayLabel('Cave Ridge Music Hall', 3),
		'Cave Ridge Music'
	);
});

test('default budget constant is exported and applied', () => {
	assert.equal(COMPACT_OVERLAY_LABEL_MAX_WORDS, 2);
	assert.equal(
		buildCompactOverlayLabel('Alpha Beta Gamma Delta'),
		buildCompactOverlayLabel('Alpha Beta Gamma Delta', COMPACT_OVERLAY_LABEL_MAX_WORDS)
	);
});

// --- leading-token protection ------------------------------------------------

test('leading article is preserved as part of the name', () => {
	assert.equal(buildCompactOverlayLabel('The Odeon'), 'The Odeon');
	assert.equal(buildCompactOverlayLabel('The Odeon Theater'), 'The Odeon');
});

test('leading connector symbol on a single-word name is kept', () => {
	assert.equal(buildCompactOverlayLabel('&pizza'), '&pizza');
});

test('a name that is only "The" still returns something', () => {
	assert.equal(buildCompactOverlayLabel('The'), 'The');
});

// --- punctuation / symbols ---------------------------------------------------

test('strips trailing comma/punctuation from final word', () => {
	assert.equal(buildCompactOverlayLabel('Smith, Jones'), 'Smith, Jones');
	assert.equal(buildCompactOverlayLabel('Jones,'), 'Jones');
});

test('preserves a period for abbreviations', () => {
	assert.equal(buildCompactOverlayLabel('Acme Co.'), 'Acme Co.');
	assert.equal(buildCompactOverlayLabel('St. Vincent College'), 'St. Vincent');
});

test('source ending in a connector is trimmed', () => {
	assert.equal(buildCompactOverlayLabel('Beaver Brewing &'), 'Beaver Brewing');
	assert.equal(buildCompactOverlayLabel('Rock and'), 'Rock');
});

test('strips bracket noise', () => {
	assert.equal(buildCompactOverlayLabel('Terra Cotta (Pottery)'), 'Terra Cotta');
});

// --- spatial prepositions that legitimately end names are NOT stripped --------

test('does not mangle real names ending in spatial/adverbial words', () => {
	assert.equal(buildCompactOverlayLabel('Five Below'), 'Five Below');
	assert.equal(buildCompactOverlayLabel('Stand Up'), 'Stand Up');
	assert.equal(buildCompactOverlayLabel('Down Under'), 'Down Under');
});

// --- short / empty inputs ----------------------------------------------------

test('single word passes through', () => {
	assert.equal(buildCompactOverlayLabel('Malone'), 'Malone');
});

test('empty / whitespace / null sources return empty string (caller adds fallback)', () => {
	assert.equal(buildCompactOverlayLabel(''), '');
	assert.equal(buildCompactOverlayLabel('   '), '');
	assert.equal(buildCompactOverlayLabel(null), '');
	assert.equal(buildCompactOverlayLabel(undefined), '');
});

test('source of only symbols/connectors collapses to first token', () => {
	assert.equal(buildCompactOverlayLabel('& & &'), '&');
});

// --- fitting rendered pills without mid-word visual cuts ---------------------

const fitsLength = (maxChars: number) => (candidate: string): boolean =>
	candidate.length <= maxChars;

test('shrinks overflowing labels at word boundaries', () => {
	assert.equal(
		shrinkCompactOverlayLabelToFit('Allegheny College', fitsLength('Allegheny'.length)),
		'Allegheny'
	);
});

test('shrinking re-cleans dangling connectors', () => {
	assert.equal(
		shrinkCompactOverlayLabelToFit('Washington & Jefferson', fitsLength('Washington'.length)),
		'Washington'
	);
	assert.equal(
		shrinkCompactOverlayLabelToFit(
			'University of Pittsburgh',
			fitsLength('University'.length)
		),
		'University'
	);
});

test('does not shrink when the label already fits', () => {
	assert.equal(
		shrinkCompactOverlayLabelToFit('Washington & Jefferson', fitsLength(100)),
		'Washington & Jefferson'
	);
});

// --- isConnectorToken helper -------------------------------------------------

test('isConnectorToken recognizes connectors regardless of case/punctuation', () => {
	assert.equal(isConnectorToken('and'), true);
	assert.equal(isConnectorToken('AND'), true);
	assert.equal(isConnectorToken('and,'), true);
	assert.equal(isConnectorToken('&'), true);
	assert.equal(isConnectorToken('of'), true);
	assert.equal(isConnectorToken('the'), true);
});

test('isConnectorToken does not flag ordinary or spatial words', () => {
	assert.equal(isConnectorToken('Clark'), false);
	assert.equal(isConnectorToken('Below'), false);
	assert.equal(isConnectorToken('Up'), false);
	assert.equal(isConnectorToken('Brewing'), false);
});
