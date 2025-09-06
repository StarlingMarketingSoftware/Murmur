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
				style={{
					padding: '0 8px',
				}}
				{...props}
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className={cn(
						'bg-black cursor-pointer relative grow overflow-visible data-[orientation=horizontal]:h-[2px] data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-[1px] data-[disabled]:opacity-50'
					)}
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
				{Array.from({ length: _values.length }, (_, index) => {
					// At 0%, thumb center is at 6px, tick is at 8px. Diff = +2px.
					// At 100%, thumb center is at (width - 6px), tick is at (width - 8px). Diff = -2px.
					// We need to apply an offset that interpolates from +2px to -2px.
					const currentValue = _values[index];
					const normalizedPosition =
						max - min === 0 ? 0 : (currentValue - min) / (max - min);
					const offsetX = 2 - 4 * normalizedPosition;

					return (
						<SliderPrimitive.Thumb
							data-slot="slider-thumb"
							key={index}
							className="bg-transparent cursor-pointer block size-[12px] shrink-0 rounded-full transition-[color] ring-0 hover:ring-0 focus:ring-0 focus-visible:ring-0 outline-none focus:outline-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 z-10 relative"
							style={{
								transform: `translateX(${offsetX}px)`,
							}}
						>
							{/* Inner dot for visual size reduction */}
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="w-[8px] aspect-square bg-foreground rounded-full"></div>
							</div>
						</SliderPrimitive.Thumb>
					);
				})}
			</SliderPrimitive.Root>
			{/* Step indicators with pipe symbols */}
			{showStepIndicators && (
				<div
					className={cn('absolute top-0 h-full pointer-events-none flex items-center')}
					style={{
						left: '8px',
						right: '8px',
						width: 'calc(100% - 16px)',
					}}
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
