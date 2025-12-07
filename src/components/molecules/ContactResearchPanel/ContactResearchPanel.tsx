import { FC, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import ResearchMap from '@/components/atoms/_svg/ResearchMap';

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
	 * Width override for the inner content boxes. Defaults to 360px.
	 */
	boxWidth?: number;
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
	compactHeader = false,
}) => {
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

	// If there is no contact, don't render the panel at all.
	// For contacts without metadata, keep the panel visible but show an empty state.
	if (!contact) {
		return null;
	}

	const parsedSectionsCount = Object.keys(metadataSections).length;
	const hasAnyParsedSections = parsedSectionsCount > 0;
	const shouldHideSummary = hasAnyParsedSections && hideSummaryIfBullets;

	const containerHeight = height
		? height
		: shouldHideSummary
		? `${77 + 65 * parsedSectionsCount}px`
		: !hasAnyParsedSections
		? '423px'
		: parsedSectionsCount === 3
		? '540px'
		: parsedSectionsCount === 4
		? '580px'
		: '630px';

	return (
		<div
			className={cn(
				'hidden xl:block relative bg-[#D8E5FB] border-[3px] border-black rounded-[7px]',
				className
			)}
			style={{
				width: '375px',
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
						...(hideAllText ? { color: 'transparent' } : {}),
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
						width: '361px',
						height: '40px',
					}}
				>
					<div className="w-full h-full pl-3 pr-[12px] flex items-center justify-between overflow-hidden">
						<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
							<div
								className="font-inter font-bold text-[14px] leading-none truncate text-black"
								style={hideAllText ? { color: 'transparent' } : undefined}
							>
								{(() => {
									const fullName = `${contact.firstName || ''} ${
										contact.lastName || ''
									}`.trim();
									const nameToDisplay =
										fullName || contact.name || contact.company || 'Unknown';
									return nameToDisplay;
								})()}
							</div>
							{/* State badge and location on second row */}
							<div className="flex items-center gap-1 mt-[3px]">
								{(() => {
									const stateAbbr = getStateAbbreviation(contact.state || '') || '';
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
								{(contact.city || contact.state) && (
									<span
										className="text-[11px] leading-none text-black truncate"
										style={hideAllText ? { color: 'transparent' } : undefined}
									>
										{contact.city || contact.state || ''}
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
									style={hideAllText ? { color: 'transparent' } : undefined}
								>
									{(() => {
										const fullName = `${contact.firstName || ''} ${
											contact.lastName || ''
										}`.trim();
										const nameToDisplay =
											fullName || contact.name || contact.company || 'Unknown';
										return nameToDisplay;
									})()}
								</div>
								{/* Only show company if we are displaying a person's name above, and it's different from the company name */}
								{(() => {
									const fullName = `${contact.firstName || ''} ${
										contact.lastName || ''
									}`.trim();
									const hasName =
										fullName.length > 0 || (contact.name && contact.name.length > 0);
									// If we are showing the company as the main title (because no name), don't show it again here
									if (!hasName) return null;

									return (
										<div
											className="text-[12px] leading-tight truncate text-black mt-[2px]"
											style={hideAllText ? { color: 'transparent' } : undefined}
										>
											{contact.company || ''}
										</div>
									);
								})()}
							</div>

							<div className="flex items-center gap-3 flex-shrink-0">
								<div className="flex flex-col items-end gap-[2px] max-w-[140px]">
									<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
										{(() => {
											const stateAbbr = getStateAbbreviation(contact.state || '') || '';
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
										{(contact.title || contact.headline) && (
											<div className="px-2 py-[2px] rounded-[8px] bg-[#E8EFFF] border border-black max-w-full truncate">
												<span
													className="text-[10px] leading-none text-black block truncate"
													style={hideAllText ? { color: 'transparent' } : undefined}
												>
													{contact.title || contact.headline}
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

			{/* Research result boxes - only show if data exists */}
			{(() => {
				const boxConfigs = [
					{ key: '1', color: '#158BCF' },
					{ key: '2', color: '#43AEEC' },
					{ key: '3', color: '#7CC9F6' },
					{ key: '4', color: '#AADAF6' },
					{ key: '5', color: '#D7F0FF' },
				] as const;

				// Filter to only boxes that have data
				const visibleBoxes = boxConfigs.filter((config) => metadataSections[config.key]);

				const content = visibleBoxes.map((config, index) => (
					<div
						key={config.key}
						// Relative to the scroll container now
						className="absolute"
						style={{
							// Original top was 76 + index * 65
							// Scroll container starts at 67px
							// New relative top = 76 - 67 + index * 65 = 9 + index * 65
							top: `${9 + index * 65}px`,
							left: '50%',
							transform: 'translateX(-50%)',
							width: `${boxWidth}px`,
							height: '52px',
							backgroundColor: config.color,
							border: '2px solid #000000',
							borderRadius: '8px',
						}}
					>
						{/* Section indicator */}
						<div
							className="absolute font-inter font-bold"
							style={{
								top: '4.5px',
								left: '8px',
								fontSize: '11.5px',
								color: hideAllText ? 'transparent' : '#000000',
							}}
						>
							[{config.key}]
						</div>
						{/* Inner content box */}
						<div
							className="absolute overflow-hidden"
							style={{
								top: '50%',
								transform: 'translateY(-50%)',
								right: '10px',
								width: `${innerBoxWidth}px`,
								height: '43px',
								backgroundColor: hideAllText ? config.color : '#FFFFFF',
								border: '1px solid #000000',
								borderRadius: '6px',
							}}
						>
							<div className="w-full h-full px-2 flex items-center overflow-hidden">
								<div
									className="w-full text-[12px] leading-[1.3] text-black font-inter"
									style={{
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
										color: hideAllText ? 'transparent' : '#000000',
									}}
								>
									{metadataSections[config.key]}
								</div>
							</div>
						</div>
					</div>
				));

				if (visibleBoxes.length === 0) return null;

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
										// Ensure content has enough height to scroll
										height: `${9 + visibleBoxes.length * 65 + 14}px`, // +14 for bottom padding
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
				// Use contentStartTop + 9 (padding) for first item positioning
				const baseTop = compactHeader ? headerHeight + 59 : headerHeight + 52;
				return visibleBoxes.map((config, index) => (
					<div
						key={config.key}
						className="absolute"
						style={{
							top: `${baseTop + index * 65}px`,
							left: '50%',
							transform: 'translateX(-50%)',
							width: `${boxWidth}px`,
							height: '52px',
							backgroundColor: config.color,
							border: '2px solid #000000',
							borderRadius: '8px',
						}}
					>
						{/* Section indicator */}
						<div
							className="absolute font-inter font-bold"
							style={{
								top: '4.5px',
								left: '8px',
								fontSize: '11.5px',
								color: hideAllText ? 'transparent' : '#000000',
							}}
						>
							[{config.key}]
						</div>
						{/* Inner content box */}
						<div
							className="absolute overflow-hidden"
							style={{
								top: '50%',
								transform: 'translateY(-50%)',
								right: '10px',
								width: `${innerBoxWidth}px`,
								height: '43px',
								backgroundColor: hideAllText ? config.color : '#FFFFFF',
								border: '1px solid #000000',
								borderRadius: '6px',
							}}
						>
							<div className="w-full h-full px-2 flex items-center overflow-hidden">
								<div
									className="w-full text-[12px] leading-[1.3] text-black font-inter"
									style={{
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
										color: hideAllText ? 'transparent' : '#000000',
									}}
								>
									{metadataSections[config.key]}
								</div>
							</div>
						</div>
					</div>
				));
			})()}

			{/* Summary box at bottom */}
			{!shouldHideSummary && (
				<div
					id="research-summary-box-shared"
					className="absolute"
					style={{
						bottom: hasAnyParsedSections ? '14px' : '8px',
						left: '50%',
						transform: 'translateX(-50%)',
						width: `${boxWidth}px`,
						height: hasAnyParsedSections ? '197px' : '336px',
						backgroundColor: hasAnyParsedSections ? '#E9F7FF' : '#158BCF',
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
							...(hasAnyParsedSections
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
							height: height
								? typeof height === 'number'
									? `${height - 53}px` // 352 - 53 = 299px (approx logic if fixed)
									: 'calc(100% - 53px)'
								: hasAnyParsedSections
								? '182px'
								: '299px',
							backgroundColor: hideAllText
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
