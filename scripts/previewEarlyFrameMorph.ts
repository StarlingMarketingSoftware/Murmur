/* Renders the early frame morph at every 0.25 step from level 0 to 8.5 and
 * writes a single HTML file showing them side by side, so visual fidelity can
 * be reviewed without a dev server. Open the file in a browser. */
/* eslint-disable no-console */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
	US_SHAPE_COLOR_LEVELS,
	US_SHAPE_COLORS,
	US_SHAPE_KEYFRAME_COORDS,
	US_SHAPE_LEVELS,
	US_SHAPE_TEMPLATE,
	WORLD_ICON_LEVELS,
	WORLD_ICON_SCALES,
	resolveColor,
	resolveMorphedPath,
	resolveScalar,
} from '../src/components/atoms/_svg/mapZoomSequence/earlyFrameTracks';
import { ZOOMED_OUT_WORLD_ICON_PATH } from '../src/components/atoms/_svg/mapZoomSequence/sharedPaths';

function transformForCenteredWorld(scale: number) {
	const x = 22.5 - 17 * scale;
	const y = 22.5 - 17 * scale;
	return `translate(${x} ${y}) scale(${scale})`;
}

function renderEarlyStage(level: number, instanceId: number): string {
	const worldIconScale = resolveScalar(level, WORLD_ICON_LEVELS, WORLD_ICON_SCALES);
	const globeOutlineRadius = resolveScalar(level, GLOBE_OUTLINE_LEVELS, GLOBE_OUTLINE_RADII);
	const globeOutlineSW = resolveScalar(level, GLOBE_OUTLINE_LEVELS, GLOBE_OUTLINE_STROKE_WIDTHS);
	const globeMaskRadius = resolveScalar(level, GLOBE_MASK_LEVELS, GLOBE_MASK_RADII);
	const globeMaskCx = resolveScalar(level, GLOBE_MASK_LEVELS, GLOBE_MASK_CX);
	const globeMaskCy = resolveScalar(level, GLOBE_MASK_LEVELS, GLOBE_MASK_CY);
	const surfaceExitScale = resolveScalar(level, SURFACE_EXIT_LEVELS, SURFACE_EXIT_SCALES);
	const focusEntryScale = resolveScalar(level, FOCUS_ENTRY_LEVELS, FOCUS_ENTRY_SCALES);
	const continentColor = resolveColor(level, CONTINENT_COLOR_LEVELS, CONTINENT_COLORS);
	const usShapeColor = resolveColor(level, US_SHAPE_COLOR_LEVELS, US_SHAPE_COLORS);

	const continentD = resolveMorphedPath(level, CONTINENT_LEVELS, CONTINENT_KEYFRAME_COORDS, CONTINENT_TEMPLATE);
	const detail1D = resolveMorphedPath(level, DETAIL_ONE_LEVELS, DETAIL_ONE_KEYFRAME_COORDS, DETAIL_ONE_TEMPLATE);
	const detail2D = resolveMorphedPath(level, DETAIL_TWO_LEVELS, DETAIL_TWO_KEYFRAME_COORDS, DETAIL_TWO_TEMPLATE);
	const detail3D = resolveMorphedPath(level, DETAIL_THREE_LEVELS, DETAIL_THREE_KEYFRAME_COORDS, DETAIL_THREE_TEMPLATE);
	const usShapeD = resolveMorphedPath(level, US_SHAPE_LEVELS, US_SHAPE_KEYFRAME_COORDS, US_SHAPE_TEMPLATE);
	const focusD = resolveMorphedPath(level, FOCUS_INSET_LEVELS, FOCUS_INSET_KEYFRAME_COORDS, FOCUS_INSET_TEMPLATE);

	const showWorldIcon = level < WORLD_ICON_LEVELS[WORLD_ICON_LEVELS.length - 1] && worldIconScale > 0.001;
	const showGlobeOutline = globeOutlineSW > 0.001 && globeOutlineRadius > 0;
	const showGlobeMask = globeMaskRadius > 0;
	const showSurface = showGlobeMask && surfaceExitScale > 0.001;
	const showUsShape = level >= US_SHAPE_LEVELS[0];
	const showFocus = level >= FOCUS_ENTRY_LEVELS[0] && focusEntryScale > 0.001;

	const roundedClipId = `clip-rounded-${instanceId}`;
	const globeMaskId = `clip-globe-${instanceId}`;

	const parts: string[] = [];
	parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 45 45" fill="none" style="display:block; background: #fafafa; border: 1px solid #ddd;">`);
	parts.push(`<defs>`);
	parts.push(`<clipPath id="${roundedClipId}"><rect width="45" height="45" rx="9"/></clipPath>`);
	if (showSurface) {
		parts.push(
			`<clipPath id="${globeMaskId}"><circle cx="${globeMaskCx}" cy="${globeMaskCy}" r="${globeMaskRadius}"/></clipPath>`
		);
	}
	parts.push(`</defs>`);
	parts.push(`<g clip-path="url(#${roundedClipId})">`);
	if (showWorldIcon) {
		parts.push(
			`<path d="${ZOOMED_OUT_WORLD_ICON_PATH}" fill="black" transform="${transformForCenteredWorld(worldIconScale)}"/>`
		);
	}
	if (showGlobeOutline) {
		parts.push(
			`<circle cx="${globeMaskCx}" cy="${globeMaskCy}" r="${globeOutlineRadius}" fill="none" stroke="${GLOBE_OUTLINE_COLOR}" stroke-width="${globeOutlineSW}"/>`
		);
	}
	if (showSurface) {
		parts.push(
			`<g clip-path="url(#${globeMaskId})"><g transform="translate(22.5 22.5) scale(${surfaceExitScale}) translate(-22.5 -22.5)">`
		);
		parts.push(`<path d="${continentD}" fill="${continentColor}"/>`);
		parts.push(`<path d="${detail1D}" fill="${continentColor}"/>`);
		parts.push(`<path d="${detail2D}" fill="${continentColor}"/>`);
		parts.push(`<path d="${detail3D}" fill="${continentColor}"/>`);
		parts.push(`</g></g>`);
	}
	if (showUsShape) {
		parts.push(`<path d="${usShapeD}" fill="${usShapeColor}"/>`);
	}
	if (showFocus) {
		parts.push(
			`<g transform="translate(22.5 22.5) scale(${focusEntryScale}) translate(-22.5 -22.5)"><path d="${focusD}" fill="${FOCUS_INSET_COLOR}"/></g>`
		);
	}
	parts.push(`</g></svg>`);
	return parts.join('');
}

