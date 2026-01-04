import React from 'react';

interface ItalicIconProps {
	width?: number | string;
	height?: number | string;
	className?: string;
}

const ItalicIcon: React.FC<ItalicIconProps> = ({
	width = 4,
	height = 11,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 4 11"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M3.22656 0L1.53622 10.1818H0L1.69034 0H3.22656Z"
				fill="black"
			/>
		</svg>
	);
};

export default ItalicIcon;

