import { CommonIconProps } from '@/utils';
import { FC } from 'react';

interface LeftArrowProps extends CommonIconProps {
	color?: string;
	opacity?: number;
}

const LeftArrow: FC<LeftArrowProps> = (props) => {
	const { width = 45, height = 85, className, color = '#A0A0A0', opacity = 0.6 } = props;
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
					x1="43.2659"
					y1="1.05852"
					x2="1.18603"
					y2="43.308"
					stroke={color}
					strokeWidth="3"
				/>
				<line
					x1="1.05859"
					y1="41.3826"
					x2="43.3057"
					y2="83.4649"
					stroke={color}
					strokeWidth="3"
				/>
			</g>
		</svg>
	);
};

export default LeftArrow;

