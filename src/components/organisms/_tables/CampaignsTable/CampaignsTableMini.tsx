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
	{ folder: '#C5494F', pill: '#B9EAF1', row: '#DFF4E5' },
	{ folder: '#C94AD8', pill: '#C8C5F4', row: '#F8F8F8' },
];

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
	<svg width="18" height="13" viewBox="0 0 18 13" fill="none" aria-hidden="true">
		<path d="M1 3.25C1 2.56 1.56 2 2.25 2H7.4L8.65 3.5H15.75C16.44 3.5 17 4.06 17 4.75V11.25C17 11.94 16.44 12.5 15.75 12.5H2.25C1.56 12.5 1 11.94 1 11.25V3.25Z" fill={color} />
		<path d="M1 2.25C1 .84 1.84 0 2.25 0H6.15C6.52 0 6.88 .17 7.12 .46L8.4 2H1V2.25Z" fill={color} />
	</svg>
);

const renderCategoryIcon = (key: CampaignDataTypeCategoryKey): ReactNode => {
	switch (key) {
		case 'wine_beer_spirits':
			return <WineBeerSpiritsIcon size={11} className="flex-shrink-0" />;
		case 'restaurants':
			return <RestaurantsIcon size={12} className="flex-shrink-0" />;
		case 'coffee_shops':
			return <CoffeeShopsIcon size={7} className="flex-shrink-0" />;
		case 'music_venues':
			return <MusicVenuesIcon size={13} className="flex-shrink-0" />;
		case 'music_festivals':
			return <FestivalsIcon size={12} className="flex-shrink-0" />;
		case 'wedding':
			return <WeddingPlannersIcon size={12} className="flex-shrink-0" />;
		case 'radio':
			return <RadioStationsIcon size={13} className="flex-shrink-0" />;
	}
};

const MiniDataBadge = ({ dataType }: { dataType: CampaignDataTypeSummary }) => {
	if (dataType.kind === 'category') {
		return (
			<span
				className="inline-flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-[4px]"
				style={{ backgroundColor: CATEGORY_BACKGROUND[dataType.key] }}
				title={dataType.label}
			>
				{renderCategoryIcon(dataType.key)}
			</span>
		);
	}

	const { icon, backgroundColor } = getCityIconProps('', dataType.key);
	return (
		<span
			className="inline-flex h-[15px] w-[15px] flex-none items-center justify-center overflow-hidden rounded-[4px]"
			style={{ backgroundColor }}
			title={dataType.label}
		>
			<span className="inline-flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-auto [&>svg]:max-h-[10px] [&>svg]:max-w-[11px] [&>svg]:w-auto">
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
			className="flex h-[15px] min-w-0 items-center rounded-[3px] px-[4px]"
			style={{ backgroundColor: palette.pill, width: 122 }}
		>
			<span className="flex-none">
				<MiniFolderIcon color={palette.folder} />
			</span>
			<span className="ml-[7px] min-w-0 truncate font-inter text-[14px] font-medium leading-[15px] text-black">
				{row.name || 'Untitled'}
			</span>
			{visible.length > 0 ? (
				<span className="ml-[7px] flex min-w-0 flex-none items-center gap-[3px] overflow-hidden">
					{visible.map((dataType) => (
						<MiniDataBadge key={`${dataType.kind}-${dataType.key}`} dataType={dataType} />
					))}
				</span>
			) : null}
			{overflow > 0 || newCount > 0 ? (
				<span className="ml-[4px] flex-none font-inter text-[8px] font-medium leading-none text-black">
					+{overflow > 0 ? overflow : newCount}
				</span>
			) : null}
		</div>
	);
};

const MetricPill = ({
	children,
	background,
	width = 60,
}: {
	children: ReactNode;
	background: string;
	width?: number;
}) => (
	<div
		className="inline-flex h-[25px] items-center justify-center rounded-[7px] border-[1px] border-black font-inter text-[17px] font-medium leading-none text-black"
		style={{ width, backgroundColor: background }}
	>
		{children}
	</div>
);

export const CampaignsTableMini: FC<Props> = ({ currentCampaignId, className }) => {
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
		const campaigns = ((campaignsData ?? []) as MiniCampaign[]).slice();
		if (currentCampaignId) {
			campaigns.sort((a, b) => {
				if (a.id === currentCampaignId) return -1;
				if (b.id === currentCampaignId) return 1;
				return 0;
			});
		}
		return campaigns.slice(0, 2);
	}, [campaignsData, currentCampaignId]);

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
					display: 'grid',
					gridTemplateColumns: '134px 66px 66px 75px',
					columnGap: 9,
					alignItems: 'center',
					height: 41,
					padding: '0 14px',
					boxSizing: 'border-box',
					fontSize: 16,
					fontWeight: 500,
					color: '#000',
				}}
			>
				<div>Folders</div>
				<div style={{ textAlign: 'center' }}>Drafts</div>
				<div style={{ textAlign: 'center' }}>Sent</div>
				<div style={{ textAlign: 'center' }}>Updated</div>
			</div>
			<div style={{ height: 2, background: '#D0D0D0' }} />
			<div style={{ height: 17, borderBottom: '1px solid #000' }} />
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
					return (
						<div
							key={row.id}
							style={{
								display: 'grid',
								gridTemplateColumns: '134px 66px 66px 75px',
								columnGap: 9,
								alignItems: 'center',
								height: 28,
								padding: '0 14px',
								boxSizing: 'border-box',
								background: index === 0 ? palette.row : '#F8F8F8',
								borderBottom: index === 0 ? '1px solid #000' : '0',
							}}
						>
							<FolderPill
								row={row}
								palette={palette}
								newCount={newCountsByCampaign.get(row.id) ?? 0}
							/>
							<div className="flex justify-center">
								<MetricPill background={getDraftFill(row.draftCount)}>
									{formatCount(row.draftCount)}
								</MetricPill>
							</div>
							<div className="flex justify-center">
								<MetricPill background={getSentFill(row.sentCount)}>
									{row.sentCount ?? 0}
								</MetricPill>
							</div>
							<div className="flex justify-center">
								<MetricPill background={getUpdatedFill(row.updatedAt)} width={64}>
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
