import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SpinnerProps {
	className?: string;
	size?: 'small' | 'medium' | 'large' | 'xl' | number;
	color?: 'foreground' | 'background' | 'primary';
}

export function Spinner({ className, size = 'xl', color = 'primary' }: SpinnerProps) {
	// Calculate base size
	const getBaseSize = (): number => {
		if (typeof size === 'number') {
			// Convert old pixel values to new scale
			if (size <= 16) return 4;  // small
			if (size <= 24) return 5;  // medium
			if (size <= 32) return 6;  // large
			return 8;                   // xl
		}
		
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
	
	// Subtle size progression - refined and elegant
	const dotSizes = [
		Math.max(3, Math.round(baseSize * 0.6)),     // Small
		Math.max(4, Math.round(baseSize * 0.8)),     // Medium
		Math.max(5, baseSize),                       // Large
	];
	
	// Perfect spacing - clean and balanced
	const spacing = Math.max(3, baseSize * 0.5);
	
	// Refined colors - Apple-like sophistication
	const getColor = () => {
		switch (color) {
			case 'background':
				return '#ffffff';
			case 'foreground':
				return '#1d1d1f'; // Apple's near-black
			case 'primary':
			default:
				return '#1d1d1f'; // Sophisticated, not harsh
		}
	};
	
	const dotColor = getColor();
	
	// Container sizing for backwards compatibility
	const containerSize = (() => {
		if (typeof size === 'number') return size;
		switch (size) {
			case 'small': return 16;
			case 'medium': return 24;
			case 'large': return 32;
			case 'xl':
			default: return 48;
		}
	})();
	
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
					style={{
						display: 'inline-block',
						width: `${dotSize}px`,
						height: `${dotSize}px`,
						backgroundColor: dotColor,
						borderRadius: '50%',
						animation: `artistic-flow 1.6s ease-in-out infinite`,
						animationDelay: `${index * 200}ms`,
						willChange: 'transform, opacity',
					}}
				/>
			))}
		</div>
	);
}

export default Spinner;