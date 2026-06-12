import type { SVGProps } from 'react';

// Calendar with a "+" nested into its bottom-left corner — the booking-request
// glyph from the Figma mock (recreated; the original SVG paste was lost). Strokes
// follow currentColor so the button/banner contexts tint it.
export const CalendarPlusIcon = (props: SVGProps<SVGSVGElement>) => (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path d="M8 2v4" />
		<path d="M16 2v4" />
		{/* Body, drawn open around the bottom-left corner where the plus sits. */}
		<path d="M3 13V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-8" />
		<path d="M3 10h18" />
		{/* The corner plus. */}
		<path d="M2 19h6" />
		<path d="M5 16v6" />
	</svg>
);
