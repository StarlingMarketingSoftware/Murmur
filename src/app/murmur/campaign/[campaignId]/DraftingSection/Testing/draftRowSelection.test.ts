import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDraftRowClick } from './draftRowSelection';

test('clicking the showing draft is a no-op', () => {
	const selected = new Set([1, 2, 3]);
	const result = resolveDraftRowClick(2, 2, selected);

	assert.equal(result.showDraft, false);
	assert.equal(result.nextSelectedIds, null);
	// The original set is never mutated.
	assert.deepEqual([...selected], [1, 2, 3]);
});

test('clicking a selected, non-showing draft deselects only that draft', () => {
	const selected = new Set([1, 2, 3]);
	const result = resolveDraftRowClick(3, 1, selected);

	assert.equal(result.showDraft, false);
	assert.ok(result.nextSelectedIds);
	assert.deepEqual([...result.nextSelectedIds!].sort((a, b) => a - b), [1, 2]);
	// Original set untouched (new Set returned).
	assert.deepEqual([...selected], [1, 2, 3]);
});

test('clicking a plain draft promotes it to showing and clears every other selection', () => {
	const selected = new Set([1, 2, 3]);
	const result = resolveDraftRowClick(9, 1, selected);

	assert.equal(result.showDraft, true);
	assert.ok(result.nextSelectedIds);
	assert.deepEqual([...result.nextSelectedIds!], [9]);
});

test('with no showing draft yet, a click promotes the clicked draft', () => {
	const result = resolveDraftRowClick(5, null, new Set());

	assert.equal(result.showDraft, true);
	assert.deepEqual([...result.nextSelectedIds!], [5]);
});

test('deselecting the last non-showing draft leaves only the showing draft', () => {
	const selected = new Set([4, 7]);
	const result = resolveDraftRowClick(7, 4, selected);

	assert.equal(result.showDraft, false);
	assert.deepEqual([...result.nextSelectedIds!], [4]);
});
