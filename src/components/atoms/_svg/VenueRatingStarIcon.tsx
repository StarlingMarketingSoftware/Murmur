import type { SVGProps } from 'react';

export const VenueRatingStarIcon = ({
	filled = false,
	color = '#FFFFFF',
	outlineColor = '#FFFFFF',
	...props
}: SVGProps<SVGSVGElement> & {
	filled?: boolean;
	color?: string;
	outlineColor?: string;
}) => (
	<svg
		width="13"
		height="12"
		viewBox="0 0 13 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{...props}
	>
		<path
			d="M6.37598 1.10352L8.17969 3.42383L10.9434 4.42285L11.4473 4.60449L11.1475 5.04785L9.49707 7.48047L9.40234 10.418L9.38477 10.9531L8.87012 10.8047L6.04688 9.98828L3.22363 10.8047L2.70898 10.9531L2.69141 10.418L2.5957 7.48047L0.946289 5.04785L0.646484 4.60449L1.15039 4.42285L3.91309 3.42383L5.71777 1.10352L6.04688 0.680664L6.37598 1.10352Z"
			fill={filled ? color : 'none'}
			stroke={filled ? color : outlineColor}
			strokeWidth="0.833333"
		/>
	</svg>
);
