import React from 'react';

export interface OverviewSelectionActionCardProps {
	/** Number of selected contacts — drives the "Write {N} Contacts" row. */
	writeCount: number;
	/** Number of selected drafts — drives the "Send {N} Drafts" row. */
	draftCount: number;
	onWriteContacts: () => void;
	/** Sends the currently selected drafts. */
	onSendDrafts: () => void;
	/** Host supplies absolute/fixed positioning. */
	style?: React.CSSProperties;
}

const ROW_BASE: React.CSSProperties = {
	width: '100%',
	padding: '11px 16px',
	border: 'none',
	borderRadius: '10px',
	fontSize: '16px',
	fontWeight: 600,
	color: '#000000',
	textAlign: 'left',
	whiteSpace: 'nowrap',
	cursor: 'pointer',
};

/**
 * Floating bulk-action card for the campaign "All" tab selection surfaces.
 * Presentational only — hosts compute the counts/handlers from whichever
 * selection state they own and supply positioning via `style`.
 */
export function OverviewSelectionActionCard({
	writeCount,
	draftCount,
	onWriteContacts,
	onSendDrafts,
	style,
}: OverviewSelectionActionCardProps) {
	if (writeCount <= 0 && draftCount <= 0) return null;

	return (
		<div
			data-campaign-interactive-surface
			onMouseDown={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '8px',
				padding: '8px',
				backgroundColor: '#FFFFFF',
				borderRadius: '16px',
				boxSizing: 'border-box',
				minWidth: '210px',
				...style,
			}}
		>
			{writeCount >= 1 && (
				<button
					type="button"
					onClick={onWriteContacts}
					className="font-inter bg-[#EFEFEF] hover:bg-[#FD8E89] transition-colors duration-150"
					style={ROW_BASE}
				>
					Write {writeCount} {writeCount === 1 ? 'Contact' : 'Contacts'}
				</button>
			)}
			{draftCount >= 1 && (
					<button
						type="button"
						onClick={onSendDrafts}
						className="font-inter bg-[#EFEFEF] hover:bg-[#FFE3AA] transition-colors duration-150"
						style={ROW_BASE}
					>
						Send {draftCount} {draftCount === 1 ? 'Draft' : 'Drafts'}
					</button>
			)}
		</div>
	);
}
