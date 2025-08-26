import { CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const DragHandleIcon: FC<CommonIconProps> = (props) => {
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
			viewBox="0 0 4 10"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<circle className={pathClassName} cx="1" cy="2" r="0.5" />
			<circle className={pathClassName} cx="3" cy="2" r="0.5" />
			<circle className={pathClassName} cx="1" cy="5" r="0.5" />
			<circle className={pathClassName} cx="3" cy="5" r="0.5" />
			<circle className={pathClassName} cx="1" cy="8" r="0.5" />
			<circle className={pathClassName} cx="3" cy="8" r="0.5" />
		</svg>
	);
};

export default DragHandleIcon;
