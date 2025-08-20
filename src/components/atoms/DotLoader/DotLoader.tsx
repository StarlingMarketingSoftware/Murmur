import React, { FC } from 'react';
import { twMerge } from 'tailwind-merge';
import { DotLoaderProps, useDotLoader, useDotMorph, useDotPulse } from './useDotLoader';

export const DotLoader: FC<DotLoaderProps> = (props) => {
	const { spacing, dotSizes, colorClass, baseSize, className } = useDotLoader(props);

	return (
		<div
			className={twMerge('inline-flex items-center justify-center', className)}
			style={{ gap: `${spacing}px` }}
			role="status"
			aria-label="Loading"
		>
			{dotSizes.map((dotSize, index) => (
				<div
					key={index}
					className={twMerge(colorClass, 'rounded-full shadow-sm')}
					style={{
						width: `${dotSize}px`,
						height: `${dotSize}px`,
						animation: `dot-wave 1.4s ease-in-out infinite`,
						animationDelay: `${index * 0.16}s`,
					}}
				/>
			))}
			<style jsx>{`
				@keyframes dot-wave {
					0%,
					60%,
					100% {
						transform: translateY(0) scale(1);
						opacity: 0.3;
					}
					10% {
						transform: translateY(-${baseSize}px) scale(1.1);
						opacity: 0.9;
					}
					30% {
						transform: translateY(0) scale(1);
						opacity: 0.5;
					}
				}
			`}</style>
		</div>
	);
};

export const DotMorph: FC<DotLoaderProps> = (props) => {
	const { spacing, dotSizes, colorClass, className } = useDotMorph(props);

	return (
		<div
			className={twMerge('inline-flex items-center justify-center', className)}
			style={{ gap: `${spacing}px` }}
			role="status"
			aria-label="Loading"
		>
			{dotSizes.map((dotSize, index) => (
				<div
					key={index}
					className={twMerge(colorClass, 'rounded-full')}
					style={{
						width: `${dotSize}px`,
						height: `${dotSize}px`,
						animation: `dot-morph 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
						animationDelay: `${index * 0.15}s`,
					}}
				/>
			))}
			<style jsx>{`
				@-webkit-keyframes dot-morph {
					0%,
					80%,
					100% {
						-webkit-transform: scale(1);
						transform: scale(1);
						opacity: 0.25;
					}
					40% {
						-webkit-transform: scale(1.3);
						transform: scale(1.3);
						opacity: 0.9;
					}
				}
				@keyframes dot-morph {
					0%,
					80%,
					100% {
						transform: scale(1);
						opacity: 0.25;
					}
					40% {
						transform: scale(1.3);
						opacity: 0.9;
					}
				}
			`}</style>
		</div>
	);
};

export const DotPulse: FC<DotLoaderProps> = (props) => {
	const { spacing, dotSizes, dotColor, className } = useDotPulse(props);

	return (
		<div
			className={twMerge(
				'inline-flex items-center justify-center rounded-full',
				className
			)}
			style={{ gap: `${spacing}px` }}
			role="status"
			aria-label="Loading"
		>
			{dotSizes.map((dotSize, index) => (
				<div
					key={index}
					style={{
						width: `${dotSize}px`,
						height: `${dotSize}px`,
						backgroundColor: dotColor,
						animation: `dot-pulse 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite`,
						animationDelay: `${index * 120}ms`,
						willChange: 'transform, opacity',
					}}
				/>
			))}
			<style jsx>{`
				@keyframes dot-pulse {
					0%,
					80%,
					100% {
						opacity: 0.15;
						transform: scale(1);
					}
					40% {
						opacity: 0.9;
						transform: scale(1.05);
					}
				}
			`}</style>
		</div>
	);
};
