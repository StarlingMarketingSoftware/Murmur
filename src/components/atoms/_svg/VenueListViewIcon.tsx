import type { SVGProps } from 'react';

export const VenueListViewIcon = ({
	selected = false,
	...props
}: SVGProps<SVGSVGElement> & { selected?: boolean }) => (
	<svg
		width="21"
		height="19"
		viewBox="0 0 21 19"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{...props}
	>
		<rect
			y="0.726562"
			width="19.7198"
			height="17.4479"
			rx="2.90798"
			fill={selected ? '#60AE54' : 'white'}
		/>
		<rect
			x="0.516167"
			y="0.516167"
			width="19.3236"
			height="17.8696"
			rx="2.39182"
			stroke={selected ? 'black' : '#B2B2B2'}
			strokeWidth="1.03233"
		/>
		<rect
			x="3.19922"
			y="3.63281"
			width="13.9583"
			height="2.32639"
			rx="1.16319"
			fill={selected ? 'white' : '#B2B2B2'}
		/>
		<rect
			x="3.19922"
			y="8.28125"
			width="13.9583"
			height="2.32639"
			rx="1.16319"
			fill={selected ? 'white' : '#B2B2B2'}
		/>
		<rect
			x="3.19922"
			y="12.9375"
			width="13.9583"
			height="2.32639"
			rx="1.16319"
			fill={selected ? 'white' : '#B2B2B2'}
		/>
	</svg>
);
