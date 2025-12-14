import { CommonIconProps } from '@/utils';
import { FC } from 'react';

interface HomeIconProps extends CommonIconProps {
	color?: string;
}

const HomeIcon: FC<HomeIconProps> = (props) => {
	const { width = 16, height = 14, className, color = 'black' } = props;
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 31 27"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M22.6557 14.6966V23.3351H7.66435V14.6966H22.6557ZM25.9235 11.6611H4.39648V26.3705H25.9235V11.6611Z"
				fill={color}
			/>
			<path
				d="M15.1752 4.33819L22.6572 11.3957H7.76118L15.182 4.33819M15.1615 0L0 14.4311H30.4592L15.1683 0H15.1615Z"
				fill={color}
			/>
		</svg>
	);
};

export default HomeIcon;
