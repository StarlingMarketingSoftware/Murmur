import React, { FC } from 'react';

interface MusicVenuesIconProps {
	size?: number;
	className?: string;
	innerFill?: string;
	outlineFill?: string;
}

export const MusicVenuesIcon: FC<MusicVenuesIconProps> = ({
	size = 29,
	className,
	innerFill = 'white',
	outlineFill = 'black',
}) => {
	// Original aspect ratio is 29:23, so height = size * (23/29)
	const height = size * (23 / 29);
	return (
		<svg
			width={size}
			height={height}
			viewBox="0 0 29 23"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<rect
				x="16.9491"
				y="0.37"
				width="11.6808"
				height="21.6174"
				fill={innerFill}
				stroke={outlineFill}
				strokeWidth="0.74"
			/>
			<circle
				cx="22.7898"
				cy="4.95974"
				r="2.11415"
				fill={innerFill}
				stroke={outlineFill}
				strokeWidth="0.74"
			/>
			<circle
				cx="22.7896"
				cy="16.7672"
				r="3.97727"
				fill={innerFill}
				stroke={outlineFill}
				strokeWidth="0.74"
			/>
			<rect
				x="0.37"
				y="0.37"
				width="11.6808"
				height="21.6174"
				fill={innerFill}
				stroke={outlineFill}
				strokeWidth="0.74"
			/>
			<circle
				cx="6.21071"
				cy="4.95974"
				r="2.11415"
				fill={innerFill}
				stroke={outlineFill}
				strokeWidth="0.74"
			/>
			<circle
				cx="6.21055"
				cy="16.7672"
				r="3.97727"
				fill={innerFill}
				stroke={outlineFill}
				strokeWidth="0.74"
			/>
		</svg>
	);
};
