import React from 'react';

interface BulletListIconProps {
	width?: number | string;
	height?: number | string;
	className?: string;
}

const BulletListIcon: React.FC<BulletListIconProps> = ({
	width = 15,
	height = 11,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 15 11"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<circle cx="1.2" cy="1.2" r="1.2" fill="black" />
			<circle cx="1.2" cy="5.2" r="1.2" fill="black" />
			<circle cx="1.2" cy="9.2" r="1.2" fill="black" />
			<rect x="4" width="11" height="2" fill="black" />
			<rect x="4" y="4" width="11" height="2" fill="black" />
			<rect x="4" y="8" width="11" height="2" fill="black" />
		</svg>
	);
};

export default BulletListIcon;

