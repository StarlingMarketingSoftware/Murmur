'use client';

import { Fragment } from 'react';
import type { MutableRefObject } from 'react';

export interface CuratedOrbSvgProps {
	curatedOrbRef: MutableRefObject<SVGSVGElement | null>;
	curatedOrbGradientRefs: MutableRefObject<Array<SVGRadialGradientElement | null>>;
	curatedOrbBloomGradientRefs: MutableRefObject<Array<SVGRadialGradientElement | null>>;
	curatedOrbClipPathRefs: MutableRefObject<Array<SVGPathElement | null>>;
	curatedOrbBloomEllipseRefs: MutableRefObject<Array<SVGEllipseElement | null>>;
	curatedOrbEllipseRefs: MutableRefObject<Array<SVGEllipseElement | null>>;
	curatedOrbSlotIds: { gradient: string; bloomGradient: string; clipPath: string }[];
}

// Curated cluster zoom-out orb SVG: per-slot gradients/ellipses/clip paths,
// positioned imperatively by useCuratedBlobOrb.
export const CuratedOrbSvg = ({
	curatedOrbRef,
	curatedOrbGradientRefs,
	curatedOrbBloomGradientRefs,
	curatedOrbClipPathRefs,
	curatedOrbBloomEllipseRefs,
	curatedOrbEllipseRefs,
	curatedOrbSlotIds,
}: CuratedOrbSvgProps) => (
	<>
			{/*
			  Curated cluster zoom-out orbs. Each SVG ellipse paints its own
			  radial gradient, while the clip paths are rebuilt from the same
			  morphed Mapbox blob geometry that draws the white outlines.
			*/}
			<svg
				ref={curatedOrbRef}
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
					{curatedOrbSlotIds.map((ids, index) => (
						<Fragment key={ids.gradient}>
							<radialGradient
								ref={(node) => {
									curatedOrbGradientRefs.current[index] = node;
								}}
								id={ids.gradient}
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
								ref={(node) => {
									curatedOrbBloomGradientRefs.current[index] = node;
								}}
								id={ids.bloomGradient}
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
							<clipPath id={ids.clipPath} clipPathUnits="userSpaceOnUse">
								<path
									ref={(node) => {
										curatedOrbClipPathRefs.current[index] = node;
									}}
									d=""
									clipRule="evenodd"
								/>
							</clipPath>
						</Fragment>
					))}
				</defs>
				{curatedOrbSlotIds.map((ids, index) => (
					<Fragment key={ids.clipPath}>
						<ellipse
							ref={(node) => {
								curatedOrbBloomEllipseRefs.current[index] = node;
							}}
							cx="0"
							cy="0"
							rx="0"
							ry="0"
							opacity="0"
							fill={`url(#${ids.bloomGradient})`}
							clipPath={`url(#${ids.clipPath})`}
						/>
						<ellipse
							ref={(node) => {
								curatedOrbEllipseRefs.current[index] = node;
							}}
							cx="0"
							cy="0"
							rx="0"
							ry="0"
							opacity="0"
							fill={`url(#${ids.gradient})`}
							clipPath={`url(#${ids.clipPath})`}
							style={{ mixBlendMode: 'color' }}
						/>
					</Fragment>
				))}
			</svg>
	</>
);
