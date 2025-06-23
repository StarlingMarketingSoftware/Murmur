'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/utils/index';
import { Typography } from '@/components/ui/typography';

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
	...props
}: StepSliderProps) => {
	const _values = React.useMemo(
		() =>
			Array.isArray(value)
				? value
				: Array.isArray(defaultValue)
				? defaultValue
				: [min, max],
		[value, defaultValue, min, max]
	); // Calculate step positions as percentages
	const stepPositions = React.useMemo(() => {
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
		<div className="relative w-full">
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
				{' '}
				<SliderPrimitive.Track
					data-slot="slider-track"
					className={cn(
						'bg-gray-400 cursor-pointer relative grow overflow-visible data-[orientation=horizontal]:h-[2px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-[1px]'
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
						className="bg-transparent ring-ring/50 cursor-pointer block size-4 shrink-0 rounded-full transition-[color] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 z-10 relative"
					>
						{/* Inner dot for visual size reduction */}
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="w-3 aspect-square bg-foreground rounded-full"></div>
						</div>
					</SliderPrimitive.Thumb>
				))}
			</SliderPrimitive.Root>
			{/* Step indicators */}
			{showStepIndicators && (
				<div
					className="absolute top-0 w-full h-[2px] pointer-events-none"
					style={{ left: '8px', right: '8px', width: 'calc(100% - 16px)' }}
				>
					{stepPositions.map((position, index) => (
						<div
							key={index}
							className="absolute w-[2px] h-8 !bg-foreground -z-10"
							style={{
								left: `${position}%`,
								transform: 'translateX(-50%) translateY(-14px)',
							}}
						/>
					))}
				</div>
			)}{' '}
			{/* Step labels */}
			{showStepIndicators && (
				<div className="flex justify-between w-full mt-2 px-0.5">
					{Array.from({ length: max - min + 1 }, (_, index) => {
						const value = min + index;
						return (
							<div key={index} className="flex justify-center w-2">
								<Typography
									className="!text-[10px] mt-3 text-muted-foreground text-center"
									font="secondary"
								>
									{value === 0 ? 'Auto' : value}
								</Typography>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
