// Run with: npx tsx src/constants/contactCategories.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapBusinessTypeToCategory } from './contactCategories';
import { titleHasStateSuffix } from '@/app/api/contacts/curated-search/distribution';

test('maps the venue picker business-type labels to booking categories', () => {
	assert.equal(mapBusinessTypeToCategory('Music Venue'), 'Music Venues');
	assert.equal(mapBusinessTypeToCategory('Coffee Shop'), 'Coffee Shops');
	assert.equal(mapBusinessTypeToCategory('Festival'), 'Music Festivals');
	assert.equal(mapBusinessTypeToCategory('Wedding'), 'Wedding Venues');
	assert.equal(mapBusinessTypeToCategory('Restaurant'), 'Restaurants');
	assert.equal(mapBusinessTypeToCategory('Winery'), 'Wineries');
});

test('maps custom / free-text business types case-insensitively', () => {
	assert.equal(mapBusinessTypeToCategory('live music venue'), 'Music Venues');
	assert.equal(mapBusinessTypeToCategory('BREWPUB'), 'Breweries');
	assert.equal(mapBusinessTypeToCategory('craft cidery'), 'Cideries');
	assert.equal(mapBusinessTypeToCategory('distillery & tasting room'), 'Distilleries');
	assert.equal(mapBusinessTypeToCategory('cozy cafe'), 'Coffee Shops');
	assert.equal(mapBusinessTypeToCategory('vineyard estate'), 'Wineries');
});

test('returns null for blank or unmappable business types', () => {
	assert.equal(mapBusinessTypeToCategory(''), null);
	assert.equal(mapBusinessTypeToCategory('   '), null);
	assert.equal(mapBusinessTypeToCategory(null), null);
	assert.equal(mapBusinessTypeToCategory(undefined), null);
	assert.equal(mapBusinessTypeToCategory('art gallery'), null);
});

test('canonical "<Category> <State>" title earns the top ranking tier', () => {
	const category = mapBusinessTypeToCategory('Music Venue');
	const titleWithAbbr = `${category} CA`;
	assert.equal(titleWithAbbr, 'Music Venues CA');
	// The 2-letter state code that venues store qualifies for the canonical tier.
	assert.equal(titleHasStateSuffix(titleWithAbbr), true);
	// A full state name also qualifies.
	assert.equal(titleHasStateSuffix('Music Venues California'), true);
	// No state suffix => not the top canonical tier.
	assert.equal(titleHasStateSuffix('Music Venues'), false);
});
