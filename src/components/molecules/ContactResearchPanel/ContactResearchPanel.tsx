import { FC, useMemo, useState } from 'react';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import ResearchMap from '@/components/atoms/_svg/ResearchMap';
import ResearchChevron from '@/components/atoms/_svg/ResearchChevron';

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
	boxWidth = 360,
	width,
	compactHeader = false,
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

	const parsedSectionsCount = Object.keys(metadataSections).length;
	const hasAnyParsedSections = parsedSectionsCount > 0;
	// Hide summary when: (1) we have parsed sections and hideSummaryIfBullets is true, OR
	// (2) we're loading and hideSummaryIfBullets is true (since we show placeholder boxes)
	const shouldHideSummary = (hasAnyParsedSections || isLoading) && hideSummaryIfBullets;

	// When loading (no contact), show 3 placeholder boxes
	const displaySectionsCount = isLoading ? 3 : parsedSectionsCount;

	// Expanded box dimensions
	const expandedOuterHeight = 161;
	const expandedInnerHeight = 123;
	const normalOuterHeight = height ? 44 : 52;
	const normalInnerHeight = height ? 36 : 43;
	const expansionDiff = expandedOuterHeight - normalOuterHeight; // 109px difference

	// Calculate container height accounting for expansion
	const baseContainerHeight = height
		? height
		: shouldHideSummary
		? `${77 + 65 * displaySectionsCount}px`
		: !hasAnyParsedSections && !isLoading
		? '423px'
		: displaySectionsCount === 3
		? '540px'
		: displaySectionsCount === 4
		? '580px'
		: '630px';

	// Add expansion difference if a box is expanded
	const containerHeight = expandedBox
		? typeof baseContainerHeight === 'number'
			? baseContainerHeight + expansionDiff
			: `calc(${baseContainerHeight} + ${expansionDiff}px)`
		: baseContainerHeight;

	return (
		<div
			className={cn(
				'hidden xl:block relative bg-[#D8E5FB] border-[3px] border-black rounded-[7px]',
				className
			)}
			style={{
				width: `${containerWidth}px`,
				height: containerHeight,
				...style,
			}}
		>
			{/* Header background bar */}
			<div
				className="absolute top-0 left-0 w-full rounded-t-[5px]"
				style={{
					height: `${headerHeight}px`,
					backgroundColor: '#E8EFFF',
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
					className="absolute bg-[#FFFFFF] border-2 border-black rounded-[7px]"
					style={{
						top: `${headerHeight + 6}px`,
						left: '50%',
						transform: 'translateX(-50%)',
						width: `${containerWidth - 14}px`,
						height: '40px',
					}}
				>
					<div className="w-full h-full pl-3 pr-[12px] flex items-center justify-between overflow-hidden">
						<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
							<div
								className="font-inter font-bold text-[14px] leading-none truncate text-black"
								style={hideAllText || isLoading ? { color: 'transparent' } : undefined}
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

						{/* Map thumbnail placeholder */}
						<div className="flex-shrink-0">
							<ResearchMap />
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Original contact info bar */}
					<div
						className="absolute left-0 w-full bg-[#FFFFFF]"
						style={{
							top: `${headerHeight + 2}px`,
							height: '40px',
						}}
					>
						<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
							<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
								<div
									className="font-inter font-bold text-[16px] leading-none truncate text-black"
									style={hideAllText || isLoading ? { color: 'transparent' } : undefined}
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
								{/* Only show company if we are displaying a person's name above, and it's different from the company name */}
								{(() => {
									if (isLoading) return null;
									const fullName = `${contact?.firstName || ''} ${
										contact?.lastName || ''
									}`.trim();
									const hasName =
										fullName.length > 0 || (contact?.name && contact?.name.length > 0);
									// If we are showing the company as the main title (because no name), don't show it again here
									if (!hasName) return null;

									return (
										<div
											className="text-[12px] leading-tight truncate text-black mt-[2px]"
											style={hideAllText ? { color: 'transparent' } : undefined}
										>
											{contact?.company || ''}
										</div>
									);
								})()}
							</div>

							<div className="flex items-center gap-3 flex-shrink-0">
								<div className="flex flex-col items-end gap-[2px] max-w-[140px]">
									<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
										{(() => {
											if (isLoading) return null;
											const stateAbbr = getStateAbbreviation(contact?.state || '') || '';
											if (stateAbbr && stateBadgeColorMap[stateAbbr]) {
												return (
													<span
														className="inline-flex items-center justify-center h-[16px] px-[6px] rounded-[4px] border border-black text-[11px] font-bold leading-none flex-shrink-0"
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
										{!isLoading && (contact?.title || contact?.headline) && (
											<div className="px-2 py-[2px] rounded-[8px] bg-[#E8EFFF] border border-black max-w-full truncate">
												<span
													className="text-[10px] leading-none text-black block truncate"
													style={hideAllText ? { color: 'transparent' } : undefined}
												>
													{contact?.title || contact?.headline}
												</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Divider under contact info - only for non-compact */}
					<div
						className="absolute left-0 w-full bg-black z-10"
						style={{
							top: `${headerHeight + 42}px`,
							height: '1px',
						}}
					/>
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

				// When loading, show first 3 placeholder boxes; otherwise filter to boxes with data
				const visibleBoxes = isLoading
					? boxConfigs.slice(0, 3)
					: boxConfigs.filter((config) => metadataSections[config.key]);

				// Compact mode spacing for All tab (when height is passed)
				const boxSpacing = height ? 52 : 65;

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

					return (
						<div
							key={config.key}
							// Relative to the scroll container now
							className="absolute cursor-pointer"
							style={{
								top: `${getBoxTop(index)}px`,
								left: '50%',
								transform: 'translateX(-50%)',
								width: `${boxWidth}px`,
								height: `${currentBoxHeight}px`,
								backgroundColor: config.color,
								border: '2px solid #000000',
								borderRadius: '8px',
							}}
							onClick={() => {
								if (!isLoading && !hideAllText) {
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
									backgroundColor: hideAllText || isLoading ? config.color : '#FFFFFF',
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

				// Calculate content start position based on header type
				// Compact: header (19) + gap (6) + contact box (40) + gap (4) = 69
				// Non-compact: header + divider (2) + contact bar (40) + divider (1) = headerHeight + 43
				const contentStartTop = compactHeader ? headerHeight + 50 : headerHeight + 43;

				if (height) {
					// Calculate if content fits without scrolling
					const numericHeight = typeof height === 'number' ? height : parseInt(String(height), 10) || 400;
					const availableHeight = numericHeight - contentStartTop;
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
								offsetRight={-5}
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
				const baseTop = compactHeader ? headerHeight + 56 : headerHeight + 52;
				
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

					return (
						<div
							key={config.key}
							className="absolute cursor-pointer"
							style={{
								top: `${getAbsoluteBoxTop(index)}px`,
								left: '50%',
								transform: 'translateX(-50%)',
								width: `${boxWidth}px`,
								height: `${currentBoxHeight}px`,
								backgroundColor: config.color,
								border: '2px solid #000000',
								borderRadius: '8px',
							}}
							onClick={() => {
								if (!isLoading && !hideAllText) {
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
									backgroundColor: hideAllText || isLoading ? config.color : '#FFFFFF',
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
					className="absolute"
					style={{
						// When height is fixed and only showing summary, position from top to match [1] box spacing
						// Content area starts at headerHeight + 50 = 69px (compact), first box at +6px = 75px
						...(height && !hasAnyParsedSections && !isLoading
							? { top: `${headerHeight + 50 + 6}px` }
							: { bottom: hasAnyParsedSections || isLoading ? '14px' : '8px' }),
						left: '50%',
						transform: 'translateX(-50%)',
						width: `${boxWidth}px`,
						// When height is fixed and only showing summary (no bullet points):
						// Calculate height: container - top offset (75px) - bottom margin (8px)
						height: hasAnyParsedSections || isLoading 
							? '197px' 
							: height 
								? typeof height === 'number'
									? `${height - (headerHeight + 50 + 6) - 8}px`
									: 'calc(100% - 83px)'
								: '336px',
						backgroundColor: hasAnyParsedSections || isLoading ? '#E9F7FF' : '#158BCF',
						border: '2px solid #000000',
						borderRadius: '8px',
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
							// Inner box height: relative to summary box height (subtract ~18px for padding)
							// Summary box height = height - (headerHeight + 50 + 6) - 8 = height - headerHeight - 64
							// Inner height = summary height - 18 = height - headerHeight - 82
							height: hasAnyParsedSections || isLoading
								? '182px'
								: height
									? typeof height === 'number'
										? `${height - headerHeight - 82}px`
										: 'calc(100% - 101px)'
									: '299px',
							backgroundColor: hideAllText || isLoading
								? hasAnyParsedSections || isLoading
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
