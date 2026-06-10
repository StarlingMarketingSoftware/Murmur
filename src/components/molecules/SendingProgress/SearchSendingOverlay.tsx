'use client';

import { FC } from 'react';
import {
	useSendingSessionActions,
	useSendingSessionState,
} from '@/contexts/SendingSessionContext';
import { SendingProgressHeader } from './SendingProgressHeader';
import { SendingResearchCard } from './SendingResearchCard';
import {
	SENDING_RESEARCH_CARD_WIDTH_PX,
	SENDING_STACK_OFFSET_X_PX,
	SENDING_STACK_OFFSET_Y_PX,
} from './constants';

const BACK_CARD_COUNT = 2;

/**
 * Search-tab "actively sending" overlay: the floating Sending progress header
 * with a stacked deck of sending research cards below it (front card = the
 * email currently sending; the next queued contacts peek out behind, exactly
 * like the draft review stack). Rendered over the map; the outer wrapper stays
 * pointer-events:none so only the tagged boxes capture clicks.
 */
export const SearchSendingOverlay: FC = () => {
	const session = useSendingSessionState();
	const { dismiss } = useSendingSessionActions();

	const frontIndex = Math.min(
		Math.max(session.activeIndex, 0),
		Math.max(session.queue.length - 1, 0)
	);
	const frontItem = session.queue[frontIndex] ?? null;
	const backItems = session.queue.slice(frontIndex + 1, frontIndex + 1 + BACK_CARD_COUNT);

	return (
		<div
			className="flex flex-col"
			style={{
				width: '377px',
				gap: '18px',
				opacity: session.status === 'done' ? 0 : 1,
				transition: 'opacity 400ms ease',
			}}
		>
			<div data-campaign-interactive-surface style={{ pointerEvents: 'auto' }}>
				<SendingProgressHeader
					variant="floating"
					total={session.total}
					sentCount={session.sentCount}
					completedCount={session.sentCount + session.failedCount}
					onDismiss={dismiss}
				/>
			</div>
			{frontItem ? (
				<div
					style={{
						position: 'relative',
						width: `${SENDING_RESEARCH_CARD_WIDTH_PX}px`,
						marginLeft: `${BACK_CARD_COUNT * -SENDING_STACK_OFFSET_X_PX}px`,
						marginTop: `${BACK_CARD_COUNT * -SENDING_STACK_OFFSET_Y_PX}px`,
					}}
				>
					{backItems.map((item, depth) => (
						<div
							key={item.emailId}
							aria-hidden="true"
							style={{
								position: 'absolute',
								top: `${(depth + 1) * SENDING_STACK_OFFSET_Y_PX}px`,
								left: `${(depth + 1) * SENDING_STACK_OFFSET_X_PX}px`,
								width: '100%',
								height: '100%',
								opacity: depth === 0 ? 0.72 : 0.5,
								zIndex: BACK_CARD_COUNT - depth,
								pointerEvents: 'none',
								overflow: 'hidden',
							}}
						>
							<SendingResearchCard item={item} tone="dimmed" />
						</div>
					))}
					<div
						key={frontItem.emailId}
						data-campaign-interactive-surface
						className="murmur-sending-card-in"
						style={{
							position: 'relative',
							zIndex: BACK_CARD_COUNT + 1,
							pointerEvents: 'auto',
						}}
					>
						<SendingResearchCard item={frontItem} tone="active" />
					</div>
					<style jsx global>{`
						@keyframes murmur-sending-card-in {
							from {
								opacity: 0;
								transform: translate(
									${SENDING_STACK_OFFSET_X_PX}px,
									${SENDING_STACK_OFFSET_Y_PX}px
								);
							}
							to {
								opacity: 1;
								transform: translate(0, 0);
							}
						}
						.murmur-sending-card-in {
							animation: murmur-sending-card-in 220ms ease;
						}
						@media (prefers-reduced-motion: reduce) {
							.murmur-sending-card-in {
								animation: none;
							}
						}
					`}</style>
				</div>
			) : null}
		</div>
	);
};
