'use client';

import { FC, ReactNode } from 'react';
import { cn } from '@/utils';
import { SendingQueueItem } from '@/contexts/SendingSessionContext';
import { useGetContactResearch } from '@/hooks/queryHooks/useContacts';
import {
	getStateAbbreviation,
	parseMetadataSections,
} from '@/components/molecules/SearchResultsMap/metadata';
import { WebsiteIcon } from '@/components/atoms/_svg/WebsiteIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import {
	useWebsitePreview,
	buildWebsiteAnchorRect,
} from '@/contexts/WebsitePreviewContext';
import { normalizeWebsiteUrl, websiteHost } from '@/utils/websiteUrl';
import {
	getWineBeerSpiritsLabel,
	isCoffeeShopTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import {
	useWebsitePreviewable,
	WEBSITE_NOT_PREVIEWABLE_LABEL,
} from '@/hooks/queryHooks/useWebsitePreviewable';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { SendingContactCard } from './SendingContactCard';
import { SENDING_RESEARCH_CARD_WIDTH_PX } from './constants';

// Band colors mirror the abridged ContactResearchPanel / StreetViewContactCard
// so the sending card reads as the same research surface.
const LOCATION_ROW_COLOR = '#EDF8FF';
const FOUNDED_ROW_COLOR = '#F4FBFF';
const WEBSITE_ROW_COLOR = '#F8FCFF';
const KEYWORDS_ROW_COLOR = '#FCFDFF';
const HEADLINE_BAND_COLOR = '#BBE0F5';
const DASHBOARD_ADDRESS_ROW_COLOR = '#E0F4FF';
const DASHBOARD_HEADLINE_ROW_COLOR = '#DFF0FA';
const DASHBOARD_TITLE_CATEGORY_ROW_COLOR = '#EEF7FF';
const DASHBOARD_COMPANY_TYPE_ROW_COLOR = '#F4FBFF';
const DASHBOARD_LOCATION_ROW_COLOR = '#F2FAFF';
const DASHBOARD_FOUNDED_ROW_COLOR = '#F8FCFF';
const DASHBOARD_WEBSITE_ROW_COLOR = '#FBFDFF';
const DASHBOARD_KEYWORDS_ROW_COLOR = '#FFFFFF';
const DASHBOARD_BOTTOM_HEADLINE_COLOR = '#B3DEF7';

type ContactTitleCategoryKind =
	| 'restaurant'
	| 'coffee-shop'
	| 'music-venue'
	| 'music-festival'
	| 'wedding-planner'
	| 'wedding-venue'
	| 'wine-beer-spirits'
	| 'custom';

const getContactTitleCategory = (title: string | null | undefined) => {
	const value = title?.trim();
	if (!value) return null;

	if (isRestaurantTitle(value)) {
		return { kind: 'restaurant' as const, label: 'Restaurant' };
	}
	if (isCoffeeShopTitle(value)) {
		return { kind: 'coffee-shop' as const, label: 'Coffee Shop' };
	}
	if (isMusicVenueTitle(value)) {
		return { kind: 'music-venue' as const, label: 'Music Venue' };
	}
	if (isMusicFestivalTitle(value)) {
		return { kind: 'music-festival' as const, label: 'Music Festival' };
	}
	if (isWeddingPlannerTitle(value)) {
		return { kind: 'wedding-planner' as const, label: 'Wedding Planner' };
	}
	if (isWeddingVenueTitle(value)) {
		return { kind: 'wedding-venue' as const, label: 'Wedding Venue' };
	}
	if (isWineBeerSpiritsTitle(value)) {
		return {
			kind: 'wine-beer-spirits' as const,
			label: getWineBeerSpiritsLabel(value) || 'Wine/Beer/Spirits',
		};
	}

	return { kind: 'custom' as const, label: value };
};

const renderContactTitleCategoryIcon = (
	kind: ContactTitleCategoryKind,
	size = 14
) => {
	switch (kind) {
		case 'restaurant':
			return <RestaurantsIcon size={size} />;
		case 'coffee-shop':
			return <CoffeeShopsIcon size={Math.round(size * 0.57)} />;
		case 'music-venue':
			return <MusicVenuesIcon size={size} className="flex-shrink-0" />;
		case 'music-festival':
			return <FestivalsIcon size={size} className="flex-shrink-0" />;
		case 'wedding-planner':
		case 'wedding-venue':
			return <WeddingPlannersIcon size={size} />;
		case 'wine-beer-spirits':
			return <WineBeerSpiritsIcon size={size} className="flex-shrink-0" />;
		case 'custom':
			return null;
	}
};

export interface SendingResearchCardProps {
	item: SendingQueueItem;
	tone: 'active' | 'dimmed';
	width?: number;
	/** Fixed card height — when set, the research blurb flexes to fill it. */
	height?: number;
	/** Corner radius (px); defaults to 10 to match the live search overlay. */
	radius?: number;
	contactCardHeight?: number;
	contactCardBackgroundColor?: string;
	useNaturalBadgeColors?: boolean;
	largeTopBadges?: boolean;
	queuedTimelineTextColor?: string;
	progressFraction?: number;
	centerWebsitePreview?: boolean;
	onWebsitePreviewOpen?: () => void;
	layout?: 'compact' | 'dashboard';
}

/**
 * Search-tab sending card: the green sending header (contact + log lines +
 * progress) stacked on a research-card body built from the contact's research
 * fields, advancing card-to-card as the batch sends.
 */
export const SendingResearchCard: FC<SendingResearchCardProps> = ({
	item,
	tone,
	width = SENDING_RESEARCH_CARD_WIDTH_PX,
	height,
	radius = 10,
	contactCardHeight,
	contactCardBackgroundColor,
	useNaturalBadgeColors,
	largeTopBadges,
	queuedTimelineTextColor,
	progressFraction,
	centerWebsitePreview = false,
	onWebsitePreviewOpen,
	layout = 'compact',
}) => {
	const hasHeight = height != null;
	const isDashboardLayout = layout === 'dashboard';
	const { openWebsite } = useWebsitePreview();
	const contact = item.contact;
	// Backfill research only for the front card, like StreetViewContactCard does
	// for slim overlay payloads (30-min cache on the research endpoint).
	const needsBackfill = tone === 'active' && !contact?.metadata;
	const { data: research, isLoading: isResearchLoading } = useGetContactResearch(
		needsBackfill ? contact?.id ?? null : null
	);

	const stateAbbr = getStateAbbreviation(contact?.state || '') || contact?.state || '';
	const cityText = contact?.city?.trim() || '';
	const addressText = contact?.address?.trim() || '';
	const foundedYearText = contact?.companyFoundedYear?.trim() || '';
	const websiteText = contact?.website?.trim() || '';
	const websiteUrl = normalizeWebsiteUrl(contact?.website);
	// Preemptive reachability: a `dead` site renders the Website row non-clickable + tooltip.
	const { classification: websiteClassification } = useWebsitePreviewable(contact?.website);
	const isWebsiteDead = websiteClassification === 'dead';
	const hasKeywords = Boolean(
		contact?.companyKeywords?.some((keyword) => keyword.trim().length > 0)
	);
	const metadata = contact?.metadata || research?.metadata || null;
	const sections = parseMetadataSections(metadata);
	const blurb = sections['1'] ?? (metadata?.trim() || '');
	const headlineText = contact?.headline?.trim() || contact?.title?.trim() || '';
	const categorySource = contact?.title?.trim() || headlineText;
	const titleCategory = getContactTitleCategory(categorySource);
	const titleCategoryIcon = titleCategory
		? renderContactTitleCategoryIcon(titleCategory.kind, 14)
		: null;
	const companyTypeText = contact?.companyType?.trim() || '';
	const latitude =
		typeof contact?.latitude === 'number' ? contact.latitude.toFixed(4) : '';
	const longitude =
		typeof contact?.longitude === 'number' ? contact.longitude.toFixed(4) : '';
	const openContactWebsitePreview = (target: HTMLElement | null) => {
		if (!websiteUrl) return;
		openWebsite(websiteUrl, {
			label: websiteHost(websiteUrl),
			contactId: centerWebsitePreview ? null : contact?.id ?? null,
			anchorRect: centerWebsitePreview ? null : buildWebsiteAnchorRect(target),
		});
		onWebsitePreviewOpen?.();
	};

	const factRow = (label: ReactNode, color: string, key: string) => (
		<div
			key={key}
			className="flex items-center gap-[6px] px-3 h-[24px] border-t-[1.5px] border-black overflow-hidden"
			style={{ backgroundColor: color }}
		>
			{label}
		</div>
	);
	const dashboardRow = (
		label: ReactNode,
		color: string,
		key: string,
		className?: string
	) => (
		<div
			key={key}
			className={cn(
				'flex items-center gap-[6px] px-4 h-[22px] border-t-[1.5px] border-black overflow-hidden text-left',
				className
			)}
			style={{ backgroundColor: color }}
		>
			{label}
		</div>
	);
	const dashboardTextClassName =
		'block min-w-0 w-full truncate font-inter text-[14.2px] font-medium leading-[16px] text-black';

	const factRows: ReactNode[] = [];
	if (isDashboardLayout) {
		if (addressText) {
			factRows.push(
				dashboardRow(
					<span className={dashboardTextClassName}>{addressText}</span>,
					DASHBOARD_ADDRESS_ROW_COLOR,
					'address',
					'h-[28px]'
				)
			);
		}
		if (headlineText) {
			factRows.push(
				dashboardRow(
					<span
						className="block min-w-0 w-full overflow-hidden font-inter text-[14.2px] font-semibold leading-[18px] text-black"
						style={{
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
						}}
					>
						{headlineText}
					</span>,
					DASHBOARD_HEADLINE_ROW_COLOR,
					'headline',
					'h-[36px]'
				)
			);
		}
		if (titleCategory || categorySource) {
			factRows.push(
				dashboardRow(
					<>
						<div className="flex w-[18px] flex-shrink-0 items-center justify-start">
							{titleCategoryIcon}
						</div>
						<span className={dashboardTextClassName}>
							{titleCategory?.label || categorySource}
						</span>
					</>,
					DASHBOARD_TITLE_CATEGORY_ROW_COLOR,
					'title-category'
				)
			);
		}
		if (companyTypeText) {
			factRows.push(
				dashboardRow(
					<span className={dashboardTextClassName}>{companyTypeText}</span>,
					DASHBOARD_COMPANY_TYPE_ROW_COLOR,
					'company-type'
				)
			);
		}
		if (stateAbbr || cityText) {
			factRows.push(
				dashboardRow(
					<>
						{stateAbbr ? (
							<span className="font-inter text-[14.2px] font-medium leading-[16px] text-black">
								{stateAbbr}
							</span>
						) : null}
						{cityText ? (
							<span className="block min-w-0 flex-1 truncate font-inter text-[14.2px] font-bold leading-[16px] text-black">
								{cityText}
							</span>
						) : null}
					</>,
					DASHBOARD_LOCATION_ROW_COLOR,
					'location'
				)
			);
		}
		if (foundedYearText) {
			factRows.push(
				dashboardRow(
					<span className={dashboardTextClassName}>
						Founded {foundedYearText}
					</span>,
					DASHBOARD_FOUNDED_ROW_COLOR,
					'founded'
				)
			);
		}
		if (websiteText) {
			const websiteInner = (
				<>
					<WebsiteIcon size={15} className="flex-shrink-0" />
					<span className={dashboardTextClassName}>Website</span>
				</>
			);
			factRows.push(
				websiteUrl && !isWebsiteDead ? (
					<button
						type="button"
						key="website"
						data-website-preview-trigger
						className="grid w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-x-[6px] overflow-hidden border-t-[1.5px] border-black px-4 h-[22px] text-left hover:underline focus:outline-none focus-visible:underline"
						style={{
							backgroundColor: DASHBOARD_WEBSITE_ROW_COLOR,
							pointerEvents: 'auto',
							cursor: 'pointer',
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
							e.preventDefault();
							openContactWebsitePreview(e.currentTarget);
						}}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								openContactWebsitePreview(e.currentTarget);
							}
						}}
					>
						{websiteInner}
					</button>
				) : isWebsiteDead ? (
					<Tooltip key="website" delayDuration={150}>
						<TooltipTrigger asChild>
							<div
								className="grid w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-x-[6px] overflow-hidden border-t-[1.5px] border-black px-4 h-[22px]"
								style={{
									backgroundColor: DASHBOARD_WEBSITE_ROW_COLOR,
									pointerEvents: 'auto',
									cursor: 'default',
									opacity: 0.55,
								}}
							>
								{websiteInner}
							</div>
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={4} className="text-[12px]">
							{WEBSITE_NOT_PREVIEWABLE_LABEL}
						</TooltipContent>
					</Tooltip>
				) : (
					dashboardRow(websiteInner, DASHBOARD_WEBSITE_ROW_COLOR, 'website')
				)
			);
		}
		if (hasKeywords) {
			factRows.push(
				dashboardRow(
					<span className={dashboardTextClassName}>Keywords</span>,
					DASHBOARD_KEYWORDS_ROW_COLOR,
					'keywords'
				)
			);
		}
	} else if (stateAbbr || cityText) {
		factRows.push(
			factRow(
				<>
					{stateAbbr ? (
						<span className="font-inter text-[12px] font-medium text-black">
							{stateAbbr}
						</span>
					) : null}
					{cityText ? (
						<span className="font-inter text-[12px] font-bold text-black truncate">
							{cityText}
						</span>
					) : null}
				</>,
				LOCATION_ROW_COLOR,
				'location'
			)
		);
	}
	if (!isDashboardLayout && foundedYearText) {
		factRows.push(
			factRow(
				<span className="font-inter text-[12px] font-medium text-black truncate">
					Founded {foundedYearText}
				</span>,
				FOUNDED_ROW_COLOR,
				'founded'
			)
		);
	}
	if (!isDashboardLayout && websiteText) {
		const websiteInner = (
			<>
				<WebsiteIcon size={13} className="flex-shrink-0" />
				<span className="font-inter text-[12px] font-medium text-black truncate">
					Website
				</span>
			</>
		);
		factRows.push(
			websiteUrl && !isWebsiteDead ? (
				<button
					type="button"
					key="website"
					data-website-preview-trigger
					className="flex w-full items-center gap-[6px] px-3 h-[24px] border-t-[1.5px] border-black overflow-hidden text-left hover:underline focus:outline-none focus-visible:underline"
					style={{
						backgroundColor: WEBSITE_ROW_COLOR,
						pointerEvents: 'auto',
						cursor: 'pointer',
					}}
					onMouseDown={(e) => {
						e.stopPropagation();
						e.preventDefault();
						openContactWebsitePreview(e.currentTarget);
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openContactWebsitePreview(e.currentTarget);
						}
					}}
				>
					{websiteInner}
				</button>
			) : isWebsiteDead ? (
				// Known un-previewable (dead/unreachable): non-clickable row + hover tooltip.
				<Tooltip key="website" delayDuration={150}>
					<TooltipTrigger asChild>
						<div
							className="flex w-full items-center gap-[6px] px-3 h-[24px] border-t-[1.5px] border-black overflow-hidden"
							style={{
								backgroundColor: WEBSITE_ROW_COLOR,
								pointerEvents: 'auto',
								cursor: 'default',
								opacity: 0.55,
							}}
						>
							{websiteInner}
						</div>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={4} className="text-[12px]">
						{WEBSITE_NOT_PREVIEWABLE_LABEL}
					</TooltipContent>
				</Tooltip>
			) : (
				factRow(websiteInner, WEBSITE_ROW_COLOR, 'website')
			)
		);
	}
	if (!isDashboardLayout && hasKeywords) {
		factRows.push(
			factRow(
				<span className="font-inter text-[12px] font-medium text-black truncate">
					Keywords
				</span>,
				KEYWORDS_ROW_COLOR,
				'keywords'
			)
		);
	}

	return (
		<div
			className={cn(
				'border-2 border-black bg-white overflow-hidden font-inter',
				hasHeight && 'flex flex-col'
			)}
			style={{
				width: `${width}px`,
				...(hasHeight ? { height: `${height}px` } : {}),
				borderRadius: radius,
			}}
		>
			<SendingContactCard
				item={item}
				isActive={tone === 'active'}
				showProgressBar
				frameless
				height={contactCardHeight}
				backgroundColor={contactCardBackgroundColor}
				useNaturalBadgeColors={useNaturalBadgeColors}
				largeTopBadges={largeTopBadges}
				queuedTimelineTextColor={queuedTimelineTextColor}
				progressFraction={progressFraction}
			/>
			{factRows}
			{(blurb || isResearchLoading || hasHeight) && (
				<div
					className={cn(
						'border-t-[1.5px] border-black bg-white',
						isDashboardLayout ? 'px-4 pt-2 pb-3' : 'px-3 py-2',
						hasHeight && 'flex-1 min-h-0 overflow-hidden'
					)}
					style={
						hasHeight
							? {
									// Fade the last lines so a long blurb clips cleanly at the
									// fixed card height instead of cutting a line in half.
									WebkitMaskImage:
										`linear-gradient(to bottom, #000 calc(100% - ${isDashboardLayout ? '32px' : '22px'}), transparent)`,
									maskImage:
										`linear-gradient(to bottom, #000 calc(100% - ${isDashboardLayout ? '32px' : '22px'}), transparent)`,
								}
							: undefined
					}
				>
					{blurb ? (
						<div
							className={cn(
								'text-left text-black/85',
								isDashboardLayout
									? 'text-[16px] font-normal leading-[1.55]'
									: 'text-[11.5px] font-medium leading-snug'
							)}
							style={
								hasHeight
									? undefined
									: {
											display: '-webkit-box',
											WebkitLineClamp: 6,
											WebkitBoxOrient: 'vertical',
											overflow: 'hidden',
										}
							}
						>
							{blurb}
						</div>
					) : isResearchLoading ? (
						<div className="text-[11px] italic text-black/40">Researching…</div>
					) : null}
				</div>
			)}
			{headlineText ? (
				<div
					className={cn(
						'border-t-[1.5px] border-black',
						isDashboardLayout ? 'px-4 py-[7px]' : 'px-3 py-[5px]'
					)}
					style={{
						backgroundColor: isDashboardLayout
							? DASHBOARD_BOTTOM_HEADLINE_COLOR
							: HEADLINE_BAND_COLOR,
					}}
				>
					<div
						className={cn(
							'font-semibold text-black truncate',
							isDashboardLayout
								? 'text-[13px] leading-[18px]'
								: 'text-[11.5px] leading-snug'
						)}
					>
						{headlineText}
					</div>
				</div>
			) : null}
			{(latitude && longitude) || (!isDashboardLayout && companyTypeText) ? (
				<div className="flex items-center justify-between px-3 h-[26px] border-t-[1.5px] border-black bg-white">
					<span className="text-[11px] font-semibold text-black tabular-nums">
						{latitude && longitude ? `${latitude}   ${longitude}` : ''}
					</span>
					{!isDashboardLayout && companyTypeText ? (
						<span className="text-[11px] font-bold text-black truncate max-w-[45%]">
							{companyTypeText}
						</span>
					) : null}
				</div>
			) : null}
		</div>
	);
};
