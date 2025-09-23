import { cn, CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const CloseIcon: FC<CommonIconProps> = (props) => {
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
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				d="M1 1L11 11M11 1L1 11"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="square"
				className={cn(pathClassName, 'fill-none')}
			/>
		</svg>
	);
};

export default CloseIcon;
