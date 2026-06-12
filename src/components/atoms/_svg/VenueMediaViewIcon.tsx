import type { SVGProps } from 'react';

export const VenueMediaViewIcon = ({
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
			x="0.517459"
			y="0.517459"
			width="19.3311"
			height="17.8764"
			rx="5.3014"
			fill={selected ? '#548DAE' : 'none'}
			stroke={selected ? 'black' : '#B2B2B2'}
			strokeWidth="1.03492"
		/>
		<path
			d="M15.6162 9.5957C15.7831 9.69205 15.783 9.93285 15.6162 10.0293L7.09863 14.9473C6.93169 15.0436 6.72266 14.9232 6.72266 14.7305L6.72266 4.89453C6.72289 4.70196 6.93179 4.58141 7.09863 4.67773L15.6162 9.5957Z"
			fill={selected ? 'white' : 'none'}
			stroke={selected ? 'black' : '#B2B2B2'}
			strokeWidth="0.726996"
		/>
	</svg>
);
