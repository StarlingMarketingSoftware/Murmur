import { profileGenreOptionRows } from '@/components/molecules/HybridPromptInput/profileFieldIcons';

export const VENUE_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
	const hours = Math.floor(index / 2);
	const minutes = index % 2 === 0 ? 0 : 30;
	const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
	const hour12 = hours % 12 || 12;
	const minuteLabel = String(minutes).padStart(2, '0');
	const meridiem = hours < 12 ? 'am' : 'pm';
	const label = `${hour12}:${minuteLabel} ${meridiem}`;

	return { value, label };
});

export const PROFILE_GENRE_OPTIONS = profileGenreOptionRows.flat();

// The dashboard calendar's native outer width (7 × 94.542px cells + 8px padding);
// venue map panels scale against it. See VENUE_CALENDAR_SCALE / VENUE_CREATE_EVENT_CALENDAR_SCALE.
export const DASHBOARD_CALENDAR_NATIVE_WIDTH_PX = 669.794;
export const VENUE_MAP_OVERLAY_SCALE = 0.8;
// Scale for the map view's corner clusters (left profile/calendar/events stack
// and the right notifications panel).
export const VENUE_MAP_LEFT_CLUSTER_SCALE = 0.7;

// Zoom for the map view's entry camera, centered on the venue's home icon —
// frames a few neighboring states around the venue (~600mi tall viewport).
export const VENUE_MAP_ENTRY_ZOOM = 6.2;

// Native (pre-scale) footprints of the map view's fixed chrome, used by
// useVenuePortalLayout to compute the responsive frames. Keep in sync with the
// w-/h- classes on each component's root.
export const VENUE_MAP_PANEL_NATIVE_W_PX = 781; // chat/events/profile panels
export const VENUE_MAP_PANEL_NATIVE_H_PX = 829;
export const VENUE_MAP_CREATE_NATIVE_W_PX = 456; // create-event panel
export const VENUE_MAP_CREATE_NATIVE_H_PX = 727;
export const VENUE_MAP_TAB_BAR_NATIVE_W_PX = 461; // tool tab bar (segment row)
export const VENUE_MAP_TAB_BAR_NATIVE_H_PX = 36;
export const VENUE_MAP_LEFT_CLUSTER_NATIVE_W_PX = 656; // profile/calendar/events stack
export const VENUE_DOCKED_CHAT_NATIVE_W_PX = 515;

// Width tiers for the map view's responsive cascade, in DESIGN px — on boosted
// large monitors useVenuePortalLayout compares them against the boost-shrunk
// design viewport, not the raw one. Derivations (rendered px at boost 1):
//   hide notifications: panels' right edge 500 + 781×0.8 (=1124.8) + 12 clearance
//     + notifications 431×0.7 (=301.7) + 24 right margin ≈ 1462.5
//   hide left cluster:  500 + 781×0.8 + 24 right margin ≈ 1148.8
//   compact:            24 + 781×0.8 + 24 ≈ 672.8
export const VENUE_BP_HIDE_NOTIFICATIONS_PX = 1464;
export const VENUE_BP_HIDE_LEFT_CLUSTER_PX = 1150;
export const VENUE_BP_COMPACT_PX = 675;

// Below this the docked corner chat is too small to read (and, mounted, would
// still mark its thread read) — the parent unmounts it instead of rendering it.
export const VENUE_MIN_DOCKED_CHAT_SCALE = 0.3;
