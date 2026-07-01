'use client';

import type { MutableRefObject } from 'react';

export interface SelectedStateGradientSvgProps {
	selectedStateGradientSvgRef: MutableRefObject<SVGSVGElement | null>;
	selectedStateGradientRef: MutableRefObject<SVGRadialGradientElement | null>;
	selectedStateGradientBloomRef: MutableRefObject<SVGRadialGradientElement | null>;
	selectedStateGradientClipPathRef: MutableRefObject<SVGPathElement | null>;
	selectedStateGradientBloomEllipseRef: MutableRefObject<SVGEllipseElement | null>;
	selectedStateGradientEllipseRef: MutableRefObject<SVGEllipseElement | null>;
	selectedStateGradientIds: { gradient: string; bloomGradient: string; clipPath: string };
}

// Selected-state wash SVG: gradient + bloom ellipses clipped to the searched
// state polygon; geometry/opacity driven imperatively by useSelectedStateGradient.
export const SelectedStateGradientSvg = ({
	selectedStateGradientSvgRef,
	selectedStateGradientRef,
	selectedStateGradientBloomRef,
	selectedStateGradientClipPathRef,
	selectedStateGradientBloomEllipseRef,
	selectedStateGradientEllipseRef,
	selectedStateGradientIds,
}: SelectedStateGradientSvgProps) => (
	<>
			{/*
			  Selected state wash. This reuses the curated blob gradient language,
			  but clips it to the searched state's projected polygon. The white
			  border is a Mapbox layer so markers always render above it.
			*/}
			<svg
				ref={selectedStateGradientSvgRef}
				aria-hidden
				width="100%"
				height="100%"
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					opacity: 0,
					willChange: 'opacity',
					zIndex: 2,
					overflow: 'visible',
				}}
			>
				<defs>
					<radialGradient
						ref={selectedStateGradientRef}
						id={selectedStateGradientIds.gradient}
						cx="0"
						cy="0"
						r="1"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0.716346" stopColor="#EFE8D8" stopOpacity="0" />
						<stop offset="0.783654" stopColor="#FFF8E5" stopOpacity="0.55" />
						<stop offset="0.841346" stopColor="#CAD7FF" />
						<stop offset="0.884615" stopColor="#CBFFE7" />
						<stop offset="1" stopColor="#F0EBDE" stopOpacity="0.2" />
					</radialGradient>
					<radialGradient
						ref={selectedStateGradientBloomRef}
						id={selectedStateGradientIds.bloomGradient}
						cx="0"
						cy="0"
						r="1"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
						<stop offset="0.14" stopColor="#FFFFFF" stopOpacity="0.7" />
						<stop offset="0.36" stopColor="#FFFFFF" stopOpacity="0.4" />
						<stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.18" />
						<stop offset="0.8" stopColor="#FFFFFF" stopOpacity="0.06" />
						<stop offset="0.92" stopColor="#FFFFFF" stopOpacity="0" />
					</radialGradient>
					<clipPath id={selectedStateGradientIds.clipPath} clipPathUnits="userSpaceOnUse">
						<path ref={selectedStateGradientClipPathRef} d="" clipRule="evenodd" />
					</clipPath>
				</defs>
				<ellipse
					ref={selectedStateGradientBloomEllipseRef}
					cx="0"
					cy="0"
					rx="0"
					ry="0"
					opacity="0"
					fill={`url(#${selectedStateGradientIds.bloomGradient})`}
					clipPath={`url(#${selectedStateGradientIds.clipPath})`}
				/>
				<ellipse
					ref={selectedStateGradientEllipseRef}
					cx="0"
					cy="0"
					rx="0"
					ry="0"
					opacity="0"
					fill={`url(#${selectedStateGradientIds.gradient})`}
					clipPath={`url(#${selectedStateGradientIds.clipPath})`}
					style={{ mixBlendMode: 'color' }}
				/>
			</svg>
	</>
);
