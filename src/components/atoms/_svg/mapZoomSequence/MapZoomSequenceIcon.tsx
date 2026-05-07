import * as React from 'react';
import {
	CONTINENT_COLOR_LEVELS,
	CONTINENT_COLORS,
	CONTINENT_KEYFRAME_COORDS,
	CONTINENT_LEVELS,
	CONTINENT_TEMPLATE,
	DETAIL_ONE_KEYFRAME_COORDS,
	DETAIL_ONE_LEVELS,
	DETAIL_ONE_TEMPLATE,
	DETAIL_THREE_KEYFRAME_COORDS,
	DETAIL_THREE_LEVELS,
	DETAIL_THREE_TEMPLATE,
	DETAIL_TWO_KEYFRAME_COORDS,
	DETAIL_TWO_LEVELS,
	DETAIL_TWO_TEMPLATE,
	FOCUS_ENTRY_LEVELS,
	FOCUS_ENTRY_SCALES,
	FOCUS_INSET_COLOR,
	FOCUS_INSET_KEYFRAME_COORDS,
	FOCUS_INSET_LEVELS,
	FOCUS_INSET_TEMPLATE,
	GLOBE_MASK_CX,
	GLOBE_MASK_CY,
	GLOBE_MASK_LEVELS,
	GLOBE_MASK_RADII,
	GLOBE_OUTLINE_COLOR,
	GLOBE_OUTLINE_LEVELS,
	GLOBE_OUTLINE_RADII,
	GLOBE_OUTLINE_STROKE_WIDTHS,
	SURFACE_EXIT_LEVELS,
	SURFACE_EXIT_SCALES,
	US_ANCHOR_LEVELS,
	US_ANCHOR_X,
	US_ANCHOR_Y,
	US_HANDOFF_SCALE_LEVELS,
	US_HANDOFF_SCALES,
	US_SHAPE_COLOR_LEVELS,
	US_SHAPE_COLORS,
	US_SHAPE_KEYFRAME_CENTER_X,
	US_SHAPE_KEYFRAME_CENTER_Y,
	US_SHAPE_KEYFRAME_COORDS,
	US_SHAPE_LEVELS,
	US_SHAPE_TEMPLATE,
	WORLD_ICON_LEVELS,
	WORLD_ICON_SCALES,
	resolveColor,
	resolveMorphedPath,
	resolveScalar,
} from './earlyFrameTracks';
import {
	ZOOMED_OUT_WORLD_ICON_PATH,
	ZOOM_LEVEL_FOUR_FOCUS_ICON_PATH,
	ZOOM_LEVEL_FOUR_US_ICON_PATH,
	ZOOM_STICKMAN_BODY_PATH,
	ZOOM_STICKMAN_HEAD_PATH,
} from './sharedPaths';

type MapZoomSequenceIconProps = React.SVGProps<SVGSVGElement> & {
	levelValue: number;
};

const MIN_LEVEL = 0;
const MAX_LEVEL = 20;
// At levels below this threshold the continuously-morphed early-frame stage runs.
// At and above it, the existing procedural zoom takes over without modification.
const EARLY_STAGE_EXIT_LEVEL = 8.5;

const clamp = (value: number, min = 0, max = 1) => {
	if (!Number.isFinite(value)) return min;
	return Math.min(Math.max(value, min), max);
};

const mix = (from: number, to: number, progress: number) =>
	from + (to - from) * clamp(progress);

const smoothStep = (value: number) => {
	const t = clamp(value);
	return t * t * (3 - 2 * t);
};

const progressBetween = (value: number, start: number, end: number) => {
	if (end <= start) return value >= end ? 1 : 0;
	return clamp((value - start) / (end - start));
};

