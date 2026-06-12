import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	CANCELED_ABOVE_FOLD_GRACE_MS,
	deriveEventChatStatus,
	formatEventDateLabel,
	stripTrailingDateFromEventName,
} from './eventChatStatus';
import type { MyEventApplication } from '@/app/api/events/applications/route';

const NOW_MS = Date.parse('2026-06-11T18:00:00.000Z');

type App = Pick<MyEventApplication, 'status' | 'event' | 'booking' | 'bookedByOther'>;

const baseEvent = (
	overrides: Partial<NonNullable<MyEventApplication['event']>> = {}
): NonNullable<MyEventApplication['event']> => ({
	id: 1,
	name: 'Singer Songwriter for December 2nd',
	whenLabel: 'December 2nd 2026',
	startsAt: '2026-12-02T20:00:00.000Z',
	pay: '$450',
	details: 'Looking for a solo musician',
	latitude: 40.0875,
	longitude: -74.9356,
	isActive: true,
	updatedAt: '2026-06-01T00:00:00.000Z',
	venueName: 'Wolf Street Tavern',
	venueCity: 'Jacksonville',
	venueState: 'Michigan',
	venueBusinessType: 'Wine, Beer & Spirits',
	...overrides,
});

const baseApp = (overrides: Partial<App> = {}): App => ({
	status: 'submitted',
	event: baseEvent(),
	booking: null,
	bookedByOther: false,
	...overrides,
});

test('open application is in-progress, messageable, below the fold', () => {
	const state = deriveEventChatStatus(baseApp(), NOW_MS);
	assert.deepEqual(state, { status: 'in-progress', canMessage: true, isAboveFold: false });
});

test('confirmed booking is booked and stays in the list until the date passes', () => {
	const state = deriveEventChatStatus(
		baseApp({ booking: { requestId: 1, status: 'confirmed', date: '2026-12-02' } }),
		NOW_MS
	);
	assert.deepEqual(state, { status: 'booked', canMessage: true, isAboveFold: false });
});

test('booked + elapsed date keeps the booked pill but moves above the fold', () => {
	const state = deriveEventChatStatus(
		baseApp({
			event: baseEvent({ startsAt: '2026-06-01T20:00:00.000Z' }),
			booking: { requestId: 1, status: 'confirmed', date: '2026-06-01' },
		}),
		NOW_MS
	);
	assert.deepEqual(state, { status: 'booked', canMessage: true, isAboveFold: true });
});

test('pending booking request does not count as booked', () => {
	const state = deriveEventChatStatus(
		baseApp({ booking: { requestId: 1, status: 'pending', date: null } }),
		NOW_MS
	);
	assert.equal(state.status, 'in-progress');
});

test('booked by another artist closes the chat but keeps it messageable', () => {
	const state = deriveEventChatStatus(baseApp({ bookedByOther: true }), NOW_MS);
	assert.deepEqual(state, { status: 'closed', canMessage: true, isAboveFold: true });
});

test('elapsed event date closes the chat', () => {
	const state = deriveEventChatStatus(
		baseApp({ event: baseEvent({ startsAt: '2026-06-10T20:00:00.000Z' }) }),
		NOW_MS
	);
	assert.deepEqual(state, { status: 'closed', canMessage: true, isAboveFold: true });
});

test('withdrawn application closes the chat', () => {
	const state = deriveEventChatStatus(baseApp({ status: 'withdrawn' }), NOW_MS);
	assert.equal(state.status, 'closed');
});

test('event with no startsAt stays open (no elapsed close)', () => {
	const state = deriveEventChatStatus(
		baseApp({ event: baseEvent({ startsAt: null }) }),
		NOW_MS
	);
	assert.equal(state.status, 'in-progress');
});

test('soft-deleted event is canceled and read-only, in place during the grace day', () => {
	const canceledAt = new Date(NOW_MS - CANCELED_ABOVE_FOLD_GRACE_MS / 2).toISOString();
	const state = deriveEventChatStatus(
		baseApp({ event: baseEvent({ isActive: false, updatedAt: canceledAt }) }),
		NOW_MS
	);
	assert.deepEqual(state, { status: 'canceled', canMessage: false, isAboveFold: false });
});

test('canceled moves above the fold after the grace day', () => {
	const canceledAt = new Date(NOW_MS - CANCELED_ABOVE_FOLD_GRACE_MS - 1).toISOString();
	const state = deriveEventChatStatus(
		baseApp({ event: baseEvent({ isActive: false, updatedAt: canceledAt }) }),
		NOW_MS
	);
	assert.deepEqual(state, { status: 'canceled', canMessage: false, isAboveFold: true });
});

test('canceled beats booked', () => {
	const state = deriveEventChatStatus(
		baseApp({
			event: baseEvent({ isActive: false }),
			booking: { requestId: 1, status: 'confirmed', date: '2026-12-02' },
		}),
		NOW_MS
	);
	assert.equal(state.status, 'canceled');
	assert.equal(state.canMessage, false);
});

test('booked beats closed (bookedByOther flag is ignored once mine is confirmed)', () => {
	const state = deriveEventChatStatus(
		baseApp({
			booking: { requestId: 1, status: 'confirmed', date: '2026-12-02' },
			bookedByOther: true,
		}),
		NOW_MS
	);
	assert.equal(state.status, 'booked');
});

test('missing event (deleted row) is canceled and above the fold', () => {
	const state = deriveEventChatStatus(baseApp({ event: null }), NOW_MS);
	assert.deepEqual(state, { status: 'canceled', canMessage: false, isAboveFold: true });
});

test('formatEventDateLabel: today / tomorrow / short date / whenLabel fallback', () => {
	const todayIso = new Date(NOW_MS).toISOString();
	assert.equal(formatEventDateLabel({ startsAt: todayIso, whenLabel: null }, NOW_MS), 'Today');
	const tomorrow = new Date(NOW_MS);
	tomorrow.setDate(tomorrow.getDate() + 1);
	assert.equal(
		formatEventDateLabel({ startsAt: tomorrow.toISOString(), whenLabel: null }, NOW_MS),
		'Tomorrow'
	);
	const dec2 = new Date(2026, 11, 2, 12, 0, 0);
	assert.equal(
		formatEventDateLabel({ startsAt: dec2.toISOString(), whenLabel: null }, NOW_MS),
		'Dec 2'
	);
	assert.equal(
		formatEventDateLabel({ startsAt: null, whenLabel: 'June 15th 2026' }, NOW_MS),
		'June 15th 2026'
	);
	assert.equal(formatEventDateLabel({ startsAt: null, whenLabel: null }, NOW_MS), 'Date TBD');
});

test('stripTrailingDateFromEventName strips embedded dates, keeps the rest', () => {
	assert.equal(
		stripTrailingDateFromEventName('Singer Songwriter for December 2nd'),
		'Singer Songwriter for'
	);
	assert.equal(
		stripTrailingDateFromEventName('Singer Songwriter for Dec 2, 2026'),
		'Singer Songwriter for'
	);
	assert.equal(stripTrailingDateFromEventName('Open Mic Night'), 'Open Mic Night');
	assert.equal(stripTrailingDateFromEventName('Jazz Night 12/2'), 'Jazz Night');
	// Degenerate name that is only a date falls back to the original.
	assert.equal(stripTrailingDateFromEventName('December 2nd'), 'December 2nd');
});
