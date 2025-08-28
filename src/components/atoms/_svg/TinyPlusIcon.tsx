import { CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const TinyPlusIcon: FC<CommonIconProps> = (props) => {
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
			viewBox="0 0 8 8"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				className={pathClassName}
				d="M4 1V7M1 4H7"
				stroke="black"
				strokeWidth="1.5"
				strokeLinecap="square"
				strokeLinejoin="miter"
			/>
		</svg>
	);
};

export default TinyPlusIcon;
