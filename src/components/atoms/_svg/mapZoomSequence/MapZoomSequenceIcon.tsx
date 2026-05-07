import * as React from 'react';
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

export default function MapZoomSequenceIcon({
	levelValue,
	...props
}: MapZoomSequenceIconProps) {
	const rawId = React.useId().replace(/:/g, '');
	const roundedClipId = `${rawId}-map-zoom-rounded`;
	const globeClipId = `${rawId}-map-zoom-globe`;
	const usRevealClipId = `${rawId}-map-zoom-us-reveal`;
	const tileRevealClipId = `${rawId}-map-zoom-tile-reveal`;
	const level = clamp(levelValue, MIN_LEVEL, MAX_LEVEL);

	const worldGrowT = smoothStep(progressBetween(level, 0, 2));
	const globeT = smoothStep(progressBetween(level, 2, 5.85));
	const worldExitT = smoothStep(progressBetween(level, 5.1, 6.15));
	const usRevealT = smoothStep(progressBetween(level, 5.35, 6.2));
	const usZoomT = smoothStep(progressBetween(level, 6, 13));
	const tileRevealT = smoothStep(progressBetween(level, 13, 14.35));
	const tileT = smoothStep(progressBetween(level, 14, 17));
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
	const tileLand = mixColor('#D0D0D0', '#454545', progressBetween(level, 14, 16.6));
	const tileRegion = mixColor('#454545', '#303030', progressBetween(level, 15, 17));
	const tileFocusScale = mix(1.04, 1.58, focusToTileT);
	const tileFocusX = mix(1.6, -12.5, focusToTileT);
	const tileFocusY = mix(3, -7, focusToTileT);
	const tileMapScale = mix(0.72, 1.25, tileT);
	const tileMapX = mix(-11, -54, tileT);
	const tileMapY = mix(24, -2, tileT);

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
				<clipPath id={tileRevealClipId}>
					<rect
						x={mix(22.5, 0, tileRevealT)}
						y={mix(22.5, 0, tileRevealT)}
						width={mix(0, 45, tileRevealT)}
						height={mix(0, 45, tileRevealT)}
						rx={mix(2, 9, tileRevealT)}
					/>
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

				{level >= 5.35 && level < 14.35 ? (
					<g clipPath={level < 6.2 ? `url(#${usRevealClipId})` : undefined}>
						<g transform={`translate(${usTranslateX} ${usTranslateY}) scale(${usScale})`}>
							<path d={ZOOM_LEVEL_FOUR_US_ICON_PATH} fill={usFill} />
							<path d={ZOOM_LEVEL_FOUR_FOCUS_ICON_PATH} fill={focusFill} />
						</g>
					</g>
				) : null}

				{level >= 13 ? (
					<g clipPath={level < 14.35 ? `url(#${tileRevealClipId})` : undefined}>
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
