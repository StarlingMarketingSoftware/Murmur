'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/ui';
import { CalendarPlusIcon } from '@/components/atoms/_svg/CalendarPlusIcon';
import {
	VenueChatBubbleActionIcon,
	VenueInviteConnectIcon,
} from '@/components/atoms/_svg/VenueChatActionIcons';
import { BookingRequestBanner } from '@/components/molecules/BookingRequestBanner/BookingRequestBanner';
import { VenueInviteToConnectBanner } from '@/components/molecules/VenueInviteToConnectBanner/VenueInviteToConnectBanner';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	useCancelBookingRequest,
	useCreateBookingRequest,
} from '@/hooks/queryHooks/useBookingRequests';
import { CALENDAR_ENTRY_QUERY_KEYS } from '@/hooks/queryHooks/useCalendarEntries';
import {
	useGetMessages,
	useMarkConversationRead,
	useSendReply,
	type ConversationThreadFilter,
} from '@/hooks/queryHooks/useConversations';
import { VENUE_APPLICATION_QUERY_KEYS } from '@/hooks/queryHooks/useVenueApplications';
import { VENUE_EVENT_QUERY_KEYS } from '@/hooks/queryHooks/useVenueEvents';
import type { ConversationCounterpart } from '@/types';
import { buildVenueInviteToConnectBody } from '@/utils/venueMessageActions';
import { MessageBubble, type ConversationThreadVariant } from './MessageBubble';

interface ConversationThreadProps {
	conversationId: number;
	// Which slice of the conversation to show: 'general' = cold-outreach thread,
	// a number = that application's thread, omitted = merged (artist messenger).
	// Replies and read-marks stay within the same slice.
	thread?: ConversationThreadFilter;
	onBack?: () => void;
	variant?: ConversationThreadVariant;
	// Skip the counterpart header — for hosts (e.g. the mobile venue thread
	// screen) that render their own richer header above the thread.
	hideHeader?: boolean;
	// Rendered in place of the seeded application-summary message's bubble (the
	// one carrying applicationId) — venue surfaces show it as a structured card.
	applicationCard?: ReactNode;
	// Pinned between the message scroll area and the input row (e.g. the venue
	// docked chat's request-to-book pill).
	aboveInput?: ReactNode;
	// Venue hosts opt in to the action stack: start chat, invite to connect, and
	// request-to-book, plus the in-thread request/booked banner.
	enableBookingRequest?: boolean;
	venueMapComposerLayout?: 'default' | 'docked';
	className?: string;
}

function CounterpartHeader({
	counterpart,
	onBack,
	variant,
}: {
	counterpart?: ConversationCounterpart;
	onBack?: () => void;
	variant: ConversationThreadVariant;
}) {
	if (variant === 'venueMap') {
		// Figma restyle: grey bar with only the bold counterpart name — no back
		// chevron (the panel's segment buttons return to the list), no pills.
		return (
			<div className="flex h-[40px] shrink-0 items-center border-b border-black bg-[#EFEFEF] px-[14px]">
				{counterpart && (
					<span className="min-w-0 truncate font-inter text-[16px] font-bold text-black">
						{counterpart.name}
					</span>
				)}
			</div>
		);
	}
	if (!counterpart) return <div className="h-[45px] border-b border-black/10" />;
	const { name, isVenue, businessType, city, state } = counterpart;
	return (
		<div className="flex items-center gap-[10px] border-b border-black/10 px-[14px] py-[10px]">
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					aria-label="Back"
					className="shrink-0 text-[20px] leading-none text-black/50"
				>
					‹
				</button>
			)}
			<span className="min-w-0 truncate font-inter text-[16px] font-bold text-black">
				{name}
			</span>
			{(state || city) && (
				<span className="flex shrink-0 items-center gap-[6px] rounded-[6px] bg-[#FBD6D7] px-[8px] py-[3px] font-inter text-[12px] font-medium text-black">
					<span className="rounded-[5px] bg-[#F7B6B8] px-[5px] py-[1px] font-semibold">
						{state || city}
					</span>
					{state && city ? city : null}
				</span>
			)}
			{isVenue && businessType && (
				<span className="shrink-0 rounded-[6px] bg-[#BBE6FF] px-[10px] py-[3px] font-inter text-[12px] font-medium text-black">
					{businessType}
				</span>
			)}
		</div>
	);
}

