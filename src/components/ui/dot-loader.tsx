import React from 'react';
import { twMerge } from 'tailwind-merge';

interface DotLoaderProps {
	className?: string;
	size?: 'small' | 'medium' | 'large' | 'xl' | number;
	color?: 'foreground' | 'background' | 'primary';
}

// Golden ratio for perfect proportions
const GOLDEN_RATIO = 1.618;
const INVERSE_GOLDEN = 0.618;

export function DotLoader({ className, size = 'xl', color = 'primary' }: DotLoaderProps) {
	// Calculate base size
	const getBaseSize = (): number => {
		if (typeof size === 'number') return size;
		
		switch (size) {
			case 'small':
				return 3;
			case 'medium':
				return 4;
			case 'large':
				return 5;
			case 'xl':
			default:
				return 6;
		}
	};
	
	const baseSize = getBaseSize();
	
	// Progressive sizing using golden ratio
	const dotSizes = [
		baseSize * INVERSE_GOLDEN * INVERSE_GOLDEN, // Smallest
		baseSize * INVERSE_GOLDEN,                   // Medium
		baseSize,                                     // Largest
	];
	
	// Spacing between dots (golden ratio)
	const spacing = baseSize * GOLDEN_RATIO;
	
	// Color selection - always subtle
	const getColorClass = () => {
		switch (color) {
			case 'background':
				return 'bg-white';
			case 'foreground':
				return 'bg-gray-800';
			case 'primary':
			default:
				return 'bg-black';
		}
	};
	
	const colorClass = getColorClass();
	
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
						animation: `dot-wave 1.4s ease-in-out infinite`,
						animationDelay: `${index * 0.16}s`,
						// Subtle drop shadow for depth
						boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
					}}
				/>
			))}
			<style jsx>{`
				@keyframes dot-wave {
					0%, 60%, 100% {
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
}

// Alternative elegant animation - morphing dots
export function DotMorph({ className, size = 'xl', color = 'primary' }: DotLoaderProps) {
	const getBaseSize = (): number => {
		if (typeof size === 'number') return size;
		
		switch (size) {
			case 'small':
				return 3;
			case 'medium':
				return 4;
			case 'large':
				return 5;
			case 'xl':
			default:
				return 6;
		}
	};
	
	const baseSize = getBaseSize();
	
	// Fibonacci sequence for sizes
	const dotSizes = [
		baseSize * 0.5,  // Small (3)
		baseSize * 0.8,  // Medium (5) 
		baseSize,        // Large (8)
	];
	
	const spacing = baseSize * 1.2;
	
	const getColorClass = () => {
		switch (color) {
			case 'background':
				return 'bg-white';
			case 'foreground':
				return 'bg-gray-700';
			case 'primary':
			default:
				return 'bg-gray-900';
		}
	};
	
	const colorClass = getColorClass();
	
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
					0%, 80%, 100% {
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
					0%, 80%, 100% {
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
}

// Ultra-minimal pulse - the Steve Jobs favorite
export function DotPulse({ className, size = 'xl', color = 'primary' }: DotLoaderProps) {
	const getBaseSize = (): number => {
		if (typeof size === 'number') return size;
		
		switch (size) {
			case 'small':
				return 4;
			case 'medium':
				return 5;
			case 'large':
				return 6;
			case 'xl':
			default:
				return 8;
		}
	};
	
	const baseSize = getBaseSize();
	
	// Elegant progression: each dot is φ times larger
	const dotSizes = [
		Math.round(baseSize * 0.5),     // Smallest
		Math.round(baseSize * 0.75),    // Medium
		baseSize,                        // Largest
	];
	
	// Tighter spacing for cohesion
	const spacing = baseSize * 0.8;
	
	// More refined color palette
	const getColor = () => {
		switch (color) {
			case 'background':
				return '#ffffff';
			case 'foreground':
				return '#374151'; // gray-700
			case 'primary':
			default:
				return '#111827'; // gray-900
		}
	};
	
	const dotColor = getColor();
	
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
					style={{
						width: `${dotSize}px`,
						height: `${dotSize}px`,
						backgroundColor: dotColor,
						borderRadius: '50%',
						animation: `dot-pulse 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite`,
						animationDelay: `${index * 120}ms`,
						willChange: 'transform, opacity',
					}}
				/>
			))}
			<style jsx>{`
				@keyframes dot-pulse {
					0%, 80%, 100% {
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
}

// Export the most elegant one as default
export default DotPulse;