const levels: number[] = [];
for (let l = 0; l <= 8.5; l += 0.25) {
	levels.push(Math.round(l * 100) / 100);
}

const cells = levels
	.map((lvl, i) => {
		const isInteger = Math.abs(lvl - Math.round(lvl)) < 1e-6;
		const labelStyle = isInteger ? 'font-weight: bold; color: #000;' : 'color: #888;';
		return `<div class="cell"><div class="label" style="${labelStyle}">L=${lvl.toFixed(2)}${isInteger ? ' ★' : ''}</div>${renderEarlyStage(lvl, i)}</div>`;
	})
	.join('\n');

const html = `<!doctype html>
<html>
<head>
	<meta charset="utf-8">
	<title>Early Frame Morph Preview (levels 0 → 8.5)</title>
	<style>
		body { font: 12px -apple-system, sans-serif; margin: 16px; background: #fff; }
		h1 { font-size: 16px; }
		.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
		.cell { display: flex; flex-direction: column; align-items: center; }
		.label { margin-bottom: 4px; }
	</style>
</head>
<body>
	<h1>Early Frame Morph Preview — levels 0 to 8.5 in 0.25 increments</h1>
	<p>Bold ★ rows are integer keyframe levels (should match the spirit of the original frame00-frame08).</p>
	<div class="grid">
		${cells}
	</div>
</body>
</html>
`;

const outPath = resolve(__dirname, 'mapZoomMorphPreview.html');
writeFileSync(outPath, html);
console.log(`Wrote preview HTML to ${outPath}`);
console.log(`Open it in a browser:  open ${outPath}`);