const parseHexColor = (hexColor: string): [number, number, number] => {
	const normalized = hexColor.replace('#', '');
	const value = Number.parseInt(normalized, 16);
	if (Number.isNaN(value)) return [0, 0, 0];
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const mixColor = (from: string, to: string, progress: number) => {
	const [fromR, fromG, fromB] = parseHexColor(from);
	const [toR, toG, toB] = parseHexColor(to);
	const t = smoothStep(progress);
	const r = Math.round(mix(fromR, toR, t));
	const g = Math.round(mix(fromG, toG, t));
	const b = Math.round(mix(fromB, toB, t));
	return `rgb(${r}, ${g}, ${b})`;
};

const transformForCenteredWorld = (scale: number, offsetX = 0, offsetY = 0) => {
	const x = 22.5 - 17 * scale + offsetX;
	const y = 22.5 - 17 * scale + offsetY;
	return `translate(${x} ${y}) scale(${scale})`;
};

const getStickmanOpacity = (level: number) => {
	if (level <= 17) return 0;
	if (level <= 18) return mix(0, 0.35, progressBetween(level, 17, 18));
	if (level <= 19) return mix(0.35, 0.7, progressBetween(level, 18, 19));
	return mix(0.7, 1, progressBetween(level, 19, 20));
};

const StreetGrid = ({
	strokeProgress,
	strokeColor = '#050505',
	detailColor = '#242424',
}: {
	strokeProgress: number;
	strokeColor?: string;
	detailColor?: string;
}) => {
	const dashOffset = 1 - clamp(strokeProgress);

	return (
		<g
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeDasharray={1}
			strokeDashoffset={dashOffset}
		>
			<path
				d="M-5 38C6 34.5 14 34.7 23 38.8C30.8 42.3 38.5 43.8 50 41"
				stroke={strokeColor}
				strokeWidth={4.4}
				pathLength={1}
			/>
			<path
				d="M-2 18L11.5 13.8L21.8 9L49 22"
				stroke={strokeColor}
				strokeWidth={3.7}
				pathLength={1}
			/>
			<path
				d="M38 -4L44 6L31.8 18.8L23.9 31.6"
				stroke={strokeColor}
				strokeWidth={4.4}
				pathLength={1}
			/>
			<path
				d="M4 -5L17 11.7L17.8 30.8"
				stroke={strokeColor}
				strokeWidth={2.4}
				pathLength={1}
			/>
			<path
				d="M-4 10L8.7 2.2L17.4 0.2M5.4 22.9L11.8 28.1L17 24.2M26.8 -1L34.3 8.4L42.6 10.9M23.6 2.5L36.8 16M1 34.2L12.6 34M30.4 28L44 32.5M29.6 4.6L38.4 13M13.2 5.6L25.7 12.6M12.2 13.6L22.2 20.7"
				stroke={detailColor}
				strokeWidth={1.35}
				pathLength={1}
			/>
			<path
				d="M5.5 31.7L13.3 26.1L21.1 31.8M27.2 9.8L35.2 18.9L44.5 20.8M1.4 25.7L8.9 19.2M31 33.5L36.8 25.3L45.5 24.8"
				stroke={mixColor(detailColor, '#2A2A2A', 0.5)}
				strokeWidth={1.15}
				pathLength={1}
			/>
		</g>
	);
};

type EarlyZoomStageProps = React.SVGProps<SVGSVGElement> & {
	rawId: string;
	level: number;
};

/** Continuously-morphed render of the original frame00..frame08 artwork.
 *
 * Every recurring element in those nine static frames (world icon, globe outline,
 * globe mask, hand-drawn continent, three detail noise paths, US silhouette, focus
 * inset) becomes a track here. At any non-integer \`level\` the track's two adjacent
 * keyframes are linearly interpolated, including per-coordinate path morphing where
 * the keyframes share an SVG command topology. Disappearance is geometric — strokes
 * thin to zero, scales collapse, the globe-mask radius grows past the viewport — so
 * we never reach for opacity to mask the seams. */
const EarlyZoomStage = ({ rawId, level, ...props }: EarlyZoomStageProps) => {
	const roundedClipId = `${rawId}-map-zoom-rounded`;
	const globeMaskId = `${rawId}-early-globe-mask`;

	const worldIconScale = resolveScalar(level, WORLD_ICON_LEVELS, WORLD_ICON_SCALES);
	const globeOutlineRadius = resolveScalar(
		level,
		GLOBE_OUTLINE_LEVELS,
		GLOBE_OUTLINE_RADII
	);
	const globeOutlineStrokeWidth = resolveScalar(
		level,
		GLOBE_OUTLINE_LEVELS,
		GLOBE_OUTLINE_STROKE_WIDTHS
	);
	const globeMaskRadius = resolveScalar(level, GLOBE_MASK_LEVELS, GLOBE_MASK_RADII);
	const globeMaskCx = resolveScalar(level, GLOBE_MASK_LEVELS, GLOBE_MASK_CX);
	const globeMaskCy = resolveScalar(level, GLOBE_MASK_LEVELS, GLOBE_MASK_CY);
	const surfaceExitScale = resolveScalar(level, SURFACE_EXIT_LEVELS, SURFACE_EXIT_SCALES);
	const focusEntryScale = resolveScalar(level, FOCUS_ENTRY_LEVELS, FOCUS_ENTRY_SCALES);
	const continentColor = resolveColor(level, CONTINENT_COLOR_LEVELS, CONTINENT_COLORS);
	const usShapeColor = resolveColor(level, US_SHAPE_COLOR_LEVELS, US_SHAPE_COLORS);

	// Anchor the lerped US bounding-box center at the active anchor target. For
	// levels 3..7 the anchor is canvas center (pure zoom, no drift). Over levels
	// 7..8 the anchor lerps to procedural's L8.5 visible center and the handoff
	// scale boosts the US to procedural's L8.5 visible size, so the level 8 → 8.5
	// boundary is seamless.
	const usCenterX = resolveScalar(level, US_SHAPE_LEVELS, US_SHAPE_KEYFRAME_CENTER_X);
	const usCenterY = resolveScalar(level, US_SHAPE_LEVELS, US_SHAPE_KEYFRAME_CENTER_Y);
	const usAnchorX = resolveScalar(level, US_ANCHOR_LEVELS, US_ANCHOR_X);
	const usAnchorY = resolveScalar(level, US_ANCHOR_LEVELS, US_ANCHOR_Y);
	const usHandoffScale = resolveScalar(
		level,
		US_HANDOFF_SCALE_LEVELS,
		US_HANDOFF_SCALES
	);

	const continentD = resolveMorphedPath(
		level,
		CONTINENT_LEVELS,
		CONTINENT_KEYFRAME_COORDS,
		CONTINENT_TEMPLATE
	);
	const detail1D = resolveMorphedPath(
		level,
		DETAIL_ONE_LEVELS,
		DETAIL_ONE_KEYFRAME_COORDS,
		DETAIL_ONE_TEMPLATE
	);
	const detail2D = resolveMorphedPath(
		level,
		DETAIL_TWO_LEVELS,
		DETAIL_TWO_KEYFRAME_COORDS,
		DETAIL_TWO_TEMPLATE
	);
	const detail3D = resolveMorphedPath(
		level,
		DETAIL_THREE_LEVELS,
		DETAIL_THREE_KEYFRAME_COORDS,
		DETAIL_THREE_TEMPLATE
	);
	const usShapeD = resolveMorphedPath(
		level,
		US_SHAPE_LEVELS,
		US_SHAPE_KEYFRAME_COORDS,
		US_SHAPE_TEMPLATE
	);
	const focusD = resolveMorphedPath(
		level,
		FOCUS_INSET_LEVELS,
		FOCUS_INSET_KEYFRAME_COORDS,
		FOCUS_INSET_TEMPLATE
	);

	// The world icon owns levels 0 → 2 only — at exactly level 2 the planet view
	// takes over and the world icon hard-cuts. The world icon's scale 1.37 at L2
	// matches the planet-circle stroke radius (23.29), so the *outer* boundary
	// stays put across the boundary; only the *interior* changes (Earth-icon
	// continents → hand-drawn continent + planet outline). No circle expands.
	//
	// Surface/outline gating is keyed off `level >= 2` so that at any L<2 they
	// stay completely hidden — even though resolveScalar returns the first
	// keyframe's value (radius 24, strokeWidth 1.41) at sub-keyframe levels.
	const showWorldIcon = level < WORLD_ICON_LEVELS[WORLD_ICON_LEVELS.length - 1] && worldIconScale > 0.001;
	const showGlobeOutline = level >= 2 && globeOutlineStrokeWidth > 0.001 && globeOutlineRadius > 0;
	const showGlobeMask = level >= 2 && globeMaskRadius > 0;
	const showSurface = showGlobeMask && surfaceExitScale > 0.001;
	const showUsShape = level >= US_SHAPE_LEVELS[0];
	const showFocus = level >= FOCUS_ENTRY_LEVELS[0] && focusEntryScale > 0.001;

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={45}
			height={45}
			viewBox="0 0 45 45"
			fill="none"
			style={{ display: 'block' }}
			{...props}
		>
			<defs>
				<clipPath id={roundedClipId}>
					<rect width={45} height={45} rx={9} />
				</clipPath>
				{showSurface ? (
					<clipPath id={globeMaskId}>
						<circle cx={globeMaskCx} cy={globeMaskCy} r={globeMaskRadius} />
					</clipPath>
				) : null}
			</defs>

			<g clipPath={`url(#${roundedClipId})`}>
				{showWorldIcon ? (
					<path
						d={ZOOMED_OUT_WORLD_ICON_PATH}
						fill="black"
						transform={transformForCenteredWorld(worldIconScale)}
					/>
				) : null}

				{showGlobeOutline ? (
					<circle
						cx={globeMaskCx}
						cy={globeMaskCy}
						r={globeOutlineRadius}
						fill="none"
						stroke={GLOBE_OUTLINE_COLOR}
						strokeWidth={globeOutlineStrokeWidth}
					/>
				) : null}

				{showSurface ? (
					<g clipPath={`url(#${globeMaskId})`}>
						<g
							transform={`translate(22.5 22.5) scale(${surfaceExitScale}) translate(-22.5 -22.5)`}
						>
							<path d={continentD} fill={continentColor} />
							<path d={detail1D} fill={continentColor} />
							<path d={detail2D} fill={continentColor} />
							<path d={detail3D} fill={continentColor} />
						</g>
					</g>
				) : null}

				{showUsShape ? (
					<g
						transform={`translate(${usAnchorX} ${usAnchorY}) scale(${usHandoffScale}) translate(${-usCenterX} ${-usCenterY})`}
					>
						<path d={usShapeD} fill={usShapeColor} />
						{showFocus ? (
							<g
								transform={`translate(${usCenterX} ${usCenterY}) scale(${focusEntryScale}) translate(${-usCenterX} ${-usCenterY})`}
							>
								<path d={focusD} fill={FOCUS_INSET_COLOR} />
							</g>
						) : null}
					</g>
				) : null}
			</g>
		</svg>
	);
};

