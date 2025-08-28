'use client';

import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/utils/index';
import { useMemo } from 'react';

interface StepSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
	showStepIndicators?: boolean;
}

export const StepSlider = ({
	className,
	defaultValue,
	value,
	min = 0,
	max = 5,
	showStepIndicators = true,
	disabled = false,
	...props
}: StepSliderProps) => {
	const _values = useMemo(
		() =>
			Array.isArray(value)
				? value
				: Array.isArray(defaultValue)
				? defaultValue
				: [min, max],
		[value, defaultValue, min, max]
	); // Calculate step positions as percentages

	const stepPositions = useMemo(() => {
		if (!showStepIndicators) return [];

		const positions = [];
		const totalSteps = max - min;

		for (let i = 0; i <= totalSteps; i++) {
			// Calculate position within the effective slider area
			const percentage = totalSteps > 0 ? (i / totalSteps) * 100 : 0;
			positions.push(percentage);
		}
		return positions;
	}, [min, max, showStepIndicators]);

	return (
		<div className={cn('relative w-full', disabled && 'opacity-50 pointer-events-none')}>
			<SliderPrimitive.Root
				data-slot="slider"
				defaultValue={defaultValue}
				value={value}
				min={min}
				max={max}
				step={1}
				className={cn(
					'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
					className
				)}
				{...props}
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className={cn(
						'bg-black cursor-pointer relative grow overflow-visible data-[orientation=horizontal]:h-[2px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-[1px] data-[disabled]:opacity-50'
					)}
					style={{
						marginLeft: '8px',
						marginRight: '8px',
						width: 'calc(100% - 16px)',
					}}
				>
					{/* Invisible clickable area overlay */}
					<div className="absolute inset-0 cursor-pointer -top-[8px] -bottom-[8px] left-0 right-0" />
					<SliderPrimitive.Range
						data-slot="slider-range"
						className={cn(
							'bg-foreground absolute data-[orientation=horizontal]:h-[2px] data-[orientation-vertical]:w-full'
						)}
					/>
				</SliderPrimitive.Track>
				{Array.from({ length: _values.length }, (_, index) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						key={index}
						className="bg-transparent ring-ring/50 cursor-pointer block size-[14px] shrink-0 rounded-full transition-[color] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 z-10 relative"
					>
						{/* Inner dot for visual size reduction */}
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="w-[10px] aspect-square bg-foreground rounded-full"></div>
						</div>
					</SliderPrimitive.Thumb>
				))}
			</SliderPrimitive.Root>
			{/* Step indicators with pipe symbols */}
			{showStepIndicators && (
				<div
					className={cn(
						'absolute top-0 w-full h-full pointer-events-none flex items-center'
					)}
					style={{ left: '8px', right: '8px', width: 'calc(100% - 16px)' }}
				>
					{stepPositions.map((position, index) => (
						<span
							key={index}
							className="absolute text-foreground text-xs"
							style={{
								left: `${position}%`,
								transform: 'translateX(-50%)',
							}}
						>
							|
						</span>
					))}
				</div>
			)}
		</div>
	);
};
