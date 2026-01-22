import { FC, useMemo, useState } from 'react';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import ResearchChevron from '@/components/atoms/_svg/ResearchChevron';
import ResearchHeaderMap from '@/components/atoms/_svg/ResearchHeaderMap';
import {
	getCampaignLoadingWaveElapsedSeconds,
	getSyncedWaveDelay,
} from '@/utils/campaignLoadingWave';

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

	// First, extract all sections
	const allSections: Record<string, string> = {};
	const regex = /\[(\d+)\]\s*([\s\S]*?)(?=\[\d+\]|$)/g;
	let match;
	while ((match = regex.exec(metadata)) !== null) {
		const sectionNum = match[1];
		const content = match[2].trim();
		allSections[sectionNum] = content;
	}

	// Filter to only sequential sections starting from 1, with meaningful content
	const sections: Record<string, string> = {};
	let expectedNum = 1;

	while (allSections[String(expectedNum)]) {
		const content = allSections[String(expectedNum)];
		// Check if content has meaningful text (not just punctuation/whitespace)
		// Remove common punctuation and whitespace to check for actual content
		const meaningfulContent = content.replace(/[.\s,;:!?'"()\-–—]/g, '').trim();

		// Require at least 5 characters of meaningful content
		if (meaningfulContent.length < 5) {
			// Stop if we hit a section without meaningful content
			break;
		}

		sections[String(expectedNum)] = content;
		expectedNum++;
	}

	// Only return sections if there are at least 3 valid sequential sections
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
	hideSummaryIfBullets = false,
	height,
	fixedHeightBoxSpacingPx,
	fixedHeightBulletOuterHeightPx,
	fixedHeightBulletInnerHeightPx,
	expandSummaryToFillHeight = false,
	boxWidth = 360,
	width,
	compactHeader = false,
	disableExpansion = false,
}) => {
	// Track which box is expanded (null = none expanded)
	const [expandedBox, setExpandedBox] = useState<string | null>(null);

	// Outer container width: use explicit width prop, or derive from boxWidth + 15 (for default 375px appearance)
	const containerWidth = width ?? (boxWidth + 15);
	// Header dimensions based on compact mode
	const headerHeight = compactHeader ? 19 : 24;
	const headerFontSize = compactHeader ? '11px' : '14px';
	// Calculate inner box widths based on outer box width
	const innerBoxWidth = boxWidth - 41; // 360 - 41 = 319 default
	const summaryInnerWidth = boxWidth - 10; // 360 - 10 = 350 default
	// useMemo must be called before any early returns to satisfy React Hooks rules
	const metadataSections = useMemo(
		() => parseMetadataSections(contact?.metadata),
		[contact?.metadata]
	);

	// Determine if we're in a "loading" state (no contact yet)
	const isLoading = !contact;
	const contactFullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const hasName =
		!isLoading &&
		(contactFullName.length > 0 || (contact?.name && contact?.name.length > 0));
	const hasCompany = !isLoading && !!contact?.company && contact.company.trim().length > 0;
	const isCompanyOnly = !hasName && hasCompany;

	const displayName = isLoading
		? 'Loading...'
		: contactFullName || contact?.name || contact?.company || 'Unknown';

	const stateAbbr = !isLoading ? getStateAbbreviation(contact?.state || '') || '' : '';
	const stateBadgeColor =
		!isLoading && stateAbbr && stateBadgeColorMap[stateAbbr]
			? stateBadgeColorMap[stateAbbr]
			: null;
	const locationText = !isLoading ? (contact?.city || contact?.state || '') : '';

	const parsedSectionsCount = Object.keys(metadataSections).length;
	const hasAnyParsedSections = parsedSectionsCount > 0;
	// Hide summary when: (1) we have parsed sections and hideSummaryIfBullets is true, OR
	// (2) we're loading and hideSummaryIfBullets is true (since we show placeholder boxes)
	const shouldHideSummary = (hasAnyParsedSections || isLoading) && hideSummaryIfBullets;

	// When loading (no contact), show 4 placeholder boxes (matches typical "4 bullets" research layout)
	const displaySectionsCount = isLoading ? 3 : parsedSectionsCount;

	// Loading wave timing (match other panels for a consistent feel)
	// IMPORTANT: `.research-panel-loading-wave-box` uses a 6s CSS animation in globals.css.
	// Keep our delay math aligned to that duration.
	const loadingWaveDurationSeconds = 6;
	const loadingWaveStepDelaySeconds = 0.1;
	const loadingWaveBaseColor = '#E9F7FF';
	// If the page-level CampaignPageSkeleton was shown, sync our wave phase to it so
	// the animation does not restart when the real component mounts.
	const syncedWaveElapsedSeconds = useMemo(() => getCampaignLoadingWaveElapsedSeconds(), []);
	const waveDelayForIndex = (idx: number) =>
		syncedWaveElapsedSeconds !== null
			? getSyncedWaveDelay({
					elapsedSeconds: syncedWaveElapsedSeconds,
					durationSeconds: loadingWaveDurationSeconds,
					index: idx,
					stepSeconds: loadingWaveStepDelaySeconds,
			  })
			: `${-(loadingWaveDurationSeconds - idx * loadingWaveStepDelaySeconds)}s`;
	// Number of bullet boxes we render while loading (used to place the summary wave after bullets).
	const loadingBulletCount = isLoading ? Math.min(displaySectionsCount, 5) : 0;

	const fixedHeightBoxSpacing = fixedHeightBoxSpacingPx ?? 52;
	const fixedHeightBulletOuterHeight = fixedHeightBulletOuterHeightPx ?? 44;
	const fixedHeightBulletInnerHeight = fixedHeightBulletInnerHeightPx ?? 36;

	// Expanded box dimensions
	const expandedOuterHeight = 161;
	const expandedInnerHeight = 123;
	const normalOuterHeight = height ? fixedHeightBulletOuterHeight : 52;
	const normalInnerHeight = height ? fixedHeightBulletInnerHeight : 43;
	const expansionDiff = expandedOuterHeight - normalOuterHeight; // 109px difference

	// Content start position used by the fixed-height layout math.
	// Compact: header (19) + gap (6) + contact box (40) + gap (4) = 69
	// Non-compact: header (24) + gap (6) + identity box (51) + gap (4) = 85
	const fixedHeightContentStartTop = compactHeader ? headerHeight + 50 : headerHeight + 61;
	// Align summary-only + auto-height layouts to the same first-box top position.
	const fixedHeightFirstBoxTop = fixedHeightContentStartTop + 6;

	// In parsed + summary mode, the summary box is pinned to the bottom with a fixed inset.
	const parsedSummaryBottomInsetPx = 14;
	const parsedSummaryMinOuterHeightPx = 197;
	const parsedSummaryInnerOverheadPx = 15; // 197 outer -> 182 inner in legacy layout

	const parsedSummaryOuterHeightPx = useMemo(() => {
		if (shouldHideSummary) return null;
		if (!(hasAnyParsedSections || isLoading)) return null;
		if (!height) return parsedSummaryMinOuterHeightPx;
		if (!expandSummaryToFillHeight) return parsedSummaryMinOuterHeightPx;

		const numericHeight =
			typeof height === 'number' ? height : parseInt(String(height), 10) || 0;

		// Mirrors `contentHeight` inside the bullets `if (height)` branch.
		let bulletContentHeight = 6;
		for (let i = 0; i < displaySectionsCount; i++) {
			const key = String(i + 1);
			const isExp = expandedBox === key;
			bulletContentHeight += isExp ? expandedOuterHeight + 13 : fixedHeightBoxSpacing;
		}
		bulletContentHeight += 10;

		const computed =
			numericHeight -
			fixedHeightContentStartTop -
			bulletContentHeight -
			parsedSummaryBottomInsetPx;

		return Math.max(parsedSummaryMinOuterHeightPx, computed);
	}, [
		shouldHideSummary,
		hasAnyParsedSections,
		isLoading,
		height,
		expandSummaryToFillHeight,
		displaySectionsCount,
		expandedBox,
		expandedOuterHeight,
		fixedHeightBoxSpacing,
		fixedHeightContentStartTop,
	]);

	const parsedSummaryInnerHeightPx = parsedSummaryOuterHeightPx
		? Math.max(0, parsedSummaryOuterHeightPx - parsedSummaryInnerOverheadPx)
		: null;

	const fixedHeightSummaryReservedBottomPx =
		!shouldHideSummary && (hasAnyParsedSections || isLoading)
			? (parsedSummaryOuterHeightPx ?? parsedSummaryMinOuterHeightPx) +
			  parsedSummaryBottomInsetPx
			: 0;

	// Calculate container height accounting for expansion
	const baseContainerHeight = height
		? height
		: shouldHideSummary
		? `${fixedHeightFirstBoxTop + 65 * displaySectionsCount + 1}px`
		: !hasAnyParsedSections && !isLoading
		? '423px'
		: displaySectionsCount === 3
		? '540px'
		: displaySectionsCount === 4
		? '580px'
		: '630px';

	// Add expansion difference if a box is expanded
	// In fixed-height mode, the panel must remain fixed; expanded bullets are handled via the
	// internal scroll wrapper. Only auto-height layouts should grow to accommodate expansion.
	const containerHeight = height
		? height
		: expandedBox
			? typeof baseContainerHeight === 'number'
				? baseContainerHeight + expansionDiff
				: `calc(${baseContainerHeight} + ${expansionDiff}px)`
			: baseContainerHeight;

	return (
		<div
			data-contact-research-panel="true"
			className={cn(
				// NOTE: Do not gate visibility with Tailwind breakpoints here.
				// The campaign app applies its own CSS zoom scaling, and the campaign page decides
				// when/where to render this panel. Keeping this component visible by default avoids
				// "it disappears at 1152px unless I browser-zoom" behavior.
				'relative bg-[#D8E5FB] border-[3px] border-black rounded-[7px]',
				className
			)}
			style={{
				width: `${containerWidth}px`,
				height: containerHeight,
				...style,
			}}
			data-hover-description="Research: Background info and notes for the selected contact."
			role="region"
			aria-label="Research panel"
		>
			{/* Header background bar */}
			<div
				className={cn(
					'absolute top-0 left-0 w-full rounded-t-[5px]',
					isLoading && 'research-panel-loading-wave-box'
				)}
				style={{
					height: `${headerHeight}px`,
					backgroundColor: isLoading ? loadingWaveBaseColor : '#E8EFFF',
					...(isLoading ? { animationDelay: waveDelayForIndex(0) } : {}),
				}}
			/>

			{/* Title */}
			<div
				className="absolute left-[16px] -translate-y-1/2 z-10"
				style={{ top: `${headerHeight / 2}px` }}
			>
				<span
					className="font-secondary font-bold leading-none text-black"
					style={{
						fontSize: headerFontSize,
						...(hideAllText || isLoading ? { color: 'transparent' } : {}),
					}}
				>
					Research
				</span>
			</div>

			{/* Divider under header */}
			<div
				className="absolute left-0 w-full bg-black z-10"
				style={{
					top: `${headerHeight}px`,
					height: '2px',
				}}
			/>

			{/* Contact info bar - boxed version for compact header (All tab) */}
			{compactHeader ? (
				<div
					className={cn(
						'absolute border-2 border-black rounded-[7px] overflow-hidden',
						isLoading ? 'research-panel-loading-wave-box' : 'bg-[#FFFFFF]'
					)}
					style={{
						top: `${headerHeight + 6}px`,
						left: '50%',
						transform: 'translateX(-50%)',
						width: `${containerWidth - 14}px`,
						height: '40px',
						backgroundColor: isLoading ? loadingWaveBaseColor : '#FFFFFF',
						...(isLoading ? { animationDelay: waveDelayForIndex(1) } : {}),
					}}
				>
					{/* Map background */}
					{!isLoading && (
						<div className="absolute inset-0 pointer-events-none opacity-0 xl:opacity-[0.35]">
							<ResearchHeaderMap
								width={containerWidth - 14}
								height={40}
								style={{ display: 'block' }}
								hideBorder
							/>
						</div>
					)}
					<div className="relative w-full h-full pl-3 pr-[12px] flex items-center justify-between overflow-hidden">
						<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
							<div
								className="font-inter font-bold text-[14px] leading-none text-black overflow-hidden whitespace-nowrap"
								style={{
									...(hideAllText || isLoading ? { color: 'transparent' } : {}),
									maskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
									WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
								}}
							>
								{(() => {
									if (isLoading) return 'Loading...';
									const fullName = `${contact?.firstName || ''} ${
										contact?.lastName || ''
									}`.trim();
									const nameToDisplay =
										fullName || contact?.name || contact?.company || 'Unknown';
									return nameToDisplay;
								})()}
							</div>
							{/* State badge and location on second row */}
							<div className="flex items-center gap-1 mt-[3px]">
								{(() => {
									if (isLoading) return null;
									const stateAbbr = getStateAbbreviation(contact?.state || '') || '';
									if (stateAbbr && stateBadgeColorMap[stateAbbr]) {
										return (
											<span
												className="inline-flex items-center justify-center h-[14px] px-[5px] rounded-[3px] border border-black text-[10px] font-bold leading-none flex-shrink-0"
												style={{
													backgroundColor: stateBadgeColorMap[stateAbbr],
												}}
											>
												<span style={hideAllText ? { color: 'transparent' } : undefined}>
													{stateAbbr}
												</span>
											</span>
										);
									}
									return null;
								})()}
								{!isLoading && (contact?.city || contact?.state) && (
									<span
										className="text-[11px] leading-none text-black truncate"
										style={hideAllText ? { color: 'transparent' } : undefined}
									>
										{contact?.city || contact?.state || ''}
									</span>
								)}
							</div>
						</div>

						{/* Map thumbnail placeholder removed */}
					</div>
				</div>
			) : (
				<>
					{/* Identity box (scales with boxWidth, 10px radius) */}
					<div
						className={cn(
							'absolute relative border-2 border-black rounded-[10px] overflow-hidden',
							isLoading ? 'research-panel-loading-wave-box' : 'bg-[#FFFFFF]'
						)}
						style={{
							top: `${headerHeight + 6}px`,
							left: '50%',
							transform: 'translateX(-50%)',
							width: `${boxWidth - 1}px`,
							height: '51px',
							backgroundColor: isLoading ? loadingWaveBaseColor : '#FFFFFF',
							...(isLoading ? { animationDelay: waveDelayForIndex(1) } : {}),
						}}
					>
						{/* Map background */}
						{!isLoading && (
							<div className="absolute inset-0 pointer-events-none opacity-0 xl:opacity-[0.35]">
								<ResearchHeaderMap
									width={boxWidth - 1}
									height={51}
									style={{ display: 'block' }}
									hideBorder
								/>
							</div>
						)}
						{/* Text block */}
						<div
							className={cn(
								'absolute left-[12px] top-[6px] flex flex-col min-w-0',
								isCompanyOnly ? 'right-[12px]' : 'right-[127px]'
							)}
						>
							<div
								className="font-inter font-bold text-[16px] leading-none text-black overflow-hidden whitespace-nowrap"
								style={{
									...(hideAllText || isLoading ? { color: 'transparent' } : {}),
									maskImage:
										'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent calc(100% - 16px), transparent 100%)',
									WebkitMaskImage:
										'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent calc(100% - 16px), transparent 100%)',
								}}
							>
								{displayName}
							</div>

							{/* Company line (only when we have a name above) */}
							{hasName && hasCompany && (
								<div
									className="font-inter font-bold text-[14px] leading-none truncate text-black mt-[3px]"
									style={hideAllText ? { color: 'transparent' } : undefined}
								>
									{contact?.company || ''}
								</div>
							)}
						</div>

						{/* Location */}
						{isCompanyOnly ? (
							<div
								className="absolute flex items-center gap-[8px]"
								style={{
									left: '8px',
									right: '8px',
									bottom: '2px',
									height: '21px',
								}}
							>
								{stateBadgeColor && (
									<span
										className="inline-flex items-center justify-center w-[39px] h-[21px] rounded-[6px] border border-black font-inter font-normal text-[16px] leading-none flex-shrink-0"
										style={{
											backgroundColor: stateBadgeColor,
											color: hideAllText || isLoading ? 'transparent' : '#000000',
										}}
									>
										{stateAbbr}
									</span>
								)}
								{!!locationText && (
									<span
										className="font-inter font-normal text-[16px] leading-none text-black overflow-hidden whitespace-nowrap"
										style={hideAllText ? { color: 'transparent' } : undefined}
									>
										{locationText}
									</span>
								)}
							</div>
						) : (
							<>
								{stateBadgeColor && (
									<span
										className="absolute inline-flex items-center justify-center w-[39px] h-[21px] rounded-[6px] border border-black font-inter font-normal text-[16px] leading-none flex-shrink-0"
										style={{
											top: '4px',
											right: '88px',
											backgroundColor: stateBadgeColor,
											color: hideAllText || isLoading ? 'transparent' : '#000000',
										}}
									>
										{stateAbbr}
									</span>
								)}

								{!!locationText && (
									<div
										className="absolute flex items-center"
										style={{
											top: '4px',
											right: '8px',
											width: '72px',
											height: '21px',
										}}
									>
										<span
											className="font-inter font-normal text-[16px] leading-none text-black w-full overflow-hidden whitespace-nowrap"
											style={{
												...(hideAllText ? { color: 'transparent' } : {}),
												maskImage:
													'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
												WebkitMaskImage:
													'linear-gradient(to right, black calc(100% - 12px), transparent 100%)',
											}}
										>
											{locationText}
										</span>
									</div>
								)}
							</>
						)}
					</div>
				</>
			)}

			{/* Research result boxes - show placeholders when loading, or actual data */}
			{(() => {
				const boxConfigs = [
					{ key: '1', color: '#158BCF' },
					{ key: '2', color: '#43AEEC' },
					{ key: '3', color: '#7CC9F6' },
					{ key: '4', color: '#AADAF6' },
					{ key: '5', color: '#D7F0FF' },
				] as const;

				// When loading, show first N placeholder boxes; otherwise filter to boxes with data
				const visibleBoxes = isLoading
					? boxConfigs.slice(0, Math.min(displaySectionsCount, boxConfigs.length))
					: boxConfigs.filter((config) => metadataSections[config.key]);

				// Fixed-height mode spacing (used by map panel + compact layouts)
				const boxSpacing = height ? fixedHeightBoxSpacing : 65;

				// Calculate cumulative top position accounting for expanded boxes
				const getBoxTop = (index: number) => {
					let top = 6;
					for (let i = 0; i < index; i++) {
						const isExpanded = expandedBox === visibleBoxes[i].key;
						top += isExpanded ? expandedOuterHeight + 13 : boxSpacing;
					}
					return top;
				};

				const content = visibleBoxes.map((config, index) => {
					const isExpanded = expandedBox === config.key;
					const currentBoxHeight = isExpanded ? expandedOuterHeight : normalOuterHeight;
					const currentInnerHeight = isExpanded ? expandedInnerHeight : normalInnerHeight;
					// Wave order: header (0) -> identity (1) -> bullets start at (2)
					const waveIndex = 2 + index;

					return (
						<div
							key={config.key}
							// Relative to the scroll container now
							className={cn(
								"absolute",
								!disableExpansion && "cursor-pointer",
								isLoading && "research-panel-loading-wave-box"
							)}
							style={{
								top: `${getBoxTop(index)}px`,
								left: '50%',
								transform: 'translateX(-50%)',
								width: `${boxWidth}px`,
								height: `${currentBoxHeight}px`,
								backgroundColor: isLoading ? loadingWaveBaseColor : config.color,
								border: '2px solid #000000',
								borderRadius: '8px',
								...(isLoading
									? {
											animationDelay: waveDelayForIndex(waveIndex),
									  }
									: {}),
							}}
							onClick={() => {
								if (!isLoading && !hideAllText && !disableExpansion) {
									setExpandedBox(isExpanded ? null : config.key);
								}
							}}
						>
							{/* Section indicator */}
							<div
								className="absolute font-inter font-bold"
								style={{
									top: '4px',
									left: '8px',
									fontSize: '11.5px',
									color: hideAllText || isLoading ? 'transparent' : '#000000',
								}}
							>
								[{config.key}]
							</div>
							{/* Inner content box */}
							<div
								className="absolute overflow-hidden"
								style={{
top: isExpanded ? '28px' : '50%',
								transform: isExpanded ? 'none' : 'translateY(-50%)',
									right: '10px',
									width: `${innerBoxWidth}px`,
									height: `${currentInnerHeight}px`,
									// Treat the full bullet box (outer + inner) as ONE colored unit while loading:
									// the inner box becomes transparent so the outer wave color fills everything.
									backgroundColor: isLoading
										? 'transparent'
										: hideAllText
											? config.color
											: '#FFFFFF',
									border: '1px solid #000000',
									borderRadius: '6px',
								}}
							>	
								<div className={cn(
									"w-full h-full pl-2 pr-6 flex overflow-hidden",
									isExpanded ? "items-start pt-2" : "items-center"
								)}>
									<div
										className="w-full text-[15px] leading-[1.25] text-black font-inter relative"
										style={{
											maxHeight: isExpanded ? '8.75em' : '2.5em',
											overflow: 'hidden',
											color: hideAllText || isLoading ? 'transparent' : '#000000',
										}}
									>
										{metadataSections[config.key]}
										{!hideAllText && !isLoading && (
											<div className="absolute bottom-0 right-0 w-12 h-[1.25em] bg-gradient-to-r from-transparent to-white pointer-events-none" />
										)}
									</div>
								</div>
								{/* Chevron icon */}
								<div
									className="absolute"
									style={{
										top: isExpanded ? '8px' : '50%',
										transform: isExpanded ? 'rotate(-90deg)' : 'translateY(-50%)',
										right: '8px',
										opacity: hideAllText || isLoading ? 0 : 1,
									}}
								>
									<ResearchChevron color={config.color} />
								</div>
							</div>
						</div>
					);
				});

				// Always show boxes (either loading placeholders or data)
				if (visibleBoxes.length === 0 && !isLoading) return null;

				// If height is constrained (e.g. 352px), wrap in scrollbar
				// If not constrained, just render the content in absolute position relative to main container?
				// Actually, to support scrolling properly, we should likely ALWAYS render the scroll container
				// if we want to handle "5 points" case in fixed height mode.
				// When height is NOT fixed, the container grows, so no scroll needed.
				// When height IS fixed (e.g. 352px), scrolling is needed.

				const contentStartTop = fixedHeightContentStartTop;

				if (height) {
					// When the summary box is pinned to the bottom (parsed bullets present or loading placeholders),
					// reserve that space so the bullet scroll area doesn't sit underneath it.
					const summaryReservedBottomPx = fixedHeightSummaryReservedBottomPx;

					// Calculate if content fits without scrolling
					const numericHeight = typeof height === 'number' ? height : parseInt(String(height), 10) || 400;
					const availableHeight = numericHeight - contentStartTop - summaryReservedBottomPx;
					// Calculate content height accounting for any expanded box
					let contentHeight = 6;
					for (let i = 0; i < visibleBoxes.length; i++) {
						const isExp = expandedBox === visibleBoxes[i].key;
						contentHeight += isExp ? expandedOuterHeight + 13 : boxSpacing;
					}
					contentHeight += 10;
					const needsScroll = contentHeight > availableHeight;

					// If content fits, render without scroll wrapper
					if (!needsScroll) {
						return (
							<div
								className="absolute w-full left-0"
								style={{
									top: `${contentStartTop}px`,
									height: `${availableHeight}px`,
									overflow: 'hidden',
								}}
							>
								<div
									style={{
										height: `${contentHeight}px`,
										position: 'relative',
										width: '100%',
									}}
								>
									{content}
								</div>
							</div>
						);
					}

					// Content needs scrolling
					return (
						<div
							id="research-bullets-scroll-wrapper"
							className="absolute w-full left-0 bottom-0"
							style={{
								top: `${contentStartTop}px`, // Below header/contact info
								bottom: `${summaryReservedBottomPx}px`,
							}}
						>
							<style>{`
								#research-bullets-scroll-wrapper *::-webkit-scrollbar {
									display: none !important;
									width: 0 !important;
									height: 0 !important;
									background: transparent !important;
								}
								#research-bullets-scroll-wrapper * {
									-ms-overflow-style: none !important;
									scrollbar-width: none !important;
								}
							`}</style>
							<CustomScrollbar
								className="w-full h-full"
								thumbColor="#000000"
								thumbWidth={2}
								// Nudge scrollbar slightly further right so it sits closer to the panel border.
								offsetRight={-7}
							>
								<div
									style={{
										height: `${contentHeight}px`,
										position: 'relative',
										width: '100%',
									}}
								>
									{content}
								</div>
							</CustomScrollbar>
						</div>
					);
				}

				// Original rendering for non-fixed height (absolute relative to main container)
				// Use contentStartTop + 6 (padding) for first item positioning
				const baseTop = fixedHeightFirstBoxTop;
				
				// Calculate cumulative top position accounting for expanded boxes
				const getAbsoluteBoxTop = (index: number) => {
					let top = baseTop;
					for (let i = 0; i < index; i++) {
						const isExp = expandedBox === visibleBoxes[i].key;
						top += isExp ? expandedOuterHeight + 13 : boxSpacing;
					}
					return top;
				};

				return visibleBoxes.map((config, index) => {
					const isExpanded = expandedBox === config.key;
					const currentBoxHeight = isExpanded ? expandedOuterHeight : normalOuterHeight;
					const currentInnerHeight = isExpanded ? expandedInnerHeight : normalInnerHeight;
					// Wave order: header (0) -> identity (1) -> bullets start at (2)
					const waveIndex = 2 + index;

					return (
						<div
							key={config.key}
							className={cn(
								"absolute",
								!disableExpansion && "cursor-pointer",
								isLoading && "research-panel-loading-wave-box"
							)}
							style={{
								top: `${getAbsoluteBoxTop(index)}px`,
								left: '50%',
								transform: 'translateX(-50%)',
								width: `${boxWidth}px`,
								height: `${currentBoxHeight}px`,
								backgroundColor: isLoading ? loadingWaveBaseColor : config.color,
								border: '2px solid #000000',
								borderRadius: '8px',
								...(isLoading
									? { animationDelay: waveDelayForIndex(waveIndex) }
									: {}),
							}}
							onClick={() => {
								if (!isLoading && !hideAllText && !disableExpansion) {
									setExpandedBox(isExpanded ? null : config.key);
								}
							}}
						>
							{/* Section indicator */}
							<div
								className="absolute font-inter font-bold"
								style={{
									top: '4px',
									left: '8px',
									fontSize: '11.5px',
									color: hideAllText || isLoading ? 'transparent' : '#000000',
								}}
							>
								[{config.key}]
							</div>
							{/* Inner content box */}
							<div
								className="absolute overflow-hidden"
								style={{
									top: isExpanded ? '28px' : '50%',
									transform: isExpanded ? 'none' : 'translateY(-50%)',
									right: '10px',
									width: `${innerBoxWidth}px`,
									height: `${currentInnerHeight}px`,
									// Treat the full bullet box as ONE colored unit while loading:
									// the inner box becomes transparent so the outer wave color fills everything.
									backgroundColor: isLoading
										? 'transparent'
										: hideAllText
											? config.color
											: '#FFFFFF',
									border: '1px solid #000000',
									borderRadius: '6px',
								}}
							>
								<div className={cn(
									"w-full h-full pl-2 pr-6 flex overflow-hidden",
									isExpanded ? "items-start pt-2" : "items-center"
								)}>
									<div
										className="w-full text-[15px] leading-[1.25] text-black font-inter relative"
										style={{
											maxHeight: isExpanded ? '8.75em' : '2.5em',
											overflow: 'hidden',
											color: hideAllText || isLoading ? 'transparent' : '#000000',
										}}
									>
										{metadataSections[config.key]}
										{!hideAllText && !isLoading && (
											<div className="absolute bottom-0 right-0 w-12 h-[1.25em] bg-gradient-to-r from-transparent to-white pointer-events-none" />
										)}
									</div>
								</div>
								{/* Chevron icon */}
								<div
									className="absolute"
									style={{
										top: isExpanded ? '8px' : '50%',
										transform: isExpanded ? 'rotate(-90deg)' : 'translateY(-50%)',
										right: '8px',
										opacity: hideAllText || isLoading ? 0 : 1,
									}}
								>
									<ResearchChevron color={config.color} />
								</div>
							</div>
						</div>
					);
				});
			})()}

			{/* Summary box at bottom */}
			{!shouldHideSummary && (
				<div
					id="research-summary-box-shared"
					className={cn('absolute', isLoading && 'research-panel-loading-wave-box')}
					style={{
						// Summary-only: pin from the top so it always sits below the identity box (avoids overlap).
						// Parsed-bullets (or loading placeholders): keep the summary pinned to the bottom.
						...(!hasAnyParsedSections && !isLoading
							? { top: `${fixedHeightFirstBoxTop}px` }
							: { bottom: hasAnyParsedSections || isLoading ? '14px' : '8px' }),
						left: '50%',
						transform: 'translateX(-50%)',
						width: `${boxWidth}px`,
						// When height is fixed and only showing summary (no bullet points):
						// Calculate height: container - top offset (75px) - bottom margin (8px)
						height: hasAnyParsedSections || isLoading
							? (parsedSummaryOuterHeightPx ?? parsedSummaryMinOuterHeightPx)
							: height 
								? typeof height === 'number'
									? `${height - fixedHeightFirstBoxTop - 8}px`
									: `calc(100% - ${fixedHeightFirstBoxTop + 8}px)`
								: `calc(100% - ${fixedHeightFirstBoxTop + 8}px)`,
						backgroundColor: isLoading
							? loadingWaveBaseColor
							: hasAnyParsedSections
								? '#E9F7FF'
								: '#158BCF',
						border: '2px solid #000000',
						borderRadius: '8px',
						...(isLoading
							? {
									// Summary comes after: header + identity + bullets
									animationDelay: waveDelayForIndex(2 + loadingBulletCount),
							  }
							: {}),
					}}
				>
					<style>{`
					#research-summary-box-shared *::-webkit-scrollbar {
						display: none !important;
						width: 0 !important;
						height: 0 !important;
						background: transparent !important;
					}
					#research-summary-box-shared * {
						scrollbar-width: none !important;
						-ms-overflow-style: none !important;
					}
				`}</style>
					{/* Inner content box */}
					<div
						className="absolute overflow-hidden"
						style={{
							...(hasAnyParsedSections || isLoading
								? {
										top: '50%',
										left: '50%',
										transform: 'translate(-50%, -50%)',
								  }
								: {
										bottom: '9px',
										left: '50%',
										transform: 'translateX(-50%)',
								  }),
							width: `${summaryInnerWidth}px`,
							// Summary-only: inner box is inset by 9px on top and bottom (18px total).
							height: hasAnyParsedSections || isLoading
								? (parsedSummaryInnerHeightPx ?? (parsedSummaryMinOuterHeightPx - parsedSummaryInnerOverheadPx))
								: 'calc(100% - 18px)',
							// Treat the summary as ONE colored unit while loading.
							backgroundColor: isLoading
								? 'transparent'
								: hideAllText
									? hasAnyParsedSections
										? '#E9F7FF'
										: '#158BCF'
									: '#FFFFFF',
							border: '1px solid #000000',
							borderRadius: '6px',
						}}
					>
						{contact?.metadata ? (
							<div className="w-full h-full p-3 overflow-hidden">
								<div
									className="text-[15px] leading-[1.5] text-black font-inter font-normal whitespace-pre-wrap overflow-y-scroll h-full"
									style={{
										wordBreak: 'break-word',
										color: hideAllText ? 'transparent' : '#000000',
									}}
								>
									{contact.metadata}
								</div>
							</div>
						) : null}
					</div>
				</div>
			)}
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
										: (isWeddingPlannerTitle(contact.title) || isWeddingVenueTitle(contact.title))
											? '#FFF2BC'
											: isWineBeerSpiritsTitle(contact.title)
												? '#BFC4FF'
												: '#E8EFFF',
						}}
					>
						{isRestaurantTitle(contact.title) && (
							<RestaurantsIcon size={12} className="flex-shrink-0" />
						)}
						{isCoffeeShopTitle(contact.title) && (
							<CoffeeShopsIcon size={7} />
						)}
						{isMusicVenueTitle(contact.title) && (
							<MusicVenuesIcon size={12} className="flex-shrink-0" />
						)}
						{(isWeddingPlannerTitle(contact.title) || isWeddingVenueTitle(contact.title)) && (
							<WeddingPlannersIcon size={12} />
						)}
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
						<div className="min-h-[82px] lg:min-h-[52px]">
							{contactInfoBox}
						</div>

						{/* Remaining cells: research bullets laid out in a 2x3 grid */}
						{orderedKeys.map((key) => renderBulletCell(key))}
					</div>
				) : (
					/* Unparsed metadata layout: contact info on left, full text on right spanning 3 rows */
					<div className="grid grid-cols-2 gap-x-[12px]">
						{/* Left column: contact info box */}
						<div className="row-span-3 flex flex-col gap-y-[8px]">
							<div className="h-[82px] lg:h-[52px]">
								{contactInfoBox}
							</div>
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
