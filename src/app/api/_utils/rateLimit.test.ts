import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withRateLimit } from './rateLimit';

// Rate limiting must NEVER take the API down: without Upstash env vars the
// helper has to allow every request (fail-open), for every tier shape.
describe('withRateLimit fail-open', () => {
	it('allows requests when Upstash env vars are unset', async () => {
		delete process.env.UPSTASH_REDIS_REST_URL;
		delete process.env.UPSTASH_REDIS_REST_TOKEN;

		const req = new Request('http://localhost/api/test');
		assert.equal(await withRateLimit(req, 'ai-expensive', 'test'), null);
		assert.equal(await withRateLimit(req, 'public-unauth', 'test'), null);
		assert.equal(
			await withRateLimit(req, 'paid-external', 'test', {
				ip: [{ tokens: 1, window: '60 s' }],
			}),
			null
		);
	});
});
