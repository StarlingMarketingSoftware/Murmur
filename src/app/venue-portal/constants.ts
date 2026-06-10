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
