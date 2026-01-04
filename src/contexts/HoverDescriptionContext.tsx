'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

type HoverDescriptionContextValue = {
	enabled: boolean;
	description: string;
};

const HoverDescriptionContext = createContext<HoverDescriptionContextValue>({
	enabled: false,
	description: '',
});

const DATA_ATTR = 'data-hover-description';
const IGNORE_ATTR = 'data-hover-description-ignore';
const SUPPRESS_ATTR = 'data-hover-description-suppress';

const SLOT_DESCRIPTION: Record<string, string> = {
	'campaign-top-box': 'Search for more contacts (opens the dashboard search for this campaign).',
	'campaign-left-box': 'Quick actions: campaigns dropdown and dashboard shortcut.',
	'campaign-top-dropdown': 'Your campaigns list.',
	'campaign-right-box': 'Toggle hover descriptions (left = ON, right = OFF).',
	'campaign-header': 'Campaign navigation and tabs.',
};

function getFirstNonEmpty(...values: Array<string | null | undefined>): string {
	for (const v of values) {
		const trimmed = v?.trim();
		if (trimmed) return trimmed;
	}
	return '';
}

/**
 * Computes a human-friendly description for an element (or one of its ancestors).
 * Returns:
 * - string: description (possibly empty string)
 * - null: ignore (do not update current description)
 */
function computeDescriptionFromTarget(target: EventTarget | null): string | null {
	if (!(target instanceof Element)) return '';

	// Don't let hovering the description itself cause flicker/feedback loops.
	if (target.closest(`[${IGNORE_ATTR}="true"]`)) return null;
	// Some UI areas (like tabs) intentionally suppress hover descriptions.
	// Return null to "freeze" the current message instead of clearing/replacing it.
	if (target.closest(`[${SUPPRESS_ATTR}="true"]`)) return null;

	// Walk up the DOM so nearer elements win (e.g. button aria-label beats a parent box description).
	let el: Element | null = target;
	while (el) {
		// Allow marking any subtree as "ignore" without clearing the current description.
		if (el.getAttribute(IGNORE_ATTR) === 'true') return null;

		const explicit = el.getAttribute(DATA_ATTR);
		if (explicit?.trim()) return explicit.trim();

		const slot = el.getAttribute('data-slot')?.trim();
		if (slot && SLOT_DESCRIPTION[slot]) return SLOT_DESCRIPTION[slot];

		const aria = el.getAttribute('aria-label');
		const title = el.getAttribute('title');
		const placeholder =
			el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
				? el.getAttribute('placeholder')
				: null;
		const alt = el instanceof HTMLImageElement ? el.getAttribute('alt') : null;

		const common = getFirstNonEmpty(aria, title, alt, placeholder);
		if (common) return common;

		if (el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement) {
			const text = el.textContent?.replace(/\s+/g, ' ').trim();
			if (text) return text;
		}

		el = el.parentElement;
	}

	return '';
}

export function HoverDescriptionProvider({
	enabled,
	children,
}: {
	enabled: boolean;
	children: React.ReactNode;
}) {
	const [description, setDescription] = useState('');
	const descriptionRef = useRef('');
	const setTimeoutRef = useRef<number | null>(null);
	const clearTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		descriptionRef.current = description;
	}, [description]);

	// Clear immediately when disabled so the header line disappears.
	useEffect(() => {
		if (!enabled) {
			if (setTimeoutRef.current != null) {
				window.clearTimeout(setTimeoutRef.current);
				setTimeoutRef.current = null;
			}
			if (clearTimeoutRef.current != null) {
				window.clearTimeout(clearTimeoutRef.current);
				clearTimeoutRef.current = null;
			}
			descriptionRef.current = '';
			setDescription('');
		}
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;

		const clearTimers = () => {
			if (setTimeoutRef.current != null) {
				window.clearTimeout(setTimeoutRef.current);
				setTimeoutRef.current = null;
			}
			if (clearTimeoutRef.current != null) {
				window.clearTimeout(clearTimeoutRef.current);
				clearTimeoutRef.current = null;
			}
		};

		// Small delays smooth out rapid hover churn across nested elements.
		const SET_DELAY_MS = 35;
		const CLEAR_DELAY_MS = 140;

		const handlePointerOver = (e: PointerEvent) => {
			// Suppress: freeze current message while the cursor is over suppressed UI (e.g. tabs).
			if (e.target instanceof Element && e.target.closest(`[${SUPPRESS_ATTR}="true"]`)) {
				// Cancel any pending clear so the message doesn't disappear while hovering tabs.
				if (clearTimeoutRef.current != null) {
					window.clearTimeout(clearTimeoutRef.current);
					clearTimeoutRef.current = null;
				}
				// Cancel any pending set as well—tabs shouldn't trigger new text.
				if (setTimeoutRef.current != null) {
					window.clearTimeout(setTimeoutRef.current);
					setTimeoutRef.current = null;
				}
				return;
			}

			const next = computeDescriptionFromTarget(e.target);
			if (next === null) return;

			// Cancel any pending clear once we have a real event again.
			if (clearTimeoutRef.current != null) {
				window.clearTimeout(clearTimeoutRef.current);
				clearTimeoutRef.current = null;
			}

			// If there's no description for this target, don't immediately blank the UI.
			// Schedule a short clear instead (and cancel it if another description arrives).
			if (!next) {
				if (clearTimeoutRef.current != null) {
					window.clearTimeout(clearTimeoutRef.current);
				}
				clearTimeoutRef.current = window.setTimeout(() => {
					descriptionRef.current = '';
					setDescription('');
					clearTimeoutRef.current = null;
				}, CLEAR_DELAY_MS);
				return;
			}

			if (next === descriptionRef.current) return;

			// Debounce updates so tiny cursor movements don't spam-render.
			if (setTimeoutRef.current != null) {
				window.clearTimeout(setTimeoutRef.current);
			}
			setTimeoutRef.current = window.setTimeout(() => {
				descriptionRef.current = next;
				setDescription(next);
				setTimeoutRef.current = null;
			}, SET_DELAY_MS);
		};

		const handleFocusIn = (e: FocusEvent) => {
			if (e.target instanceof Element && e.target.closest(`[${SUPPRESS_ATTR}="true"]`)) {
				// Freeze current message on tab focus as well.
				if (clearTimeoutRef.current != null) {
					window.clearTimeout(clearTimeoutRef.current);
					clearTimeoutRef.current = null;
				}
				if (setTimeoutRef.current != null) {
					window.clearTimeout(setTimeoutRef.current);
					setTimeoutRef.current = null;
				}
				return;
			}

			const next = computeDescriptionFromTarget(e.target);
			if (next === null) return;
			clearTimers();
			descriptionRef.current = next;
			setDescription(next);
		};

		const handlePointerLeaveWindow = () => {
			clearTimers();
			descriptionRef.current = '';
			setDescription('');
		};

		document.addEventListener('pointerover', handlePointerOver, { passive: true });
		document.addEventListener('focusin', handleFocusIn);
		window.addEventListener('blur', handlePointerLeaveWindow);

		return () => {
			clearTimers();
			document.removeEventListener('pointerover', handlePointerOver);
			document.removeEventListener('focusin', handleFocusIn);
			window.removeEventListener('blur', handlePointerLeaveWindow);
		};
	}, [enabled]);

	const value = useMemo<HoverDescriptionContextValue>(
		() => ({ enabled, description }),
		[enabled, description]
	);

	return (
		<HoverDescriptionContext.Provider value={value}>{children}</HoverDescriptionContext.Provider>
	);
}

export function useHoverDescription() {
	return useContext(HoverDescriptionContext);
}


