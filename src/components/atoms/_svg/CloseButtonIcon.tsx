import { FC } from 'react';

interface CloseButtonIconProps {
	width?: string | number;
	height?: string | number;
	className?: string;
}

const CloseButtonIcon: FC<CloseButtonIconProps> = ({
	width = 14,
	height = 14,
	className,
}) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M1.07031 1.07227L12.5232 12.5251"
				stroke="#A20000"
				strokeWidth="1.51582"
				strokeLinecap="square"
			/>
			<path
				d="M12.5232 1.07227L1.07031 12.5251"
				stroke="#A20000"
				strokeWidth="1.51582"
				strokeLinecap="square"
			/>
		</svg>
	);
};

export default CloseButtonIcon;
