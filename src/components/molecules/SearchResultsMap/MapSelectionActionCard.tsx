'use client';

import type { MutableRefObject } from 'react';
import type { WheelEvent as ReactWheelEvent } from 'react';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import { SELECTION_ACTIONS_Z_INDEX } from './selectionActionsLayout';

export interface MapSelectionActionCardProps {
	forwardWheelToMap: (event: ReactWheelEvent<HTMLDivElement>) => void;
	isLoading: boolean | undefined;
	onAddSelectionToFolder: SearchResultsMapProps['onAddSelectionToFolder'];
	onWriteSelectionMessage: SearchResultsMapProps['onWriteSelectionMessage'];
	selectedContacts: number[];
	selectionActionsOverlayRef: MutableRefObject<HTMLDivElement | null>;
}

export const MapSelectionActionCard = (params: MapSelectionActionCardProps) => {
	const {
		forwardWheelToMap,
		isLoading,
		onAddSelectionToFolder,
		onWriteSelectionMessage,
		selectedContacts,
		selectionActionsOverlayRef,
	} = params;
	return (
		<>
			{/* Multi-select action card — docked beside the left "Showing" rail when the
			    selection is off-screen or zoomed out; otherwise anchored above the
			    top-most selected dot. Stays in the map layer so portaled top nav /
			    side panel (z-120+) always stacks above (see VenueMapActionPills). */}
			{!isLoading && selectedContacts.length >= 1 && onAddSelectionToFolder && (
				<div
					ref={selectionActionsOverlayRef}
					className="pointer-events-none absolute left-0 top-0 will-change-transform"
					style={{
						opacity: 0,
						zIndex: SELECTION_ACTIONS_Z_INDEX,
					}}
					onMouseDown={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					onWheel={forwardWheelToMap}
				>
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '4px',
							padding: '5px',
							backgroundColor: '#FFFFFF',
							borderRadius: '9px',
							boxSizing: 'border-box',
						}}
					>
						<button
							type="button"
							onClick={() => onAddSelectionToFolder?.()}
							className="font-inter"
							style={{
								width: '100%',
								padding: '5px 10px',
								backgroundColor: '#EFEFEF',
								border: 'none',
								borderRadius: '6px',
								fontSize: '12px',
								fontWeight: 500,
								color: '#000000',
								textAlign: 'left',
								whiteSpace: 'nowrap',
								cursor: 'pointer',
							}}
						>
							Add Contacts to Folder
						</button>
						<button
							type="button"
							onClick={() => onWriteSelectionMessage?.()}
							className="font-inter"
							style={{
								width: '100%',
								padding: '5px 10px',
								backgroundColor: '#EFEFEF',
								border: 'none',
								borderRadius: '6px',
								fontSize: '12px',
								fontWeight: 500,
								color: '#000000',
								textAlign: 'left',
								whiteSpace: 'nowrap',
								cursor: 'pointer',
							}}
						>
							Write Message
						</button>
					</div>
				</div>
			)}
		</>
	);
};
