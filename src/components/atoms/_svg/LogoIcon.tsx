import { CommonIconProps, defaultPathClassName } from '@/utils';
import { FC } from 'react';

const LogoIcon: FC<CommonIconProps> = (props) => {
	const { size = '100%', pathClassName = defaultPathClassName } = props;
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 467.68 138.25"
			xmlns="http://www.w3.org/2000/svg"
			preserveAspectRatio="xMidYMid meet"
			style={{ display: 'block' }}
		>
			<path
				className={pathClassName}
				d="M70.5,90.29V12.91l21.87,65.91c.03-.51-.95-9.71-.55-17.98.83-16.92.17-41.58.55-49.36,8.23,24.29,24.03,48.58,32.26,72.87l33.04-2.85L12.69,131.41c19.27-13.71,57.8-32.62,57.8-41.13h0Z"
				style={{
					strokeMiterlimit: 10,
					strokeWidth: '4px',
				}}
			/>
		</svg>
	);
};

export default LogoIcon;
