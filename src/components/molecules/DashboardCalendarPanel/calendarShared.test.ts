import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONTH_COLOR_PALETTES, getCellBackground } from './calendarShared';

test('month colorway changes on the 1st inside a trailing week row', () => {
	const row = 0;
	const boundaryWeek = Array.from(
		{ length: 7 },
		(_, dayOffset) => new Date(2026, 4, 31 + dayOffset)
	);

	const colors = boundaryWeek.map((date, col) =>
		getCellBackground(date.getMonth(), row, col)
	);

	assert.equal(colors[0], MONTH_COLOR_PALETTES[4][0]);
	assert.equal(colors[1], MONTH_COLOR_PALETTES[5][1]);
	assert.notEqual(colors[1], getCellBackground(4, row, 1));
	assert.deepEqual(
		colors.slice(1),
		Array.from(
			{ length: 6 },
			(_, index) => MONTH_COLOR_PALETTES[5][(index + 1) % MONTH_COLOR_PALETTES[5].length]
		)
	);
});