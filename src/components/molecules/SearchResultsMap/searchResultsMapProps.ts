import { CampaignContactMapStatus, DashboardDraftingMapContactStatus } from './markerStatusStyles';
import { MapEvent, OwnedVenueLocation } from './radarOverlays';
import type { AreaSelectPayload, GlobeNightLightingLike, LatLngLiteral, MapSelectionBounds, MarkerHoverMeta } from './types';
import { WeatherMood } from '@/lib/weather/regions';
import { ContactWithName } from '@/types/contact';
import type { ReactNode } from 'react';

export interface SearchResultsMapProps {
	contacts: ContactWithName[];
	selectedContacts: number[];
	/** Full objects for the selected contacts, so halos persist even when those contacts
	 *  are not in `contacts`/overlays (e.g. after disengaging search to the ambient atlas). */
	selectedContactObjects?: ContactWithName[];
	/** When set, highlights the corresponding marker as hovered (e.g. hovering a row in the map results panel). */
	externallyHoveredContactId?: number | null;
	/** Full search query string (e.g. "[Booking] Music Venues (Portland, ME)") */
	searchQuery?: string | null;
	/** Used to color the default (unselected) result dots by the active "What" search value. */
	searchWhat?: string | null;
	/** When false, keeps contacts/results available but hides search-specific geography (blobs/outlines/locked areas). */
	searchEngaged?: boolean;
	/** When true, connects result dots by category even without an active search query. */
	categoryConstellationsEnabled?: boolean;
	/** When true, renders the persistent selected-contact SVG labels without requiring the Search action card. */
	showSelectedContactTooltips?: boolean;
	/** Campaign overview marker mode. Category mode preserves the normal category-colored markers. */
	campaignMarkerMode?: 'category' | 'status';
	/** Per-contact campaign status used when `campaignMarkerMode` is `status`. */
	campaignContactStatusById?: ReadonlyMap<number, CampaignContactMapStatus>;
	/**
	 * Dashboard search-tab write workflow status for selected contacts. When present, the
	 * selected marker artwork + selected tooltips are recolored for queued/drafting/drafted
	 * progress and automatically fall back to normal selection UI when omitted/empty.
	 */
	dashboardDraftingContactStatusById?: ReadonlyMap<
		number,
		DashboardDraftingMapContactStatus
	>;
	/**
	 * Tint for the campaign selection heatmap glow (rendered behind the status
	 * pins). `null`/absent disables the glow. Only takes effect in
	 * `campaignMarkerMode === 'status'`.
	 */
	campaignHeatmapColor?: string | null;
	/** Optional per-status tints for the campaign heatmap glow. */
	campaignHeatmapStatusColors?: Readonly<Record<CampaignContactMapStatus, string>>;
	/**
	 * When true, the heatmap glow shows the whole tab set while nothing is
	 * selected. When false/absent, the glow is selection-only and stays hidden
	 * until contacts are selected.
	 */
	campaignHeatmapAmbient?: boolean;
	/** Real contacts from the active campaign, rendered as a subtle non-interactive footprint under search results. */
	campaignFootprintContacts?: ContactWithName[];
	/**
	 * Changes when the persistent singleton map is handed to a different route host.
	 * Used to synchronously clear imperative Mapbox overlays from the previous host
	 * before the next route paints.
	 */
	transientOverlayResetKey?: string | number | null;
	/** When true, renders a browse-oriented all-contact atlas while search results are visually disengaged. */
	ambientContactsEnabled?: boolean;
	/** When true, warms the ambient atlas cache before the user disengages the search. */
	ambientContactsPreloadEnabled?: boolean;
	/** Per-category ambient visibility, ordered like the map grab-category stack. */
	ambientActiveCategories?: readonly boolean[];
	/** Ambient visibility for contacts that do not map to a known category. */
	ambientUncategorizedActive?: boolean;
	/** Increment to ask the map to refit to the active search without changing the query/results. */
	autoFitRequestNonce?: number;
	/**
	 * Bump to request that the *next* auto-fit be applied instantly (duration 0) instead of an
	 * animated ease/fly. Consumed once per distinct value; later fits animate normally. Used for the
	 * campaign-tab → dashboard-search transition, which must land without a pan or globe flash.
	 */
	instantAutoFitNonce?: number;
	/** Empty-map hover prompt. When present, an empty map click calls `onEmptyMapClick`. */
	emptyMapClickPrompt?: string | null;
	onEmptyMapClick?: () => void;
	/** When set, shows a persistent outline of the selected search area. */
	selectedAreaBounds?: MapSelectionBounds | null;
	/**
	 * Called as soon as the user starts interacting with the viewport (drag/zoom).
	 * Useful for dismissing transient UI (e.g. "Search this area" CTA).
	 */
	onViewportInteraction?: () => void;
	/**
	 * Called during live zoom gestures so parent UI can track the camera without
	 * waiting for Mapbox's `moveend`.
	 */
	onViewportZoom?: (zoom: number) => void;
	/**
	 * Called when the viewport becomes idle after panning/zooming (Mapbox `moveend`).
	 * Useful for syncing viewport-derived state in the parent.
	 */
	onViewportIdle?: (payload: {
		bounds: MapSelectionBounds;
		center: LatLngLiteral;
		zoom: number;
		isCenterInSearchArea: boolean;
	}) => void;
	/** Dashboard/tooling mode (e.g. `"select"` enables rectangle selection). */
	activeTool?: string | null;
	/** Imperative zoom request from dashboard map chrome. */
	requestedZoom?: { zoom: number; nonce: number; isDragging?: boolean } | null;
	/** Changes when the dashboard triggers "select all in view". */
	selectAllInViewNonce?: number;

