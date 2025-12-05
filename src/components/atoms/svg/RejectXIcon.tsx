import { SVGProps } from 'react';

const RejectXIcon = ({
	width = 12,
	height = 12,
	...props
}: SVGProps<SVGSVGElement>) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 12 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			d="M2.39844 2.3999L9.59844 9.5999"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="square"
		/>
		<path
			d="M9.59844 2.3999L2.39844 9.5999"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="square"
		/>
	</svg>
);

export default RejectXIcon;

