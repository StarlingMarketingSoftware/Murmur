'use client';

import { FC, useEffect, useRef } from 'react';
import {
	type SendingSessionState,
	useSendingSessionActions,
	useSendingSessionState,
} from '@/contexts/SendingSessionContext';
import { SendingProgressHeader } from '@/components/molecules/SendingProgress/SendingProgressHeader';
import { SendingContactCard } from '@/components/molecules/SendingProgress/SendingContactCard';
import { SENDING_PANEL_GREEN } from '@/components/molecules/SendingProgress/constants';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { cn } from '@/utils';

const SENDING_CARD_HEIGHT_PX = 108;
const SENDING_CARD_GAP_PX = 8;
const SENDING_HEADER_SPACE_PX = 87;
const SENDING_CARD_DEPTH_STYLES = [
	{ opacity: 1, backgroundColor: '#40CE6F' },
	{ opacity: 0.72, backgroundColor: '#37B561' },
	{ opacity: 0.5, backgroundColor: '#2F9F54' },
	{ opacity: 0.3, backgroundColor: '#236F3B' },
	{ opacity: 0.16, backgroundColor: '#1D5F32' },
] as const;
const SENDING_CARD_MIN_DEPTH_OPACITY = 0.08;

export interface SendingExpandedListProps {
	width: number | string;
	height: number | string;
	/**
	 * When provided, render STATICALLY from this snapshot (the persisted send-queue
	 * view) instead of the live in-memory session — no auto-scroll ticker.
	 */
	staticSession?: Pick<
		SendingSessionState,
		'queue' | 'total' | 'sentCount' | 'failedCount' | 'activeIndex' | 'status'
	>;
	/** Overrides the progress header's dismiss (✕) action. */
	onDismiss?: () => void;
	/** When set, clicking a card calls this with its index (send-queue view focus). */
	onItemClick?: (index: number) => void;
	/** Static send-queue view row currently shown in the center deck. */
	showingIndex?: number;
	/** Optional per-row cancel action for the persisted send-queue view. */
	onItemCancel?: (index: number) => void;
	isItemCanceling?: (index: number) => boolean;
	canCancelItem?: (index: number) => boolean;
}

/**
 * The left expanded panel's "actively sending" mode — swapped in for
 * ContactsExpandedList/DraftPreviewExpandedList while a send session runs.
 * Green panel with the Sending progress header and one card per queued email;
 * the active card highlights and the list auto-scrolls as the batch advances.
 *
 * Also reused STATICALLY by the campaign send-queue view: pass `staticSession`
 * (and optionally `onDismiss`/`onItemClick`) to render the persisted queue with
 * no live ticker.
 */
