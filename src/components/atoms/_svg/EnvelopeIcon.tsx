import React, { FC } from 'react';

interface EnvelopeIconProps {
	width?: number;
	height?: number;
	className?: string;
	opacity?: number;
}

export const EnvelopeIcon: FC<EnvelopeIconProps> = ({ 
	width = 38, 
	height = 27, 
	className,
	opacity = 0.4 
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="13 5 31 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			opacity={opacity}
			className={className}
		>
			<rect x="16.25" y="8.78906" width="24.5" height="14.5" fill="#071525" stroke="black" strokeWidth="0.5"/>
			<mask id="mask0_envelope_icon" style={{maskType: "alpha"}} maskUnits="userSpaceOnUse" x="9" y="8" width="41" height="19">
				<rect x="9" y="8.53906" width="41" height="18" fill="#D9D9D9"/>
			</mask>
			<g mask="url(#mask0_envelope_icon)">
				<path d="M14.3418 6.03906L41.6582 6.03906L28 17.2451L14.3418 6.03906Z" fill="#071525" stroke="white" strokeWidth="2"/>
			</g>
		</svg>
	);
};
