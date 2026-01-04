import React from 'react';

interface UnderlineIconProps {
	width?: number | string;
	height?: number | string;
	className?: string;
}

const UnderlineIcon: React.FC<UnderlineIconProps> = ({
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
				d="M7.66619 0H9.20739V6.69673C9.20739 7.40933 9.04001 8.04072 8.70526 8.59091C8.3705 9.13778 7.89986 9.56866 7.29332 9.88352C6.68679 10.1951 5.97585 10.3509 5.16051 10.3509C4.34848 10.3509 3.6392 10.1951 3.03267 9.88352C2.42614 9.56866 1.95549 9.13778 1.62074 8.59091C1.28598 8.04072 1.11861 7.40933 1.11861 6.69673V0H2.65483V6.57244C2.65483 7.03314 2.75592 7.44247 2.9581 7.80043C3.16359 8.15838 3.4536 8.4401 3.82812 8.6456C4.20265 8.84777 4.64678 8.94886 5.16051 8.94886C5.67756 8.94886 6.12334 8.84777 6.49787 8.6456C6.87571 8.4401 7.16406 8.15838 7.36293 7.80043C7.5651 7.44247 7.66619 7.03314 7.66619 6.57244V0Z"
				fill="black"
			/>
			<path
				d="M0 12.9659H10.326V13.9205H0V12.9659Z"
				fill="black"
			/>
		</svg>
	);
};

export default UnderlineIcon;

