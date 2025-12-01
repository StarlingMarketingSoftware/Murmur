import { cn, CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const UpscaleIcon: FC<CommonIconProps> = (props) => {
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
				d="M6 19L12 13L18 19"
				stroke="black"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
			<path
				d="M6 16L12 10L18 16"
				stroke="black"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
			<path
				d="M6 13L12 7L18 13"
				stroke="black"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
			<path
				d="M20 4.5V8.5"
				stroke="black"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
			<path
				d="M18 6.5H22"
				stroke="black"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(pathClassName, 'fill-none')}
			/>
		</svg>
	);
};

export default UpscaleIcon;

