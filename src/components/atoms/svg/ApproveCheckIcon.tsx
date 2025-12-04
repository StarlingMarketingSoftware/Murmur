import { SVGProps } from 'react';

const ApproveCheckIcon = ({
	width = 16,
	height = 12,
	...props
}: SVGProps<SVGSVGElement>) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 16 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			d="M1.70703 5.67993L5.68139 9.65429L13.6301 1.70557"
			stroke="currentColor"
			strokeWidth="2.41209"
			strokeLinecap="square"
		/>
	</svg>
);

export default ApproveCheckIcon;

