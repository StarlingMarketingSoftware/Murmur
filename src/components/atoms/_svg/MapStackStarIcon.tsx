import React, { FC } from 'react';

interface MapStackStarIconProps {
	size?: number;
	className?: string;
}

export const MapStackStarIcon: FC<MapStackStarIconProps> = ({
	size = 27,
	className,
}) => {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 27 27"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			style={{ display: 'block' }}
		>
			<path
				d="M8.27685 8.81876L8.81821 8.7443L8.77354 8.19978L8.2151 1.46302L13.1125 6.12361L13.5076 6.50046L13.9059 6.12537L18.8249 1.48905L18.2344 8.22314L18.186 8.76721L18.7272 8.84507L25.4191 9.80069L19.786 13.5365L19.3304 13.8382L19.6074 14.3101L23.0326 20.1381L16.5992 18.0626L16.0786 17.8953L15.8836 18.4055L13.4621 24.7179L11.0736 18.3935L10.88 17.8818L10.3597 18.0473L3.91467 20.0902L7.37001 14.2791L7.64886 13.8093L7.19493 13.5051L1.58031 9.74128L8.27685 8.81876Z"
				fill="#FF9797"
				stroke="#CE0202"
				strokeWidth="1.15402"
			/>
		</svg>
	);
};
