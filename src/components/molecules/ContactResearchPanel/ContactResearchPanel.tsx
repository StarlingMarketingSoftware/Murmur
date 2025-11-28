import { FC, useMemo } from 'react';
import { ContactWithName } from '@/types/contact';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import { cn } from '@/utils';

export interface ContactResearchPanelProps {
	contact: ContactWithName | null | undefined;
	className?: string;
	style?: React.CSSProperties;
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
		const meaningfulContent = content
			.replace(/[.\s,;:!?'"()\-–—]/g, '')
			.trim();

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
}) => {
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

	const hasAnyParsedSections = Object.keys(metadataSections).length > 0;
	const containerHeight = hasAnyParsedSections ? '630px' : '423px';

	return (
		<div
			className={cn(
				'hidden xl:block relative bg-[#D8E5FB] border-[2px] border-black rounded-[7px] overflow-hidden',
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
				className="absolute top-0 left-0 w-full"
				style={{
					height: '24px',
					backgroundColor: '#E8EFFF',
				}}
			/>

			{/* Title */}
			<div className="absolute top-[12px] left-[16px] -translate-y-1/2 z-10">
				<span className="font-secondary font-bold text-[14px] leading-none text-black">
					Research
				</span>
			</div>

			{/* Divider under header */}
			<div
				className="absolute left-0 w-full bg-black z-10"
				style={{
					top: '24px',
					height: '2px',
				}}
			/>

			{/* Contact info bar */}
			<div
				className="absolute left-0 w-full bg-[#FFFFFF]"
				style={{
					top: '26px',
					height: '40px',
				}}
			>
				<div className="w-full h-full px-3 flex items-center justify-between overflow-hidden">
					<div className="flex flex-col justify-center min-w-0 flex-1 pr-2">
						<div className="font-inter font-bold text-[16px] leading-none truncate text-black">
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
								fullName.length > 0 ||
								(contact.name && contact.name.length > 0);
							// If we are showing the company as the main title (because no name), don't show it again here
							if (!hasName) return null;

							return (
								<div className="text-[12px] leading-tight truncate text-black mt-[2px]">
									{contact.company || ''}
								</div>
							);
						})()}
					</div>

					<div className="flex items-center gap-3 flex-shrink-0">
						<div className="flex flex-col items-end gap-[2px] max-w-[140px]">
							<div className="flex items-center gap-1 w-full justify-end overflow-hidden">
								{(() => {
									const stateAbbr =
										getStateAbbreviation(contact.state || '') || '';
									if (stateAbbr && stateBadgeColorMap[stateAbbr]) {
										return (
											<span
												className="inline-flex items-center justify-center h-[16px] px-[6px] rounded-[4px] border border-black text-[11px] font-bold leading-none flex-shrink-0"
												style={{
													backgroundColor:
														stateBadgeColorMap[stateAbbr],
												}}
											>
												{stateAbbr}
											</span>
										);
									}
									return null;
								})()}
								{(contact.title || contact.headline) && (
									<div className="px-2 py-[2px] rounded-[8px] bg-[#E8EFFF] border border-black max-w-full truncate">
										<span className="text-[10px] leading-none text-black block truncate">
											{contact.title || contact.headline}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Divider under contact info */}
			<div
				className="absolute left-0 w-full bg-black z-10"
				style={{
					top: '66px',
					height: '1px',
				}}
			/>

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
				const visibleBoxes = boxConfigs.filter(
					(config) => metadataSections[config.key]
				);

				return visibleBoxes.map((config, index) => (
					<div
						key={config.key}
						className="absolute"
						style={{
							top: `${76 + index * 65}px`,
							left: '50%',
							transform: 'translateX(-50%)',
							width: '360px',
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
								color: '#000000',
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
								width: '319px',
								height: '43px',
								backgroundColor: '#FFFFFF',
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
			<div
				id="research-summary-box-shared"
				className="absolute"
				style={{
					bottom: hasAnyParsedSections ? '14px' : '8px',
					left: '50%',
					transform: 'translateX(-50%)',
					width: '360px',
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
						width: '350px',
						height: hasAnyParsedSections ? '182px' : '299px',
						backgroundColor: '#FFFFFF',
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
								}}
							>
								{contact.metadata}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
};

export default ContactResearchPanel;


