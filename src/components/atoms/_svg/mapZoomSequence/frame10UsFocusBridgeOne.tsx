import * as React from 'react';
import {
	ZOOM_LEVEL_THREE_BRIDGE_ONE_US_ICON_PATH,
	ZOOM_LEVEL_THREE_BRIDGE_ONE_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame10UsFocusBridgeOneIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="45"
			height="37"
			viewBox="0 0 45 37"
			fill="none"
			{...props}
		>
			<path d={ZOOM_LEVEL_THREE_BRIDGE_ONE_US_ICON_PATH} fill="#8F8F8F" />
			<path d={ZOOM_LEVEL_THREE_BRIDGE_ONE_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
