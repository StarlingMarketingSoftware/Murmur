'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
	computeMurmurChromeZoomForViewport,
	type MurmurChromeZoomScreen,
} from '@/utils/murmurChromeZoom';
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
//
// Large monitors get the inverse treatment: a "boost" factor (the standard
// side's murmurChromeZoom curve, normalized to its 0.92 value at the 1920×1080
// reference this chrome was designed against) simulates the root zoom the
// dashboard/campaign pages apply — the cascade runs on the boost-shrunk
// "design viewport" and every output anchor/scale is multiplied back up. The
// portal deliberately has no real root zoom (the map must stay unzoomed), so
// the simulation keeps all viewport-px and getBoundingClientRect math valid.

// murmurChromeZoom's tuned value at 1920×1080 (SIXTEEN_BY_NINE_ZOOM_MAP).
const BASELINE_CHROME_ZOOM = 0.92;

// ≥1; exactly 1 at and below the 1080p baseline so smaller viewports keep the
// shrink cascade untouched.
export function computeVenuePortalChromeBoost(
	vw: number,
	vh: number,
	screen?: MurmurChromeZoomScreen
): number {
	return Math.max(
		1,
		computeMurmurChromeZoomForViewport(vw, vh, screen) / BASELINE_CHROME_ZOOM
	);
}

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
	// Large-monitor growth factor (≥1, see computeVenuePortalChromeBoost). The
	// frames/scales below already include it; consumers that keep their own
	// native-px anchors or portaled-popup geometry (notifications panel, docked
	// chat margins, pills geometry, calendar popupScale) multiply by it.
	boost: number;
	showNotifications: boolean;
	showLeftCluster: boolean;
	bar: VenuePortalFrame; // tool tab bar
	panel: VenuePortalFrame; // chat/events/profile (781×829 native)
	createPanel: VenuePortalFrame; // create event (456×727 native)
	// Left profile/calendar/events stack (meaningful while showLeftCluster).
	cluster: VenuePortalFrame;
	// Pill stack's docked/min x — beside the left cluster while it's visible,
	// at the viewport's left margin once it isn't.
	pillsDockMinX: number;
	dockedChatScale: number;
	dockedChatVisible: boolean;
};

// Panels' shared MINIMUM anchors at the non-compact tiers (see the placement
// rationale in VenueCreateEventMapPanel: 500 clears the left cluster's ~483px
// right edge). Beyond the 1080p reference width the tool cluster drifts from
// the 500 anchor toward true horizontal center (CENTER_RAMP_START below).
const PANELS_TOP_PX = 122;
const PANELS_LEFT_BESIDE_CLUSTER_PX = 500;
const PANELS_LEFT_NO_CLUSTER_PX = 24;
// Left cluster's fixed-corner anchor (historically left-[24px] top-[56px]
// classes on the wrapper in VenuePortalClient).
const LEFT_CLUSTER_LEFT_PX = 24;
const LEFT_CLUSTER_TOP_PX = 56;
// Design-px width where the tool cluster starts centering. At the 1920×1080
// reference the centered position would already sit ~148px right of the 500
// anchor; ramping at 1 design px per extra viewport px keeps that reference
// layout pixel-identical, stays continuous on resize, and reaches true center
// by ~2215 design px (every boosted big-monitor case lands beyond that).
const CENTER_RAMP_START_DESIGN_VW_PX = 1920;
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

