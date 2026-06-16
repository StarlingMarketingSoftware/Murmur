'use client';

import { FC, ReactNode, useMemo } from 'react';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
import { MAX_CAMPAIGNS } from '@/hooks/useAddCampaignFolder';
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
	/** Dropdown mode: called when a row is clicked (select-to-confirm). */
	onRowClick?: (campaignId: number) => void;
	/** Dropdown mode: show the "+" add-folder row. */
	showAddRow?: boolean;
	onAddRow?: () => void;
	isAddingFolder?: boolean;
	/** Dropdown mode: show the green "Choose Folder" footer button. */
	showChooseFolderButton?: boolean;
	onChooseFolder?: () => void;
	chooseDisabled?: boolean;
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

const ROW_PALETTE = [
	{ folder: '#C5494F', pill: '#B9EAF1' },
	{ folder: '#C94AD8', pill: '#C8C5F4' },
];

const SELECTED_ROW_BACKGROUND = '#DFF4E5';

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
}: {
	row: MiniCampaign;
	palette: (typeof ROW_PALETTE)[number];
	newCount: number;
}) => {
	const dataTypes = row.campaignDataTypes ?? [];
	const visible = dataTypes.slice(0, 2);
	const overflow = Math.max(0, dataTypes.length - visible.length);
	return (
		<div
			className="flex min-w-0 items-center overflow-hidden px-[3px]"
			style={{
				width: FOLDER_PILL_WIDTH,
				height: FOLDER_PILL_HEIGHT,
				boxSizing: 'border-box',
				borderRadius: 2.5,
				backgroundColor: palette.pill,
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
	showChooseFolderButton = false,
	onChooseFolder,
	chooseDisabled = false,
}) => {
	const { data: campaignsData, isPending } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails({ enabled: true });

	const isDropdown = variant === 'dropdown';

	const newCountsByCampaign = useMemo(() => {
		const counts = new Map<number, number>();
		for (const email of (inboundEmails ?? []) as MiniInboundEmail[]) {
			const id = email.campaign?.id ?? email.campaignId;
			if (typeof id !== 'number') continue;
			counts.set(id, (counts.get(id) ?? 0) + 1);
		}
		return counts;
	}, [inboundEmails]);

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
		index: number,
		opts: {
			highlighted: boolean;
			bottomBorder: boolean;
			clickable: boolean;
			onClick?: () => void;
			rowHeight?: number;
		}
	) => {
		const palette = ROW_PALETTE[index % ROW_PALETTE.length] ?? ROW_PALETTE[0];
		const rh = opts.rowHeight ?? ROW_HEIGHT;
		const rowContentHeight =
			rh - (opts.bottomBorder ? SELECTED_ROW_BOTTOM_BORDER_WIDTH : 0);
		const folderPillTop =
			(rowContentHeight - FOLDER_PILL_HEIGHT) / 2 + FOLDER_PILL_TOP_OFFSET;
		const metricPillTop =
			(rowContentHeight - METRIC_PILL_HEIGHT) / 2 + METRIC_PILL_TOP_OFFSET;
		return (
			<div
				key={row.id}
				onClick={opts.clickable ? opts.onClick : undefined}
				style={{
					position: 'relative',
					height: rh,
					boxSizing: 'border-box',
					background: opts.highlighted ? SELECTED_ROW_BACKGROUND : '#F8F8F8',
					borderBottom: opts.bottomBorder ? '1px solid #000' : '0',
					cursor: opts.clickable ? 'pointer' : 'default',
				}}
			>
				<div style={{ position: 'absolute', left: FOLDER_PILL_LEFT, top: folderPillTop }}>
					<FolderPill
						row={row}
						palette={palette}
						newCount={newCountsByCampaign.get(row.id) ?? 0}
					/>
				</div>
				<div style={{ position: 'absolute', left: DRAFT_PILL_LEFT, top: metricPillTop }}>
					<MetricPill background={getDraftFill(row.draftCount)}>
						{formatCount(row.draftCount)}
					</MetricPill>
				</div>
				<div style={{ position: 'absolute', left: SENT_PILL_LEFT, top: metricPillTop }}>
					<MetricPill background={getSentFill(row.sentCount)}>
						{row.sentCount ?? 0}
					</MetricPill>
				</div>
				<div style={{ position: 'absolute', left: UPDATED_PILL_LEFT, top: metricPillTop }}>
					<MetricPill background={getUpdatedFill(row.updatedAt)}>
						{formatUpdated(row.updatedAt)}
					</MetricPill>
				</div>
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
				{showChooseFolderButton ? (
					<>
						{/* Divider 2: the thick line between the "Choose Folder" button and the rest. */}
						<div style={{ height: 2, background: '#000', flexShrink: 0 }} />
						<button
							type="button"
							onClick={onChooseFolder}
							disabled={chooseDisabled}
							className="flex h-[38px] w-full flex-shrink-0 items-center justify-center font-inter font-bold text-[16px] text-white transition-colors duration-150 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
							style={{ background: '#4E9D6B' }}
						>
							Choose Folder
						</button>
					</>
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
