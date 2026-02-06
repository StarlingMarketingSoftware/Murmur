import * as React from 'react';

const CampaignsDropdownIcon = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width={7}
		height={8}
		viewBox="0 0 7 8"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<mask id="path-1-inside-1_1330_54656" fill="white">
			<path d="M3.35156 0.339844L6.69892 3.68721L3.35156 7.03457L0.00420051 3.68721L3.35156 0.339844Z" />
		</mask>
		<path
			d="M3.35156 7.03457L2.90075 7.48538L3.35156 7.9362L3.80238 7.48538L3.35156 7.03457ZM6.69892 3.68721L6.24811 3.23639L2.90075 6.58375L3.35156 7.03457L3.80238 7.48538L7.14974 4.13802L6.69892 3.68721ZM3.35156 7.03457L3.80238 6.58375L0.455014 3.23639L0.00420051 3.68721L-0.446613 4.13802L2.90075 7.48538L3.35156 7.03457Z"
			fill="black"
			mask="url(#path-1-inside-1_1330_54656)"
		/>
		<line
			x1="3.3531"
			y1="6.375"
			x2="3.3531"
			y2="-0.000469194"
			stroke="black"
			strokeWidth="0.637547"
		/>
	</svg>
);

export default CampaignsDropdownIcon;
