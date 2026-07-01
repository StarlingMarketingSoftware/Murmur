'use client';

import { useEffect, useState } from 'react';

/**
 * Hold-Shift-to-select for the map tools.
 *
 * While {@link enabled} is true (i.e. a `MapSelectGrabTool` cluster is actually
 * on screen) and the user holds the Shift key, this returns `true`. Consumers
 * OR this into a *derived* active tool (`isShiftHeld ? 'select' : activeMapTool`)
 * rather than mutating their `activeMapTool` state, so:
 *   - the base tool the user picked by clicking is preserved and restored on
 *     release, and
 *   - the area-select completion handlers that snap the base tool back to
 *     `'grab'` after each rectangle don't end the hold — the user can drag
 *     several selection boxes in one continuous Shift press.
 *
 * Edge cases handled:
 *   - `event.repeat` auto-repeat keydowns are ignored (no thrash).
 *   - Shift pressed while typing in an input/textarea/contentEditable/select is
 *     ignored, so capital letters and Shift+Enter in the drafting editors never
 *     flip the map tool.
 *   - Shift combined with Cmd/Ctrl/Alt (browser/OS shortcuts) is ignored.
 *   - Window blur, tab hide (visibilitychange) and `enabled` turning false all
 *     release the hold, so a keyup that never arrives can't strand the tool in
 *     select mode.
 */
export function useShiftHoldMapSelectTool(enabled: boolean): boolean {
	const [isShiftHeld, setIsShiftHeld] = useState(false);

	useEffect(() => {
		if (!enabled) {
			// Leaving the map view (or any other gate flip) must not strand the
			// tool in Shift-select mode.
			setIsShiftHeld(false);
			return;
		}

		const isEditableTarget = (target: EventTarget | null): boolean => {
			const element = target as HTMLElement | null;
			if (!element) return false;
			if (element.isContentEditable) return true;
			const tagName = element.tagName;
			return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Shift') return;
			// Ignore OS/browser shortcut combos (e.g. Shift+Cmd, Shift+Alt).
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			// Ignore the held-key auto-repeat stream after the first keydown.
			if (event.repeat) return;
			// Don't hijack Shift while the user is typing (capitals, Shift+Enter, …).
			if (isEditableTarget(event.target)) return;
			setIsShiftHeld(true);
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (event.key !== 'Shift') return;
			setIsShiftHeld(false);
		};

		const releaseHold = () => setIsShiftHeld(false);

		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') releaseHold();
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		window.addEventListener('blur', releaseHold);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('blur', releaseHold);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [enabled]);

	return isShiftHeld;
}
