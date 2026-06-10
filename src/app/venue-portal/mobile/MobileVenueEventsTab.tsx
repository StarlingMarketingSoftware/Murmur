'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Event as VenueEvent } from '@prisma/client';
import {
	useDeleteVenueEvent,
	useGetVenueEvents,
} from '@/hooks/queryHooks/useVenueEvents';
import {
	formatApplicantCount,
	formatVenueOpportunityDate,
	formatVenueOpportunityTimeRange,
	isVenueOpportunityLive,
} from '../venueOpportunityFormat';
import { MobileVenueEventDetail } from './MobileVenueEventDetail';

const SKELETON_WAVE_DURATION_S = 4.8;
const SKELETON_WAVE_STEP_S = 1.2;

// Single event card (Figma frame 1287). The open action and the delete
// affordance are sibling buttons (the X floats over the card's top-right) so
// the markup stays valid — no nested buttons — while the whole card remains a
// single tap target. Delete is touch-first: the X is always visible (no hover
// reveal) and swaps to a red "Delete?" confirm pill on first tap.
function MobileVenueEventCard({
	opportunity,
	applicantCount,
	confirming,
	deletePending,
	onOpen,
	onDeleteTap,
}: {
	opportunity: VenueEvent;
	applicantCount: number;
	confirming: boolean;
	deletePending: boolean;
	onOpen: () => void;
	onDeleteTap: () => void;
}) {
	return (
		<div className="relative w-full shrink-0">
			<button
				type="button"
				onClick={onOpen}
				aria-label={`View ${opportunity.name}`}
				className="flex min-h-[92px] w-full flex-col justify-between rounded-[9.496px] border-[2.374px] border-black bg-[#F7FFF0] p-[12px] text-left font-inter text-black"
			>
				<span className="block w-full truncate pr-[32px] text-[18px] font-bold leading-tight">
					{opportunity.name}
				</span>
				<span className="mt-[10px] flex w-full flex-wrap items-center gap-[8px]">
					<span className="flex h-[24px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#FF818A] px-[10px] text-[13px] font-medium leading-none">
						{formatVenueOpportunityDate(opportunity.whenLabel, opportunity.startsAt)}
					</span>
					<span className="shrink-0 text-[13px] font-medium leading-none">
						{formatVenueOpportunityTimeRange(opportunity.startTime, opportunity.endTime)}
					</span>
					<span className="flex h-[24px] shrink-0 items-center justify-center rounded-[8px] border-[1.5px] border-black bg-[#F7EFC0] px-[10px] text-[13px] font-medium leading-none">
						{formatApplicantCount(applicantCount)}
					</span>
					{isVenueOpportunityLive(opportunity) && (
						<span className="flex h-[24px] shrink-0 items-center justify-center gap-[5px] rounded-[8px] border-[1.5px] border-black bg-[#C5EDA0] px-[10px] text-[13px] font-medium leading-none">
							<span
								aria-hidden="true"
								className="h-[7px] w-[7px] rounded-full bg-[#34A853]"
							/>
							Live
						</span>
					)}
				</span>
			</button>
			{confirming ? (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onDeleteTap();
					}}
					disabled={deletePending}
					aria-label="Confirm delete event"
					className="absolute right-[10px] top-[10px] flex h-[26px] items-center justify-center rounded-full bg-[#FF4D5E] px-[10px] font-inter text-[12px] font-medium leading-none text-white disabled:opacity-60"
				>
					Delete?
				</button>
			) : (
				<button
					type="button"
					onClick={(event) => {
						event.stopPropagation();
						onDeleteTap();
					}}
					aria-label="Delete event"
					className="absolute right-[2px] top-[2px] flex items-center justify-center p-[10px] text-black"
				>
					<X className="h-[18px] w-[18px]" strokeWidth={2.5} />
				</button>
			)}
		</div>
	);
}

