'use client';

import { FC, ReactNode, useMemo, useState } from 'react';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { MAX_CAMPAIGNS } from '@/hooks/useAddCampaignFolder';
import { getCampaignTopNavScheme } from '@/hooks/useCampaignTopNavScheme';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import { mmdd } from '@/utils';
import type {
	CampaignDataTypeCategoryKey,
	CampaignDataTypeSummary,
} from '@/utils/campaignDataTypes';
import { getCityIconProps } from '@/utils/cityIcons';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';

type MiniCampaign = {
	id: number;
	name: string;
	draftCount?: number;
	sentCount?: number;
	newEmailCount?: number;
	updatedAt?: string | Date;
	campaignDataTypes?: CampaignDataTypeSummary[];
};

type MiniInboundEmail = {
	campaignId?: number | null;
	campaign?: { id?: number | null } | null;
};

type Props = {
	currentCampaignId?: number | null;
	className?: string;
	onSelectCampaign?: (campaignId: number) => void;
	/** 'dropdown' renders the full-width, all-rows variant used inside the header dropdown. */
	variant?: 'card' | 'dropdown';
	/** When true, render every campaign instead of the 2-row card preview. */
	showAllRows?: boolean;
	/** Dropdown mode: the row to highlight (the in-panel pick). Defaults to currentCampaignId. */
	selectedCampaignId?: number | null;
	/** Dropdown mode: called when a campaign row is clicked. */
	onRowClick?: (campaignId: number) => void;
	/** Dropdown mode: show the "+" add-folder row. */
	showAddRow?: boolean;
	onAddRow?: () => void;
	isAddingFolder?: boolean;
	/** Dropdown mode: show the per-row delete affordance (divider + white X cell). */
	showDeleteColumn?: boolean;
	/** Dropdown mode: the row currently armed for delete confirmation (red band). */
	confirmingCampaignId?: number | null;
	/** Dropdown mode: called when a row's delete "X" is clicked. */
	onDeleteClick?: (campaignId: number) => void;
};

const CATEGORY_BACKGROUND: Record<CampaignDataTypeCategoryKey, string> = {
	wine_beer_spirits: '#BFC4FF',
	restaurants: '#C3FBD1',
	coffee_shops: '#D6F1BD',
	music_venues: '#B7E5FF',
	music_festivals: '#C1D6FF',
	wedding: '#FFF2BC',
	radio: '#E8EFFF',
};

// Folder colorway is the SAME per-campaign scheme as the top-nav box + campaign
// header box (single source of truth), keyed by campaign id via
// getMiniFolderPalette — NOT by render order — so the dropdown's folder pill +
// icon match the surfaces they open into.
type MiniRowPalette = { folder: string; pill: string };
const FALLBACK_ROW_PALETTE: MiniRowPalette = { folder: '#C5494F', pill: '#B9EAF1' };
const getMiniFolderPalette = (
	campaignId: number | string | null | undefined,
	campaigns: ReadonlyArray<{ id: number }> | null | undefined
): MiniRowPalette => {
	const scheme = getCampaignTopNavScheme(campaignId, campaigns);
	return { folder: scheme.icon, pill: scheme.box };
};

const SELECTED_ROW_BACKGROUND = '#DFF4E5';
const DELETE_WARNING_BACKGROUND = '#E7677C';
const DELETE_CELL_WIDTH = 21;

const FOLDER_PILL_LEFT = 11;
const FOLDER_PILL_WIDTH = 105.331;
const FOLDER_PILL_HEIGHT = 11.703;
const METRIC_PILL_WIDTH = 60.845;
const METRIC_PILL_HEIGHT = 19.316;
const ROW_HEIGHT = 28;
const DROPDOWN_ROW_HEIGHT = 32;
const SELECTED_ROW_BOTTOM_BORDER_WIDTH = 1;
const FOLDER_PILL_TOP_OFFSET = -1.5;
const METRIC_PILL_TOP_OFFSET = -5;
const HEADER_HEIGHT = 34;
const HEADER_LABEL_CENTER_Y = 22;
const DRAFT_PILL_LEFT = FOLDER_PILL_LEFT + FOLDER_PILL_WIDTH + 8;
const SENT_PILL_LEFT = DRAFT_PILL_LEFT + METRIC_PILL_WIDTH + 18;
const UPDATED_PILL_LEFT = SENT_PILL_LEFT + METRIC_PILL_WIDTH + 18;

