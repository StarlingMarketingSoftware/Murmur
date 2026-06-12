import { CSSProperties, FC, useMemo } from 'react';
import { cn } from '@/utils';
import { parseMetadataSections } from '@/components/molecules/SearchResultsMap/metadata';

export const RESEARCH_DESCRIPTION_BOX_WIDTH_PX = 272;
export const RESEARCH_DESCRIPTION_BOX_COLLAPSED_HEIGHT_PX = 285;
export const RESEARCH_DESCRIPTION_BOX_EXPANDED_HEIGHT_PX = 415;
const RESEARCH_DESCRIPTION_BOX_BORDER_WIDTH = 1.835;
const RESEARCH_DESCRIPTION_BOX_RADIUS = 11.012;
const RESEARCH_DESCRIPTION_PILL_WIDTH_PX = 161;
const RESEARCH_DESCRIPTION_PILL_HEIGHT_PX = 23;
const RESEARCH_DESCRIPTION_PILL_GAP_PX = 9;
const RESEARCH_DESCRIPTION_LINE_HEIGHT_PX = 20;
const RESEARCH_DESCRIPTION_COLLAPSED_LINE_CLAMP = 10;
const RESEARCH_DESCRIPTION_EXPANDED_LINE_CLAMP = 17;

interface ContactResearchDescriptionBoxProps {
	metadata?: string | null;
	/** Shown when metadata is empty (e.g. contact.headline). */
	fallbackText?: string;
	expanded: boolean;
	className?: string;
	style?: CSSProperties;
}

/**
 * "Description" box shown below the abridged research card on map marker hover,
 * with the "Press Tab to Expand/Collapse" pill beneath it. Collapsed/expanded
 * heights are fixed so the panel never shifts between contacts.
 */
export const ContactResearchDescriptionBox: FC<ContactResearchDescriptionBoxProps> = ({
	metadata,
	fallbackText,
	expanded,
	className,
	style,
}) => {
	const descriptionText = useMemo(() => {
		const sections = parseMetadataSections(metadata);
		const keys = Object.keys(sections);
		if (keys.length > 0) {
			return keys
				.sort((a, b) => Number(a) - Number(b))
				.map((key) => sections[key])
				.join('\n\n');
		}
		const stripped = (metadata || '').replace(/\[\d+\]\s*/g, '').trim();
		return stripped || fallbackText?.trim() || '';
	}, [metadata, fallbackText]);

	return (
		<div className={cn('flex flex-col items-center', className)} style={style}>
			<div
				className="flex flex-col overflow-hidden"
				style={{
					width: `${RESEARCH_DESCRIPTION_BOX_WIDTH_PX}px`,
					height: `${
						expanded
							? RESEARCH_DESCRIPTION_BOX_EXPANDED_HEIGHT_PX
							: RESEARCH_DESCRIPTION_BOX_COLLAPSED_HEIGHT_PX
					}px`,
					borderRadius: `${RESEARCH_DESCRIPTION_BOX_RADIUS}px`,
					border: `${RESEARCH_DESCRIPTION_BOX_BORDER_WIDTH}px solid #FFF`,
					// Translucent box so the map shows through; text stays full opacity.
					background:
						'linear-gradient(180deg, rgba(237, 248, 255, 0.8) 36.54%, rgba(237, 248, 255, 0.8) 100%)',
					padding: '12px 16px',
					transition: 'height 150ms ease-out',
				}}
			>
				<span
					style={{
						color: '#4FA8E0',
						fontFamily: 'Inter',
						fontSize: '17px',
						fontStyle: 'normal',
						fontWeight: 500,
						lineHeight: 'normal',
					}}
				>
					Description
				</span>
				{descriptionText && (
					<span
						style={{
							marginTop: '6px',
							color: '#000',
							fontFamily: 'Inter',
							fontSize: '14px',
							fontStyle: 'normal',
							fontWeight: 400,
							lineHeight: `${RESEARCH_DESCRIPTION_LINE_HEIGHT_PX}px`,
							whiteSpace: 'pre-line',
							display: '-webkit-box',
							WebkitBoxOrient: 'vertical',
							WebkitLineClamp: expanded
								? RESEARCH_DESCRIPTION_EXPANDED_LINE_CLAMP
								: RESEARCH_DESCRIPTION_COLLAPSED_LINE_CLAMP,
							overflow: 'hidden',
						}}
					>
						{descriptionText}
					</span>
				)}
			</div>
			<div
				className="flex items-center justify-center flex-shrink-0"
				style={{
					marginTop: `${RESEARCH_DESCRIPTION_PILL_GAP_PX}px`,
					width: `${RESEARCH_DESCRIPTION_PILL_WIDTH_PX}px`,
					height: `${RESEARCH_DESCRIPTION_PILL_HEIGHT_PX}px`,
					borderRadius: `${RESEARCH_DESCRIPTION_BOX_RADIUS}px`,
					border: `${RESEARCH_DESCRIPTION_BOX_BORDER_WIDTH}px solid #FFF`,
					background: 'rgba(244, 244, 244, 0.8)',
				}}
			>
				<span
					style={{
						color: 'rgba(0, 0, 0, 0.55)',
						fontFamily: 'Inter',
						fontSize: '15px',
						fontStyle: 'normal',
						fontWeight: 400,
						lineHeight: 'normal',
					}}
				>
					{expanded ? 'Press Tab to Collapse' : 'Press Tab to Expand'}
				</span>
			</div>
		</div>
	);
};
