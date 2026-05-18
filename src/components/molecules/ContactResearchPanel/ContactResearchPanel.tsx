import { FC, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';
import {
	isRestaurantTitle,
	isCoffeeShopTitle,
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
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';

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
] as const;

const RESEARCH_PANEL_METADATA_TOP = 210;
const RESEARCH_PANEL_DIVIDER_TOPS = [52, 65, 90, 138, 162, 186, 210] as const;

const toCssSize = (value: string | number) =>
	typeof value === 'number' ? `${value}px` : value;

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
}) => {
	const panelWidth = width ?? RESEARCH_PANEL_DEFAULT_WIDTH;
	const panelHeight = height ?? RESEARCH_PANEL_DEFAULT_HEIGHT;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const displayName = contact
		? fullName || contact.name || contact.company || 'Unknown'
		: 'Loading...';
	const companyName = contact?.company?.trim() || '';
	const latitude =
		typeof contact?.latitude === 'number' ? contact.latitude.toFixed(4) : '';
	const longitude =
		typeof contact?.longitude === 'number' ? contact.longitude.toFixed(4) : '';
	const coordinateText = [latitude, longitude].filter(Boolean).join('   ');
	const addressText = contact?.address?.trim() || '';
	const headlineText = contact?.headline?.trim() || contact?.title?.trim() || '';
	const metadataText = contact?.metadata || '';
	const textStyle = hideAllText ? { color: 'transparent' } : undefined;

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
				{RESEARCH_PANEL_BANDS.map((band) => (
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
						top: `${RESEARCH_PANEL_METADATA_TOP}px`,
						backgroundColor: '#FCFDFF',
					}}
				/>
			</div>

			{RESEARCH_PANEL_DIVIDER_TOPS.map((top) => (
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
				className="absolute left-[31px] right-[17px] top-[10px] z-10 font-inter text-black"
				style={textStyle}
			>
				<div className="min-w-0 pr-[130px]">
					<div className="truncate text-[18px] leading-[1.05] font-normal">
						{displayName}
					</div>
					{companyName && (
						<div className="truncate text-[17px] leading-[1.05] font-normal mt-[2px]">
							{companyName}
						</div>
					)}
				</div>
				{coordinateText && (
					<div className="absolute right-0 bottom-[1px] text-[13px] leading-none font-bold whitespace-nowrap">
						{coordinateText}
					</div>
				)}
			</div>

			<div
				className="absolute left-0 right-0 z-10 flex items-center justify-center px-[24px] font-inter text-black"
				style={{
					top: '65px',
					height: '25px',
					fontSize: '14.349px',
					fontStyle: 'normal',
					fontWeight: 500,
					lineHeight: '16.419px',
					textAlign: 'center',
					...(textStyle || {}),
				}}
			>
				<span className="block w-full truncate">{addressText}</span>
			</div>

			<div
				className="absolute left-0 right-0 z-10 flex items-center px-[36px] font-inter text-black"
				style={{
					top: '90px',
					height: '48px',
					fontSize: '14.349px',
					fontStyle: 'normal',
					fontWeight: 600,
					lineHeight: '24.392px',
					...(textStyle || {}),
				}}
			>
				<span
					style={{
						display: '-webkit-box',
						WebkitBoxOrient: 'vertical',
						WebkitLineClamp: 2,
						overflow: 'hidden',
					}}
				>
					{headlineText}
				</span>
			</div>

			<div
				className="research-panel-metadata-scroll absolute left-0 right-0 bottom-0 z-10"
				style={{ top: `${RESEARCH_PANEL_METADATA_TOP}px` }}
			>
				<style>{`
					.research-panel-metadata-scroll *::-webkit-scrollbar {
						display: none !important;
						width: 0 !important;
						height: 0 !important;
						background: transparent !important;
					}
					.research-panel-metadata-scroll * {
						-ms-overflow-style: none !important;
						scrollbar-width: none !important;
					}
				`}</style>
				<div className="h-full px-[40px] pt-[20px] pb-[22px] overflow-hidden">
					<div
						className="h-full overflow-y-auto whitespace-pre-wrap break-words font-inter text-[15px] leading-[1.33] font-normal text-black"
						style={textStyle}
					>
						{metadataText}
					</div>
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
				{contact.title && (
					<div
						className="max-w-[160px] px-2 py-[2px] rounded-[8px] border border-black flex items-center gap-1"
						style={{
							backgroundColor: isRestaurantTitle(contact.title)
								? '#C3FBD1'
								: isCoffeeShopTitle(contact.title)
									? '#D6F1BD'
									: isMusicVenueTitle(contact.title)
										? '#B7E5FF'
										: isWeddingPlannerTitle(contact.title) ||
											  isWeddingVenueTitle(contact.title)
											? '#FFF2BC'
											: isWineBeerSpiritsTitle(contact.title)
												? '#BFC4FF'
												: '#E8EFFF',
						}}
					>
						{isRestaurantTitle(contact.title) && (
							<RestaurantsIcon size={12} className="flex-shrink-0" />
						)}
						{isCoffeeShopTitle(contact.title) && <CoffeeShopsIcon size={7} />}
						{isMusicVenueTitle(contact.title) && (
							<MusicVenuesIcon size={12} className="flex-shrink-0" />
						)}
						{(isWeddingPlannerTitle(contact.title) ||
							isWeddingVenueTitle(contact.title)) && <WeddingPlannersIcon size={12} />}
						{isWineBeerSpiritsTitle(contact.title) && (
							<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
						)}
						<span className="text-[10px] leading-none text-black block truncate">
							{isRestaurantTitle(contact.title)
								? 'Restaurant'
								: isCoffeeShopTitle(contact.title)
									? 'Coffee Shop'
									: isMusicVenueTitle(contact.title)
										? 'Music Venue'
										: isWeddingPlannerTitle(contact.title)
											? 'Wedding Planner'
											: isWeddingVenueTitle(contact.title)
												? 'Wedding Venue'
												: isWineBeerSpiritsTitle(contact.title)
													? getWineBeerSpiritsLabel(contact.title)
													: contact.title}
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
