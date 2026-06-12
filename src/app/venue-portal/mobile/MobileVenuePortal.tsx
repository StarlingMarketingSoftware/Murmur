'use client';

import { useEffect, useRef, useState } from 'react';
// VenueEventWithBooking (not the bare prisma Event): the GET payload carries the
// confirmed-booking attribution the booked-state UI renders from.
import type { VenueEventWithBooking as VenueEvent } from '@/app/api/venue/events/route';
import { useGetVenue } from '@/hooks/queryHooks/useVenue';
import {
	hasSavedVenueRequiredFields,
	readVenueProfileComplete,
} from '../VenuePortalClient';
import { MobileVenueTabBar, type MobileVenueTab } from './MobileVenueTabBar';
import { MobileVenueChatTab } from './MobileVenueChatTab';
import { MobileVenueCreateTab } from './MobileVenueCreateTab';
import { MobileVenueEventsTab } from './MobileVenueEventsTab';
import { MobileVenueProfileTab } from './MobileVenueProfileTab';

// The mobile venue portal frame: a 100dvh column over the persistent map —
// safe-area gap (map shows through), white tab bar, then the active tab's
// screen. Mirrors the mobile dashboard frame (dashboard/page.tsx); navigation
// is plain state like the desktop portal's tool selection — no URL state.
export function MobileVenuePortal({
	opportunities,
	applicantCountByEventId,
	unreadCount,
}: {
	opportunities: VenueEvent[];
	applicantCountByEventId: Map<number, number>;
	unreadCount: number;
}) {
	// Only mounted client-side after useIsMobile resolves (never SSR'd), so the
	// initializer can read localStorage directly: venues without a completed
	// profile land on the Profile tab to fill in their details (no first-run gate).
	const [activeTab, setActiveTab] = useState<MobileVenueTab>(() =>
		readVenueProfileComplete() ? 'events' : 'profile'
	);
	const [eventDetailId, setEventDetailId] = useState<number | null>(null);
	const [editingEventId, setEditingEventId] = useState<number | null>(null);

	// One-time corrective check once the real venue resolves (stale or missing
	// hint, account switch): an incomplete profile pulls the user onto the
	// Profile tab; a complete one lands on Events (mirrors desktop's optimistic
	// map-entry correction). Skipped if the user already navigated themselves,
	// and never fires again, so it can't yank them mid-edit.
	const { data: venue, isSuccess: hasResolvedVenue } = useGetVenue();
	const hasResolvedInitialTabRef = useRef(false);
	const userNavigatedRef = useRef(false);
	useEffect(() => {
		if (hasResolvedInitialTabRef.current || !hasResolvedVenue) return;
		hasResolvedInitialTabRef.current = true;
		if (userNavigatedRef.current) return;
		setActiveTab(hasSavedVenueRequiredFields(venue) ? 'events' : 'profile');
	}, [hasResolvedVenue, venue]);

	// Tab taps reset sub-views (desktop selectVenueTool parity); re-tapping the
	// active tab is a no-op so it can't blow away an open detail or draft.
	const handleTabChange = (tab: MobileVenueTab) => {
		userNavigatedRef.current = true;
		if (tab === activeTab) return;
		if (tab === 'events') setEventDetailId(null);
		if (tab === 'create') setEditingEventId(null);
		setActiveTab(tab);
	};

	const openCreateEvent = () => {
		setEditingEventId(null);
		setActiveTab('create');
	};
	const openEditEvent = (eventId: number) => {
		setEditingEventId(eventId);
		setActiveTab('create');
	};
	const handleEventSaved = () => {
		setEditingEventId(null);
		setEventDetailId(null);
		setActiveTab('events');
	};

	const editingEvent =
		opportunities.find((opportunity) => opportunity.id === editingEventId) ?? null;

	return (
		// z-[99] clears the interactive map's z-98 canvas (PersistentDashboardMap),
		// same layer as the desktop tool panels.
		<div
			className="relative z-[99] flex w-full flex-col"
			style={{
				height: '100dvh',
				overflow: 'hidden',
				paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
			}}
		>
			<MobileVenueTabBar
				activeTab={activeTab}
				onTabChange={handleTabChange}
				unreadCount={unreadCount}
			/>
			<div className="min-h-0 w-full flex-1" style={{ overflow: 'hidden' }}>
				{activeTab === 'create' && (
					<MobileVenueCreateTab
						key={editingEventId ?? 'new'}
						event={editingEvent}
						onSaved={handleEventSaved}
					/>
				)}
				{activeTab === 'events' && (
					<MobileVenueEventsTab
						opportunities={opportunities}
						applicantCountByEventId={applicantCountByEventId}
						eventDetailId={eventDetailId}
						onOpenEvent={setEventDetailId}
						onCloseEvent={() => setEventDetailId(null)}
						onAddEvent={openCreateEvent}
						onEditEvent={openEditEvent}
					/>
				)}
				{activeTab === 'chat' && <MobileVenueChatTab />}
				{activeTab === 'profile' && <MobileVenueProfileTab />}
			</div>
		</div>
	);
}
