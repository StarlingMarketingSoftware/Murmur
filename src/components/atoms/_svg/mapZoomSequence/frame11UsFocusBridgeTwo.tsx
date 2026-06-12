import * as React from 'react';
import {
	ZOOM_LEVEL_THREE_BRIDGE_TWO_US_ICON_PATH,
	ZOOM_LEVEL_THREE_BRIDGE_TWO_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame11UsFocusBridgeTwoIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="45"
			height="45"
			viewBox="0 0 45 37"
			fill="none"
			preserveAspectRatio="xMidYMin meet"
			style={{ display: 'block' }}
			{...props}
		>
			<path d={ZOOM_LEVEL_THREE_BRIDGE_TWO_US_ICON_PATH} fill="#A8A8A8" />
			<path d={ZOOM_LEVEL_THREE_BRIDGE_TWO_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
