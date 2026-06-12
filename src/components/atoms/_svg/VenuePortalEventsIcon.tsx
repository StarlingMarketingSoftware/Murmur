import type { SVGProps } from 'react';

export const VenuePortalEventsIcon = ({
	selected = false,
	...props
}: SVGProps<SVGSVGElement> & { selected?: boolean }) => (
	<svg
		width="41"
		height="39"
		viewBox="0 0 41 39"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{...props}
	>
		<g opacity={selected ? 1 : 0.3}>
			<rect
				y="1.46094"
				width="39.6754"
				height="35.1045"
				rx="5.85075"
				fill={selected ? '#60AE54' : 'white'}
			/>
			<rect
				x="1.03851"
				y="1.03851"
				width="38.8782"
				height="35.9528"
				rx="4.81224"
				stroke="black"
				strokeWidth="2.07701"
			/>
			<rect
				x="6.58291"
				y="6.58291"
				width="27.791"
				height="26.3284"
				rx="0.731343"
				fill="white"
				stroke="black"
				strokeWidth="1.46269"
			/>
			<circle
				cx="20.4783"
				cy="7.31425"
				r="2.19403"
				fill="white"
				stroke="black"
				strokeWidth="1.46269"
			/>
			<rect
				x="11.7031"
				y="13.1641"
				width="17.5522"
				height="2.92537"
				rx="1.46269"
				fill="black"
			/>
			<rect
				x="11.7031"
				y="19.0156"
				width="17.5522"
				height="2.92537"
				rx="1.46269"
				fill="black"
			/>
			<rect
				x="11.7031"
				y="24.8672"
				width="17.5522"
				height="2.92537"
				rx="1.46269"
				fill="black"
			/>
		</g>
	</svg>
);
