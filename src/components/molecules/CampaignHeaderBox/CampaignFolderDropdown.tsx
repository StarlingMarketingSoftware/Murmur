'use client';

import { FC, RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';
import { getMurmurRootScale } from '@/utils/rootScale';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { MAX_CAMPAIGNS, useAddCampaignFolder } from '@/hooks/useAddCampaignFolder';
import { CampaignsTableMini } from '@/components/organisms/_tables/CampaignsTable/CampaignsTableMini';

const PANEL_HEIGHT = 288;

interface CampaignFolderDropdownProps {
	currentCampaignId: number;
	onClose: () => void;
	/** The chevron button that toggles this dropdown — excluded from outside-click close. */
	chevronRef: RefObject<HTMLButtonElement | null>;
	/** The header-box root the dropdown anchors beneath. */
	anchorRef: RefObject<HTMLDivElement | null>;
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
}) => {
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	const [selectedId, setSelectedId] = useState<number | null>(currentCampaignId);
	const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(
		null
	);

	const { data: campaignsData } = useGetCampaigns();
	const { addFolder, isAddingFolder } = useAddCampaignFolder();

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

	// Close on outside mousedown / Escape. Excluding the chevron prevents the
	// close-then-reopen race: mousedown fires onClose before the chevron's click
	// toggles it back open.
	useEffect(() => {
		const handleMouseDown = (event: MouseEvent) => {
			const target = event.target as Node;
			if (panelRef.current?.contains(target)) return;
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
	}, [chevronRef]);

	const handleChooseFolder = () => {
		onClose();
		if (selectedId && selectedId !== currentCampaignId) {
			router.push(`${urls.murmur.campaign.detail(selectedId)}?tab=all`);
		}
	};

	if (typeof document === 'undefined' || !pos) return null;

	return createPortal(
		<div
			ref={panelRef}
			role="dialog"
			aria-label="Choose folder"
			data-campaign-folder-dropdown=""
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
				showChooseFolderButton
				currentCampaignId={currentCampaignId}
				selectedCampaignId={selectedId}
				onRowClick={setSelectedId}
				onAddRow={addFolder}
				isAddingFolder={isAddingFolder}
				onChooseFolder={handleChooseFolder}
			/>
		</div>,
		document.documentElement
	);
};
