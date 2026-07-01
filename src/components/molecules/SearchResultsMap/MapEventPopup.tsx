'use client';

import type { MutableRefObject } from 'react';
import type { WheelEvent as ReactWheelEvent } from 'react';
import type { MapEvent } from './radarOverlays';
import type { SearchResultsMapProps } from './searchResultsMapProps';
import { HOVER_TOOLTIP_Z_INDEX } from './constants';
import {
	EVENT_POPUP_DESIGN_H,
	EVENT_POPUP_DESIGN_W,
	EVENT_POPUP_H,
	EVENT_POPUP_SCALE,
	EVENT_POPUP_W,
} from './radarOverlays';

export interface MapEventPopupProps {
	activeEvent: MapEvent | null;
	eventPopupOverlayRef: MutableRefObject<HTMLDivElement | null>;
	forwardWheelToMap: (event: ReactWheelEvent<HTMLDivElement>) => void;
	hoveredEventId: number | null;
	isLoading: boolean | undefined;
	isPointerOverEventPopupRef: MutableRefObject<boolean>;
	renderEventPopupContent: SearchResultsMapProps['renderEventPopupContent'];
	scheduleEventHoverClose: () => void;
	setEventHover: (id: number) => void;
}

export const MapEventPopup = (params: MapEventPopupProps) => {
	const {
		activeEvent,
		eventPopupOverlayRef,
		forwardWheelToMap,
		hoveredEventId,
		isLoading,
		isPointerOverEventPopupRef,
		renderEventPopupContent,
		scheduleEventHoverClose,
		setEventHover,
	} = params;
	return (
		<>
			{/* Event opportunity popup (phase 1: shapes + lat/lng only). Outer red box,
			    inner white box inset 5px from the top, and a bottom red strip with the
			    event coordinates. Positioned by the edge-aware placement effect above. */}
			{!isLoading && activeEvent && (
				<div
					ref={eventPopupOverlayRef}
					style={{
						position: 'absolute',
						left: 0,
						top: 0,
						width: `${EVENT_POPUP_W}px`,
						height: `${EVENT_POPUP_H}px`,
						pointerEvents: hoveredEventId === activeEvent.id ? 'auto' : 'none',
						zIndex: HOVER_TOOLTIP_Z_INDEX + 12,
					}}
					onMouseEnter={() => {
						isPointerOverEventPopupRef.current = true;
						setEventHover(activeEvent.id);
					}}
					onMouseLeave={() => {
						isPointerOverEventPopupRef.current = false;
						scheduleEventHoverClose();
					}}
					onWheel={forwardWheelToMap}
				>
					{/* Outer red box — authored at its natural design size and uniformly
					    scaled down to the footprint above. transform-origin top-left so the
					    scaled box aligns with the overlay's translate() placement. */}
					<div
						style={{
							position: 'relative',
							width: `${EVENT_POPUP_DESIGN_W}px`,
							height: `${EVENT_POPUP_DESIGN_H}px`,
							transform: `scale(${EVENT_POPUP_SCALE})`,
							transformOrigin: 'top left',
							background: '#E06D6D',
							border: '3px solid #A43B3B',
							borderRadius: '16px',
							boxSizing: 'border-box',
						}}
					>
						{/* Inner white box: 347×427, 5px from top, horizontally centered. Hosts the
						    event card content supplied by the host via renderEventPopupContent. */}
						<div
							style={{
								position: 'absolute',
								top: '5px',
								left: 0,
								right: 0,
								marginLeft: 'auto',
								marginRight: 'auto',
								width: '347px',
								height: '427px',
								background: '#FFF',
								border: '2px solid #000',
								borderRadius: '12px',
								boxSizing: 'border-box',
								overflow: 'hidden',
							}}
						>
							{renderEventPopupContent?.(activeEvent.id)}
						</div>
						{/* Bottom red strip: the event's lat/lng (the only text in phase 1). */}
						<div
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: '432px',
								bottom: 0,
								paddingLeft: '14px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'flex-start',
								color: '#000',
								fontSize: '12px',
								lineHeight: 1,
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							{`${activeEvent.lat.toFixed(4)}  ${activeEvent.lng.toFixed(4)}`}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
