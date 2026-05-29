import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreview, isVenueContact, serializeMessage } from './messaging';
import type { Message } from '@prisma/client';

test('isVenueContact detects published venue contacts via venueId', () => {
	assert.equal(isVenueContact({ venueId: 7 }), true);
	assert.equal(isVenueContact({ venueId: null }), false);
});

test('buildPreview strips HTML and collapses whitespace', () => {
	assert.equal(buildPreview('<p>Hello   <b>there</b></p>', true), 'Hello there');
	assert.equal(buildPreview('plain  text\n line', false), 'plain text line');
});

test('buildPreview truncates with an ellipsis', () => {
	const preview = buildPreview('a'.repeat(200), false, 50);
	assert.ok(preview.length <= 50);
	assert.ok(preview.endsWith('…'));
});

test('serializeMessage maps a Message row to the API shape', () => {
	const createdAt = new Date('2026-05-29T12:00:00.000Z');
	const row: Message = {
		id: 1,
		conversationId: 2,
		sender: 'standard',
		senderClerkId: 'user_1',
		body: 'hi',
		isHtml: false,
		emailId: null,
		campaignId: null,
		createdAt,
		updatedAt: createdAt,
	};
	const out = serializeMessage(row);
	assert.deepEqual(out, {
		id: 1,
		conversationId: 2,
		sender: 'standard',
		body: 'hi',
		isHtml: false,
		createdAt: '2026-05-29T12:00:00.000Z',
	});
});
