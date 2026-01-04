import React from 'react';

interface TextColorIconProps {
	width?: number | string;
	height?: number | string;
	className?: string;
}

const TextColorIcon: React.FC<TextColorIconProps> = ({
	width = 11,
	height = 14,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 11 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M2.63991 10.1818H0.333097L3.84801 0H6.62216L10.1321 10.1818H7.82528L5.27486 2.3267H5.19531L2.63991 10.1818ZM2.49574 6.17969H7.9446V7.86009H2.49574V6.17969Z"
				fill="black"
			/>
			<path
				d="M0 12.9659H10.4702V13.9205H0V12.9659Z"
				fill="black"
			/>
		</svg>
	);
};

export default TextColorIcon;

