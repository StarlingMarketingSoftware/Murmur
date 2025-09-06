import { cn, CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const PlusIcon: FC<CommonIconProps> = (props) => {
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
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M8 2V14M2 8H14"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="square"
				strokeLinejoin="miter"
				className={cn(pathClassName, 'fill-none')}
			/>
		</svg>
	);
};

export default PlusIcon;