const formatCount = (value: number | undefined) =>
	(value ?? 0) >= 1000
		? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value ?? 0)
		: `${value ?? 0}`.padStart(2, '0');

const formatUpdated = (value: string | Date | undefined) => {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '--.--';
	const today = new Date();
	return today.toDateString() === date.toDateString() ? 'Today' : mmdd(date);
};

const getDraftFill = (value: number | undefined) => {
	const n = value ?? 0;
	if (n >= 30) return '#FFF1CF';
	if (n > 0) return '#FFFBF3';
	return '#FFFCF7';
};

const getSentFill = (value: number | undefined) => {
	const n = value ?? 0;
	if (n >= 100) return '#A7EA9E';
	return '#E8F8E4';
};

const getUpdatedFill = (value: string | Date | undefined) => {
	const date = value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return '#FFFFFF';
	const today = new Date();
	if (today.toDateString() === date.toDateString()) return '#FFFFFF';
	const ageDays = Math.floor(
		(today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86_400_000
	);
	return ageDays > 14 ? '#F5C7C7' : '#FFFFFF';
};

const MiniFolderIcon = ({ color }: { color: string }) => (
	<DashboardActionBarFolderIcon
		width={16.2}
		height={9.58}
		aria-hidden="true"
		style={{ color, display: 'block' }}
	/>
);

const MiniPlusIcon = () => (
	<svg
		width={9}
		height={9}
		viewBox="0 0 9 9"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M4.5 1V8M1 4.5H8"
			stroke="currentColor"
			strokeWidth={1.5}
			strokeLinecap="round"
		/>
	</svg>
);

const MiniXIcon = ({ color }: { color: string }) => (
	<svg
		width={12}
		height={12}
		viewBox="0 0 18 18"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<line x1="4.58793" y1="4.41176" x2="13.5876" y2="13.4115" stroke={color} />
		<line x1="4.41207" y1="13.4118" x2="13.4118" y2="4.41207" stroke={color} />
	</svg>
);

const renderCategoryIcon = (key: CampaignDataTypeCategoryKey): ReactNode => {
	switch (key) {
		case 'wine_beer_spirits':
			return <WineBeerSpiritsIcon size={8.6} className="flex-shrink-0" />;
		case 'restaurants':
			return <RestaurantsIcon size={9} className="flex-shrink-0" />;
		case 'coffee_shops':
			return <CoffeeShopsIcon size={5.7} className="flex-shrink-0" />;
		case 'music_venues':
			return <MusicVenuesIcon size={9.6} className="flex-shrink-0" />;
		case 'music_festivals':
			return <FestivalsIcon size={9} className="flex-shrink-0" />;
		case 'wedding':
			return <WeddingPlannersIcon size={9} className="flex-shrink-0" />;
		case 'radio':
			return <RadioStationsIcon size={9.6} className="flex-shrink-0" />;
	}
};

const MiniDataBadge = ({ dataType }: { dataType: CampaignDataTypeSummary }) => {
	if (dataType.kind === 'category') {
		return (
			<span
				className="inline-flex flex-none items-center justify-center overflow-hidden"
				style={{
					width: 11.703,
					height: 11.703,
					borderRadius: 3.1,
					backgroundColor: CATEGORY_BACKGROUND[dataType.key],
				}}
				title={dataType.label}
			>
				{renderCategoryIcon(dataType.key)}
			</span>
		);
	}

	const { icon, backgroundColor } = getCityIconProps('', dataType.key);
	return (
		<span
			className="inline-flex flex-none items-center justify-center overflow-hidden"
			style={{ width: 11.703, height: 11.703, borderRadius: 3.1, backgroundColor }}
			title={dataType.label}
		>
			<span className="inline-flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:max-h-[8px] [&>svg]:max-w-[9px] [&>svg]:w-auto">
				{icon}
			</span>
		</span>
	);
};

const FolderPill = ({
	row,
	palette,
	newCount,
	confirming = false,
	bordered = false,
	width = FOLDER_PILL_WIDTH,
	height = FOLDER_PILL_HEIGHT,
}: {
	row: MiniCampaign;
	palette: MiniRowPalette;
	newCount: number;
	confirming?: boolean;
	bordered?: boolean;
	width?: number | string;
	height?: number;
}) => {
	const dataTypes = row.campaignDataTypes ?? [];
	const visible = dataTypes.slice(0, 2);
	const overflow = Math.max(0, dataTypes.length - visible.length);
	return (
		<div
			className="flex min-w-0 items-center overflow-hidden px-[3px]"
			style={{
				width,
				height,
				boxSizing: 'border-box',
				borderRadius: bordered ? 6 : 2.5,
				border: bordered ? '1px solid #000' : undefined,
				backgroundColor: confirming ? 'transparent' : palette.pill,
			}}
		>
			<span className="flex-none">
				<MiniFolderIcon color={palette.folder} />
			</span>
			<span
				className="ml-[5px] min-w-0 truncate font-inter font-medium text-black"
				style={{ fontSize: 12.555, lineHeight: '11.703px' }}
			>
				{row.name || 'Untitled'}
			</span>
			{visible.length > 0 ? (
				<span className="ml-[5px] flex min-w-0 flex-none items-center gap-[2px] overflow-hidden">
					{visible.map((dataType) => (
						<MiniDataBadge key={`${dataType.kind}-${dataType.key}`} dataType={dataType} />
					))}
				</span>
			) : null}
			{overflow > 0 || newCount > 0 ? (
				<span className="ml-[3px] flex-none font-inter text-[7px] font-medium leading-none text-black">
					+{overflow > 0 ? overflow : newCount}
				</span>
			) : null}
		</div>
	);
};

const MetricPill = ({
	children,
	background,
	width = METRIC_PILL_WIDTH,
}: {
	children: ReactNode;
	background: string;
	width?: number;
}) => (
	<div
		className="inline-flex items-center justify-center rounded-[5px] border-[1px] border-black font-inter font-medium text-black"
		style={{
			width,
			height: METRIC_PILL_HEIGHT,
			boxSizing: 'border-box',
			backgroundColor: background,
			fontSize: 12.555,
			lineHeight: '15.426px',
		}}
	>
		{children}
	</div>
);

export const CampaignsTableMini: FC<Props> = ({
	currentCampaignId,
	className,
	onSelectCampaign,
	variant = 'card',
	showAllRows = false,
	selectedCampaignId,
	onRowClick,
	showAddRow = false,
	onAddRow,
	isAddingFolder = false,
	showDeleteColumn = false,
	confirmingCampaignId = null,
	onDeleteClick,
}) => {
	const { data: campaignsData, isPending } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails({ enabled: true });
	const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
	// Dropdown delete affordance: which row's "X" cell is currently hovered. While
	// hovered (and not yet armed) the whole row previews the red delete-warning
	// look; clicking the X swaps that row into the final confirmation banner.
	const [hoveredDeleteId, setHoveredDeleteId] = useState<number | null>(null);

	const isDropdown = variant === 'dropdown';

	const newCountsByCampaign = useMemo(() => {
		const counts = new Map<number, number>();
		for (const campaign of (campaignsData ?? []) as MiniCampaign[]) {
			if (typeof campaign.id !== 'number') continue;
			const persisted = campaign.newEmailCount ?? 0;
			if (persisted > 0) counts.set(campaign.id, persisted);
		}
		const liveCounts = new Map<number, number>();
		for (const email of (inboundEmails ?? []) as MiniInboundEmail[]) {
			const id = email.campaign?.id ?? email.campaignId;
			if (typeof id !== 'number') continue;
			liveCounts.set(id, (liveCounts.get(id) ?? 0) + 1);
		}
		for (const [id, live] of liveCounts) {
			counts.set(id, Math.max(counts.get(id) ?? 0, live));
		}
		return counts;
	}, [campaignsData, inboundEmails]);

	const rows = useMemo(() => {
		const campaigns = (campaignsData ?? []) as MiniCampaign[];
		if (showAllRows) return campaigns;
		const current = currentCampaignId
			? campaigns.find((c) => c.id === currentCampaignId)
			: undefined;
		if (!current) return campaigns.slice(0, 2);
		const firstOther = campaigns.find((c) => c.id !== currentCampaignId);
		// Keep the fetched order so rows don't swap when the viewed campaign changes.
		return campaigns.filter((c) => c === current || c === firstOther);
	}, [campaignsData, currentCampaignId, showAllRows]);

	const selectedIndex = Math.max(
		0,
		currentCampaignId ? rows.findIndex((r) => r.id === currentCampaignId) : 0
	);

	// In dropdown mode the green highlight follows the user's in-panel pick
	// (which defaults to the current campaign), not the row being viewed.
	const highlightId = isDropdown
		? (selectedCampaignId ?? currentCampaignId ?? null)
		: null;

	const renderRow = (
		row: MiniCampaign,
		_index: number,
		opts: {
			highlighted: boolean;
			bottomBorder: boolean;
			clickable: boolean;
			onClick?: () => void;
			rowHeight?: number;
		}
	) => {
		const palette = campaignsData
			? getMiniFolderPalette(row.id, campaignsData as ReadonlyArray<{ id: number }>)
			: FALLBACK_ROW_PALETTE;
		const rh = opts.rowHeight ?? ROW_HEIGHT;
		const rowContentHeight =
			rh - (opts.bottomBorder ? SELECTED_ROW_BOTTOM_BORDER_WIDTH : 0);
		const folderPillTop =
			(rowContentHeight - FOLDER_PILL_HEIGHT) / 2 + FOLDER_PILL_TOP_OFFSET;
		const metricPillTop =
			(rowContentHeight - METRIC_PILL_HEIGHT) / 2 + METRIC_PILL_TOP_OFFSET;
		// Delete affordance (dropdown only). Three layers:
		//  1. Hovering the row paints it the selected green and reveals the white "X".
		//  2. Hovering that "X" previews the delete by painting the whole row red
		//     (#E7677C) with the metric pills hidden — the "are you sure?" warning.
		//  3. Clicking the "X" arms the final confirmation: the row becomes the red
		//     banner (bordered folder pill | divider | "Confirm Delete and Move to
		//     Archive" + white close "X"); a second click executes the delete.
		const deleteEnabled = showDeleteColumn && !!onDeleteClick;
		const isConfirming = deleteEnabled && confirmingCampaignId === row.id;
		const isRowHovered = hoveredRowId === row.id;
		const isDeleteHovered = deleteEnabled && !isConfirming && hoveredDeleteId === row.id;
		// The red "warning" wash is shown both while previewing (X hover) and while
		// the final confirmation banner is armed.
		const showWarning = isConfirming || isDeleteHovered;
		const showHighlight = !showWarning && (opts.highlighted || (deleteEnabled && isRowHovered));
		const rowBackground = showWarning
			? DELETE_WARNING_BACKGROUND
			: showHighlight
				? SELECTED_ROW_BACKGROUND
				: '#F8F8F8';

		// Final confirmation banner: replaces the whole row content with the bordered
		// folder pill on the left, a vertical divider, the warning copy, and a close X.
		if (isConfirming) {
			return (
				<div
					key={row.id}
					style={{
						position: 'relative',
						height: rh,
						boxSizing: 'border-box',
						background: DELETE_WARNING_BACKGROUND,
						borderBottom: opts.bottomBorder ? '1px solid #000' : '0',
						display: 'flex',
						alignItems: 'stretch',
						cursor: 'default',
					}}
				>
					{/* Left segment: bordered folder pill that still identifies the row. */}
					<div
						style={{
							flex: `0 0 ${DRAFT_PILL_LEFT}px`,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: FOLDER_PILL_LEFT,
							paddingRight: 6,
							boxSizing: 'border-box',
							borderRight: '1px solid #000',
						}}
					>
						<FolderPill
							row={row}
							palette={palette}
							newCount={newCountsByCampaign.get(row.id) ?? 0}
							confirming
							bordered
							height={Math.min(rowContentHeight - 6, 20)}
							width="100%"
						/>
					</div>
					{/* Right segment: warning copy + close X, vertically centered. */}
					<div
						style={{
							flex: '1 1 auto',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 8,
							paddingLeft: 14,
							paddingRight: 12,
							minWidth: 0,
						}}
					>
						<span
							className="min-w-0 truncate font-inter font-medium text-white"
							style={{ fontSize: 12.555, lineHeight: '15.426px' }}
						>
							Confirm Delete and Move to Archive
						</span>
						<button
							type="button"
							aria-label={`Confirm delete ${row.name || 'folder'} and move to archive`}
							title="Click to delete and move to archive"
							onClick={(event) => {
								event.stopPropagation();
								setHoveredDeleteId((prev) => (prev === row.id ? null : prev));
								onDeleteClick?.(row.id);
							}}
							style={{
								flex: '0 0 auto',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: 'transparent',
								border: 'none',
								padding: 0,
								margin: 0,
								cursor: 'pointer',
							}}
						>
							<MiniXIcon color="#FFFFFF" />
						</button>
					</div>
				</div>
			);
		}

		return (
			<div
				key={row.id}
				onClick={opts.clickable ? opts.onClick : undefined}
				onMouseEnter={deleteEnabled ? () => setHoveredRowId(row.id) : undefined}
				onMouseLeave={
					deleteEnabled
						? () => {
								setHoveredRowId((prev) => (prev === row.id ? null : prev));
								setHoveredDeleteId((prev) => (prev === row.id ? null : prev));
							}
						: undefined
				}
				style={{
					position: 'relative',
					height: rh,
					boxSizing: 'border-box',
					background: rowBackground,
					borderBottom: opts.bottomBorder ? '1px solid #000' : '0',
					cursor: opts.clickable ? 'pointer' : 'default',
				}}
			>
				<div style={{ position: 'absolute', left: FOLDER_PILL_LEFT, top: folderPillTop }}>
					<FolderPill
						row={row}
						palette={palette}
						newCount={newCountsByCampaign.get(row.id) ?? 0}
						confirming={showWarning}
					/>
				</div>
				<div style={{ position: 'absolute', left: DRAFT_PILL_LEFT, top: metricPillTop }}>
					<MetricPill
						background={showWarning ? 'transparent' : getDraftFill(row.draftCount)}
					>
						{formatCount(row.draftCount)}
					</MetricPill>
				</div>
				<div style={{ position: 'absolute', left: SENT_PILL_LEFT, top: metricPillTop }}>
					<MetricPill
						background={showWarning ? 'transparent' : getSentFill(row.sentCount)}
					>
						{row.sentCount ?? 0}
					</MetricPill>
				</div>
				<div style={{ position: 'absolute', left: UPDATED_PILL_LEFT, top: metricPillTop }}>
					<MetricPill
						background={showWarning ? 'transparent' : getUpdatedFill(row.updatedAt)}
					>
						{formatUpdated(row.updatedAt)}
					</MetricPill>
				</div>
				{deleteEnabled && (isRowHovered || isDeleteHovered) ? (
					<button
						type="button"
						aria-label={`Delete ${row.name || 'folder'}`}
						title={isDeleteHovered ? 'Click to confirm delete' : `Delete ${row.name || 'folder'}`}
						onMouseEnter={() => setHoveredDeleteId(row.id)}
						onMouseLeave={() =>
							setHoveredDeleteId((prev) => (prev === row.id ? null : prev))
						}
						onClick={(event) => {
							event.stopPropagation();
							setHoveredDeleteId((prev) => (prev === row.id ? null : prev));
							onDeleteClick?.(row.id);
						}}
						style={{
							position: 'absolute',
							top: 0,
							right: 0,
							width: DELETE_CELL_WIDTH,
							height: rowContentHeight,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxSizing: 'border-box',
							background: isDeleteHovered ? DELETE_WARNING_BACKGROUND : '#FFFFFF',
							// Vertical divider line on the left edge of the rightmost cell.
							border: 'none',
							borderLeft: '1px solid #000',
							padding: 0,
							margin: 0,
							cursor: 'pointer',
							zIndex: 1,
						}}
					>
						<MiniXIcon color={isDeleteHovered ? '#FFFFFF' : '#000000'} />
					</button>
				) : null}
			</div>
		);
	};

	// Card-variant "+" ghost row: a placeholder folder swatch, a bordered "+" in
	// the Drafts column, and empty Sent/Updated pill outlines. Clicking it adds a
	// folder. Reuses the same column offsets as a real row.
	const renderAddRow = () => {
		const folderPillTop =
			(ROW_HEIGHT - FOLDER_PILL_HEIGHT) / 2 + FOLDER_PILL_TOP_OFFSET;
		const metricPillTop =
			(ROW_HEIGHT - METRIC_PILL_HEIGHT) / 2 + METRIC_PILL_TOP_OFFSET;
		const ghostPill = {
			width: METRIC_PILL_WIDTH,
			height: METRIC_PILL_HEIGHT,
			borderRadius: 5,
			border: '1px solid rgba(0, 0, 0, 0.18)',
			boxSizing: 'border-box' as const,
		};
		return (
			<div
				key="__add-folder-row"
				onClick={isAddingFolder ? undefined : onAddRow}
				role="button"
				tabIndex={isAddingFolder ? -1 : 0}
				aria-label="Add folder"
				className={`relative transition-colors ${
					isAddingFolder
						? 'cursor-default bg-[#F3F3F3] opacity-70'
						: 'cursor-pointer bg-[#F3F3F3] hover:bg-[#ECECEC]'
				}`}
				style={{ height: ROW_HEIGHT, boxSizing: 'border-box' }}
			>
				<div style={{ position: 'absolute', left: FOLDER_PILL_LEFT, top: folderPillTop }}>
					<div
						style={{
							width: 22,
							height: FOLDER_PILL_HEIGHT,
							borderRadius: 2.5,
							background: 'rgba(0, 0, 0, 0.08)',
						}}
					/>
				</div>
				<div style={{ position: 'absolute', left: DRAFT_PILL_LEFT, top: metricPillTop }}>
					<MetricPill background="#FCFCFC">
						<MiniPlusIcon />
					</MetricPill>
				</div>
				<div style={{ position: 'absolute', left: SENT_PILL_LEFT, top: metricPillTop }}>
					<div style={ghostPill} />
				</div>
				<div style={{ position: 'absolute', left: UPDATED_PILL_LEFT, top: metricPillTop }}>
					<div style={ghostPill} />
				</div>
			</div>
		);
	};

	const headerRow = (
		<div
			style={{
				position: 'relative',
				height: HEADER_HEIGHT,
				flexShrink: 0,
				boxSizing: 'border-box',
				fontSize: 12.555,
				fontStyle: 'normal',
				fontWeight: 500,
				lineHeight: '15.426px',
				color: '#000',
				textAlign: 'center',
			}}
		>
			<div
				style={{
					position: 'absolute',
					left: FOLDER_PILL_LEFT,
					top: HEADER_LABEL_CENTER_Y + 2,
					transform: 'translateY(-50%)',
				}}
			>
				Folders
			</div>
			<div
				style={{
					position: 'absolute',
					left: DRAFT_PILL_LEFT + METRIC_PILL_WIDTH / 2,
					top: HEADER_LABEL_CENTER_Y,
					transform: 'translate(-50%, -50%)',
				}}
			>
				Drafts
			</div>
			<div
				style={{
					position: 'absolute',
					left: SENT_PILL_LEFT + METRIC_PILL_WIDTH / 2,
					top: HEADER_LABEL_CENTER_Y,
					transform: 'translate(-50%, -50%)',
				}}
			>
				Sent
			</div>
			<div
				style={{
					position: 'absolute',
					left: UPDATED_PILL_LEFT + METRIC_PILL_WIDTH / 2,
					top: HEADER_LABEL_CENTER_Y,
					transform: 'translate(-50%, -50%)',
				}}
			>
				Updated
			</div>
		</div>
	);

	const emptyState = (label: string) => (
		<div className="flex h-[56px] items-center justify-center font-inter text-[12px] text-black/50">
			{label}
		</div>
	);

	if (isDropdown) {
		return (
			<div
				className={className}
				style={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					background: '#F8F8F8',
					overflow: 'hidden',
					fontFamily: 'Inter, sans-serif',
				}}
			>
				{headerRow}
				<div style={{ height: 2, background: '#D0D0D0', flexShrink: 0 }} />
				<div style={{ height: 17, flexShrink: 0 }} />
				<div
					style={{
						flex: 1,
						minHeight: 0,
						overflowY: 'auto',
						borderTop: '1px solid #000',
					}}
				>
					{isPending
						? emptyState('Loading folders')
						: rows.length === 0
							? emptyState('No folders yet')
							: rows.map((row, index) =>
									renderRow(row, index, {
										highlighted: row.id === highlightId,
										bottomBorder: true,
										clickable: true,
										onClick: () => onRowClick?.(row.id),
										rowHeight: DROPDOWN_ROW_HEIGHT,
									})
								)}
				</div>
				{showAddRow ? (
					<div style={{ flexShrink: 0, padding: '6px 11px' }}>
						<button
							type="button"
							onClick={onAddRow}
							disabled={isAddingFolder}
							aria-label="Add folder"
							className="flex h-[20px] w-full items-center justify-center rounded-[6px] bg-[#EDEDED] text-black transition-colors duration-150 hover:bg-[#E2E2E2] active:bg-[#DADADA] disabled:cursor-not-allowed disabled:opacity-70"
						>
							<MiniPlusIcon />
						</button>
					</div>
				) : null}
			</div>
		);
	}

	return (
		<div
			className={className}
			style={{
				width: 371,
				// Roomy floor with 1–2 folders; grows row-by-row toward the 5-folder
				// cap (pushing the Strategy box below it down).
				minHeight: 165,
				borderRadius: 8,
				background: '#F8F8F8',
				overflow: 'hidden',
				fontFamily: 'Inter, sans-serif',
			}}
		>
			{headerRow}
			<div style={{ height: 2, background: '#D0D0D0' }} />
			<div
				style={{
					height: 17,
					borderBottom: selectedIndex === 0 ? '1px solid #000' : '0',
				}}
			/>
			{isPending
				? emptyState('Loading folders')
				: rows.length === 0
					? emptyState('No folders yet')
					: rows.map((row, index) => {
							const isSelectedRow = index === selectedIndex;
							// The selected row is framed by dividers: its own bottom border plus
							// the bottom border of whatever sits directly above it.
							const hasBottomBorder =
								isSelectedRow || index === selectedIndex - 1;
							return renderRow(row, index, {
								highlighted: isSelectedRow,
								bottomBorder: hasBottomBorder,
								clickable: !!onSelectCampaign && row.id !== currentCampaignId,
								onClick: () => onSelectCampaign?.(row.id),
							});
						})}
			{showAddRow && !isPending && rows.length < MAX_CAMPAIGNS
				? renderAddRow()
				: null}
		</div>
	);
};
