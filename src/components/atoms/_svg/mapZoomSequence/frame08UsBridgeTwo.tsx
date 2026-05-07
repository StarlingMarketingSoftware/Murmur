import * as React from 'react';
import {
	ZOOM_LEVEL_TWO_BRIDGE_TWO_US_ICON_PATH,
	ZOOM_LEVEL_TWO_BRIDGE_TWO_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame08UsBridgeTwoIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="45"
			height="34"
			viewBox="0 0 45 34"
			fill="none"
			{...props}
		>
			<path d={ZOOM_LEVEL_TWO_BRIDGE_TWO_US_ICON_PATH} fill="#717171" />
			<path d={ZOOM_LEVEL_TWO_BRIDGE_TWO_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
