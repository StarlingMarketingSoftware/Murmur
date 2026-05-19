import { FC, Fragment, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
	isMusicFestivalTitle,
	isMusicVenueTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
	getWineBeerSpiritsLabel,
} from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { WebsiteIcon } from '@/components/atoms/_svg/WebsiteIcon';

const RESEARCH_PANEL_DEFAULT_WIDTH = 375;
const RESEARCH_PANEL_DEFAULT_HEIGHT = 672;
const RESEARCH_PANEL_BORDER_WIDTH = 1.913;

const RESEARCH_PANEL_BANDS = [
	{ top: 0, height: 52, color: '#FFFFFF' },
	{ top: 52, height: 13, color: '#F67C7E' },
	{ top: 65, height: 25, color: '#ABDCF9' },
	{ top: 90, height: 48, color: '#BBE0F5' },
	{ top: 138, height: 24, color: '#D2EFFF' },
	{ top: 162, height: 24, color: '#E8F7FF' },
	{ top: 186, height: 24, color: '#EDF8FF' },
	{ top: 210, height: 24, color: '#F4FBFF' },
	{ top: 234, height: 24, color: '#F8FCFF' },
] as const;

const RESEARCH_PANEL_METADATA_TOP = 258;
const RESEARCH_PANEL_DIVIDER_TOPS = [52, 65, 90, 138, 162, 186, 210, 234, 258] as const;

const toCssSize = (value: string | number) =>
	typeof value === 'number' ? `${value}px` : value;

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
		return {
			kind: 'restaurant' as const,
			label: 'Restaurant',
			backgroundColor: '#C3FBD1',
		};
	}
	if (isCoffeeShopTitle(value)) {
		return {
			kind: 'coffee-shop' as const,
			label: 'Coffee Shop',
			backgroundColor: '#D6F1BD',
		};
	}
	if (isMusicVenueTitle(value)) {
		return {
			kind: 'music-venue' as const,
			label: 'Music Venue',
			backgroundColor: '#B7E5FF',
		};
	}
	if (isMusicFestivalTitle(value)) {
		return {
			kind: 'music-festival' as const,
			label: 'Music Festival',
			backgroundColor: '#C1D6FF',
		};
	}
	if (isWeddingPlannerTitle(value)) {
		return {
			kind: 'wedding-planner' as const,
			label: 'Wedding Planner',
			backgroundColor: '#FFF2BC',
		};
	}
	if (isWeddingVenueTitle(value)) {
		return {
			kind: 'wedding-venue' as const,
			label: 'Wedding Venue',
			backgroundColor: '#FFF2BC',
		};
	}
	if (isWineBeerSpiritsTitle(value)) {
		return {
			kind: 'wine-beer-spirits' as const,
			label: getWineBeerSpiritsLabel(value) || 'Wine/Beer/Spirits',
			backgroundColor: '#BFC4FF',
		};
	}

	return {
		kind: 'custom' as const,
		label: value,
		backgroundColor: '#E8EFFF',
	};
};

