import React, { FC } from 'react';

interface MapStackBlueSparkIconProps {
	size?: number;
	className?: string;
	fill?: string;
	stroke?: string;
}

export const MapStackBlueSparkIcon: FC<MapStackBlueSparkIconProps> = ({
	size = 27,
	className,
	fill = '#50A5C9',
	stroke = 'white',
}) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 27 27"
			fill="none"
			className={className}
			style={{ display: 'block' }}
		>
			<path
				d="M12.1865 0.979492C12.5764 0.341123 13.5037 0.341124 13.8936 0.979492L18.1416 7.93945L25.1016 12.1875C25.7399 12.5774 25.7399 13.5047 25.1016 13.8945L18.1416 18.1426L13.8936 25.1025C13.5037 25.7409 12.5764 25.7409 12.1865 25.1025L7.93848 18.1426L0.978516 13.8945C0.340147 13.5047 0.340147 12.5774 0.978516 12.1875L7.93848 7.93945L12.1865 0.979492Z"
				fill={fill}
				stroke={stroke}
			/>
		</svg>
	);
};
