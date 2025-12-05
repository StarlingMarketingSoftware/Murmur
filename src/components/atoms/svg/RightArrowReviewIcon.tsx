import { SVGProps } from 'react';

const RightArrowReviewIcon = ({
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
			d="M9.92871 0.292743C10.3191 -0.0976788 10.9522 -0.0974833 11.3428 0.292743L17.707 6.657C18.0976 7.04752 18.0976 7.68054 17.707 8.07106L11.3428 14.4353C10.9522 14.8255 10.3191 14.8257 9.92871 14.4353C9.53829 14.0449 9.53848 13.4118 9.92871 13.0213L14.5859 8.36403L0 8.36403L0 6.36403L14.5859 6.36403L9.92871 1.70681C9.53848 1.31626 9.53829 0.683169 9.92871 0.292743Z"
			fill="currentColor"
		/>
	</svg>
);

export default RightArrowReviewIcon;

