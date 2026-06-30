'use client';

import { FC, RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { getMurmurRootScale } from '@/utils/rootScale';
import { useGetCampaigns, useDeleteCampaign } from '@/hooks/queryHooks/useCampaigns';
import { MAX_CAMPAIGNS, useAddCampaignFolder } from '@/hooks/useAddCampaignFolder';
import { CampaignsTableMini } from '@/components/organisms/_tables/CampaignsTable/CampaignsTableMini';

// Was 288 with the green "Choose Folder" footer; clicking a folder row now
// switches campaigns directly, so the footer (2px divider + 38px button = 40px)
// is gone and the panel shrinks by that exact amount, preserving the folder
// list area.
const PANEL_HEIGHT = 248;
const DELETE_CONFIRM_TIMEOUT_MS = 5000;

interface CampaignFolderDropdownProps {
	currentCampaignId: number;
	onClose: () => void;
	/** The chevron button that toggles this dropdown — fallback excluded from outside-click close. */
	chevronRef: RefObject<HTMLButtonElement | null>;
	/** The header-box root the dropdown anchors beneath and treats as its toggle surface. */
	anchorRef: RefObject<HTMLDivElement | null>;
	/**
	 * When provided, picking a folder switches the campaign IN CONTEXT instead of
	 * navigating to that campaign's page. The dashboard search surface passes this
	 * so selecting a folder swaps the active campaign of the search page rather
	 * than redirecting to the campaign detail's "All" tab. Receives the chosen
	 * campaign id; the dropdown still closes itself afterward.
	 */
	onSelectCampaign?: (campaignId: number) => void;
}

/**
 * Folder-selector panel that drops below the campaign header box.
 *
 * It is portaled to <html> and positioned with `position: fixed` so it escapes
 * the campaign workspace's scaled, high-z stacking context (the top tabs sit at
 * z-9999, chrome at z-126/130). Coordinates come from the header box's rect
 * divided by the applied root scale — the same fixed-portal math as
 * `BookingForDropdownControl`. Closed by clicking outside or pressing Escape.
 */
export const CampaignFolderDropdown: FC<CampaignFolderDropdownProps> = ({
	currentCampaignId,
	onClose,
	chevronRef,
	anchorRef,
	onSelectCampaign,
}) => {
	const router = useRouter();
	const pathname = usePathname();
	const panelRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
		null
	);
	const [confirmingId, setConfirmingId] = useState<number | null>(null);
	const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const { data: campaignsData } = useGetCampaigns();
	const { addFolder, isAddingFolder } = useAddCampaignFolder();
	const { mutate: deleteCampaign } = useDeleteCampaign();
	const isCampaignRoute = pathname?.startsWith('/murmur/campaign/');

	// Anchor the panel flush beneath the header box. getBoundingClientRect() is in
	// scaled (visual) units; position: fixed resolves in unscaled units, so divide
	// by the applied root scale. Recompute on scroll/resize so it tracks the header.
	useLayoutEffect(() => {
		const measure = () => {
			const anchor = anchorRef.current;
			if (!anchor) return;
			const scale = getMurmurRootScale() || 1;
			const rect = anchor.getBoundingClientRect();
			setPos({
				top: rect.bottom / scale - 1,
				left: rect.left / scale,
				width: rect.width / scale,
			});
		};
		measure();
		window.addEventListener('scroll', measure, true);
		window.addEventListener('resize', measure);
		return () => {
			window.removeEventListener('scroll', measure, true);
			window.removeEventListener('resize', measure);
		};
	}, [anchorRef]);

	// Close on outside mousedown / Escape. Excluding the header prevents the
	// close-then-reopen race: mousedown fires onClose before the header's click
	// toggles it back open.
	useEffect(() => {
		const handleMouseDown = (event: MouseEvent) => {
			const target = event.target as Node;
			if (panelRef.current?.contains(target)) return;
			if (anchorRef.current?.contains(target)) return;
			if (chevronRef.current?.contains(target)) return;
			onCloseRef.current();
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onCloseRef.current();
		};
		document.addEventListener('mousedown', handleMouseDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleMouseDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [anchorRef, chevronRef]);

	// Switch into a campaign. A single click on a folder row triggers this directly
	// (no separate "Choose Folder" confirmation step) and closes the panel.
	// Re-selecting the campaign you're already viewing is a no-op (besides closing).
	//
	// Two modes:
	//  - In-context (onSelectCampaign provided, e.g. dashboard search): swap the
	//    active campaign WITHOUT leaving the current page. This is what keeps the
	//    dashboard search surface from auto-redirecting to the campaign detail
	//    page's "All" tab when a folder is picked.
	//  - Navigation (default, e.g. the campaign detail page): route to that
	//    campaign's page.
	const navigateToCampaign = (campaignId: number) => {
		onClose();
		if (campaignId === currentCampaignId) return;
		if (onSelectCampaign) {
			onSelectCampaign(campaignId);
			return;
		}
		router.push(`${urls.murmur.campaign.detail(campaignId)}?tab=all`);
	};

	// Clear the pending confirm timer on unmount (e.g. dropdown closes).
	useEffect(() => {
		return () => {
			if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
		};
	}, []);

	// Two-step delete: the first X click arms the red confirm (auto-reverting
	// after a timeout); the second click on the armed row executes the delete.
	const handleDeleteClick = (campaignId: number) => {
		if (confirmTimeoutRef.current) {
			clearTimeout(confirmTimeoutRef.current);
			confirmTimeoutRef.current = null;
		}

		if (campaignId === confirmingId) {
			setConfirmingId(null);
			deleteCampaign(campaignId, {
				onSuccess: () => {
					// If the deleted folder is the one being viewed, navigate away to
					// another remaining folder (or the dashboard) so we don't sit on a
					// dead campaign page.
				if (campaignId === currentCampaignId) {
						const remaining = ((campaignsData ?? []) as Array<{ id: number }>).find(
							(c) => c.id !== campaignId
						);
						onClose();
						if (onSelectCampaign && remaining) {
							// In-context surface (dashboard search): keep the user on the
							// page and switch to a remaining folder instead of redirecting.
							onSelectCampaign(remaining.id);
						} else if (isCampaignRoute && remaining) {
							router.push(`${urls.murmur.campaign.detail(remaining.id)}?tab=all`);
						} else {
							router.push(urls.murmur.dashboard.index);
						}
					}
				},
			});
			return;
		}

		setConfirmingId(campaignId);
		confirmTimeoutRef.current = setTimeout(() => {
			setConfirmingId(null);
			confirmTimeoutRef.current = null;
		}, DELETE_CONFIRM_TIMEOUT_MS);
	};

	if (typeof document === 'undefined' || !pos) return null;

	return createPortal(
		<div
			ref={panelRef}
			role="dialog"
			aria-label="Choose folder"
			data-campaign-folder-dropdown=""
			// The dropdown is portaled to <html>, but React still bubbles its
			// synthetic events through the COMPONENT tree — i.e. up into the
			// CampaignHeaderBox's onClick (handleHeaderClick), which toggles this
			// panel shut. Without these, clicking a folder row / "Choose Folder" /
			// the "+" add row immediately closes the panel (the reported "the
			// folder dropdown doesn't work / won't change folders" bug). The header
			// already opts its own controls out of the toggle via this data
			// attribute; tag the whole panel so every click inside it is ignored,
			// and stop propagation as a defensive backstop.
			data-campaign-header-folder-toggle-ignore="true"
			onClick={(event) => event.stopPropagation()}
			style={{
				position: 'fixed',
				top: pos.top,
				left: pos.left,
				width: pos.width,
				height: PANEL_HEIGHT,
				zIndex: 10000,
				boxSizing: 'border-box',
				background: '#F8F8F8',
				// 2px stroke matches the thickened header; the top border is divider 1
				// (the line under the header pills, since the header drops its bottom edge).
				border: '2px solid #000',
				borderBottomLeftRadius: 8,
				borderBottomRightRadius: 8,
				overflow: 'hidden',
			}}
		>
			<CampaignsTableMini
				variant="dropdown"
				showAllRows
				showAddRow={(campaignsData?.length ?? 0) < MAX_CAMPAIGNS}
				currentCampaignId={currentCampaignId}
				selectedCampaignId={currentCampaignId}
				onRowClick={navigateToCampaign}
				onAddRow={addFolder}
				isAddingFolder={isAddingFolder}
				showDeleteColumn
				confirmingCampaignId={confirmingId}
				onDeleteClick={handleDeleteClick}
			/>
		</div>,
		document.documentElement
	);
};
