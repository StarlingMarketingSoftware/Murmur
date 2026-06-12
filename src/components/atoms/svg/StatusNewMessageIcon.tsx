import { SVGProps } from 'react';

const StatusNewMessageIcon = ({
	width = 19,
	height = 19,
	...props
}: SVGProps<SVGSVGElement>) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 19 19"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<circle
			cx="9.32422"
			cy="9.32422"
			r="8.16169"
			fill="#277CAE"
			stroke="white"
			strokeWidth="2.32338"
		/>
	</svg>
);

export default StatusNewMessageIcon;
