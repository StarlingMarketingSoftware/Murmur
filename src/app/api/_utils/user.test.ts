// Run with: npx tsx --tsconfig tsconfig.json src/app/api/_utils/user.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveAccountType } from './user';

test('resolveAccountType: explicit venue metadata resolves to venue', () => {
	assert.equal(resolveAccountType({ accountType: 'venue' }), 'venue');
});

test('resolveAccountType: everything else defaults to standard (normal flow undisturbed)', () => {
	assert.equal(resolveAccountType({ accountType: 'standard' }), 'standard');
	assert.equal(resolveAccountType({ accountType: 'artist' }), 'standard');
	assert.equal(resolveAccountType({ accountType: 'VENUE' }), 'standard'); // case-sensitive
	assert.equal(resolveAccountType({}), 'standard');
	assert.equal(resolveAccountType(null), 'standard');
	assert.equal(resolveAccountType(undefined), 'standard');
	assert.equal(resolveAccountType('venue'), 'standard'); // non-object input
	assert.equal(resolveAccountType(42), 'standard');
});
