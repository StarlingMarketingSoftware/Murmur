import type { SVGProps } from 'react';

export const VenuePortalAddIcon = ({
	selected = false,
	...props
}: SVGProps<SVGSVGElement> & { selected?: boolean }) => (
	<svg
		width="29"
		height="27"
		viewBox="0 0 29 27"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{...props}
	>
		<g opacity={selected ? 1 : 0.3}>
			<rect
				x="0.711777"
				y="0.711777"
				width="26.5903"
				height="24.5893"
				rx="7.29219"
				fill={selected ? '#A6F5A0' : 'none'}
				stroke="black"
				strokeWidth="1.42355"
			/>
			<path
				d="M12.3822 22.1953V5.17937H15.2698V22.1953H12.3822ZM5.31803 15.1311V12.2436H22.3339V15.1311H5.31803Z"
				fill="black"
			/>
		</g>
	</svg>
);
