import * as React from 'react';
import {
	ZOOM_LEVEL_THREE_US_ICON_PATH,
	ZOOM_LEVEL_THREE_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame09UsFocusIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="45"
			height="38"
			viewBox="0 0 45 38"
			fill="none"
			{...props}
		>
			<path d={ZOOM_LEVEL_THREE_US_ICON_PATH} fill="#8F8F8F" />
			<path d={ZOOM_LEVEL_THREE_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
