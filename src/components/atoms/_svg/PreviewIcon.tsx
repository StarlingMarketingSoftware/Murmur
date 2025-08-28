import { CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const PreviewIcon: FC<CommonIconProps> = (props) => {
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
			viewBox="0 0 333 138"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<path
				className={pathClassName}
				d="M165.486 0.00878906C129.171 0.566307 99.8995 31.043 99.8994 68.5586C99.8994 106.1 129.211 136.593 165.56 137.11C164.9 137.115 164.24 137.117 163.579 137.117C73.2369 137.117 0 87.5946 0 68.5586C0.000587042 49.5225 73.2373 0 163.579 0C164.215 4.48585e-07 164.851 0.00371488 165.486 0.00878906ZM169.732 0.0791016C257.482 2.32707 333 51.9399 333 74.2725C332.999 96.6601 257.108 135.494 169.083 137.066C204.668 135.669 233.1 105.532 233.1 68.5586C233.099 31.8105 205.013 1.81495 169.732 0.0791016Z"
				fill="currentColor"
			/>
		</svg>
	);
};

export default PreviewIcon;
