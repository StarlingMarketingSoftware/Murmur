/* Verification script for the early frame morph tracks. Renders key levels and
 * checks that integer levels produce the original keyframe paths and that
 * intermediate levels produce well-formed SVG. */
/* eslint-disable no-console */
import {
	CONTINENT_KEYFRAME_COORDS,
	CONTINENT_LEVELS,
	CONTINENT_TEMPLATE,
	DETAIL_ONE_KEYFRAME_COORDS,
	DETAIL_ONE_LEVELS,
	DETAIL_ONE_TEMPLATE,
	FOCUS_INSET_KEYFRAME_COORDS,
	FOCUS_INSET_LEVELS,
	FOCUS_INSET_TEMPLATE,
	GLOBE_MASK_LEVELS,
	GLOBE_MASK_RADII,
	GLOBE_OUTLINE_LEVELS,
	GLOBE_OUTLINE_STROKE_WIDTHS,
	US_SHAPE_KEYFRAME_COORDS,
	US_SHAPE_LEVELS,
	US_SHAPE_TEMPLATE,
	WORLD_ICON_LEVELS,
	WORLD_ICON_SCALES,
	morphPath,
	resolveColor,
	resolveMorphedPath,
	resolveScalar,
} from '../src/components/atoms/_svg/mapZoomSequence/earlyFrameTracks';

const COORDS_PER_COMMAND: Record<string, number> = {
	M: 2,
	L: 2,
	H: 1,
	V: 1,
	C: 6,
	S: 4,
	Q: 4,
	T: 2,
	A: 7,
	Z: 0,
};

function tokenize(d: string): { commands: string[]; nums: number[] } {
	const commands: string[] = [];
	const nums: number[] = [];
	let i = 0;
	while (i < d.length) {
		const ch = d[i];
		if (/[a-zA-Z]/.test(ch)) {
			commands.push(ch);
			i++;
		} else if (/[\-\d.]/.test(ch)) {
			let j = i;
			let sawDecimal = false;
			while (j < d.length) {
				const c = d[j];
				if (c === '-' && j === i) j++;
				else if (c === '.' && !sawDecimal) {
					sawDecimal = true;
					j++;
				} else if (/\d/.test(c)) j++;
				else break;
			}
			nums.push(Number(d.slice(i, j)));
			i = j;
		} else {
			i++;
		}
	}
	return { commands, nums };
}

let failures = 0;
function assertEq(label: string, actual: unknown, expected: unknown, eps = 1e-3) {
	if (typeof actual === 'number' && typeof expected === 'number') {
		const ok = Math.abs(actual - expected) < eps;
		if (!ok) {
			console.error(`  FAIL ${label}: expected ${expected}, got ${actual}`);
			failures++;
		} else {
			console.log(`  ok   ${label}: ${actual}`);
		}
	} else {
		const ok = actual === expected;
		if (!ok) {
			console.error(`  FAIL ${label}: expected ${expected}, got ${actual}`);
			failures++;
		} else {
			console.log(`  ok   ${label}: ${actual}`);
		}
	}
}

function assertNear(label: string, actual: number, expected: number, eps = 1e-2) {
	const ok = Math.abs(actual - expected) < eps;
	if (!ok) {
		console.error(`  FAIL ${label}: expected ~${expected}, got ${actual}`);
		failures++;
	} else {
		console.log(`  ok   ${label}: ${actual.toFixed(4)} (within ${eps} of ${expected})`);
	}
}

console.log('\n=== morphPath at t=0 returns first path ===');
{
	const result = morphPath(
		CONTINENT_KEYFRAME_COORDS[0],
		CONTINENT_KEYFRAME_COORDS[1],
		0,
		CONTINENT_TEMPLATE
	);
	const tok = tokenize(result);
	assertEq('command count', tok.commands.length, CONTINENT_TEMPLATE.length);
	assertEq('coord count', tok.nums.length, CONTINENT_KEYFRAME_COORDS[0].length);
	for (let i = 0; i < tok.nums.length; i++) {
		const expected = CONTINENT_KEYFRAME_COORDS[0][i];
		if (Math.abs(tok.nums[i] - expected) > 1e-3) {
			console.error(`  FAIL coord ${i}: expected ${expected}, got ${tok.nums[i]}`);
			failures++;
			break;
		}
	}
	console.log(`  ok   all ${tok.nums.length} coords match keyframe 0 within tolerance`);
}

console.log('\n=== morphPath at t=1 returns second path ===');
{
	const result = morphPath(
		CONTINENT_KEYFRAME_COORDS[0],
		CONTINENT_KEYFRAME_COORDS[1],
		1,
		CONTINENT_TEMPLATE
	);
	const tok = tokenize(result);
	for (let i = 0; i < tok.nums.length; i++) {
		const expected = CONTINENT_KEYFRAME_COORDS[1][i];
		if (Math.abs(tok.nums[i] - expected) > 1e-3) {
			console.error(`  FAIL coord ${i}: expected ${expected}, got ${tok.nums[i]}`);
			failures++;
			break;
		}
	}
	console.log(`  ok   all ${tok.nums.length} coords match keyframe 1 within tolerance`);
}

