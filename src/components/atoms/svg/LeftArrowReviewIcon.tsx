import { SVGProps } from 'react';

const LeftArrowReviewIcon = ({
	width = 18,
	height = 15,
	...props
}: SVGProps<SVGSVGElement>) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 18 15"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			d="M8.07129 14.4353C7.68086 14.8257 7.04777 14.8255 6.65723 14.4353L0.292968 8.07103C-0.0975562 7.68051 -0.0975563 7.04749 0.292968 6.65697L6.65722 0.292708C7.04777 -0.0975192 7.68086 -0.0977167 8.07129 0.292708C8.46171 0.683134 8.46151 1.31622 8.07129 1.70677L3.41406 6.364L18 6.364L18 8.364L3.41406 8.364L8.07129 13.0212C8.46152 13.4118 8.46171 14.0449 8.07129 14.4353Z"
			fill="currentColor"
		/>
	</svg>
);

export default LeftArrowReviewIcon;

