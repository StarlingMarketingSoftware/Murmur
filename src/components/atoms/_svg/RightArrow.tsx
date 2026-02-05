import { CommonIconProps } from '@/utils';
import { FC } from 'react';

interface RightArrowProps extends CommonIconProps {
	color?: string;
	opacity?: number;
	strokeWidth?: number;
}

const RightArrow: FC<RightArrowProps> = (props) => {
	const {
		width = 45,
		height = 85,
		className,
		color = '#A0A0A0',
		opacity = 0.6,
		strokeWidth = 3,
	} = props;
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 45 85"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<g opacity={opacity}>
				<line
					y1="-1.5"
					x2="59.63"
					y2="-1.5"
					transform="matrix(0.705683 0.708528 0.708528 -0.705683 2.16016 0)"
					stroke={color}
					strokeWidth={strokeWidth}
				/>
				<line
					y1="-1.5"
					x2="59.63"
					y2="-1.5"
					transform="matrix(-0.708487 0.705723 0.705723 0.708487 44.3633 42.4453)"
					stroke={color}
					strokeWidth={strokeWidth}
				/>
			</g>
		</svg>
	);
};

export default RightArrow;

