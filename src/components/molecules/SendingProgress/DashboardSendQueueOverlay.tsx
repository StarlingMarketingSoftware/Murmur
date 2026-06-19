'use client';

import { FC, useMemo, useRef } from 'react';
import { type SendingQueueItem } from '@/contexts/SendingSessionContext';
import { useSendQueue } from '@/hooks/queryHooks/useSendQueue';
import { SendingProgressHeader } from './SendingProgressHeader';
import { SendingResearchCard } from './SendingResearchCard';

const CARD_WIDTH_PX = 417;
const CARD_HEIGHT_PX = 500;
const CARD_RADIUS_PX = 8;
const CARD_HEADER_HEIGHT_PX = 119;
const CARD_HEADER_COLOR = '#77D284';
const HEADER_WIDTH_PX = 426;
// Up to 4 cards visible: the front card + 3 peeking behind it.
const BACK_CARD_COUNT = 3;
const DASHBOARD_STACK_OFFSET_X_PX = -9;
const DASHBOARD_STACK_OFFSET_Y_PX = -10;

export interface DashboardSendQueueOverlayProps {
	campaignId: number;
	onClose: () => void;
}

/**
 * Dashboard search-tab "send queue" overlay: a frozen, non-interactive stack of
 * up to 4 sending research cards (the same card the live SearchSendingOverlay
 * uses) showing what's sitting in the campaign's persisted send queue, opened on
 * demand from the header "in send queue" pill. Sourced from useSendQueue (same
 * query/key as the pill, so the count matches exactly).
 */
export const DashboardSendQueueOverlay: FC<DashboardSendQueueOverlayProps> = ({
	campaignId,
	onClose,
}) => {
	const { items, count } = useSendQueue(campaignId);
	const initialQueueCountRef = useRef<{ campaignId: number; total: number } | null>(
		null
	);

	// Map the persisted queue rows into the same queued timeline shape used by the
	// campaign send-queue view.
	const queue = useMemo<SendingQueueItem[]>(
		() =>
			items.map((it) => {
				const queuedMs = new Date(it.queuedAt).getTime();
				const scheduledMs = new Date(it.scheduledFor).getTime();
				return {
					emailId: it.emailId,
					contactId: it.contactId,
					contact: it.contact,
					kind: it.contact.venueId != null ? 'venueMessage' : 'email',
					subject: it.email.subject,
					status: 'queued' as const,
					logLines: [],
					startedAt: Number.isFinite(scheduledMs) ? scheduledMs : null,
					queuedAt: Number.isFinite(queuedMs) ? queuedMs : undefined,
					scheduledFor: Number.isFinite(scheduledMs) ? scheduledMs : undefined,
					progress: 0,
				};
			}),
		[items]
	);

	const frontItem = queue[0] ?? null;
	const backItems = queue.slice(1, 1 + BACK_CARD_COUNT);
	const stackReserveX = backItems.length * -DASHBOARD_STACK_OFFSET_X_PX;
	const stackReserveY = backItems.length * -DASHBOARD_STACK_OFFSET_Y_PX;
	const overlayWidth = Math.max(HEADER_WIDTH_PX, CARD_WIDTH_PX + stackReserveX);

	if (count <= 0) {
		initialQueueCountRef.current = null;
	} else if (initialQueueCountRef.current?.campaignId !== campaignId) {
		initialQueueCountRef.current = { campaignId, total: count };
	}

	const dashboardTotal = initialQueueCountRef.current?.total ?? count;
	const dashboardSentCount = Math.max(0, Math.min(dashboardTotal, dashboardTotal - count));
	const dashboardProgressFraction =
		dashboardTotal > 0 ? dashboardSentCount / dashboardTotal : 0;

	if (count === 0 || !frontItem) return null;

	return (
		<div
			className="flex flex-col"
			style={{ width: `${overlayWidth}px`, gap: '12px' }}
		>
			<div data-campaign-interactive-surface style={{ pointerEvents: 'auto' }}>
				<SendingProgressHeader
					variant="dashboard"
					total={dashboardTotal}
					sentCount={dashboardSentCount}
					completedCount={dashboardSentCount}
					onDismiss={onClose}
					width={HEADER_WIDTH_PX}
				/>
			</div>
			<div
				style={{
					position: 'relative',
					width: `${CARD_WIDTH_PX}px`,
					marginLeft: `${stackReserveX}px`,
					marginTop: `${stackReserveY}px`,
				}}
			>
				{backItems.map((item, depth) => (
					<div
						key={item.emailId}
						aria-hidden="true"
						style={{
							position: 'absolute',
							top: `${(depth + 1) * DASHBOARD_STACK_OFFSET_Y_PX}px`,
							left: `${(depth + 1) * DASHBOARD_STACK_OFFSET_X_PX}px`,
							width: '100%',
							height: '100%',
							zIndex: BACK_CARD_COUNT - depth,
							pointerEvents: 'none',
							overflow: 'hidden',
						}}
					>
						<SendingResearchCard
							item={item}
							tone="dimmed"
							width={CARD_WIDTH_PX}
							height={CARD_HEIGHT_PX}
							radius={CARD_RADIUS_PX}
							contactCardHeight={CARD_HEADER_HEIGHT_PX}
							contactCardBackgroundColor={CARD_HEADER_COLOR}
							useNaturalBadgeColors
							largeTopBadges
							queuedTimelineTextColor="#000000"
							progressFraction={dashboardProgressFraction}
							centerWebsitePreview
							onWebsitePreviewOpen={onClose}
							layout="dashboard"
						/>
					</div>
				))}
				<div
					key={frontItem.emailId}
					data-campaign-interactive-surface
					style={{
						position: 'relative',
						zIndex: BACK_CARD_COUNT + 1,
						pointerEvents: 'auto',
					}}
				>
					<SendingResearchCard
						item={frontItem}
						tone="active"
						width={CARD_WIDTH_PX}
						height={CARD_HEIGHT_PX}
						radius={CARD_RADIUS_PX}
						contactCardHeight={CARD_HEADER_HEIGHT_PX}
						contactCardBackgroundColor={CARD_HEADER_COLOR}
						useNaturalBadgeColors
						largeTopBadges
						queuedTimelineTextColor="#000000"
						progressFraction={dashboardProgressFraction}
						centerWebsitePreview
						onWebsitePreviewOpen={onClose}
						layout="dashboard"
					/>
				</div>
			</div>
		</div>
	);
};