	onAreaSelect?: (bounds: MapSelectionBounds, payload?: AreaSelectPayload) => void;

	onVisibleOverlayContactsChange?: (contacts: ContactWithName[]) => void;
	onMarkerClick?: (contact: ContactWithName) => void;
	onMarkerHover?: (contact: ContactWithName | null, meta?: MarkerHoverMeta) => void;
	onToggleSelection?: (contactId: number) => void;
	/**
	 * Multi-select action card (dashboard search map). When >= 1 contacts are
	 * selected, a floating card offers these actions. While the selection is
	 * on-screen at street zoom it tracks the top-most dot; otherwise it docks
	 * beside the left "Showing" rail (venue-portal pill pattern). Providing
	 * `onAddSelectionToFolder` opts a host into showing the card.
	 */
	onAddSelectionToFolder?: () => void;
	onWriteSelectionMessage?: () => void;
	onStateSelect?: (stateName: string) => void;
	enableStateInteractions?: boolean;
	lockedStateName?: string | null;
	/** When true, hides the state outlines (useful while search is loading). */
	isLoading?: boolean;
	/**
	 * Reports viewport-driven overlay contact fetches (for example when panning or
	 * zooming into a new area) so host chrome can show a lightweight loading state.
	 */
	onOverlayBusyChange?: (busy: boolean) => void;
	/**
	 * Reports map readiness: called with true once Mapbox's `load` event fires (style + first
	 * render complete), and with false on map teardown/recreate or unmount.
	 */
	onMapLoadedChange?: (loaded: boolean) => void;
	/**
	 * Reports the earlier "globe silhouette ready" stage: true once the style is in
	 * and the world-land fill has painted (cream continents on ocean blue) — usually
	 * well before the full `load` event — and false on teardown/recreate or unmount.
	 * Hosts can drop boot masks on this and let street detail stream in behind.
	 */
	onMapFirstPaintChange?: (painted: boolean) => void;
	/**
	 * Reports the *computed* interactive zoom floor: desktop MAP_MIN_ZOOM plus the
	 * viewport-proportional delta (large monitors), mobile MOBILE_MAP_MIN_ZOOM.
	 * Fires when the value changes AND when the callback attaches (the persistent
	 * singleton map outlives route handoffs, so host pages attach this after map
	 * mount and need the current floor immediately). Never reports the transient
	 * relaxed floors used during background→interactive camera sweeps.
	 */
	onInteractiveMinZoomChange?: (minZoom: number) => void;
	/**
	 * When true, disables the base-dot "wave reveal" animation.
	 * Useful in fullscreen/cinematic map transitions where hiding dots causes visible flicker.
	 */
	disableDotWaveReveal?: boolean;
	/** When true, the dashboard's disengaged/general ambient map overlay can use the
	 *  lightweight Airbnb-style compact pill UI. Active search result markers are
	 *  intentionally not affected. Kept opt-in so campaign/venue surfaces preserve
	 *  their existing marker behavior. */
	lightweightSearchOverlayEnabled?: boolean;
	/** When true, the currently engaged search is a curated/"For You" blob search (not a bbox
	 *  "Search this area" or state-lock search). Lets the lightweight ambient overlay render
	 *  OUTSIDE the curated blob while the search stays engaged, and swaps the empty-map prompt
	 *  for a perimeter-only "Disengage search" affordance. */
	curatedBlobSearchActive?: boolean;
	/** When true, the currently engaged search is a category search scoped to a US state
	 *  (e.g. "Wine, Beer, and Spirits in Pennsylvania"). Gives the locked-state outline the
	 *  same treatment as the curated blob: the lightweight ambient overlay renders OUTSIDE the
	 *  state polygon and the empty-map prompt becomes a perimeter-only "Disengage search"
	 *  affordance. ANDed map-side with `hasLockedStateOutline` so it stays inert until the
	 *  state polygon is actually drawn. */
	stateCategorySearchActive?: boolean;
	/** When true, prevents the map from auto-zooming to fit contacts or the locked state. */
	skipAutoFit?: boolean;
	/**
	 * Optional Mapbox camera padding (in px). Useful for layouts where UI covers part
	 * of the map (e.g. a right-side panel) and the map should behave as if that area
	 * is not available.
	 */
	cameraPadding?: {
		top?: number;
		right?: number;
		bottom?: number;
		left?: number;
	} | null;
	/**
	 * Optional padding (in px) for auto-fit camera moves (fitBounds). Use when fixed UI
	 * chrome overlays the map (e.g. the mobile search view) so fitted results land in
	 * the uncovered area. Clamped to the canvas size so Mapbox's "cannot fit" bail is
	 * unreachable on small viewports. Defaults preserve the historical insets
	 * (50px contacts / 100px state).
	 */
	autoFitPadding?: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	} | null;
	/**
	 * Controls whether the map should behave like a decorative dashboard background (no interactions,
	 * optional auto-rotation), or the full interactive results map.
	 */
	presentation?: 'background' | 'interactive';
	/**
	 * When true (interactive presentation only), deep zoom transitions the camera into a
	 * pitched street-level 3D view with extruded buildings, and marker hover shows the
	 * rich research card instead of the slim tooltip. Opt-in so only the dashboard
	 * map-search surface gets it (not campaign/venue/mobile maps).
	 */
	streetViewEnabled?: boolean;
	/** When true (and `presentation="background"`), auto-rotate the globe. */
	autoSpin?: boolean;
	/**
	 * Drives the globe's atmospheric mood (clouds, fog, lighting, precipitation).
	 * Defaults to `"normal"` which preserves the historical visual tuning.
	 */
	weatherMood?: WeatherMood;
	/**
	 * Approximate center of the region driving `weatherMood`. Storm lightning is
	 * localized around this point instead of spawning globally.
	 */
	weatherRegionCenter?: LatLngLiteral | null;
	/**
	 * Current Fahrenheit temperature for the user's region. When > 80°F and the
	 * active mood uses a bright (screen-blend) softbox, the globe gets a small
	 * additional brightness lift so hot weather "feels hot."
	 */
	weatherTemperatureF?: number | null;
	/**
	 * 0 = full day, 1 = deep night. Drives the moonlit rear-lighting overlay
	 * system so night feels organic (not a basemap "dark mode" toggle).
	 */
	nightT?: number | null;
	/**
	 * Full sun-phase timing for globe lighting. When present, the daytime shade
	 * uses this to drift slowly from sunrise to sunset.
	 */
	nightLighting?: GlobeNightLightingLike | null;
	/**
	 * Radius-search overlay. When set, draws a translucent circle (white ring +
	 * faint fill) of `radiusMiles` around `center` plus a draggable red center pin.
	 * Null clears the overlay. `radiusMiles` should be the committed search radius,
	 * not a draft slider value.
	 */
	radiusOverlay?: { center: LatLngLiteral; radiusMiles: number } | null;
	/**
	 * Suppresses viewport-wide contextual contact overlays (booking extras,
	 * promotion pins, and close-zoom all-contact dots) without drawing the radius
	 * circle. Used while a radius search is pending: the committed `radiusOverlay`
	 * intentionally stays null until results resolve, but the old contextual
	 * overlays must already be hidden.
	 */
	suppressContextualContactOverlays?: boolean;
	/** Called when the user drops the draggable radius center pin at a new location. */
	onRadiusCenterChange?: (center: LatLngLiteral) => void;
	/**
	 * Radius-center placement mode. When true, the map locks the same red radius pin
	 * used by the dropped-center UI (plus a live preview circle sized to
	 * `radiusPlacementMiles`) to the cursor so the user can click anywhere to choose
	 * the search center — instead of the app assuming the user's closest location.
	 * Panning still works; a click that isn't a drag commits via `onRadiusPlace`.
	 * ESC (or the parent toggling this off) cancels.
	 */
	radiusPlacementActive?: boolean;
	/** Draft radius (miles) for the placement preview circle. */
	radiusPlacementMiles?: number;
	/** Fires with the chosen center when the user clicks to place the radius. */
	onRadiusPlace?: (center: LatLngLiteral) => void;
	/** Fires when the user cancels placement from within the map (e.g. ESC). */
	onRadiusPlacementCancel?: () => void;
	/** Current venue account location; draws the map-anchored home/radar overlay. */
	ownedVenueLocation?: OwnedVenueLocation | null;
	/**
	 * Camera target for entering interactive mode. When set, the background →
	 * interactive reveal snaps straight here (no zoom-in sweep) instead of gliding
	 * to the neutral handoff target derived from the decorative globe framing. A
	 * value that resolves or changes shortly after the reveal (e.g. the venue save
	 * is still refetching as the portal flips views) still snaps into place — until
	 * the user moves the camera themselves, after which it is never overridden.
	 */
	interactiveEntryCamera?: { center: LatLngLiteral; zoom: number } | null;
	/** Reports the owned-venue home icon's projected position in viewport px on every
	 *  camera move/resize. Null when there is no valid venue location, the map is not
	 *  loaded, or on teardown. `isOnScreen` is false when the icon is outside the
	 *  viewport (40px pad) or occluded behind the globe at low zoom. */
	onOwnedVenueAnchorChange?: (
		anchor: { x: number; y: number; isOnScreen: boolean; zoom: number } | null
	) => void;
	/** Venue-posted events to draw as radar opportunity markers (red star + radar). */
	events?: MapEvent[];
	/** Pixels along the right edge obstructed by host UI (e.g. the search-results panel).
	 *  The event popup places to the right of a marker only when it clears this region,
	 *  flipping left otherwise. */
	rightSafeAreaPx?: number;
	/** Renders the content inside an event popup's white inner box for the active event.
	 *  The map owns the popup container + positioning; the host owns the event card. */
	renderEventPopupContent?: (eventId: number) => ReactNode;
	/** When true, hides and resets event popups while a higher-level modal owns pointer flow. */
	suppressEventPopups?: boolean;
}


// Identity key for an interactive entry camera, so a refetch that re-delivers the
// same values (new object identity) is distinguishable from actually-new values.
export const interactiveEntryCameraKey = (
	camera: SearchResultsMapProps['interactiveEntryCamera']
) => (camera ? `${camera.center.lat},${camera.center.lng},${camera.zoom}` : null);
