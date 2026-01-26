import * as React from 'react';

const CLOCK_HANDS_PIVOT = { x: 91, y: 153 };
// The hour hand in this SVG is drawn “pre-rotated” (its tip points ~11 o’clock at 0deg).
// This base angle is derived from the hour-hand tip vector relative to the pivot.
const HOUR_HAND_BASE_ANGLE_DEG = -120.214;

type ClockHandsProps = React.SVGProps<SVGSVGElement> & {
	/**
	 * Desired minute-hand angle in SVG degrees.
	 * \(0deg points right / 3 o’clock; -90deg points up / 12 o’clock\)
	 */
	minuteHandAngleDeg: number;
	/**
	 * Desired hour-hand angle in SVG degrees.
	 * \(0deg points right / 3 o’clock; -90deg points up / 12 o’clock\)
	 */
	hourHandAngleDeg: number;
};

function ClockHands({ minuteHandAngleDeg, hourHandAngleDeg, ...props }: ClockHandsProps) {
	const minuteHandTransform = `rotate(${minuteHandAngleDeg} ${CLOCK_HANDS_PIVOT.x} ${CLOCK_HANDS_PIVOT.y})`;
	const hourHandTransform = `rotate(${hourHandAngleDeg - HOUR_HAND_BASE_ANGLE_DEG} ${CLOCK_HANDS_PIVOT.x} ${CLOCK_HANDS_PIVOT.y})`;

	return (
		<svg
			width={327}
			height={210}
			viewBox="0 0 327 210"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			overflow="visible"
			{...props}
		>
			{/* Minute hand (longer, thicker) */}
			<g className="clock-hand-primary" transform={minuteHandTransform}>
				<path
					d="M95 173l-58-15 54-26h235.5L95 173zm-4-33c-7.18 0-13 5.82-13 13s5.82 13 13 13 13-5.82 13-13-5.82-13-13-13z"
					fill="#000"
				/>
			</g>

			{/* Hour hand (shorter) */}
			<g className="clock-hand-secondary" transform={hourHandTransform}>
				<path
					d="M9.758 13.49l96.951 126.158 12.601 58.568-47.454-36.608L9.758 13.489zM79.007 158.02c3.22 6.417 11.031 9.01 17.449 5.79 6.417-3.219 9.01-11.031 5.79-17.449-3.22-6.417-11.031-9.01-17.449-5.79-6.417 3.219-9.01 11.032-5.79 17.449z"
					fill="#0B0B0B"
				/>
			</g>
		</svg>
	);
}

export default ClockHands;
