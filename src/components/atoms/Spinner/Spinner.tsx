import React, { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { SpinnerProps, useSpinner } from './useSpinner';

export const Spinner: FC<SpinnerProps> = (props) => {
	const { className, dotSizes, spacing, dotColor, containerSize } = useSpinner(props);

	return (
		<div
			className={twMerge('inline-flex items-center justify-center mx-auto', className)}
			style={{
				gap: `${spacing}px`,
				minHeight: `${containerSize}px`,
				minWidth: `${containerSize}px`,
			}}
			role="status"
			aria-label="Loading"
		>
			{dotSizes.map((dotSize, index) => (
				<span
					key={index}
					className={twMerge('rounded-full inline-block', className)}
					style={{
						width: `${dotSize}px`,
						height: `${dotSize}px`,
						backgroundColor: dotColor,
						animation: `artistic-flow 1.6s ease-in-out infinite`,
						animationDelay: `${index * 200}ms`,
						willChange: 'transform, opacity',
					}}
				/>
			))}
		</div>
	);
};
