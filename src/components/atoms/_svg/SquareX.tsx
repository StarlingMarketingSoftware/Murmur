import { CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';
import { twMerge } from 'tailwind-merge';

const SquareCheck: FC<CommonIconProps> = (props) => {
	const {
		width = '100%',
		height = '100%',
		className,
		pathClassName = defaultPathClassName,
	} = props;
	return (
		<svg
			id="Layer_1"
			data-name="Layer 1"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 124.16 124.16"
			className={className}
			width={width}
			height={height}
		>
			<path
				d="M8.49,8.49l107.19,107.19"
				className={twMerge(pathClassName, 'fill-none !stroke-[27px]')}
			/>
			<path
				d="M115.67,8.49L8.49,115.67"
				className={twMerge(pathClassName, 'fill-none !stroke-[27px]')}
			/>
		</svg>
	);
};

export default SquareCheck;
