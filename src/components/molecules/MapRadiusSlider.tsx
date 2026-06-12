'use client';

import type { CSSProperties } from 'react';

import { Slider } from '@/components/ui/slider';

export const RADIUS_MIN_MILES = 5;
export const RADIUS_MAX_MILES = 250;
export const RADIUS_STEP_MILES = 5;
export const RADIUS_DEFAULT_MILES = 50;

type MapRadiusSliderProps = {
	/** Current radius in miles. */
	miles: number;
	/** Fires while dragging — updates the draft radius used by the next search. */
	onMilesChange: (miles: number) => void;
	className?: string;
	style?: CSSProperties;
};

// Pill-shaped radius control shown top-left of the search map while radius mode is
// on. Reuses the shared shadcn Slider (data-slot overrides give a thin black track
// + blue thumb to match the Figma). Position is set by the parent.
const MapRadiusSlider = ({
	miles,
	onMilesChange,
	className,
	style,
}: MapRadiusSliderProps) => {
	return (
		<div
			className={`pointer-events-auto flex h-[29px] w-[196px] flex-col items-center justify-center rounded-[27px] border border-[#C6C6C6] bg-[#F7F7F7] ${
				className ?? ''
			}`}
			style={style}
		>
			<span className="font-inter -translate-x-[3px] text-center text-[9.955px] leading-[13.273px] font-medium text-black select-none">
				{miles} mil Radius
			</span>
			<Slider
				value={[miles]}
				min={RADIUS_MIN_MILES}
				max={RADIUS_MAX_MILES}
				step={RADIUS_STEP_MILES}
				onValueChange={(value) => onMilesChange(value[0])}
				aria-label="Search radius in miles"
				className="h-[11px] w-[159px] [&_[data-slot=slider-track]]:h-[2px] [&_[data-slot=slider-track]]:rounded-[8px] [&_[data-slot=slider-track]]:bg-black [&_[data-slot=slider-range]]:bg-black [&_[data-slot=slider-thumb]]:size-[11px] [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:bg-[#37AEF4] [&_[data-slot=slider-thumb]]:shadow-none [&_[data-slot=slider-thumb]]:ring-0 [&_[data-slot=slider-thumb]:focus-visible]:ring-0 [&_[data-slot=slider-thumb]:hover]:ring-0"
			/>
		</div>
	);
};

export default MapRadiusSlider;
