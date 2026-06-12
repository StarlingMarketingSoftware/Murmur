'use client';

import { FC, useEffect, useRef } from 'react';
import {
	useSendingSessionActions,
	useSendingSessionState,
} from '@/contexts/SendingSessionContext';
import { SendingProgressHeader } from '@/components/molecules/SendingProgress/SendingProgressHeader';
import { SendingContactCard } from '@/components/molecules/SendingProgress/SendingContactCard';
import { SENDING_PANEL_GREEN } from '@/components/molecules/SendingProgress/constants';

export interface SendingExpandedListProps {
	width: number | string;
	height: number | string;
}

/**
 * The left expanded panel's "actively sending" mode — swapped in for
 * ContactsExpandedList/DraftPreviewExpandedList while a send session runs.
 * Green panel with the Sending progress header and one card per queued email;
 * the active card highlights and the list auto-scrolls as the batch advances.
 */
export const SendingExpandedList: FC<SendingExpandedListProps> = ({ width, height }) => {
	const session = useSendingSessionState();
	const { dismiss } = useSendingSessionActions();
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

	// Keep the active card near the top as the highlight advances.
	useEffect(() => {
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
	}, [session.activeIndex, session.queue]);

	const cardOpacity = (index: number): number => {
		const item = session.queue[index];
		if (item?.status === 'sent' || item?.status === 'failed') return 0.45;
		if (index === session.activeIndex || session.activeIndex < 0) return 1;
		return Math.max(0.25, 1 - 0.18 * (index - session.activeIndex));
	};

	return (
		<div
			className="relative flex flex-col rounded-[8px] border border-black overflow-hidden"
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
			<div
				ref={scrollRef}
				className="relative flex-1 overflow-y-auto px-2 pb-2"
				style={{ scrollbarWidth: 'none' }}
			>
				<div className="flex flex-col gap-2">
					{session.queue.map((item, index) => (
						<div
							key={item.emailId}
							ref={(el) => {
								if (el) cardRefs.current.set(item.emailId, el);
								else cardRefs.current.delete(item.emailId);
							}}
						>
							<SendingContactCard
								item={item}
								isActive={index === session.activeIndex && item.status === 'sending'}
								opacity={cardOpacity(index)}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
