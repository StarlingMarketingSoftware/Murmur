import * as React from 'react';
import {
	ZOOM_LEVEL_TWO_BRIDGE_ONE_US_ICON_PATH,
	ZOOM_LEVEL_TWO_BRIDGE_ONE_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame07UsBridgeOneIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="43"
			height="28"
			viewBox="0 0 43 28"
			fill="none"
			{...props}
		>
			<path d={ZOOM_LEVEL_TWO_BRIDGE_ONE_US_ICON_PATH} fill="#646464" />
			<path d={ZOOM_LEVEL_TWO_BRIDGE_ONE_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
