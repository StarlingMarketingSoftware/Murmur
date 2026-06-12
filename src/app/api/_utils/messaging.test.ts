import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildApplicationSummaryHtml,
	buildPreview,
	buildSentApplicationHtml,
	isVenueContact,
	serializeMessage,
} from './messaging';
import { buildVenueInviteToConnectBody } from '@/utils/venueMessageActions';
import type { Message } from '@prisma/client';

test('isVenueContact detects published venue contacts via venueId', () => {
	assert.equal(isVenueContact({ venueId: 7 }), true);
	assert.equal(isVenueContact({ venueId: null }), false);
});

test('buildPreview strips HTML and collapses whitespace', () => {
	assert.equal(buildPreview('<p>Hello   <b>there</b></p>', true), 'Hello there');
	assert.equal(buildPreview('plain  text\n line', false), 'plain text line');
});

test('buildPreview hides venue action markers', () => {
	assert.equal(buildPreview(buildVenueInviteToConnectBody(), false), 'Invite to connect');
});

test('buildPreview truncates with an ellipsis', () => {
	const preview = buildPreview('a'.repeat(200), false, 50);
	assert.ok(preview.length <= 50);
	assert.ok(preview.endsWith('…'));
});

test('buildApplicationSummaryHtml composes allowlisted HTML and escapes values', () => {
	const html = buildApplicationSummaryHtml(
		{
			performingName: 'The <Quartet>',
			genre: 'Jazz',
			area: null,
			bio: 'Line one\nLine two',
		},
		'Jazz & Wine Night'
	);
	assert.equal(
		html,
		'<p><strong>Application — Jazz &amp; Wine Night</strong></p>' +
			'<p><strong>Performing name:</strong> The &lt;Quartet&gt;</p>' +
			'<p><strong>Genre:</strong> Jazz</p>' +
			'<p>Line one<br>Line two</p>'
	);
});

test('buildApplicationSummaryHtml degrades when the event is gone and fields are empty', () => {
	const html = buildApplicationSummaryHtml(
		{ performingName: null, genre: '  ', area: null, bio: null },
		null
	);
	assert.equal(html, '<p><strong>Application</strong></p>');
});

test('buildSentApplicationHtml appends a videos line without touching the summary', () => {
	const summary = '<p><strong>Application — Jazz Night</strong></p>';
	assert.equal(
		buildSentApplicationHtml(summary, 2),
		`${summary}<p><strong>Videos:</strong> 2 attached</p>`
	);
	// No videos → the venue-visible summary passes through byte-identical.
	assert.equal(buildSentApplicationHtml(summary, 0), summary);
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
		applicationId: null,
		threadApplicationId: null,
		bookingRequestId: null,
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
		applicationId: null,
		bookingRequestId: null,
		bookingRequest: null,
		venueAction: null,
		createdAt: '2026-05-29T12:00:00.000Z',
	});
});

test('serializeMessage exposes venue invite actions without the hidden marker', () => {
	const createdAt = new Date('2026-06-11T12:00:00.000Z');
	const row: Message = {
		id: 4,
		conversationId: 2,
		sender: 'venue',
		senderClerkId: 'user_venue',
		body: buildVenueInviteToConnectBody(),
		isHtml: false,
		emailId: null,
		applicationId: null,
		threadApplicationId: null,
		bookingRequestId: null,
		campaignId: null,
		createdAt,
		updatedAt: createdAt,
	};
	const out = serializeMessage(row);
	assert.equal(out.body, 'Invite to connect');
	assert.deepEqual(out.venueAction, {
		kind: 'invite-to-connect',
		label: 'Invite to connect',
	});
});

test('serializeMessage attaches live booking-request state from the lookup map', () => {
	const createdAt = new Date('2026-06-11T12:00:00.000Z');
	const row: Message = {
		id: 5,
		conversationId: 2,
		sender: 'venue',
		senderClerkId: 'user_venue',
		body: 'Booking request — Jazz Night',
		isHtml: false,
		emailId: null,
		applicationId: null,
		threadApplicationId: 9,
		bookingRequestId: 41,
		campaignId: null,
		createdAt,
		updatedAt: createdAt,
	};
	const liveState = {
		id: 41,
		conversationId: 2,
		threadApplicationId: 9,
		eventId: 3,
		status: 'confirmed' as const,
		date: '2026-06-15',
		requestedAt: '2026-06-11T12:00:00.000Z',
		confirmedAt: '2026-06-11T13:00:00.000Z',
		canceledAt: null,
		eventName: 'Jazz Night',
		eventStartsAt: '2026-06-15T23:00:00.000Z',
		eventWhenLabel: 'June 15th 2026',
		eventStartTimeLabel: '7 pm',
		eventEndTimeLabel: '10 pm',
		eventAddress: null,
		eventLatitude: null,
		eventLongitude: null,
		venueName: 'The Note',
		bookingNotes: null,
	};
	const out = serializeMessage(row, new Map([[41, liveState]]));
	assert.equal(out.bookingRequestId, 41);
	assert.deepEqual(out.bookingRequest, liveState);
	assert.equal(out.venueAction, null);
	// A message whose request is missing from the map degrades to null state.
	assert.equal(serializeMessage(row, new Map()).bookingRequest, null);
});
