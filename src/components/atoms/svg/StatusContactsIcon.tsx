import { SVGProps } from 'react';

const StatusContactsIcon = ({
	width = 17,
	height = 17,
	...props
}: SVGProps<SVGSVGElement>) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 17 17"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<circle
			cx="8.13266"
			cy="8.13266"
			r="6.97013"
			fill="white"
			stroke="white"
			strokeWidth="2.32338"
		/>
	</svg>
);

export default StatusContactsIcon;
