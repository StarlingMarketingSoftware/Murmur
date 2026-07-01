'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

import { urls } from '@/constants/urls';
import { useDashboardDraftingSession } from '@/contexts/DashboardDraftingSessionContext';
import { DashboardWriteOverlay } from './DashboardWriteOverlay';

export const DashboardDraftingSessionHost = () => {
	const pathname = usePathname();
	const router = useRouter();
	const {
		session,
		status,
		isReviewActive,
		isDraftingDeckCollapsed,
		dashboardHandlersRef,
		closeSession,
		setStatus,
		setReviewActive,
		setActiveReviewContactId,
		setDraftingDeckCollapsed,
	} = useDashboardDraftingSession();

	const isDashboardRoute = pathname === urls.murmur.dashboard.index;
	const isVisible = Boolean(session?.isVisible && session.placement && isDashboardRoute);

	// If a user navigates from dashboard search into a campaign tab while drafting, keep the
	// hidden engine mounted until the batch finishes. Once the dashboard-only review would open,
	// tear down the hidden shell; generated drafts have already been persisted to the campaign.
	useEffect(() => {
		if (!session) return;
		if (isDashboardRoute) return;
		if (status.isDrafting) return;
		if (!isReviewActive) return;
		closeSession();
	}, [closeSession, isDashboardRoute, isReviewActive, session, status.isDrafting]);

	if (!session || typeof document === 'undefined') return null;

	const requestClose = () => {
		dashboardHandlersRef.current.onClose?.();
		closeSession();
	};

	const requestSwitchToAddToFolder = () => {
		const handler = dashboardHandlersRef.current.onSwitchToAddToFolder;
		if (handler) {
			handler();
		} else {
			closeSession();
		}
	};

	const requestViewDrafting = () => {
		const handler = dashboardHandlersRef.current.onViewDrafting;
		if (handler) {
			handler();
			return;
		}
		router.push(`${urls.murmur.campaign.detail(session.campaign.id)}?tab=write`);
	};

	return createPortal(
		<div
			className={isVisible ? 'fixed pointer-events-none map-overlay-appear' : undefined}
			style={
				isVisible && session.placement
					? {
							zIndex: session.placement.zIndex ?? 125,
							top: session.placement.top,
							right: session.placement.right,
						}
					: { display: 'none' }
			}
		>
			<div className={isVisible ? 'pointer-events-auto' : undefined}>
				<DashboardWriteOverlay
					campaign={session.campaign}
					targetContactIds={session.targetContactIds}
					onClose={requestClose}
					onSwitchToAddToFolder={requestSwitchToAddToFolder}
					onReviewActiveChange={setReviewActive}
					onActiveReviewContactChange={setActiveReviewContactId}
					onDraftingStatusChange={setStatus}
					isDraftingDeckCollapsed={isDraftingDeckCollapsed}
					onDraftingDeckCollapsedChange={setDraftingDeckCollapsed}
					onViewDrafting={requestViewDrafting}
				/>
			</div>
		</div>,
		document.body
	);
};
