import { CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const ArrowLeftIcon: FC<CommonIconProps> = (props) => {
	const {
		width = '100%',
		height = '100%',
		className,
		pathClassName = defaultPathClassName,
	} = props;
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M12 16L6 10L12 4"
				stroke={pathClassName}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={pathClassName}
			/>
		</svg>
	);
};

export default ArrowLeftIcon;