const renderContactTitleCategoryIcon = (
	kind: ContactTitleCategoryKind,
	size = 12
) => {
	switch (kind) {
		case 'restaurant':
			return (
				<RestaurantsIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'coffee-shop':
			return (
				<CoffeeShopsIcon
					size={Math.round(size * (7 / 12))}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'music-venue':
			return (
				<MusicVenuesIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'music-festival':
			return (
				<FestivalsIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'wedding-planner':
		case 'wedding-venue':
			return (
				<WeddingPlannersIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'wine-beer-spirits':
			return (
				<WineBeerSpiritsIcon
					size={size}
					className="flex-shrink-0"
					innerFill="transparent"
					outlineFill="black"
				/>
			);
		case 'custom':
			return null;
	}
};

export interface ContactResearchPanelProps {
	contact: ContactWithName | null | undefined;
	className?: string;
	style?: React.CSSProperties;
	/**
	 * When true, renders the full panel chrome but hides all textual content.
	 * Used for the Drafts tab empty state so research details aren't shown
	 * while still keeping the layout skeleton visible.
	 */
	hideAllText?: boolean;
	/**
	 * If true, hides the summary box at the bottom when bullet points (parsed sections) are present.
	 * If no bullet points are present, the summary box is still shown (as the only content).
	 */
	hideSummaryIfBullets?: boolean;
	/**
	 * Fixed height override for the panel.
	 */
	height?: string | number;
	/**
	 * In fixed-height mode (when `height` is provided), controls the vertical spacing increment
	 * between parsed bullet boxes. Defaults to 52 (legacy compact spacing).
	 */
	fixedHeightBoxSpacingPx?: number;
	/**
	 * In fixed-height mode (when `height` is provided), overrides the parsed bullet outer box height.
	 * Defaults to 44 (legacy compact bullet height).
	 */
	fixedHeightBulletOuterHeightPx?: number;
	/**
	 * In fixed-height mode (when `height` is provided), overrides the parsed bullet inner white box height.
	 * Defaults to 36 (legacy compact bullet inner height).
	 */
	fixedHeightBulletInnerHeightPx?: number;
	/**
	 * When showing parsed bullets + the bottom summary in fixed-height mode, allow the summary box
	 * to expand to fill the remaining available height (useful when the outer `height` is computed dynamically).
	 */
	expandSummaryToFillHeight?: boolean;
	/**
	 * Width override for the panel and inner content boxes. Defaults to 360px for inner boxes, 375px for outer.
	 */
	boxWidth?: number;
	/**
	 * Width override for the outer container. Defaults to boxWidth + 15 (or 375px).
	 */
	width?: number;
	/**
	 * When true, uses a compact 19px header with smaller font (for All tab).
	 */
	compactHeader?: boolean;
	/**
	 * When true, prevents bullet points from expanding on click.
	 * Useful for demo/landing page views where interaction should be limited.
	 */
	disableExpansion?: boolean;
}

// Parse metadata sections [1], [2], etc. from the contact metadata field.
// Only includes sequential sections starting from [1] that have meaningful content.
const parseMetadataSections = (metadata: string | null | undefined) => {
	if (!metadata) return {};

	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match;
	while ((match = regex.exec(metadata)) !== null) {
		const sectionNum = match[1];
		const content = match[2].trim();
		allSections[sectionNum] = content;
	}

	const sections: Record<string, string> = {};
	let expectedNum = 1;

	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)];
		const meaningfulContent = content.replace(/[.\s,;:!?'")(\-–—]/g, '').trim();

		if (meaningfulContent.length < 5) {
			break;
		}

		sections[String(expectedNum)] = content;
		expectedNum++;
	}

	if (Object.keys(sections).length < 3) {
		return {};
	}

	return sections;
};

export const ContactResearchPanel: FC<ContactResearchPanelProps> = ({
	contact,
	className,
	style,
	hideAllText = false,
	height,
	width,
	boxWidth,
}) => {
	const panelWidth = width ?? RESEARCH_PANEL_DEFAULT_WIDTH;
	const panelHeight = height ?? RESEARCH_PANEL_DEFAULT_HEIGHT;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const personalName = fullName || contact?.name?.trim() || '';
	const companyName = contact?.company?.trim() || '';
	const isCompanyOnlyHeader = Boolean(
		!hideAllText && contact && companyName && !personalName
	);
	const headerHeight = isCompanyOnlyHeader ? 45 : 52;
	const topDetailStart = headerHeight + 13;
	const displayName = contact
		? personalName || companyName || 'Unknown'
		: 'Loading...';
	const showCompanyName = Boolean(personalName && companyName);
	const latitude =
		typeof contact?.latitude === 'number' ? contact.latitude.toFixed(4) : '';
	const longitude =
		typeof contact?.longitude === 'number' ? contact.longitude.toFixed(4) : '';
	const coordinateText = [latitude, longitude].filter(Boolean).join('   ');
	const addressText = contact?.address?.trim() || '';
	const headlineText = contact?.headline?.trim() || contact?.title?.trim() || '';
	const titleCategory = getContactTitleCategory(contact?.title);
	const titleCategoryIcon = titleCategory
		? renderContactTitleCategoryIcon(titleCategory.kind, 16)
		: null;
	const companyTypeText = contact?.companyType?.trim() || '';
	const stateAbbr = getStateAbbreviation(contact?.state || '').trim();
	const cityText = contact?.city?.trim() || '';
	const foundedYearText = contact?.companyFoundedYear?.trim() || '';
	const websiteText = contact?.website?.trim() || '';
	const metadataText = contact?.metadata || '';
	const textStyle = hideAllText ? { color: 'transparent' } : undefined;
	const headlineWidth =
		boxWidth ?? (typeof style?.width === 'number' ? style.width : panelWidth);
	const headlineCharsPerLine = Math.max(1, Math.floor((headlineWidth - 40) / 7.5));
	const isSingleLineHeadline =
		!headlineText.includes('\n') && headlineText.length <= headlineCharsPerLine;
	const headlineRowHeight = isSingleLineHeadline ? 24 : 48;
	const topDetailRows: Array<{
		key: string;
		height: number;
		color: string;
		render: (top: number) => React.ReactNode;
	}> = [];

	if (addressText) {
		topDetailRows.push({
			key: 'address',
			height: 25,
			color: '#ABDCF9',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start font-inter text-left text-black"
					style={{
						top: `${top}px`,
						height: '25px',
						fontSize: '14.349px',
						fontStyle: 'normal',
						fontWeight: 500,
						lineHeight: '16.419px',
						textAlign: 'left',
						...(textStyle || {}),
					}}
				>
					<span className="block w-full truncate">{addressText}</span>
				</div>
			),
		});
	}

	if (headlineText) {
		topDetailRows.push({
			key: 'headline',
			height: headlineRowHeight,
			color: '#BBE0F5',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center font-inter text-left text-black"
					style={{
						top: `${top}px`,
						height: `${headlineRowHeight}px`,
						fontSize: '14.349px',
						fontStyle: 'normal',
						fontWeight: 600,
						lineHeight: isSingleLineHeadline ? '16.419px' : '24.392px',
						...(textStyle || {}),
					}}
				>
					<span
						style={{
							display: '-webkit-box',
							WebkitBoxOrient: 'vertical',
							WebkitLineClamp: isSingleLineHeadline ? 1 : 2,
							overflow: 'hidden',
						}}
					>
						{headlineText}
					</span>
				</div>
			),
		});
	}

	if (titleCategory && !hideAllText) {
		topDetailRows.push({
			key: 'title-category',
			height: 24,
			color: '#D2EFFF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<div
						className={cn(
							'w-full items-center overflow-hidden',
							titleCategoryIcon
								? 'grid grid-cols-[18px_minmax(0,1fr)] gap-x-[8px]'
								: 'flex justify-start'
						)}
					>
						{titleCategoryIcon && (
							<div className="flex items-center justify-start">
								{titleCategoryIcon}
							</div>
						)}
						<span
							className="truncate"
							style={{
								color: '#000',
								textAlign: 'left',
								fontFamily: 'Inter',
								fontSize: '14.349px',
								fontStyle: 'normal',
								fontWeight: 500,
								lineHeight: '16.419px',
							}}
						>
							{titleCategory.label}
						</span>
					</div>
				</div>
			),
		});
	}

	if (companyTypeText && !hideAllText) {
		topDetailRows.push({
			key: 'company-type',
			height: 24,
			color: '#E8F7FF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<span
						className="block w-full truncate"
						style={{
							color: '#000',
							textAlign: 'left',
							fontFamily: 'Inter',
							fontSize: '14.349px',
							fontStyle: 'normal',
							fontWeight: 500,
							lineHeight: '16.419px',
						}}
					>
						{companyTypeText}
					</span>
				</div>
			),
		});
	}

	if ((stateAbbr || cityText) && !hideAllText) {
		topDetailRows.push({
			key: 'location',
			height: 24,
			color: '#EDF8FF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-[6px] overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<div className="flex items-center justify-start">
						{stateAbbr && (
							<span
								style={{
									color: '#000',
									fontFamily: 'Inter',
									fontSize: '15.091px',
									fontStyle: 'normal',
									fontWeight: 400,
									lineHeight: '14.408px',
								}}
							>
								{stateAbbr}
							</span>
						)}
					</div>
					{cityText && (
						<span
							className="truncate"
							style={{
								color: '#202020',
								fontFamily: 'Inter',
								fontSize: '15.091px',
								fontStyle: 'normal',
								fontWeight: 600,
								lineHeight: '14.408px',
							}}
						>
							{cityText}
						</span>
					)}
				</div>
			),
		});
	}

	if (foundedYearText && !hideAllText) {
		topDetailRows.push({
			key: 'founded-year',
			height: 24,
			color: '#F4FBFF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<span
						className="block w-full truncate"
						style={{
							color: '#000',
							textAlign: 'left',
							fontFamily: 'Inter',
							fontSize: '14.349px',
							fontStyle: 'normal',
							fontWeight: 500,
							lineHeight: '16.419px',
						}}
					>
						Founded {foundedYearText}
					</span>
				</div>
			),
		});
	}

	if (websiteText && !hideAllText) {
		topDetailRows.push({
			key: 'website',
			height: 24,
			color: '#F8FCFF',
			render: (top) => (
				<div
					className="absolute left-[23px] right-[17px] z-10 flex items-center justify-start overflow-hidden"
					style={{
						top: `${top}px`,
						height: '24px',
					}}
				>
					<div className="grid w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-x-[9px] overflow-hidden">
						<div className="flex items-center justify-start">
							<WebsiteIcon className="flex-shrink-0" />
						</div>
						<span
							className="truncate"
							style={{
								color: '#000',
								textAlign: 'left',
								fontFamily: 'Inter',
								fontSize: '14.349px',
								fontStyle: 'normal',
								fontWeight: 500,
								lineHeight: '16.419px',
							}}
						>
							Website
						</span>
					</div>
				</div>
			),
		});
	}

	let nextTopDetailRowTop = topDetailStart;
	const positionedTopDetailRows = topDetailRows.map((row) => {
		const top = nextTopDetailRowTop;
		nextTopDetailRowTop += row.height;
		return { ...row, top };
	});
	const lastTopDetailRow = positionedTopDetailRows[positionedTopDetailRows.length - 1];
	const metadataTop = hideAllText
		? RESEARCH_PANEL_METADATA_TOP
		: lastTopDetailRow
			? lastTopDetailRow.top + lastTopDetailRow.height
			: topDetailStart;
	const panelBands = hideAllText
		? RESEARCH_PANEL_BANDS
		: [
				{ top: 0, height: headerHeight, color: '#FFFFFF' },
				{ top: headerHeight, height: 13, color: '#F67C7E' },
				...positionedTopDetailRows.map(({ top, height, color }) => ({
					top,
					height,
					color,
				})),
			];
	const dividerTops = hideAllText
		? RESEARCH_PANEL_DIVIDER_TOPS
		: [
				headerHeight,
				topDetailStart,
				...positionedTopDetailRows.map((row) => row.top + row.height),
			];

	return (
		<div
			data-contact-research-panel="true"
			className={cn(
				'relative block overflow-hidden rounded-[11.48px] border-[1.913px] border-black bg-[#F8FAFF] text-black',
				className
			)}
			style={{
				width: toCssSize(panelWidth),
				height: toCssSize(panelHeight),
				...style,
			}}
			data-hover-description="Research: Background info and notes for the selected contact."
			role="region"
			aria-label="Research panel"
		>
			<div className="absolute inset-0 rounded-[inherit] overflow-hidden">
				{panelBands.map((band) => (
					<div
						key={`${band.top}-${band.color}`}
						className="absolute left-0 right-0"
						style={{
							top: `${band.top}px`,
							height: `${band.height}px`,
							backgroundColor: band.color,
						}}
					/>
				))}
				<div
					className="absolute left-0 right-0 bottom-0"
					style={{
						top: `${metadataTop}px`,
						backgroundColor: '#FCFDFF',
					}}
				/>
			</div>

			{dividerTops.map((top) => (
				<div
					key={top}
					className="absolute left-0 right-0 bg-black"
					style={{
						top: `${top}px`,
						height: `${RESEARCH_PANEL_BORDER_WIDTH}px`,
					}}
				/>
			))}

			<div
				className={cn(
					'absolute left-[23px] right-[17px] top-[10px] z-10 font-inter text-left text-black',
					isCompanyOnlyHeader && 'flex items-center'
				)}
				style={{
					...(textStyle || {}),
					...(isCompanyOnlyHeader ? { top: 0 } : {}),
					height: `${isCompanyOnlyHeader ? headerHeight : headerHeight - 10}px`,
				}}
			>
				<div className={cn('min-w-0 pr-[130px]', isCompanyOnlyHeader && 'w-full')}>
					<div className="truncate text-[18px] leading-[1.05] font-normal">
						{displayName}
					</div>
					{showCompanyName && (
						<div className="truncate text-[17px] leading-[1.05] font-normal mt-[2px]">
							{companyName}
						</div>
					)}
				</div>
				{coordinateText && (
					<div
						className="absolute right-0 bottom-[-2px] whitespace-nowrap"
						style={{
							color: '#000',
							fontFamily: 'Inter',
							fontSize: '11.48px',
							fontStyle: 'normal',
							fontWeight: 600,
							lineHeight: '24.392px',
						}}
					>
						{coordinateText}
					</div>
				)}
			</div>

			{positionedTopDetailRows.map((row) => (
				<Fragment key={row.key}>{row.render(row.top)}</Fragment>
			))}

			<div
				className="research-panel-metadata-scroll absolute left-0 right-0 bottom-0 z-10"
				style={{ top: `${metadataTop}px` }}
			>
				<div className="h-full pl-[23px] pr-[17px] pt-[11px] pb-[22px] overflow-hidden">
					<CustomScrollbar
						className="h-full"
						thumbWidth={0}
						thumbColor="transparent"
						trackColor="transparent"
						lockHorizontalScroll
					>
						<div
							className="whitespace-pre-wrap break-words"
							style={{
								color: '#000',
								fontFamily: 'Inter',
								fontSize: '14.349px',
								fontStyle: 'normal',
								fontWeight: 400,
								lineHeight: '121.531%',
								...(textStyle || {}),
							}}
						>
							{metadataText}
						</div>
					</CustomScrollbar>
				</div>
			</div>
		</div>
	);
};

