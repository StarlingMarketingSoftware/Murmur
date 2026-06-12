import assert from 'node:assert/strict';
import { type BookingContactTitlePrefix } from '../src/constants/contactCategories';
import { parseFreeTextSearchQuery } from '../src/app/api/contacts/search/parse';

const expectCategory = (query: string, category: BookingContactTitlePrefix): void => {
	const parsed = parseFreeTextSearchQuery(query);
	assert.ok(
		parsed.categories.includes(category),
		`${query} should include category ${category}`
	);
};

const critical = parseFreeTextSearchQuery(
	'Music venues that support emerging artists in Newark, NJ'
);
assert.equal(critical.city?.name, 'Newark');
assert.equal(critical.city?.state, 'NJ');
assert.equal(critical.city?.coordinatePrecision, 'city');
assert.equal(critical.state?.abbr, 'NJ');
assert.deepEqual(critical.categories, ['Music Venues']);
assert.equal(critical.restOfQuery, 'support emerging artists');

const lowercaseCritical = parseFreeTextSearchQuery(
	'music venues that support emerging artists in newark, nj'
);
assert.equal(lowercaseCritical.city?.name, 'Newark');
assert.equal(lowercaseCritical.state?.abbr, 'NJ');

const nashville = parseFreeTextSearchQuery('music venues in Nashville');
assert.equal(nashville.city?.name, 'Nashville');
assert.equal(nashville.city?.state, 'TN');
assert.equal(nashville.state?.abbr ?? null, null);

const nearMe = parseFreeTextSearchQuery('coffee shops near me');
assert.equal(nearMe.state?.abbr ?? null, null);
assert.equal(nearMe.city?.name ?? null, null);
assert.deepEqual(nearMe.categories, ['Coffee Shops']);

const multiCategory = parseFreeTextSearchQuery('wineries or breweries in nj');
assert.equal(multiCategory.state?.abbr, 'NJ');
assert.equal(multiCategory.restOfQuery, '');
assert.ok(multiCategory.categories.includes('Wineries'));
assert.ok(multiCategory.categories.includes('Breweries'));

const categoryConnectorOnly = parseFreeTextSearchQuery('music venues or breweries');
assert.equal(categoryConnectorOnly.state?.abbr ?? null, null);
assert.equal(categoryConnectorOnly.restOfQuery, '');

const portlandComma = parseFreeTextSearchQuery('music venues in Portland, OR');
assert.equal(portlandComma.city?.name, 'Portland');
assert.equal(portlandComma.state?.abbr, 'OR');

const portlandLower = parseFreeTextSearchQuery('music venues in Portland or');
assert.equal(portlandLower.city?.name, 'Portland');
assert.equal(portlandLower.state?.abbr, 'OR');

const uppercaseIndiana = parseFreeTextSearchQuery('music venues in IN');
assert.equal(uppercaseIndiana.state?.abbr, 'IN');

expectCategory('music venues in Newark, NJ', 'Music Venues');

console.log('free-text parser checks passed');
