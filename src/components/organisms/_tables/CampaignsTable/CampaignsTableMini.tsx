'use client';

import { FC, ReactNode, useMemo } from 'react';
import { useGetCampaigns } from '@/hooks/queryHooks/useCampaigns';
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
}) => {
	const { data: campaignsData, isPending } = useGetCampaigns();
	const { data: inboundEmails } = useGetInboundEmails({ enabled: true });

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
		const current = currentCampaignId
			? campaigns.find((c) => c.id === currentCampaignId)
			: undefined;
		if (!current) return campaigns.slice(0, 2);
		const firstOther = campaigns.find((c) => c.id !== currentCampaignId);
		// Keep the fetched order so rows don't swap when the viewed campaign changes.
		return campaigns.filter((c) => c === current || c === firstOther);
	}, [campaignsData, currentCampaignId]);

	const selectedIndex = Math.max(
		0,
		currentCampaignId ? rows.findIndex((r) => r.id === currentCampaignId) : 0
	);

	return (
		<div
			className={className}
			style={{
				width: 371,
				height: 135,
				borderRadius: 8,
				background: '#F8F8F8',
				overflow: 'hidden',
				fontFamily: 'Inter, sans-serif',
			}}
		>
			<div
				style={{
					position: 'relative',
					height: HEADER_HEIGHT,
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
			<div style={{ height: 2, background: '#D0D0D0' }} />
			<div
				style={{
					height: 17,
					borderBottom: selectedIndex === 0 ? '1px solid #000' : '0',
				}}
			/>
			{isPending ? (
				<div className="flex h-[56px] items-center justify-center font-inter text-[12px] text-black/50">
					Loading folders
				</div>
			) : rows.length === 0 ? (
				<div className="flex h-[56px] items-center justify-center font-inter text-[12px] text-black/50">
					No folders yet
				</div>
			) : (
				rows.map((row, index) => {
					const palette = ROW_PALETTE[index] ?? ROW_PALETTE[0];
					const isSelectedRow = index === selectedIndex;
					// The selected row is framed by dividers: its own bottom border plus the
					// bottom border of whatever sits directly above it (header spacer or row).
					const hasBottomBorder = isSelectedRow || index === selectedIndex - 1;
					const rowContentHeight =
						ROW_HEIGHT - (hasBottomBorder ? SELECTED_ROW_BOTTOM_BORDER_WIDTH : 0);
					const folderPillTop =
						(rowContentHeight - FOLDER_PILL_HEIGHT) / 2 + FOLDER_PILL_TOP_OFFSET;
					const metricPillTop =
						(rowContentHeight - METRIC_PILL_HEIGHT) / 2 + METRIC_PILL_TOP_OFFSET;
					const isClickable = !!onSelectCampaign && row.id !== currentCampaignId;
					return (
						<div
							key={row.id}
							onClick={isClickable ? () => onSelectCampaign(row.id) : undefined}
							style={{
								position: 'relative',
								height: ROW_HEIGHT,
								boxSizing: 'border-box',
								background: isSelectedRow ? SELECTED_ROW_BACKGROUND : '#F8F8F8',
								borderBottom: hasBottomBorder ? '1px solid #000' : '0',
								cursor: isClickable ? 'pointer' : 'default',
							}}
						>
							<div
								style={{
									position: 'absolute',
									left: FOLDER_PILL_LEFT,
									top: folderPillTop,
								}}
							>
								<FolderPill
									row={row}
									palette={palette}
									newCount={newCountsByCampaign.get(row.id) ?? 0}
								/>
							</div>
							<div
								style={{
									position: 'absolute',
									left: DRAFT_PILL_LEFT,
									top: metricPillTop,
								}}
							>
								<MetricPill background={getDraftFill(row.draftCount)}>
									{formatCount(row.draftCount)}
								</MetricPill>
							</div>
							<div
								style={{
									position: 'absolute',
									left: SENT_PILL_LEFT,
									top: metricPillTop,
								}}
							>
								<MetricPill background={getSentFill(row.sentCount)}>
									{row.sentCount ?? 0}
								</MetricPill>
							</div>
							<div
								style={{
									position: 'absolute',
									left: UPDATED_PILL_LEFT,
									top: metricPillTop,
								}}
							>
								<MetricPill background={getUpdatedFill(row.updatedAt)}>
									{formatUpdated(row.updatedAt)}
								</MetricPill>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
};