export default ContactResearchPanel;

/**
 * Horizontal, table-width version of the research panel.
 *
 * Intended for medium desktop widths where the right-side `ContactResearchPanel`
 * would be off-screen. Renders a 2x3 grid:
 * - Top-left: contact info summary box
 * - Remaining 5 cells: research bullets [1]-[5] in the order:
 *   [3]  [1]
 *   [4]  [2]
 *   [5]  (empty if missing)
 *
 * The layout is responsive but is designed around ~831px width and 224px height.
 */
export const ContactResearchHorizontalStrip: FC<
	Pick<ContactResearchPanelProps, 'contact' | 'className' | 'style'>
> = ({ contact, className, style }) => {
	const metadataSections = useMemo(
		() => parseMetadataSections(contact?.metadata),
		[contact?.metadata]
	);

	const sectionKeys = Object.keys(metadataSections);
	const hasParsedSections = sectionKeys.length >= 3;
	const hasUnparsedMetadata = !hasParsedSections && !!contact?.metadata;

	// Only show if we have parsed sections OR unparsed metadata
	if (!contact || (!hasParsedSections && !hasUnparsedMetadata)) {
		return null;
	}

	// Colors match the vertical panel for visual consistency
	const boxColorMap: Record<string, string> = {
		'1': '#158BCF',
		'2': '#43AEEC',
		'3': '#7CC9F6',
		'4': '#AADAF6',
		'5': '#D7F0FF',
	};

	// Order for numbered bullets to roughly match the design mock
	const orderedKeys: (keyof typeof boxColorMap)[] = ['3', '1', '4', '2', '5'];

	const renderBulletCell = (key: keyof typeof boxColorMap) => {
		const text = metadataSections[key];
		const hasText = !!text;

		// If this key isn't present, render a placeholder box with just fill color and stroke
		return (
			<div key={key} className="min-h-[82px] lg:min-h-[52px]">
				<div
					className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black flex items-stretch"
					style={{
						backgroundColor: boxColorMap[key],
					}}
				>
					{hasText && (
						<>
							<div className="flex items-center justify-center px-2">
								<span className="font-inter font-bold text-[11.5px] leading-none text-black">
									[{key}]
								</span>
							</div>
							<div className="flex-1 mr-[6px] my-[4px] bg-white border border-black rounded-[6px] px-[6px] py-[4px] flex items-center min-w-0">
								<div
									className="text-[13px] leading-[1.25] font-inter text-black horizontal-research-bullet-text"
									style={{
										display: '-webkit-box',
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
									}}
								>
									{text}
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		);
	};

	const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
	const displayName = fullName || contact.name || contact.company || 'Unknown';
	const hasName = fullName.length > 0 || (contact.name && contact.name.length > 0);

	const stateAbbr = getStateAbbreviation(contact.state || '') || '';
	const titleCategory = getContactTitleCategory(contact.title);

	// Contact info box component (reused in both layouts)
	const contactInfoBox = (
		<div className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black bg-white px-3 py-[6px] flex items-center justify-between gap-3">
			<div className="flex flex-col justify-center min-w-0">
				<div className="font-inter font-bold text-[14px] leading-tight truncate text-black">
					{displayName}
				</div>
				{hasName && contact.company && (
					<div className="text-[11px] leading-tight text-[#4b4b4b] truncate">
						{contact.company}
					</div>
				)}
				{!hasName && contact.title && (
					<div className="text-[11px] leading-tight text-[#4b4b4b] truncate">
						{contact.title}
					</div>
				)}
			</div>
			<div className="flex flex-col items-start gap-[2px] flex-shrink-0">
				<div className="flex items-center gap-1">
					{stateAbbr && stateBadgeColorMap[stateAbbr] && (
						<span
							className="inline-flex items-center justify-center h-[16px] px-[6px] rounded-[4px] border border-black text-[11px] font-bold leading-none"
							style={{ backgroundColor: stateBadgeColorMap[stateAbbr] }}
						>
							{stateAbbr}
						</span>
					)}
					{contact.city && (
						<span className="text-[11px] leading-none text-black truncate max-w-[120px]">
							{contact.city}
						</span>
					)}
				</div>
				{titleCategory && (
					<div
						className="max-w-[160px] px-2 py-[2px] rounded-[8px] border border-black flex items-center gap-1"
						style={{ backgroundColor: titleCategory.backgroundColor }}
					>
						{renderContactTitleCategoryIcon(titleCategory.kind)}
						<span className="text-[10px] leading-none text-black block truncate">
							{titleCategory.label}
						</span>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div
			className={cn(
				// Hidden on very small screens and on wide screens where the side panel is visible.
				'hidden sm:block xl:hidden relative z-[50] mx-auto -mt-[55px] lg:mt-0 mb-8 lg:mb-4 bg-[#D8E5FB] border-[3px] border-black rounded-[7px]',
				'max-w-[596px] lg:max-w-[831px] min-h-[305px] lg:min-h-[224px]',
				className
			)}
			style={style}
			data-hover-description="Research: Background info and notes for the selected contact."
		>
			{/* CSS for responsive line clamp on bullet text */}
			<style>{`
				.horizontal-research-bullet-text {
					-webkit-line-clamp: 4;
				}
				@media (min-width: 1024px) {
					.horizontal-research-bullet-text {
						-webkit-line-clamp: 2;
					}
				}
			`}</style>
			<div className="px-3 pt-[6px] pb-3">
				<div className="mb-2">
					<span className="font-secondary font-bold text-[13px] leading-none text-black">
						Research
					</span>
				</div>

				{hasParsedSections ? (
					/* Normal parsed sections layout: 2-column grid */
					<div className="grid grid-cols-2 gap-x-[12px] gap-y-[8px] auto-rows-[82px] lg:auto-rows-[52px]">
						{/* Top-left: contact summary info box */}
						<div className="min-h-[82px] lg:min-h-[52px]">{contactInfoBox}</div>

						{/* Remaining cells: research bullets laid out in a 2x3 grid */}
						{orderedKeys.map((key) => renderBulletCell(key))}
					</div>
				) : (
					/* Unparsed metadata layout: contact info on left, full text on right spanning 3 rows */
					<div className="grid grid-cols-2 gap-x-[12px]">
						{/* Left column: contact info box */}
						<div className="row-span-3 flex flex-col gap-y-[8px]">
							<div className="h-[82px] lg:h-[52px]">{contactInfoBox}</div>
							{/* Two placeholder boxes below contact info */}
							<div
								className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black"
								style={{ backgroundColor: '#C6D9F8' }}
							/>
							<div
								className="w-full h-[82px] lg:h-[52px] rounded-[8px] border-2 border-black"
								style={{ backgroundColor: '#C6D9F8' }}
							/>
						</div>

						{/* Right column: single tall text block spanning all 3 rows */}
						<div id="horizontal-research-text-block" className="row-span-3">
							<style>{`
								#horizontal-research-text-block *::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
									background: transparent !important;
								}
								#horizontal-research-text-block * {
									-ms-overflow-style: none !important;
									scrollbar-width: none !important;
								}
							`}</style>
							<div
								className="w-full h-[calc(82px*3+8px*2)] lg:h-[calc(52px*3+8px*2)] rounded-[8px] border-2 border-black flex items-stretch"
								style={{
									backgroundColor: boxColorMap['1'],
								}}
							>
								<div className="flex-1 m-[6px] bg-white border border-black rounded-[6px] px-[8px] py-[6px] overflow-hidden">
									<div
										className="text-[13px] leading-[1.35] font-inter text-black h-full overflow-y-auto"
										style={{
											wordBreak: 'break-word',
										}}
									>
										{contact.metadata}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
