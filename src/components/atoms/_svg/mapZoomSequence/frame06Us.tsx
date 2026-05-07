import * as React from 'react';
import {
	ZOOM_LEVEL_TWO_US_ICON_PATH,
} from './sharedPaths';

export default function MapZoomFrame06UsIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="40"
			height="25"
			viewBox="0 0 40 25"
			fill="none"
			{...props}
		>
			<path d={ZOOM_LEVEL_TWO_US_ICON_PATH} fill="#454545" />
		</svg>
	);
}
