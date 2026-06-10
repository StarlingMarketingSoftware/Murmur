import test from 'node:test';
import assert from 'node:assert/strict';

process.env.UNSUBSCRIBE_SECRET = 'test-secret';

import { buildUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe';

test('round-trips a payload', () => {
	const token = buildUnsubscribeToken({ email: 'venue@example.com', userId: 'user_123' });
	assert.deepEqual(verifyUnsubscribeToken(token), {
		email: 'venue@example.com',
		userId: 'user_123',
	});
});

test('lowercases the email', () => {
	const token = buildUnsubscribeToken({ email: 'Venue@Example.COM', userId: 'user_123' });
	assert.equal(verifyUnsubscribeToken(token)?.email, 'venue@example.com');
});

test('rejects a tampered payload', () => {
	const token = buildUnsubscribeToken({ email: 'venue@example.com', userId: 'user_123' });
	const [version, , signature] = token.split('.');
	const forgedPayload = Buffer.from(
		JSON.stringify({ e: 'other@example.com', u: 'user_123' })
	).toString('base64url');
	assert.equal(verifyUnsubscribeToken(`${version}.${forgedPayload}.${signature}`), null);
});

test('rejects a tampered signature', () => {
	const token = buildUnsubscribeToken({ email: 'venue@example.com', userId: 'user_123' });
	assert.equal(verifyUnsubscribeToken(`${token.slice(0, -2)}xx`), null);
});

test('rejects garbage', () => {
	assert.equal(verifyUnsubscribeToken(''), null);
	assert.equal(verifyUnsubscribeToken('v1'), null);
	assert.equal(verifyUnsubscribeToken('v2.a.b'), null);
	assert.equal(verifyUnsubscribeToken('not even a token'), null);
});