export function computeVenuePortalLayout(
	vw: number,
	vh: number,
	screen?: MurmurChromeZoomScreen
): VenuePortalLayout {
	const boost = computeVenuePortalChromeBoost(vw, vh, screen);
	// All cascade math below runs in the boost-shrunk design viewport; every
	// output anchor/scale is multiplied back by boost at the end. Equivalent to
	// the dashboard's root zoom for this fixed chrome — including degrading the
	// tier in a window that's small relative to its (boost-driving) screen.
	const designVw = vw / boost;
	const designVh = vh / boost;
	const tier: VenuePortalLayoutTier =
		designVw < VENUE_BP_COMPACT_PX
			? 'compact'
			: designVw < VENUE_BP_HIDE_LEFT_CLUSTER_PX
				? 'hideLeftCluster'
				: designVw < VENUE_BP_HIDE_NOTIFICATIONS_PX
					? 'hideNotifications'
					: 'full';

	let bar: VenuePortalFrame;
	let panel: VenuePortalFrame;
	let createPanel: VenuePortalFrame;
	if (tier === 'compact') {
		// Tab bar pinned to the top-left corner at its own scale — it's the page's
		// only persistent navigation here, so it must not shrink with the panel.
		const widthAvail = designVw - COMPACT_MARGIN_PX * 2;
		const barScale = Math.max(
			MIN_PANEL_SCALE,
			Math.min(VENUE_MAP_OVERLAY_SCALE, widthAvail / VENUE_MAP_TAB_BAR_NATIVE_W_PX)
		);
		const panelTop =
			COMPACT_MARGIN_PX + VENUE_MAP_TAB_BAR_NATIVE_H_PX * barScale + BAR_PANEL_SEAM_PX;
		const heightAvail = designVh - panelTop - VIEWPORT_BOTTOM_MARGIN_PX;
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
		const heightAvail = designVh - PANELS_TOP_PX - VIEWPORT_BOTTOM_MARGIN_PX;
		const panelScale = Math.max(
			MIN_PANEL_SCALE,
			Math.min(VENUE_MAP_OVERLAY_SCALE, heightAvail / VENUE_MAP_PANEL_NATIVE_H_PX)
		);
		const createScale = Math.max(
			MIN_PANEL_SCALE,
			Math.min(VENUE_MAP_OVERLAY_SCALE, heightAvail / VENUE_MAP_CREATE_NATIVE_H_PX)
		);
		// Centering targets the 781px chat/events/profile envelope (the bar widens
		// to it on those tabs); the narrower create panel and the tab bar's segment
		// row stay left-aligned to the same shared anchor, so the tabs never move
		// when switching tools — same invariant as the fixed-anchor layout.
		const centeredLeft = (designVw - VENUE_MAP_PANEL_NATIVE_W_PX * panelScale) / 2;
		const left =
			tier === 'hideLeftCluster'
				? PANELS_LEFT_NO_CLUSTER_PX
				: Math.max(
						PANELS_LEFT_BESIDE_CLUSTER_PX,
						Math.min(
							centeredLeft,
							PANELS_LEFT_BESIDE_CLUSTER_PX +
								Math.max(0, designVw - CENTER_RAMP_START_DESIGN_VW_PX)
						)
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
			(designVw -
				(panel.left + VENUE_MAP_PANEL_NATIVE_W_PX * panel.scale) -
				DOCKED_CHAT_MARGINS_PX) /
				VENUE_DOCKED_CHAT_NATIVE_W_PX
		)
	);

	// Design px → viewport px.
	const boostFrame = (frame: VenuePortalFrame): VenuePortalFrame => ({
		left: frame.left * boost,
		top: frame.top * boost,
		scale: frame.scale * boost,
	});

	return {
		tier,
		boost,
		showNotifications: tier === 'full',
		showLeftCluster,
		bar: boostFrame(bar),
		panel: boostFrame(panel),
		createPanel: boostFrame(createPanel),
		cluster: {
			left: LEFT_CLUSTER_LEFT_PX * boost,
			top: LEFT_CLUSTER_TOP_PX * boost,
			scale: VENUE_MAP_LEFT_CLUSTER_SCALE * boost,
		},
		pillsDockMinX: pillsDockMinX * boost,
		dockedChatScale: dockedChatScale * boost,
		// Legibility floor compares the RENDERED scale — a boosted strip can make
		// a design-space sliver readable.
		dockedChatVisible:
			tier !== 'compact' && dockedChatScale * boost >= VENUE_MIN_DOCKED_CHAT_SCALE,
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
		// window.screen drives the boost's resolution matching (same semantics as
		// the dashboard/campaign zoom); reading it here is safe — viewport is only
		// non-null on the client, and screen changes arrive with a resize.
		() =>
			viewport
				? computeVenuePortalLayout(viewport.vw, viewport.vh, window.screen)
				: computeVenuePortalLayout(1920, 1080),
		[viewport]
	);
}