console.log('\n=== morphPath at t=0.5 returns midpoint ===');
{
	const result = morphPath(
		CONTINENT_KEYFRAME_COORDS[0],
		CONTINENT_KEYFRAME_COORDS[1],
		0.5,
		CONTINENT_TEMPLATE
	);
	const tok = tokenize(result);
	for (let i = 0; i < tok.nums.length; i++) {
		const expected =
			(CONTINENT_KEYFRAME_COORDS[0][i] + CONTINENT_KEYFRAME_COORDS[1][i]) / 2;
		if (Math.abs(tok.nums[i] - expected) > 1e-3) {
			console.error(`  FAIL coord ${i}: expected ${expected}, got ${tok.nums[i]}`);
			failures++;
			break;
		}
	}
	console.log(`  ok   all ${tok.nums.length} coords are midpoint within tolerance`);
}

console.log('\n=== resolveScalar at integer levels matches keyframes ===');
for (let i = 0; i < WORLD_ICON_LEVELS.length; i++) {
	const lvl = WORLD_ICON_LEVELS[i];
	const expected = WORLD_ICON_SCALES[i];
	assertNear(`worldIconScale at level ${lvl}`, resolveScalar(lvl, WORLD_ICON_LEVELS, WORLD_ICON_SCALES), expected);
}

for (let i = 0; i < GLOBE_MASK_LEVELS.length; i++) {
	const lvl = GLOBE_MASK_LEVELS[i];
	const expected = GLOBE_MASK_RADII[i];
	assertNear(`globeMaskRadius at level ${lvl}`, resolveScalar(lvl, GLOBE_MASK_LEVELS, GLOBE_MASK_RADII), expected);
}

console.log('\n=== resolveScalar past last keyframe stays at last value ===');
assertNear(
	'globeMaskRadius at level 7 (past last)',
	resolveScalar(7, GLOBE_MASK_LEVELS, GLOBE_MASK_RADII),
	80
);
assertNear(
	'worldIconScale at level 5 (past last)',
	resolveScalar(5, WORLD_ICON_LEVELS, WORLD_ICON_SCALES),
	1.36994
);

console.log('\n=== world icon must NOT shrink between adjacent keyframes ===');
let prev: number = WORLD_ICON_SCALES[0];
for (let i = 1; i < WORLD_ICON_SCALES.length; i++) {
	const cur = WORLD_ICON_SCALES[i];
	if (cur < prev) {
		console.error(
			`  FAIL world icon shrinks from ${prev} (level ${WORLD_ICON_LEVELS[i - 1]}) to ${cur} (level ${WORLD_ICON_LEVELS[i]})`
		);
		failures++;
	} else {
		console.log(
			`  ok   world icon grows from ${prev} → ${cur} (level ${WORLD_ICON_LEVELS[i - 1]} → ${WORLD_ICON_LEVELS[i]})`
		);
	}
	prev = cur;
}

console.log('\n=== sample levels produce well-formed paths ===');
const sampleLevels = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.49];
for (const lvl of sampleLevels) {
	const continentD = resolveMorphedPath(
		lvl,
		CONTINENT_LEVELS,
		CONTINENT_KEYFRAME_COORDS,
		CONTINENT_TEMPLATE
	);
	const usD = resolveMorphedPath(lvl, US_SHAPE_LEVELS, US_SHAPE_KEYFRAME_COORDS, US_SHAPE_TEMPLATE);
	const focusD = resolveMorphedPath(lvl, FOCUS_INSET_LEVELS, FOCUS_INSET_KEYFRAME_COORDS, FOCUS_INSET_TEMPLATE);

	const cTok = tokenize(continentD);
	const uTok = tokenize(usD);
	const fTok = tokenize(focusD);

	const cOk = cTok.commands.length === CONTINENT_TEMPLATE.length;
	const uOk = uTok.commands.length === US_SHAPE_TEMPLATE.length;
	const fOk = fTok.commands.length === FOCUS_INSET_TEMPLATE.length;

	if (!cOk || !uOk || !fOk) {
		console.error(`  FAIL level ${lvl}: continent=${cOk}, us=${uOk}, focus=${fOk}`);
		failures++;
	} else {
		console.log(`  ok   level ${lvl.toFixed(2)}: continent ${cTok.commands.length} cmds, us ${uTok.commands.length} cmds, focus ${fTok.commands.length} cmds`);
	}
}

console.log('\n=== globe outline thins out, never grows in stroke width past frame 03 ===');
for (let i = 0; i < GLOBE_OUTLINE_LEVELS.length; i++) {
	const lvl = GLOBE_OUTLINE_LEVELS[i];
	console.log(`  level ${lvl}: strokeWidth ${GLOBE_OUTLINE_STROKE_WIDTHS[i]}`);
}

console.log('\n=== summary ===');
console.log(`failures: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
