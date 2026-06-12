import * as React from 'react';
import { ZOOM_STICKMAN_BODY_PATH, ZOOM_STICKMAN_HEAD_PATH } from './sharedPaths';

export default function MapZoomFrame19StreetStickmanFade70Icon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="45"
			height="45"
			viewBox="0 0 45 45"
			fill="none"
			style={{ display: 'block' }}
			{...props}
		>
			<rect width="45" height="45" fill="#3F3F3F" />
			<path d="M-5 38C6 34.5 14 34.7 23 38.8C30.8 42.3 38.5 43.8 50 41" stroke="#050505" strokeWidth="4.4" strokeLinecap="round" />
			<path d="M-2 18L11.5 13.8L21.8 9L49 22" stroke="#050505" strokeWidth="3.7" strokeLinecap="round" />
			<path d="M38 -4L44 6L31.8 18.8L23.9 31.6" stroke="#050505" strokeWidth="4.4" strokeLinecap="round" />
			<path d="M4 -5L17 11.7L17.8 30.8" stroke="#050505" strokeWidth="2.4" strokeLinecap="round" />
			<path d="M-4 10L8.7 2.2L17.4 0.2M5.4 22.9L11.8 28.1L17 24.2M26.8 -1L34.3 8.4L42.6 10.9M23.6 2.5L36.8 16M1 34.2L12.6 34M30.4 28L44 32.5M29.6 4.6L38.4 13M13.2 5.6L25.7 12.6M12.2 13.6L22.2 20.7" stroke="#242424" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M5.5 31.7L13.3 26.1L21.1 31.8M27.2 9.8L35.2 18.9L44.5 20.8M1.4 25.7L8.9 19.2M31 33.5L36.8 25.3L45.5 24.8" stroke="#2A2A2A" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
			<g opacity={0.7} transform="translate(16.08 7.35) scale(1.35)">
				<path d={ZOOM_STICKMAN_HEAD_PATH} fill="#FFFFFF" />
				<path d={ZOOM_STICKMAN_BODY_PATH} fill="#FFFFFF" />
			</g>
		</svg>
	);
}
