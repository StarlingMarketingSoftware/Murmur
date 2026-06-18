'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import { SendingExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/SendingExpandedList';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import type { SendingQueueItem } from '@/contexts/SendingSessionContext';
import type { SendQueueItemVM } from '@/types/sendQueue';
import { SendQueueDeck } from './SendQueueDeck';

export interface SendQueueViewProps {
	items: SendQueueItemVM[];
	onClose: () => void;
}

const LEFT_PANEL_WIDTH = 377;
const LEFT_PANEL_HEIGHT = 597;
const DECK_WIDTH = 460;
const DECK_HEIGHT = 560;
const RESEARCH_WIDTH = 375;
const RESEARCH_HEIGHT = 597;

/**
 * The campaign send-queue VIEW — a read-only overlay over whatever campaign tab
 * is showing. Three columns mirroring the drafts experience: the green "Sending"
 * list (left, static), a read-only one-by-one email deck (center), and the
 * contact research card (right). A fixed, pointer-events:none backdrop lets the
 * map/tabs behind stay live; a document pointerdown listener closes the view when
 * the click lands outside the queue's columns and the header box.
 */
export const SendQueueView: FC<SendQueueViewProps> = ({ items, onClose }) => {
	const [focusedIndex, setFocusedIndex] = useState(0);

	// Keep focus in-bounds as the queue drains/refetches.
	useEffect(() => {
		if (focusedIndex > items.length - 1) setFocusedIndex(Math.max(0, items.length - 1));
	}, [items.length, focusedIndex]);

	// Close when the click lands outside the queue columns + the header box.
	useEffect(() => {
		const onPointerDown = (e: PointerEvent) => {
			const el = e.target instanceof Element ? e.target : null;
			if (el?.closest('[data-send-queue-view-col], [data-campaign-header-box]')) return;
			onClose();
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	}, [onClose]);

	// Map the persisted queue rows into the shape the green "Sending" cards consume.
	// status:'queued' renders the queued/scheduled timeline; activeIndex:-1 keeps
	// every card at full opacity with no highlight (static, not live).
	const staticSession = useMemo(() => {
		const queue: SendingQueueItem[] = items.map((it) => ({
			emailId: it.emailId,
			contactId: it.contactId,
			contact: it.contact,
			kind: it.contact.venueId != null ? 'venueMessage' : 'email',
			subject: it.email.subject,
			status: 'queued' as const,
			logLines: [],
			startedAt: new Date(it.scheduledFor).getTime(),
			queuedAt: new Date(it.queuedAt).getTime(),
			scheduledFor: new Date(it.scheduledFor).getTime(),
			progress: 0,
		}));
		return {
			queue,
			total: items.length,
			sentCount: 0,
			failedCount: 0,
			activeIndex: -1,
			status: 'sending' as const,
		};
	}, [items]);

	const resolvedFocusedIndex = Math.min(focusedIndex, items.length - 1);
	const focused = items[resolvedFocusedIndex] ?? items[0];
	if (!focused) return null;

	return (
		<div
			data-send-queue-view
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 40,
				pointerEvents: 'none',
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 100,
					left: 40,
					right: 40,
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					gap: 24,
					pointerEvents: 'none',
				}}
			>
				{/* LEFT — the static green "Sending" list */}
				<div
					data-send-queue-view-col
					data-left-expanded-panel
					data-campaign-interactive-surface
					style={{ pointerEvents: 'auto' }}
				>
					<SendingExpandedList
						staticSession={staticSession}
						width={LEFT_PANEL_WIDTH}
						height={LEFT_PANEL_HEIGHT}
						onDismiss={onClose}
						onItemClick={setFocusedIndex}
						showingIndex={resolvedFocusedIndex}
					/>
				</div>

				{/* CENTER — read-only one-by-one email deck */}
				<div
					data-send-queue-view-col
					data-campaign-interactive-surface
					style={{ pointerEvents: 'auto' }}
				>
					<SendQueueDeck
						items={items}
						focusedIndex={resolvedFocusedIndex}
						onFocusChange={setFocusedIndex}
						width={DECK_WIDTH}
						height={DECK_HEIGHT}
					/>
				</div>

				{/* RIGHT — contact research card for the focused email */}
				<div
					data-send-queue-view-col
					data-research-panel-container
					data-campaign-interactive-surface
					style={{ pointerEvents: 'auto' }}
				>
					<ContactResearchPanel
						contact={focused.contact}
						width={RESEARCH_WIDTH}
						boxWidth={RESEARCH_WIDTH - 15}
						height={RESEARCH_HEIGHT}
					/>
				</div>
			</div>
		</div>
	);
};
