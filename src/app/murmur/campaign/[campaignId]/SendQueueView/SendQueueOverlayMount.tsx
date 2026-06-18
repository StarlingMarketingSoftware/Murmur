'use client';

import { FC, useEffect } from 'react';
import { useSendQueueView } from '@/contexts/SendQueueViewContext';
import { useSendQueue } from '@/hooks/queryHooks/useSendQueue';

/**
 * Bridges the SendQueueViewProvider open-state + the persisted queue data to the
 * queue lifecycle. The visible queue is rendered in DraftingSection's existing
 * left-panel slot; this mount now only force-closes if the worker drains the queue.
 */
export const SendQueueOverlayMount: FC<{
	campaignId: number;
	isMobile: boolean | null;
}> = ({ campaignId }) => {
	const { isOpen, close } = useSendQueueView();
	const { count } = useSendQueue(campaignId);

	// An emptied queue (drained by the worker) can't leave a dangling overlay.
	useEffect(() => {
		if (isOpen && count === 0) close();
	}, [isOpen, count, close]);

	return null;
};