export const SendingExpandedList: FC<SendingExpandedListProps> = ({
	width,
	height,
	staticSession,
	onDismiss,
	onItemClick,
	showingIndex,
	onItemCancel,
	isItemCanceling,
	canCancelItem,
}) => {
	const liveSession = useSendingSessionState();
	const { dismiss: liveDismiss } = useSendingSessionActions();
	const session = staticSession ?? liveSession;
	const dismiss = onDismiss ?? liveDismiss;
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	const numericHeight =
		typeof height === 'number'
			? height
			: typeof height === 'string' && height.endsWith('px')
				? Number.parseFloat(height)
				: null;
	const minVisibleRows =
		numericHeight !== null && Number.isFinite(numericHeight)
			? Math.max(
					0,
					Math.ceil(
						(numericHeight - SENDING_HEADER_SPACE_PX + SENDING_CARD_GAP_PX) /
							(SENDING_CARD_HEIGHT_PX + SENDING_CARD_GAP_PX)
					)
				)
			: 0;
	const placeholderCount = Math.max(0, minVisibleRows - session.queue.length);

	// Keep the active card near the top as the highlight advances (live mode only).
	useEffect(() => {
		if (staticSession) return;
		if (session.activeIndex < 0) return;
		const activeItem = session.queue[session.activeIndex];
		if (!activeItem) return;
		const scrollEl = scrollRef.current;
		const cardEl = cardRefs.current.get(activeItem.emailId);
		if (!scrollEl || !cardEl) return;
		const prefersReducedMotion =
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		scrollEl.scrollTo({
			top: Math.max(0, cardEl.offsetTop - scrollEl.offsetTop - 8),
			behavior: prefersReducedMotion ? 'auto' : 'smooth',
		});
	}, [session.activeIndex, session.queue, staticSession]);

	const cardDepthStyle = (
		index: number,
		isActive: boolean
	): { opacity: number; backgroundColor?: string } => {
		const item = session.queue[index];
		const isCompleted = item?.status === 'sent' || item?.status === 'failed';
		if (isActive) return { opacity: 1 };
		const depthStyle =
			SENDING_CARD_DEPTH_STYLES[Math.min(index, SENDING_CARD_DEPTH_STYLES.length - 1)];
		const opacity =
			index >= SENDING_CARD_DEPTH_STYLES.length
				? Math.max(
						SENDING_CARD_MIN_DEPTH_OPACITY,
						depthStyle.opacity - 0.04 * (index - SENDING_CARD_DEPTH_STYLES.length + 1)
					)
				: depthStyle.opacity;
		return {
			opacity: isCompleted ? Math.min(opacity, 0.45) : opacity,
			backgroundColor: depthStyle.backgroundColor,
		};
	};
	return (
		<div
			className={cn(
				'relative flex flex-col rounded-[8px] border border-black',
				onItemCancel ? 'overflow-visible' : 'overflow-hidden'
			)}
			style={{
				width,
				height,
				backgroundColor: SENDING_PANEL_GREEN,
				opacity: session.status === 'done' ? 0 : 1,
				transition: 'opacity 400ms ease',
			}}
		>
			<div className="px-2 pt-2 pb-1">
				<SendingProgressHeader
					variant="panel"
					total={session.total}
					sentCount={session.sentCount}
					completedCount={session.sentCount + session.failedCount}
					onDismiss={dismiss}
				/>
			</div>
			<CustomScrollbar
				className="relative min-h-0 flex-1"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={onItemCancel ? 26 : -6}
				contentClassName="px-2 pb-2"
				scrollContainerRef={scrollRef}
				style={{
					width: onItemCancel ? 'calc(100% + 32px)' : undefined,
				}}
			>
				<div
					className="flex flex-col gap-2"
					style={{ width: onItemCancel ? 'calc(100% - 32px)' : undefined }}
				>
					{session.queue.map((item, index) => {
						const isCanceling = isItemCanceling?.(index) ?? false;
						const canCancel = canCancelItem?.(index) ?? true;
						const isShowing = staticSession ? index === showingIndex : false;
						const isActive = staticSession
							? isShowing
							: index === session.activeIndex && item.status === 'sending';
						const depthStyle = cardDepthStyle(index, isActive);
						return (
							<div
								key={item.emailId}
								ref={(el) => {
									if (el) cardRefs.current.set(item.emailId, el);
									else cardRefs.current.delete(item.emailId);
								}}
								className="group relative"
								onClick={onItemClick ? () => onItemClick(index) : undefined}
								style={onItemClick ? { cursor: 'pointer' } : undefined}
							>
								<SendingContactCard
									item={item}
									isActive={isActive}
									opacity={depthStyle.opacity}
									backgroundColor={depthStyle.backgroundColor}
									className={staticSession ? 'h-[108px]' : undefined}
									blendInactiveWithPanel={Boolean(staticSession)}
									disableTransition={Boolean(staticSession)}
								/>
								{onItemCancel && canCancel ? (
									<button
										type="button"
										aria-label="Cancel queued send"
										title="Cancel queued send"
										disabled={isCanceling}
										onClick={(event) => {
											event.stopPropagation();
											onItemCancel(index);
										}}
										className="absolute right-[-38px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center text-black opacity-0 hover:opacity-70 focus:opacity-100 focus:outline-none disabled:pointer-events-none disabled:opacity-40 group-hover:opacity-100"
									>
										<svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
											<path
												d="M1 1L8 8M8 1L1 8"
												stroke="currentColor"
												strokeWidth="1.8"
												strokeLinecap="round"
											/>
										</svg>
									</button>
								) : null}
							</div>
						);
					})}
					{Array.from({ length: placeholderCount }).map((_, index) => {
						const depthStyle = cardDepthStyle(session.queue.length + index, false);
						return (
							<div
								key={`sending-placeholder-${index}`}
								aria-hidden="true"
								className="select-none overflow-hidden rounded-[8px] border-2 border-black"
								style={{
									height: `${SENDING_CARD_HEIGHT_PX}px`,
									backgroundColor: depthStyle.backgroundColor ?? SENDING_PANEL_GREEN,
									opacity: depthStyle.opacity,
								}}
							/>
						);
					})}
				</div>
			</CustomScrollbar>
		</div>
	);
};
