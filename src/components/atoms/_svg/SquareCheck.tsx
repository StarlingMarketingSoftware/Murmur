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
			viewBox="0 0 123.64 87.33"
			className={className}
			width={width}
			height={height}
		>
			<path
				d="M8.49,43.69l35.56,35.2L115.16,8.49"
				className={twMerge(pathClassName, 'fill-none stroke-[21px]')}
			/>
		</svg>
	);
};

export default SquareCheck;
