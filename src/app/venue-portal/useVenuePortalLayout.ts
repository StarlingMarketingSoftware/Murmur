'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
	VENUE_BP_COMPACT_PX,
	VENUE_BP_HIDE_LEFT_CLUSTER_PX,
	VENUE_BP_HIDE_NOTIFICATIONS_PX,
	VENUE_DOCKED_CHAT_NATIVE_W_PX,
	VENUE_MAP_CREATE_NATIVE_H_PX,
	VENUE_MAP_CREATE_NATIVE_W_PX,
	VENUE_MAP_LEFT_CLUSTER_NATIVE_W_PX,
	VENUE_MAP_LEFT_CLUSTER_SCALE,
	VENUE_MAP_OVERLAY_SCALE,
	VENUE_MAP_PANEL_NATIVE_H_PX,
	VENUE_MAP_PANEL_NATIVE_W_PX,
	VENUE_MAP_TAB_BAR_NATIVE_H_PX,
	VENUE_MAP_TAB_BAR_NATIVE_W_PX,
	VENUE_MIN_DOCKED_CHAT_SCALE,
} from './constants';

// Responsive cascade for the desktop map view's fixed chrome. The portal's
// regions are Figma-native px boxes that scale as wholes (their interiors are
// rigid absolute layouts), so narrowing the window progressively sheds regions
// instead of reflowing them: first the notifications panel, then the left
// profile/calendar/events cluster (the center column re-anchors to the left
// edge), and at the narrowest widths only the tool tab bar + the open tool
// panel remain, the panel scaled to fill the viewport width.

export type VenuePortalLayoutTier =
	| 'full'
	| 'hideNotifications'
	| 'hideLeftCluster'
	| 'compact';

// One fixed-position chrome box: viewport-px anchor + the transform scale
// applied to its native-px contents.
export type VenuePortalFrame = { left: number; top: number; scale: number };

export type VenuePortalLayout = {
	tier: VenuePortalLayoutTier;
	showNotifications: boolean;
	showLeftCluster: boolean;
	bar: VenuePortalFrame; // tool tab bar
	panel: VenuePortalFrame; // chat/events/profile (781×829 native)
	createPanel: VenuePortalFrame; // create event (456×727 native)
	// Pill stack's docked/min x — beside the left cluster while it's visible,
	// at the viewport's left margin once it isn't.
	pillsDockMinX: number;
	dockedChatScale: number;
	dockedChatVisible: boolean;
};

// Panels' shared anchors at the non-compact tiers (see the placement rationale
// in VenueCreateEventMapPanel: 500 clears the left cluster's ~483px right edge).
const PANELS_TOP_PX = 122;
const PANELS_LEFT_BESIDE_CLUSTER_PX = 500;
const PANELS_LEFT_NO_CLUSTER_PX = 24;
const COMPACT_MARGIN_PX = 12;
const VIEWPORT_BOTTOM_MARGIN_PX = 24;
// Bar bottom → panel top seam; 122 − 8 − 36×0.8 ≈ 85, the bar's original top.
const BAR_PANEL_SEAM_PX = 8;
const PILLS_DOCK_GAP_PX = 16;
// 12px clearance from the panels' right edge + the docked chat's 12px right margin.
const DOCKED_CHAT_MARGINS_PX = 24;
// Floor for pathological viewports — a non-positive scale would collapse or
// mirror the panel instead of just rendering it small.
const MIN_PANEL_SCALE = 0.25;

