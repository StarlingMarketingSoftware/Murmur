import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	buildBookingRequestBody,
	composeArtistEntryNotes,
	composeVenueEntryContent,
	formatEventTimeLabel,
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
	const withEvent = serializeBookingRequest(
		row,
		{
			name: 'Jazz Night',
			startsAt,
			whenLabel: 'June 15th 2026',
			startTime: '19:00',
			endTime: '22:30',
			address: '100 Main St, Malvern, PA',
			latitude: 40.04,
			longitude: -75.51,
			size: 'Full Band',
			genres: ['jazz', 'funk'],
			pay: '$300',
			details: 'Two sets, originals welcome',
		},
		{
			venueName: 'The Note',
			address: '100 Main St',
			city: 'Malvern',
			state: 'PA',
			businessType: 'Listening room',
			capacityMin: 80,
			capacityMax: 150,
			genres: ['jazz', 'soul'],
			payRange: null,
			payMin: 100,
			payMax: 250,
			sound: 'Full PA provided',
			description: 'Intimate room focused on live music.',
			website: 'thenote.com',
		}
	);
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
		eventStartTimeLabel: '7 pm',
		eventEndTimeLabel: '10:30 pm',
		eventAddress: '100 Main St, Malvern, PA',
		eventLatitude: 40.04,
		eventLongitude: -75.51,
		venueName: 'The Note',
		bookingNotes:
			'Event: Jazz Night • 7 pm - 10:30 pm • Full Band • Pay: $300 • ' +
			'Two sets, originals welcome • Venue: The Note • Listening room • ' +
			'100 Main St, Malvern, PA • Capacity 80-150 • jazz, funk • ' +
			'Sound: Full PA provided • thenote.com • Intimate room focused on live music.',
	});
	const withoutEvent = serializeBookingRequest({ ...row, eventId: null }, null);
	assert.equal(withoutEvent.eventId, null);
	assert.equal(withoutEvent.eventName, null);
	assert.equal(withoutEvent.eventStartsAt, null);
	assert.equal(withoutEvent.eventWhenLabel, null);
	assert.equal(withoutEvent.eventStartTimeLabel, null);
	assert.equal(withoutEvent.eventAddress, null);
	assert.equal(withoutEvent.venueName, null);
	assert.equal(withoutEvent.bookingNotes, null);
});

test('formatEventTimeLabel converts HH:MM to calendar labels', () => {
	assert.equal(formatEventTimeLabel('21:00'), '9 pm');
	assert.equal(formatEventTimeLabel('21:30'), '9:30 pm');
	assert.equal(formatEventTimeLabel('09:00'), '9 am');
	assert.equal(formatEventTimeLabel('00:00'), '12 am');
	assert.equal(formatEventTimeLabel('12:00'), '12 pm');
	assert.equal(formatEventTimeLabel('  '), null);
	assert.equal(formatEventTimeLabel(null), null);
	assert.equal(formatEventTimeLabel('9 pm'), null);
	assert.equal(formatEventTimeLabel('25:00'), null);
});

test('composeArtistEntryNotes skips empty parts and falls back to venue pay', () => {
	const sparse = composeArtistEntryNotes(
		{
			name: 'Open Mic',
			startsAt: null,
			whenLabel: null,
			startTime: '19:00',
			endTime: null,
			address: null,
			latitude: null,
			longitude: null,
			size: null,
			genres: [],
			pay: null,
			details: null,
		},
		{
			venueName: 'The Note',
			address: null,
			city: 'Malvern',
			state: 'PA',
			businessType: null,
			capacityMin: null,
			capacityMax: 150,
			genres: [],
			payRange: '$50-$100 per set',
			payMin: null,
			payMax: null,
			sound: null,
			description: null,
			website: null,
		}
	);
	// No time range without BOTH ends; venue payRange wins when the event has no pay.
	assert.equal(
		sparse,
		'Event: Open Mic • Pay: $50-$100 per set • Venue: The Note • Malvern, PA • Capacity up to 150'
	);
	assert.equal(composeArtistEntryNotes(null, null), '');
});

test('composeArtistEntryNotes truncates long event details and descriptions', () => {
	const notes = composeArtistEntryNotes(
		{
			name: null,
			startsAt: null,
			whenLabel: null,
			startTime: null,
			endTime: null,
			address: null,
			latitude: null,
			longitude: null,
			size: null,
			genres: [],
			pay: null,
			details: 'd'.repeat(200),
		},
		null
	);
	assert.equal(notes, `${'d'.repeat(139)}…`);
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
