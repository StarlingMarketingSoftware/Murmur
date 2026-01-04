import React, { FC } from 'react';

interface CoffeeShopsIconProps {
	size?: number;
	className?: string;
}

export const CoffeeShopsIcon: FC<CoffeeShopsIconProps> = ({ size = 16, className }) => {
	// Original aspect ratio is 16:29, so height = size * (29/16)
	const height = size * (29 / 16);
	return (
		<svg
			width={size}
			height={height}
			viewBox="0 0 16 29"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M1.95605 11.6699H14.0166C14.7655 11.6701 15.378 12.2664 15.3975 13.0137C15.4969 16.8242 15.5116 19.7639 15.4561 23.3613C15.4161 25.9503 13.2921 28.0195 10.6982 28.0195H5.09863C2.59925 28.0195 0.51158 26.0973 0.400391 23.6152C0.238618 20.0039 0.298455 16.9819 0.582031 12.9463C0.632606 12.2278 1.23305 11.6701 1.95605 11.6699Z"
				fill="white"
				stroke="black"
				strokeWidth="0.624"
			/>
			<path
				d="M4.31105 9.65182C2.16803 5.49246 6.83535 4.32509 5.98671 2.37815"
				stroke="black"
				strokeWidth="0.624"
				strokeLinecap="square"
			/>
			<path
				d="M4.31105 9.65182C2.16803 5.49246 6.83535 4.32509 5.98671 2.37815"
				stroke="black"
				strokeWidth="0.624"
				strokeLinecap="square"
			/>
			<path
				d="M7.50277 9.65326C5.35976 5.4939 12.5731 2.37897 10.0272 0.430557"
				stroke="black"
				strokeWidth="0.624"
				strokeLinecap="square"
			/>
			<path
				d="M7.50277 9.65326C5.35976 5.4939 12.5731 2.37897 10.0272 0.430557"
				stroke="black"
				strokeWidth="0.624"
				strokeLinecap="square"
			/>
			<path
				d="M10.4622 9.65436C9.54627 6.56221 13.8282 5.16085 13.1138 2.77009"
				stroke="black"
				strokeWidth="0.624"
				strokeLinecap="square"
			/>
			<path
				d="M10.4622 9.65436C9.54627 6.56221 13.8282 5.16085 13.1138 2.77009"
				stroke="black"
				strokeWidth="0.624"
				strokeLinecap="square"
			/>
		</svg>
	);
};