export default function MapZoomSequenceIcon({
	levelValue,
	...props
}: MapZoomSequenceIconProps) {
	const rawId = React.useId().replace(/:/g, '');
	const level = clamp(levelValue, MIN_LEVEL, MAX_LEVEL);

	if (level < EARLY_STAGE_EXIT_LEVEL) {
		return <EarlyZoomStage rawId={rawId} level={level} {...props} />;
	}

	const roundedClipId = `${rawId}-map-zoom-rounded`;
	const globeClipId = `${rawId}-map-zoom-globe`;
	const usRevealClipId = `${rawId}-map-zoom-us-reveal`;

	const worldGrowT = smoothStep(progressBetween(level, 0, 2));
	const globeT = smoothStep(progressBetween(level, 2, 5.85));
	const worldExitT = smoothStep(progressBetween(level, 5.1, 6.15));
	const usRevealT = smoothStep(progressBetween(level, 5.35, 6.2));
	const usZoomT = smoothStep(progressBetween(level, 6, 13));
	const tileT = smoothStep(progressBetween(level, 13, 17));
	const streetT = smoothStep(progressBetween(level, 15.35, 17));
	const focusToTileT = smoothStep(progressBetween(level, 13, 15));
	const stickmanOpacity = getStickmanOpacity(level);

	const globeEntryT = smoothStep(progressBetween(level, 1.65, 2));
	const globeRadius =
		level < 2 ? mix(0, 24, globeEntryT) : mix(24, 38, globeT);
	const worldScale = mix(1, 1.08, worldGrowT) + globeT * 1.78 + worldExitT * 0.95;
	const worldPanX = mix(0, -17.5, globeT) + worldExitT * -20;
	const worldPanY = mix(0, -9.5, globeT) + worldExitT * -13;
	const worldFill = mixColor('#000000', '#C8C8C8', progressBetween(level, 2, 5.7));

	const usScale = mix(0.34, 1.04, usZoomT);
	const usTranslateX = mix(11.8, 1.6, usZoomT);
	const usTranslateY = mix(23, 3, usZoomT);
	const usFill = mixColor('#454545', '#E0E0E0', progressBetween(level, 6, 13));
	const focusFill = '#454545';

	const tileBg = mixColor('#E2E2E2', '#3F3F3F', progressBetween(level, 15.1, 17));
	// Tile-mode US params are seeded with the US-in-air values at level 13 so the
	// L13 boundary is visually continuous (no "different content reveal" inside a
	// growing rect). The tile rendering takes over at L13 with the US in the same
	// place and color it just was, then evolves to its end state by L17. Streets
	// draw on between L15.35 and L17 (existing animation), then the stickman
	// fades in from L17 — the user's preferred "zoom into Texas, then road
	// texture, then stickman" sequence.
	const tileLand = mixColor('#E0E0E0', '#454545', progressBetween(level, 13, 16.6));
	const tileRegion = mixColor('#454545', '#303030', progressBetween(level, 15, 17));
	const tileFocusScale = mix(1.04, 1.58, focusToTileT);
	const tileFocusX = mix(1.6, -12.5, focusToTileT);
	const tileFocusY = mix(3, -7, focusToTileT);
	const tileMapScale = mix(1.04, 1.25, tileT);
	const tileMapX = mix(1.6, -54, tileT);
	const tileMapY = mix(3, -2, tileT);

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={45}
			height={45}
			viewBox="0 0 45 45"
			fill="none"
			style={{ display: 'block' }}
			{...props}
		>
			<defs>
				<clipPath id={roundedClipId}>
					<rect width={45} height={45} rx={9} />
				</clipPath>
				<clipPath id={globeClipId}>
					<circle cx={22} cy={23} r={globeRadius} />
				</clipPath>
				<clipPath id={usRevealClipId}>
					<circle cx={22.5} cy={22.5} r={mix(0, 33, usRevealT)} />
				</clipPath>
			</defs>

			<g clipPath={`url(#${roundedClipId})`}>
				{level < 6.15 ? (
					<g>
						<g clipPath={globeRadius > 0 ? `url(#${globeClipId})` : undefined}>
							<path
								d={ZOOMED_OUT_WORLD_ICON_PATH}
								fill={worldFill}
								transform={transformForCenteredWorld(
									worldScale,
									worldPanX,
									worldPanY
								)}
							/>
						</g>
					</g>
				) : null}

				{level >= 5.35 && level < 13 ? (
					<g clipPath={level < 6.2 ? `url(#${usRevealClipId})` : undefined}>
						<g transform={`translate(${usTranslateX} ${usTranslateY}) scale(${usScale})`}>
							<path d={ZOOM_LEVEL_FOUR_US_ICON_PATH} fill={usFill} />
							<path d={ZOOM_LEVEL_FOUR_FOCUS_ICON_PATH} fill={focusFill} />
						</g>
					</g>
				) : null}

				{level >= 13 ? (
					<g>
						<rect width={45} height={45} fill={tileBg} />
						{level < 16.85 ? (
							<g>
								<path
									d={ZOOM_LEVEL_FOUR_US_ICON_PATH}
									fill={tileLand}
									transform={`translate(${tileMapX} ${tileMapY}) scale(${tileMapScale})`}
								/>
								<path
									d={ZOOM_LEVEL_FOUR_FOCUS_ICON_PATH}
									fill={tileRegion}
									transform={`translate(${tileFocusX} ${tileFocusY}) scale(${tileFocusScale})`}
								/>
							</g>
						) : null}
						<StreetGrid
							strokeProgress={streetT}
							strokeColor={mixColor('#282828', '#050505', streetT)}
							detailColor={mixColor('#363636', '#242424', streetT)}
						/>
						<g
							opacity={stickmanOpacity}
							transform="translate(16.08 7.35) scale(1.35)"
						>
							<path d={ZOOM_STICKMAN_HEAD_PATH} fill="#FFFFFF" />
							<path d={ZOOM_STICKMAN_BODY_PATH} fill="#FFFFFF" />
						</g>
					</g>
				) : null}
			</g>
		</svg>
	);
}
