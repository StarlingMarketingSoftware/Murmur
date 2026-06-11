import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildBookingRequestBody,
	composeVenueEntryContent,
	serializeBookingRequest,
} from './bookingRequests';
import type { BookingRequest } from '@prisma/client';

test('buildBookingRequestBody labels the event when known', () => {
	assert.equal(buildBookingRequestBody('Jazz Night'), 'Booking request — Jazz Night');
	assert.equal(buildBookingRequestBody(null), 'Booking request');
});

test('serializeBookingRequest maps a row with and without event context', () => {
	const requestedAt = new Date('2026-06-11T12:00:00.000Z');
	const confirmedAt = new Date('2026-06-11T13:00:00.000Z');
	const row: BookingRequest = {
		id: 41,
		conversationId: 2,
		threadApplicationId: 9,
		eventId: 3,
		venueUserId: 'user_venue',
		standardUserId: 'user_artist',
		venueId: 7,
		status: 'confirmed',
		date: '2026-06-15',
		requestedAt,
		confirmedAt,
		canceledAt: null,
		createdAt: requestedAt,
		updatedAt: confirmedAt,
	};
	const startsAt = new Date('2026-06-15T23:00:00.000Z');
	const withEvent = serializeBookingRequest(row, {
		name: 'Jazz Night',
		startsAt,
		whenLabel: 'June 15th 2026',
	});
	assert.deepEqual(withEvent, {
		id: 41,
		conversationId: 2,
		threadApplicationId: 9,
		eventId: 3,
		status: 'confirmed',
		date: '2026-06-15',
		requestedAt: '2026-06-11T12:00:00.000Z',
		confirmedAt: '2026-06-11T13:00:00.000Z',
		canceledAt: null,
		eventName: 'Jazz Night',
		eventStartsAt: '2026-06-15T23:00:00.000Z',
		eventWhenLabel: 'June 15th 2026',
	});
	const withoutEvent = serializeBookingRequest({ ...row, eventId: null }, null);
	assert.equal(withoutEvent.eventId, null);
	assert.equal(withoutEvent.eventName, null);
	assert.equal(withoutEvent.eventStartsAt, null);
	assert.equal(withoutEvent.eventWhenLabel, null);
});

test('composeVenueEntryContent prefers event times and labels the event', () => {
	const content = composeVenueEntryContent({
		artistName: 'Jeremy Simon',
		eventName: 'Jazz Night',
		eventStartTime: '19:00',
		eventEndTime: '22:00',
		artistStartTime: '9 am',
		artistEndTime: '1 pm',
	});
	assert.deepEqual(content, {
		personName: 'Jeremy Simon',
		company: '',
		startTime: '19:00',
		endTime: '22:00',
		notes: 'Event: Jazz Night',
		address: '',
	});
});

test('composeVenueEntryContent falls back to the artist times and a generic note', () => {
	const content = composeVenueEntryContent({
		artistName: 'Jeremy Simon',
		eventName: null,
		eventStartTime: null,
		eventEndTime: '  ',
		artistStartTime: '9 am',
		artistEndTime: '1 pm',
	});
	assert.equal(content.startTime, '9 am');
	assert.equal(content.endTime, '1 pm');
	assert.equal(content.notes, 'Booked via Murmur');
});
