// Run with: npx tsx src/app/api/stripe/checkout/returnPaths.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
	checkoutReturnPathSchema,
	getHostedCheckoutCancelPath,
	isSafeCheckoutReturnPath,
} from './returnPaths';

test('checkout return paths accept relative application paths', () => {
	assert.equal(checkoutReturnPathSchema.parse('/pricing'), '/pricing');
	assert.equal(
		checkoutReturnPathSchema.parse('/pricing?checkoutBillingCycle=month#plans'),
		'/pricing?checkoutBillingCycle=month#plans'
	);
	assert.equal(checkoutReturnPathSchema.parse(' /pricing/free-trial '), '/pricing/free-trial');
});

test('checkout return paths reject external or ambiguous paths', () => {
	for (const path of [
		'',
		'pricing',
		'https://example.com/pricing',
		'//example.com/pricing',
		'///example.com/pricing',
		'/\\example.com/pricing',
	]) {
		assert.equal(isSafeCheckoutReturnPath(path), false, path);
		assert.throws(() => checkoutReturnPathSchema.parse(path), path);
	}
});

test('hosted checkout cancel path defaults to pricing', () => {
	assert.equal(getHostedCheckoutCancelPath(), '/pricing');
	assert.equal(getHostedCheckoutCancelPath('/pricing/free-trial'), '/pricing/free-trial');
});
