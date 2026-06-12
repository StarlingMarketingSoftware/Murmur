import * as React from 'react';
import {
	ZOOM_LEVEL_FOUR_US_ICON_PATH,
	ZOOM_LEVEL_FOUR_FOCUS_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame12UsDeepZoomIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="45"
			height="45"
			viewBox="0 0 45 39"
			fill="none"
			style={{ display: 'block' }}
			{...props}
		>
			<path d={ZOOM_LEVEL_FOUR_US_ICON_PATH} fill="#C4C0C0" />
			<path d={ZOOM_LEVEL_FOUR_FOCUS_ICON_PATH} fill="#454545" />
		</svg>
	);
}
