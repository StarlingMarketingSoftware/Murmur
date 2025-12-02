import { cn, CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const UndoIcon: FC<CommonIconProps> = (props) => {
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
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M9 7L4 12L9 17"
				stroke="black"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
			<path
				d="M4 12H11C12.8565 12 14.637 12.7375 15.9497 14.0503C17.2625 15.363 18 17.1435 18 19"
				stroke="black"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
		</svg>
	);
};

export default UndoIcon;

