'use client';

import { useLayoutEffect, useRef } from 'react';
import { VenuePortalAddIcon } from '@/components/atoms/_svg/VenuePortalAddIcon';
import { VenuePortalChatIcon } from '@/components/atoms/_svg/VenuePortalChatIcon';
import { VenuePortalEventsIcon } from '@/components/atoms/_svg/VenuePortalEventsIcon';
import { VenuePortalProfileIcon } from '@/components/atoms/_svg/VenuePortalProfileIcon';

// The map reports the owned-venue home icon's projected viewport position on every
// camera frame (see SearchResultsMap's onOwnedVenueAnchorChange). The store keeps
// those 60fps updates out of React state so only this component's DOM moves.
export type VenueIconAnchor = {
	x: number;
	y: number;
	isOnScreen: boolean;
	zoom: number;
};

export type VenueIconAnchorStore = {
	get: () => VenueIconAnchor | null;
	set: (anchor: VenueIconAnchor | null) => void;
	subscribe: (listener: () => void) => () => void;
};

export function createVenueIconAnchorStore(): VenueIconAnchorStore {
	let current: VenueIconAnchor | null = null;
	const listeners = new Set<() => void>();
	return {
		get: () => current,
		set: (anchor) => {
			current = anchor;
			listeners.forEach((listener) => listener());
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

// Pill geometry from the Figma mock (native px). The stack renders scaled down by
// the same chrome scale as the profile-card/calendar cluster so it sits proportionate
// to the rest of the map UI.
const PILL_W = 196;
const PILL_H = 52.657;
const PILL_GAP = 22;
const STACK_H = PILL_H * 4 + PILL_GAP * 3;
// Horizontal gap from the home icon's center to the stack's right edge.
const ICON_GAP = 64;
const VIEWPORT_MARGIN = 16;
// Vertical docked resting spot when the home icon is off-screen; the docked x
// is the dockMinX prop (just right of the left cluster while it's visible, the
// viewport's left margin once the responsive cascade hides it).
const DOCKED_TOP = 120;
// Below this zoom the view is continent/globe scale and the home icon no longer has
// a meaningful neighborhood — dock instead of chasing the icon across the viewport.
// (Map min zoom is 2.25; the venue entry camera lands at 6.2.)
const ANCHOR_MIN_ZOOM = 4;

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), Math.max(min, max));

export function VenueMapActionPills({
	anchorStore,
	selectedTool,
	onToolSelect,
	unreadCount,
	clusterScale,
	dockMinX,
}: {
	anchorStore: VenueIconAnchorStore;
	selectedTool: 'add' | 'profile' | 'mail' | 'events' | null;
	onToolSelect: (tool: 'add' | 'profile' | 'mail' | 'events') => void;
	unreadCount: number;
	clusterScale: number;
	dockMinX: number;
}) {
	const wrapperRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;

		let transitionTimeout: number | null = null;
		let wasAnchored: boolean | null = null;

		const place = () => {
			const anchor = anchorStore.get();
			const vw = window.innerWidth;
			const vh = window.innerHeight;
			// Rendered footprint after the chrome scale.
			const stackW = PILL_W * clusterScale;
			const stackH = STACK_H * clusterScale;
			const minX = dockMinX;
			const maxX = vw - stackW - VIEWPORT_MARGIN;
			const isAnchored =
				anchor != null && anchor.isOnScreen && anchor.zoom >= ANCHOR_MIN_ZOOM;

			let x: number;
			let y: number;
			if (isAnchored) {
				x = clamp(anchor.x - ICON_GAP - stackW, minX, maxX);
				y = clamp(anchor.y - stackH / 2, VIEWPORT_MARGIN, vh - stackH - VIEWPORT_MARGIN);
			} else {
				x = minX;
				y = DOCKED_TOP;
			}

			// Rigid tracking while anchored (a persistent transition would retarget every
			// move frame and make the stack swim behind the icon); ease only the discrete
			// anchored <-> docked jumps.
			if (wasAnchored !== null && wasAnchored !== isAnchored) {
				el.style.transition = 'transform 280ms ease';
				if (transitionTimeout != null) window.clearTimeout(transitionTimeout);
				transitionTimeout = window.setTimeout(() => {
					el.style.transition = '';
					transitionTimeout = null;
				}, 300);
			}
			wasAnchored = isAnchored;
			el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scale(${clusterScale})`;
		};

		place();
		const unsubscribe = anchorStore.subscribe(place);
		window.addEventListener('resize', place);
		return () => {
			unsubscribe();
			window.removeEventListener('resize', place);
			if (transitionTimeout != null) window.clearTimeout(transitionTimeout);
		};
	}, [anchorStore, clusterScale, dockMinX]);

	const pillClassName =
		'pointer-events-auto flex h-[52.657px] w-[196px] cursor-pointer items-center gap-[14px] rounded-[23.022px] bg-white pl-[20px] opacity-[0.81]';
	const labelClassName =
		'font-inter text-[22px] font-semibold leading-none text-black/40';

	return (
		<div
			ref={wrapperRef}
			className="pointer-events-none fixed left-0 top-0 z-[100] flex w-[196px] origin-top-left flex-col gap-[22px] will-change-transform"
		>
			<button
				type="button"
				aria-label="Create"
				aria-pressed={selectedTool === 'add'}
				onClick={() => onToolSelect('add')}
				className={pillClassName}
			>
				<VenuePortalAddIcon
					selected={selectedTool === 'add'}
					className="h-[30px] w-auto shrink-0"
				/>
				<span className={labelClassName}>Create</span>
			</button>
			<button
				type="button"
				aria-label="Chat"
				aria-pressed={selectedTool === 'mail'}
				onClick={() => onToolSelect('mail')}
				className={pillClassName}
			>
				<span className="relative flex shrink-0 items-center justify-center">
					<VenuePortalChatIcon
						selected={selectedTool === 'mail'}
						className="h-[30px] w-auto"
					/>
					{unreadCount > 0 && (
						<span className="pointer-events-none absolute -right-[5px] -top-[5px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#2F6FED] px-[3px] text-[9px] font-semibold leading-none text-white">
							{unreadCount > 99 ? '99+' : unreadCount}
						</span>
					)}
				</span>
				<span className={labelClassName}>Chat</span>
			</button>
			<button
				type="button"
				aria-label="Events"
				aria-pressed={selectedTool === 'events'}
				onClick={() => onToolSelect('events')}
				className={pillClassName}
			>
				<VenuePortalEventsIcon
					selected={selectedTool === 'events'}
					className="h-[30px] w-auto shrink-0"
				/>
				<span className={labelClassName}>Events</span>
			</button>
			<button
				type="button"
				aria-label="Profile"
				aria-pressed={selectedTool === 'profile'}
				onClick={() => onToolSelect('profile')}
				className={pillClassName}
			>
				<VenuePortalProfileIcon
					selected={selectedTool === 'profile'}
					className="h-[30px] w-auto shrink-0"
				/>
				<span className={labelClassName}>Profile</span>
			</button>
		</div>
	);
}
