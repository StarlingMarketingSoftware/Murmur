import React from 'react';

interface FontSizeIconProps {
	width?: number | string;
	height?: number | string;
	className?: string;
}

const FontSizeIcon: React.FC<FontSizeIconProps> = ({
	width = 12,
	height = 12,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M3.16813 1.32244V0H11.0481V1.32244H7.87126V10.1818H6.34001V1.32244H3.16813Z"
				fill="black"
			/>
			<path
				d="M0 4.73864V3.77686H5.73089V4.73864H3.42045V11.1818H2.30682V4.73864H0Z"
				fill="black"
			/>
		</svg>
	);
};

export default FontSizeIcon;

