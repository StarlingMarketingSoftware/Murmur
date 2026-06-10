'use client';

import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ConversationThread } from '@/components/organisms/ConversationsPane';
import { type ConversationThreadFilter } from '@/hooks/queryHooks/useConversations';

// Shrink the wrapper to the visual viewport when the iOS keyboard opens so the
// composer stays visible, and restore on close. Uses ONLY visualViewport.height
// — width-based handlers jitter on mobile (see the campaign page's
// visualViewport notes) — and writes style directly on the node (no re-renders).
function useVisualViewportHeight(ref: React.RefObject<HTMLDivElement | null>) {
	useEffect(() => {
		if (typeof window === 'undefined' || !window.visualViewport) return;
		const viewport = window.visualViewport;
		const node = ref.current;
		if (!node) return;
		const update = () => {
			// Keyboard open ⇔ the visual viewport is shorter than the layout viewport.
			if (viewport.height < window.innerHeight - 1) {
				const top = node.getBoundingClientRect().top;
				node.style.height = `${viewport.height - top}px`;
			} else {
				node.style.height = '';
			}
		};
		viewport.addEventListener('resize', update);
		viewport.addEventListener('scroll', update);
		return () => {
			viewport.removeEventListener('resize', update);
			viewport.removeEventListener('scroll', update);
			node.style.height = '';
		};
	}, [ref]);
}

// Full-screen open-thread view for the mobile Chat tab: white header (back
// chevron, counterpart name, optional event pill) over the shared
// ConversationThread (venueMap variant, header hidden — we own it here).
export function MobileVenueChatThread({
	conversationId,
	thread,
	title,
	eventChip,
	onBack,
}: {
	conversationId: number;
	thread: ConversationThreadFilter;
	title: string;
	eventChip: { label: string; color: string; countdown: string } | null;
	onBack: () => void;
}) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	useVisualViewportHeight(wrapperRef);

	return (
		<div
			ref={wrapperRef}
			className="flex h-full flex-col"
			style={{ background: 'linear-gradient(180deg, #BBD4F7 0%, #FFFFFF 100%)' }}
		>
			<div className="flex h-[48px] shrink-0 items-center gap-[8px] border-b-[2px] border-black bg-white px-[8px]">
				<button
					type="button"
					aria-label="Back"
					onClick={onBack}
					className="flex shrink-0 items-center justify-center p-[11px]"
				>
					<ChevronLeft className="h-[22px] w-[22px] text-black" />
				</button>
				<span className="min-w-0 flex-1 truncate font-inter text-[17px] font-bold text-black">
					{title}
				</span>
				{eventChip && (
					<span
						className="flex h-[24px] shrink-0 items-center gap-[8px] rounded-[6px] px-[10px]"
						style={{ backgroundColor: eventChip.color }}
					>
						<span className="max-w-[120px] truncate font-inter text-[13px] font-medium leading-none text-black">
							{eventChip.label}
						</span>
						<span className="shrink-0 font-inter text-[13px] leading-none text-black">
							{eventChip.countdown}
						</span>
					</span>
				)}
			</div>
			{/* Composer padding: the thread's own footer sits flush, so the wrapper
			    carries the home-indicator safe area below it. */}
			<div
				className="flex min-h-0 flex-1 flex-col"
				style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
			>
				<ConversationThread
					conversationId={conversationId}
					thread={thread}
					variant="venueMap"
					hideHeader
					className="min-h-0 flex-1 bg-transparent"
				/>
			</div>
		</div>
	);
}
