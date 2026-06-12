import { SVGProps, useId } from 'react';

const CampaignRowChevronIcon = (props: SVGProps<SVGSVGElement>) => {
	const maskId = useId().replace(/:/g, '');

	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			<mask id={maskId} fill="white">
				<path d="M0 7L7.00361 -0.00361183L14.0072 7L7.00361 14.0036L0 7Z" />
			</mask>
			<path
				d="M14.0072 7L14.9505 7.94323L15.8937 7L14.9505 6.05677L14.0072 7ZM7.00361 -0.00361183L6.06038 0.939616L13.064 7.94323L14.0072 7L14.9505 6.05677L7.94684 -0.94684L7.00361 -0.00361183ZM14.0072 7L13.064 6.05677L6.06038 13.0604L7.00361 14.0036L7.94684 14.9468L14.9505 7.94323L14.0072 7Z"
				fill="currentColor"
				mask={`url(#${maskId})`}
			/>
		</svg>
	);
};

export default CampaignRowChevronIcon;
