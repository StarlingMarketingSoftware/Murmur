import * as React from 'react';
import {
	ZOOM_LEVEL_FOUR_BRIDGE_ONE_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame13FocusOnlyIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="40"
			height="39"
			viewBox="0 0 40 39"
			fill="none"
			style={{ display: 'block' }}
			{...props}
		>
			<path d={ZOOM_LEVEL_FOUR_BRIDGE_ONE_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
