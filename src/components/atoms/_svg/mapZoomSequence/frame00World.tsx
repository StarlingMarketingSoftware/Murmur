import * as React from 'react';
import { ZOOMED_OUT_WORLD_ICON_PATH } from './sharedPaths';

export default function MapZoomFrame00WorldIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="34"
			height="34"
			viewBox="0 0 34 34"
			fill="none"
			{...props}
		>
			<path d={ZOOMED_OUT_WORLD_ICON_PATH} fill="black" />
		</svg>
	);
}
