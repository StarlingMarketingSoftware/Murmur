import { SVGProps } from 'react';

const DeleteXIcon = ({
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
		<path
			d="M1.21484 1.21484L15.2148 15.2148"
			stroke="currentColor"
			strokeWidth="1.72059"
			strokeLinecap="square"
		/>
		<path
			d="M15.2148 1.21484L1.21484 15.2148"
			stroke="currentColor"
			strokeWidth="1.72059"
			strokeLinecap="square"
		/>
	</svg>
);

export default DeleteXIcon;
