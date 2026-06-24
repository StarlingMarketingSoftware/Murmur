import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDraftRowClick } from './draftRowSelection';

test('clicking a selected, non-showing draft promotes it to showing without changing the selection', () => {
	const selected = new Set([1, 2, 3]);
	const result = resolveDraftRowClick(3, 1, selected, [1, 2, 3]);

	assert.equal(result.nextShowingId, 3);
	assert.equal(result.nextSelectedIds, null);
	// Original set untouched.
	assert.deepEqual([...selected], [1, 2, 3]);
});

test('clicking the showing draft deselects it and shows the next selected draft', () => {
	const selected = new Set([1, 2, 3]);
	const result = resolveDraftRowClick(2, 2, selected, [1, 2, 3]);

	assert.equal(result.nextShowingId, 3);
	assert.ok(result.nextSelectedIds);
	assert.deepEqual([...result.nextSelectedIds!].sort((a, b) => a - b), [1, 3]);
	// The original set is never mutated.
	assert.deepEqual([...selected], [1, 2, 3]);
});

test('deselecting the last showing draft falls back to the previous selected draft', () => {
	const selected = new Set([1, 3]);
	const result = resolveDraftRowClick(3, 3, selected, [1, 2, 3]);

	assert.equal(result.nextShowingId, 1);
	assert.deepEqual([...result.nextSelectedIds!], [1]);
});

test('deselecting the showing draft when nothing else is selected clears the next showing id', () => {
	const selected = new Set([5]);
	const result = resolveDraftRowClick(5, 5, selected, [5]);

	assert.equal(result.nextShowingId, null);
	assert.deepEqual([...result.nextSelectedIds!], []);
});

test('clicking a plain draft promotes it to showing and clears every other selection', () => {
	const selected = new Set([1, 2, 3]);
	const result = resolveDraftRowClick(9, 1, selected, [1, 2, 3, 9]);

	assert.equal(result.nextShowingId, 9);
	assert.ok(result.nextSelectedIds);
	assert.deepEqual([...result.nextSelectedIds!], [9]);
});

test('with no showing draft yet, a click promotes the clicked draft', () => {
	const result = resolveDraftRowClick(5, null, new Set(), [5]);

	assert.equal(result.nextShowingId, 5);
	assert.deepEqual([...result.nextSelectedIds!], [5]);
});

test('deselecting the showing draft when it is missing from the ordered list falls back to the first selected', () => {
	// Race: the clicked/showing row left the view, so it is not in orderedIds.
	const selected = new Set([2, 4, 7]);
	const result = resolveDraftRowClick(7, 7, selected, [2, 4]);

	assert.equal(result.nextShowingId, 2);
	assert.deepEqual([...result.nextSelectedIds!].sort((a, b) => a - b), [2, 4]);
});