// Mobile Events tab: the event-card list over the map, or — when a card has
// been opened — the full-screen event detail. The list owns its own scrolling
// inside the frame's flex-1 slot. The events query here shares the parent's
// query key, so it only reads cache status (isPending/isError) — no extra
// fetch.
export function MobileVenueEventsTab({
	opportunities,
	applicantCountByEventId,
	eventDetailId,
	onOpenEvent,
	onCloseEvent,
	onAddEvent,
	onEditEvent,
}: {
	opportunities: VenueEvent[];
	applicantCountByEventId: Map<number, number>;
	eventDetailId: number | null;
	onOpenEvent: (eventId: number) => void;
	onCloseEvent: () => void;
	onAddEvent: () => void;
	onEditEvent: (eventId: number) => void;
}) {
	const { isPending, isError, refetch } = useGetVenueEvents();
	const [confirmingId, setConfirmingId] = useState<number | null>(null);
	const deleteEvent = useDeleteVenueEvent({
		onSuccess: () => setConfirmingId(null),
	});

	// The "Delete?" confirm pill auto-reverts to the X after a few seconds so a
	// stray first tap can't leave the card armed indefinitely.
	useEffect(() => {
		if (confirmingId === null) return;
		const timeout = setTimeout(() => setConfirmingId(null), 3000);
		return () => clearTimeout(timeout);
	}, [confirmingId]);

	const handleDeleteTap = (eventId: number) => {
		if (confirmingId === eventId) {
			deleteEvent.mutate(eventId);
			return;
		}
		setConfirmingId(eventId);
	};

	// A deleted event automatically falls back to the list (find returns null).
	const detailEvent =
		opportunities.find((opportunity) => opportunity.id === eventDetailId) ?? null;
	if (detailEvent) {
		return (
			<MobileVenueEventDetail
				key={detailEvent.id}
				event={detailEvent}
				fallbackApplicantCount={applicantCountByEventId.get(detailEvent.id) ?? 0}
				onBack={onCloseEvent}
				onEditEvent={onEditEvent}
			/>
		);
	}

	return (
		<div
			className="flex h-full flex-col gap-[12px] overflow-y-auto"
			style={{
				padding: '12px 16px',
				paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
				overscrollBehavior: 'contain',
				WebkitOverflowScrolling: 'touch',
			}}
		>
			{isPending ? (
				Array.from({ length: 3 }).map((_, idx) => (
					<div
						key={idx}
						className="mobile-venue-cards-loading-wave-card h-[92px] w-full shrink-0 rounded-[9.496px] border-[2.374px] border-black p-[12px]"
						style={{
							animationDelay: `${-(SKELETON_WAVE_DURATION_S - idx * SKELETON_WAVE_STEP_S)}s`,
						}}
					>
						<div className="flex h-full flex-col justify-between">
							<div className="h-[18px] w-[60%] rounded bg-black/10" />
							<div className="h-[24px] w-[45%] rounded bg-black/10" />
						</div>
					</div>
				))
			) : isError ? (
				<div className="flex flex-col items-center gap-[14px] py-[32px]">
					<span className="font-inter text-[14px] font-medium text-black">
						Couldn&apos;t load events.
					</span>
					<button
						type="button"
						onClick={() => refetch()}
						className="flex h-[44px] items-center justify-center rounded-full border-[1.5px] border-black bg-white px-[20px] font-inter text-[14px] font-medium text-black"
					>
						Retry
					</button>
				</div>
			) : (
				<>
					{opportunities.map((opportunity) => (
						<MobileVenueEventCard
							key={opportunity.id}
							opportunity={opportunity}
							applicantCount={applicantCountByEventId.get(opportunity.id) ?? 0}
							confirming={confirmingId === opportunity.id}
							deletePending={deleteEvent.isPending}
							onOpen={() => onOpenEvent(opportunity.id)}
							onDeleteTap={() => handleDeleteTap(opportunity.id)}
						/>
					))}
					<button
						type="button"
						onClick={onAddEvent}
						aria-label="Add event"
						className="flex h-[56px] w-full shrink-0 items-center justify-center rounded-[9.496px] border-2 border-dashed border-black/50 bg-white/30"
					>
						<span className="text-[22px] font-medium leading-none text-black">+</span>
					</button>
				</>
			)}
		</div>
	);
}