export function computeVenuePortalLayout(vw: number, vh: number): VenuePortalLayout {
	const tier: VenuePortalLayoutTier =
		vw < VENUE_BP_COMPACT_PX
			? 'compact'
			: vw < VENUE_BP_HIDE_LEFT_CLUSTER_PX
				? 'hideLeftCluster'
				: vw < VENUE_BP_HIDE_NOTIFICATIONS_PX
					? 'hideNotifications'
					: 'full';

	let bar: VenuePortalFrame;
	let panel: VenuePortalFrame;
	let createPanel: VenuePortalFrame;
	if (tier === 'compact') {
		// Tab bar pinned to the top-left corner at its own scale — it's the page's
		// only persistent navigation here, so it must not shrink with the panel.
		const widthAvail = vw - COMPACT_MARGIN_PX * 2;
		const barScale = Math.max(
			MIN_PANEL_SCALE,
			Math.min(VENUE_MAP_OVERLAY_SCALE, widthAvail / VENUE_MAP_TAB_BAR_NATIVE_W_PX)
		);
		const panelTop =
			COMPACT_MARGIN_PX + VENUE_MAP_TAB_BAR_NATIVE_H_PX * barScale + BAR_PANEL_SEAM_PX;
		const heightAvail = vh - panelTop - VIEWPORT_BOTTOM_MARGIN_PX;
		bar = { left: COMPACT_MARGIN_PX, top: COMPACT_MARGIN_PX, scale: barScale };
		// Wide panels fill the viewport width (slightly above the 0.8 overlay scale
		// just under the breakpoint, per the Figma mock); the narrower create panel
		// caps at its normal 0.8 so the form doesn't blow up past its desktop size.
		panel = {
			left: COMPACT_MARGIN_PX,
			top: panelTop,
			scale: Math.max(
				MIN_PANEL_SCALE,
				Math.min(
					widthAvail / VENUE_MAP_PANEL_NATIVE_W_PX,
					heightAvail / VENUE_MAP_PANEL_NATIVE_H_PX
				)
			),
		};
		createPanel = {
			left: COMPACT_MARGIN_PX,
			top: panelTop,
			scale: Math.max(
				MIN_PANEL_SCALE,
				Math.min(
					VENUE_MAP_OVERLAY_SCALE,
					widthAvail / VENUE_MAP_CREATE_NATIVE_W_PX,
					heightAvail / VENUE_MAP_CREATE_NATIVE_H_PX
				)
			),
		};
	} else {
		const left =
			tier === 'hideLeftCluster'
				? PANELS_LEFT_NO_CLUSTER_PX
				: PANELS_LEFT_BESIDE_CLUSTER_PX;
		const heightAvail = vh - PANELS_TOP_PX - VIEWPORT_BOTTOM_MARGIN_PX;
		const panelScale = Math.max(
			MIN_PANEL_SCALE,
			Math.min(VENUE_MAP_OVERLAY_SCALE, heightAvail / VENUE_MAP_PANEL_NATIVE_H_PX)
		);
		const createScale = Math.max(
			MIN_PANEL_SCALE,
			Math.min(VENUE_MAP_OVERLAY_SCALE, heightAvail / VENUE_MAP_CREATE_NATIVE_H_PX)
		);
		// The bar tracks the wide panels' scale and keeps a constant seam above
		// their top edge, so bar and panel stay flush when height-fit kicks in.
		bar = {
			left,
			top: PANELS_TOP_PX - BAR_PANEL_SEAM_PX - VENUE_MAP_TAB_BAR_NATIVE_H_PX * panelScale,
			scale: panelScale,
		};
		panel = { left, top: PANELS_TOP_PX, scale: panelScale };
		createPanel = { left, top: PANELS_TOP_PX, scale: createScale };
	}

	const showLeftCluster = tier === 'full' || tier === 'hideNotifications';
	const pillsDockMinX = showLeftCluster
		? PANELS_LEFT_NO_CLUSTER_PX +
			VENUE_MAP_LEFT_CLUSTER_NATIVE_W_PX * VENUE_MAP_LEFT_CLUSTER_SCALE +
			PILLS_DOCK_GAP_PX
		: PANELS_LEFT_NO_CLUSTER_PX;
	// Never overlap the centered tool panels: fill the strip between their live
	// right edge and the viewport's, up to the corner clusters' preferred 0.7.
	const dockedChatScale = Math.min(
		VENUE_MAP_LEFT_CLUSTER_SCALE,
		Math.max(
			0,
			(vw -
				(panel.left + VENUE_MAP_PANEL_NATIVE_W_PX * panel.scale) -
				DOCKED_CHAT_MARGINS_PX) /
				VENUE_DOCKED_CHAT_NATIVE_W_PX
		)
	);

	return {
		tier,
		showNotifications: tier === 'full',
		showLeftCluster,
		bar,
		panel,
		createPanel,
		pillsDockMinX,
		dockedChatScale,
		dockedChatVisible:
			tier !== 'compact' && dockedChatScale >= VENUE_MIN_DOCKED_CHAT_SCALE,
	};
}

// Pre-paint on the client, no-op on the server (same idiom as VenuePortalClient) —
// the first chrome-bearing frame must already have the real viewport's tier.
const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useVenuePortalLayout(): VenuePortalLayout {
	// null until the first client layout effect — the SSR/hydration markup never
	// contains tier-dependent chrome (it's all gated on isMobile === false, which
	// resolves post-mount), so the placeholder frames are never painted.
	const [viewport, setViewport] = useState<{ vw: number; vh: number } | null>(null);
	useIsomorphicLayoutEffect(() => {
		const update = () =>
			setViewport({ vw: window.innerWidth, vh: window.innerHeight });
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, []);
	return useMemo(
		() => computeVenuePortalLayout(viewport?.vw ?? 1920, viewport?.vh ?? 1080),
		[viewport]
	);
}
