import { HOVER_TOOLTIP_Z_INDEX } from './constants';
import { MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX, MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX, MAP_SELECT_GRAB_STACK_BOX_SIZE_PX, MAP_SELECT_GRAB_STARTER_BOX_GAP_PX, MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX, MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX, MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX } from '@/components/molecules/MapSelectGrabTool/MapSelectGrabTool';
// Multi-select action card dock layout (mirrors dashboard MapSelectGrab rail).
export const SELECTION_ACTIONS_MAP_SELECT_GRAB_LEFT_PX = 26;

export const SELECTION_ACTIONS_MAP_VIEW_SIDE_PANEL_TOP_PX = 106;

export const SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX =
	MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX +
	MAP_SELECT_GRAB_STARTER_BOX_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX +
	MAP_SELECT_GRAB_STACK_BOX_SIZE_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX +
	MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX;

export const SELECTION_ACTIONS_SHOWING_ABOVE_GRAB_ORIGIN_PX =
	SELECTION_ACTIONS_MAP_SELECT_GRAB_TOP_EXTENT_PX + 17 + 6;

export const SELECTION_ACTIONS_DOCK_RAIL_WIDTH_PX = 66;

export const SELECTION_ACTIONS_DOCK_GAP_PX = 16;

// Gap between the card and the selection's tooltip footprint when anchored.
export const SELECTION_ACTIONS_AROUND_SIDE_GAP_PX = 24;

// Conservative first-frame obstacle before the tooltip placement effect has
// published exact boxes. This prevents the card from flashing over the tooltip
// on the initial selection frame.
export const SELECTION_ACTIONS_FALLBACK_TOOLTIP_HALF_W_PX = 210;

export const SELECTION_ACTIONS_FALLBACK_TOOLTIP_ABOVE_PX = 125;

// The action card must also clear the selected marker/ring itself, not only the
// tooltip. Use a little padding because selected marker rings pulse/scale.
export const SELECTION_ACTIONS_MARKER_CLEAR_RADIUS_PX = 40;

// Continuous dock blend: the card eases from "anchored around the selection" to
// "parked by the rail" as the view zooms out and/or the selection is panned
// off-center — never a sudden snap. Fully anchored at/above the full-anchor zoom,
// fully docked at/below the full-dock zoom, linearly blended between.
export const SELECTION_ACTIONS_ANCHOR_FULL_ZOOM = 6.5;

export const SELECTION_ACTIONS_DOCK_FULL_ZOOM = 4;

// Pan blend: the cluster center stays fully anchored while inside the viewport
// inset by COMFORT_PAD; past that it ramps to fully docked over DOCK_RAMP px.
export const SELECTION_ACTIONS_PAN_COMFORT_PAD_PX = 96;

export const SELECTION_ACTIONS_PAN_DOCK_RAMP_PX = 220;

export const SELECTION_ACTIONS_VIEWPORT_MARGIN_PX = 16;

// Keep the docked card below the portaled top nav / search chrome (z-120+).
export const SELECTION_ACTIONS_MAP_VIEW_UI_SCALE = 0.85;

export const SELECTION_ACTIONS_TOP_BACKDROP_TOP_PX = 9;

export const SELECTION_ACTIONS_TOP_BACKDROP_HEIGHT_PX = 93;

export const SELECTION_ACTIONS_SEARCH_BAR_INPUT_HEIGHT_PX = 49;

export const SELECTION_ACTIONS_SEARCH_BAR_BOTTOM_INSET_PX = 4;

export const SELECTION_ACTIONS_TOP_CHROME_PAD_PX = 8;

// Above the selection tooltips (HOVER_TOOLTIP_Z_INDEX ± a few) so the card never
// hides behind them. Still inside the map subtree (body z-98), so the dashboard's
// portaled top nav / side panel (z-120+) keeps painting above it.
export const SELECTION_ACTIONS_Z_INDEX = HOVER_TOOLTIP_Z_INDEX + 12;

export const readSelectionActionsTopChromeBottomPx = (): number => {
	const scale = SELECTION_ACTIONS_MAP_VIEW_UI_SCALE;
	const searchBarTop =
		SELECTION_ACTIONS_TOP_BACKDROP_TOP_PX +
		SELECTION_ACTIONS_TOP_BACKDROP_HEIGHT_PX * scale -
		SELECTION_ACTIONS_SEARCH_BAR_BOTTOM_INSET_PX -
		SELECTION_ACTIONS_SEARCH_BAR_INPUT_HEIGHT_PX * scale;
	return (
		searchBarTop +
		SELECTION_ACTIONS_SEARCH_BAR_INPUT_HEIGHT_PX * scale +
		SELECTION_ACTIONS_TOP_CHROME_PAD_PX
	);
};