function VenueChatActionButton({
	icon,
	label,
	compact = false,
	disabled = false,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	compact?: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={cn(
				'inline-flex w-full max-w-full items-center overflow-hidden rounded-[12px] border-[2px] border-[#85919A] bg-white/20 font-inter font-bold leading-none text-[#85919A] transition hover:border-black hover:bg-[#ACD2FF] hover:text-black active:border-black active:bg-[#ACD2FF] active:text-black disabled:cursor-not-allowed disabled:hover:border-[#85919A] disabled:hover:bg-white/20 disabled:hover:text-[#85919A]',
				compact
					? 'h-[32px] gap-[8px] px-[10px] text-[14px]'
					: 'h-[38px] gap-[10px] px-[13px] text-[16px]',
				disabled && 'opacity-75'
			)}
		>
			<span className="flex shrink-0 items-center justify-center">
				{icon}
			</span>
			<span className="min-w-0 truncate whitespace-nowrap text-left">{label}</span>
		</button>
	);
}

export function ConversationThread({
	conversationId,
	thread,
	onBack,
	variant = 'default',
	hideHeader = false,
	applicationCard,
	aboveInput,
	enableBookingRequest = false,
	venueMapComposerLayout = 'default',
	className,
}: ConversationThreadProps) {
	const { data, isLoading } = useGetMessages(conversationId, { thread });
	const sendReply = useSendReply(conversationId, data?.currentUserRole, {}, thread);
	const markRead = useMarkConversationRead();
	const createBookingRequest = useCreateBookingRequest(conversationId, thread);
	const cancelBookingRequest = useCancelBookingRequest(conversationId, thread);
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	const counterpartInitial = useMemo(
		() => data?.counterpart.name?.trim()[0]?.toUpperCase() || '?',
		[data?.counterpart.name]
	);
	const counterpartFirstName =
		data?.counterpart.name?.trim().split(/\s+/)[0] ?? '';

	const messageCount = data?.items.length ?? 0;

	// Page-level active request (server keeps it non-canceled) — drives the
	// button↔banner swap even when the delivering message paginated out.
	const activeBookingRequest =
		enableBookingRequest &&
		data?.bookingRequest &&
		data.bookingRequest.status !== 'canceled'
			? data.bookingRequest
			: null;
	const showVenueActionButtons =
		enableBookingRequest &&
		data?.currentUserRole === 'venue' &&
		counterpartFirstName !== '';
	const showVenueConversationActions = thread !== 'general';
	const canRequestBooking = showVenueActionButtons && activeBookingRequest == null;

	// The artist confirms on their own schedule (the 10s poll delivers it) — when
	// the active request flips pending→confirmed, refresh the venue's calendar and
	// Booked labels without waiting for a remount. Scoped to the REQUEST id, not
	// just the status: hosts that swap threads in place (the Chat tool re-renders
	// one instance with new props) must not read one thread's 'pending' against
	// another thread's 'confirmed' as a flip.
	const activeBookingStatus = activeBookingRequest?.status ?? null;
	const activeBookingId = activeBookingRequest?.id ?? null;
	const previousBookingRef = useRef<{
		id: number | null;
		status: typeof activeBookingStatus;
	}>({ id: null, status: null });
	useEffect(() => {
		const previous = previousBookingRef.current;
		previousBookingRef.current = { id: activeBookingId, status: activeBookingStatus };
		if (!enableBookingRequest) return;
		if (
			previous.status === 'pending' &&
			activeBookingStatus === 'confirmed' &&
			previous.id === activeBookingId
		) {
			queryClient.invalidateQueries({ queryKey: CALENDAR_ENTRY_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: VENUE_EVENT_QUERY_KEYS.all });
			queryClient.invalidateQueries({ queryKey: VENUE_APPLICATION_QUERY_KEYS.all });
		}
	}, [activeBookingId, activeBookingStatus, enableBookingRequest, queryClient]);

	// Id of the newest message authored by the OTHER side. Drives mark-read so we
	// don't re-POST on our own (optimistic) sends or on every 10s poll tick.
	const latestCounterpartMessageId = useMemo(() => {
		if (!data) return null;
		for (let i = data.items.length - 1; i >= 0; i--) {
			if (data.items[i].sender !== data.currentUserRole) return data.items[i].id;
		}
		return null;
	}, [data]);

	// Mark read on open and when a new counterpart message arrives while open.
	useEffect(() => {
		markRead.mutate({
			conversationId,
			applicationId: typeof thread === 'number' ? thread : undefined,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [conversationId, thread, latestCounterpartMessageId]);

	// Keep the latest message in view (including our own sends).
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: 'end' });
	}, [messageCount]);

	const handleSend = () => {
		const body = draft.trim();
		if (!body || sendReply.isPending) return;
		setDraft('');
		sendReply.mutate(body);
	};

	const focusComposer = () => {
		bottomRef.current?.scrollIntoView({ block: 'end' });
		requestAnimationFrame(() => inputRef.current?.focus());
	};

	const handleInviteToConnect = () => {
		if (sendReply.isPending) return;
		sendReply.mutate(buildVenueInviteToConnectBody());
	};

	const handleRequestBooking = () => {
		if (!canRequestBooking || createBookingRequest.isPending) return;
		createBookingRequest.mutate();
	};
	const useDockedVenueMapComposer =
		variant === 'venueMap' && venueMapComposerLayout === 'docked';

	// Shared input/button elements; the footer chrome around them differs per
	// variant (default = bordered row, venueMap = single black-bordered capsule).
	const input = (
		<input
			ref={inputRef}
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' && !event.shiftKey) {
					event.preventDefault();
					handleSend();
				}
			}}
			placeholder="Type a message…"
			className={
				variant === 'venueMap'
					? useDockedVenueMapComposer
						? 'h-[35px] min-w-0 flex-1 bg-transparent font-inter text-[18px] text-black outline-none placeholder:text-[#9EA3AA]'
						: 'h-[30px] min-w-0 flex-1 bg-transparent font-inter text-[14px] text-black outline-none'
					: 'h-[36px] flex-1 rounded-[18px] border border-black/15 bg-white px-[14px] font-inter text-[14px] outline-none'
			}
		/>
	);
	const replyButton = (
		<button
			type="button"
			onClick={handleSend}
			disabled={!draft.trim() || sendReply.isPending}
			className={
				variant === 'venueMap'
					? useDockedVenueMapComposer
						? 'h-[35px] w-[72px] shrink-0 rounded-full border-[2px] border-black bg-[#9CC2FA] px-[12px] font-inter text-[16px] font-bold text-black transition-opacity disabled:opacity-50'
						: 'h-[30px] shrink-0 rounded-full border border-black bg-[#ACD2FF] px-[18px] font-inter text-[14px] font-semibold text-black transition-opacity disabled:opacity-50'
					: 'h-[36px] shrink-0 rounded-[18px] bg-[#2F6FED] px-[18px] font-inter text-[14px] font-semibold text-white transition-opacity disabled:opacity-50'
			}
		>
			Reply
		</button>
	);

	return (
		<div className={cn('flex h-full flex-col bg-white/70', className)}>
			{!hideHeader && (
				<CounterpartHeader
					counterpart={data?.counterpart}
					onBack={onBack}
					variant={variant}
				/>
			)}
			<CustomScrollbar
				className="min-h-0 flex-1"
				contentClassName={
					useDockedVenueMapComposer
						? 'flex flex-col px-[8px] py-[8px]'
						: 'flex flex-col px-[14px] py-[12px]'
				}
			>
				<div className="flex min-h-full flex-col gap-[8px]">
					{isLoading && (
						<div className="py-[8px] text-center text-[13px] text-black/40">Loading…</div>
					)}
					{!isLoading && messageCount === 0 && (
						<div className="py-[8px] text-center text-[13px] text-black/40">
							No messages yet.
						</div>
					)}
					{data?.items.map((message) =>
						applicationCard != null && message.applicationId != null ? (
							<Fragment key={message.id}>{applicationCard}</Fragment>
						) : message.venueAction?.kind === 'invite-to-connect' ? (
							<VenueInviteToConnectBanner
								key={message.id}
								perspective={data.currentUserRole === 'venue' ? 'venue' : 'artist'}
								counterpartName={
									data.currentUserRole === 'venue'
										? counterpartFirstName
										: data.counterpart.name
								}
								pending={message.id < 0}
								className="-mx-[4px] w-auto"
							/>
						) : message.bookingRequest != null ? (
							message.bookingRequest.status === 'canceled' ? (
								// The venue withdrew it; their thread shows nothing (the button
								// returning is the affordance), the other side keeps a muted trace.
								data.currentUserRole === 'venue' ? null : (
									<div
										key={message.id}
										className="self-center py-[2px] font-inter text-[12px] italic text-black/40"
									>
										Booking request canceled
									</div>
								)
							) : (
								<BookingRequestBanner
									key={message.id}
									status={message.bookingRequest.status}
									perspective={data.currentUserRole === 'venue' ? 'venue' : 'artist'}
									counterpartFirstName={counterpartFirstName}
									date={message.bookingRequest.date}
									pending={message.id < 0}
									compact={useDockedVenueMapComposer}
									onCancel={
										data.currentUserRole === 'venue' &&
										message.bookingRequest.status === 'pending' &&
										message.bookingRequest.id > 0
											? () => cancelBookingRequest.mutate(message.bookingRequest!.id)
											: undefined
									}
									className={
										useDockedVenueMapComposer
											? 'mx-[8px] w-auto overflow-hidden rounded-[4px]'
											: '-mx-[14px] w-auto'
									}
								/>
							)
						) : (
							<MessageBubble
								key={message.id}
								message={message}
								currentUserRole={data.currentUserRole}
								counterpartInitial={counterpartInitial}
								variant={variant}
							/>
						)
					)}
					{/* Fallback: the active request's delivery message can paginate out of
					    the loaded page — the page-level state still renders the banner so
					    the venue keeps its status (and the cancel affordance). */}
					{activeBookingRequest != null &&
						activeBookingRequest.status !== 'canceled' &&
						!(data?.items ?? []).some(
							(message) => message.bookingRequest?.id === activeBookingRequest.id
						) && (
							<BookingRequestBanner
								status={activeBookingRequest.status}
								perspective={data?.currentUserRole === 'venue' ? 'venue' : 'artist'}
								counterpartFirstName={counterpartFirstName}
								date={activeBookingRequest.date}
								compact={useDockedVenueMapComposer}
								onCancel={
									data?.currentUserRole === 'venue' &&
									activeBookingRequest.status === 'pending' &&
									activeBookingRequest.id > 0
										? () => cancelBookingRequest.mutate(activeBookingRequest.id)
										: undefined
								}
								className={
									useDockedVenueMapComposer
										? 'mx-[8px] w-auto overflow-hidden rounded-[4px]'
										: '-mx-[14px] w-auto'
								}
							/>
						)}
					{/* Action stack rides at the end of the conversation (scrolls with the
					    messages) rather than pinned above the composer. */}
					{showVenueActionButtons && (
						<div
							className={cn(
								'mt-auto grid max-w-full grid-cols-[max-content] justify-end self-end px-[4px]',
								useDockedVenueMapComposer
									? 'gap-[16px] pb-[18px] pt-[24px]'
									: 'gap-[14px] pt-[24px]'
							)}
						>
							{showVenueConversationActions && (
								<>
									<VenueChatActionButton
										icon={
											<VenueChatBubbleActionIcon
												className={
													useDockedVenueMapComposer ? 'h-[16px] w-[16px]' : 'h-[20px] w-[20px]'
												}
											/>
										}
										label={`Start Chat with ${counterpartFirstName}`}
										compact={useDockedVenueMapComposer}
										onClick={focusComposer}
									/>
									<VenueChatActionButton
										icon={
											<VenueInviteConnectIcon
												className={
													useDockedVenueMapComposer ? 'h-[15px] w-[17px]' : 'h-[18px] w-[20px]'
												}
											/>
										}
										label={`Invite ${counterpartFirstName} to connect`}
										compact={useDockedVenueMapComposer}
										disabled={sendReply.isPending}
										onClick={handleInviteToConnect}
									/>
								</>
							)}
							<VenueChatActionButton
								icon={
									<CalendarPlusIcon
										className={useDockedVenueMapComposer ? 'h-[16px] w-[16px]' : 'h-[20px] w-[20px]'}
									/>
								}
								label={`Request to book ${counterpartFirstName}`}
								compact={useDockedVenueMapComposer}
								disabled={!canRequestBooking || createBookingRequest.isPending}
								onClick={handleRequestBooking}
							/>
						</div>
					)}
					<div ref={bottomRef} />
				</div>
			</CustomScrollbar>
			{aboveInput}
			{variant === 'venueMap' ? (
				<div
					className={
						useDockedVenueMapComposer ? 'px-[12px] py-[8px]' : 'px-[12px] py-[10px]'
					}
				>
					<div
						className={
							useDockedVenueMapComposer
								? 'flex h-[42px] items-center gap-[8px] rounded-full border-[2px] border-black bg-white pl-[20px] pr-[4px]'
								: 'flex items-center gap-[8px] rounded-full border border-black bg-white py-[4px] pl-[16px] pr-[5px]'
						}
					>
						{input}
						{replyButton}
					</div>
				</div>
			) : (
				<div className="flex items-center gap-[8px] border-t border-black/10 px-[12px] py-[10px]">
					{input}
					{replyButton}
				</div>
			)}
		</div>
	);
}
