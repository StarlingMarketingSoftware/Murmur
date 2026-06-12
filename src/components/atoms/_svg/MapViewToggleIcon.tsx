import React from 'react';

interface MapViewToggleIconProps {
	width?: number | string;
	height?: number | string;
	className?: string;
}

const MapViewToggleIcon: React.FC<MapViewToggleIconProps> = ({
	width = 38,
	height = 36,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 38 36"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M18.8906 7.55729H18.9095M24.5573 28.3351L13.224 34.0017L1.89062 28.3351V3.77951L5.6684 5.6684M13.224 34.0017V22.6684M24.5573 28.3351L35.8906 34.0017V9.44618L32.1128 7.55729M24.5573 28.3351V22.6684M24.5573 7.93507C24.5573 11.2733 21.724 13.9795 18.8906 17.0017C16.0573 13.9795 13.224 11.2733 13.224 7.93507C13.224 4.59682 15.7609 1.89062 18.8906 1.89062C22.0203 1.89062 24.5573 4.59682 24.5573 7.93507Z"
				stroke="black"
				strokeWidth="3.77778"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

export default MapViewToggleIcon;
