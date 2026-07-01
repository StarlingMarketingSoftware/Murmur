import { getBookingTitlePrefixFromContactTitle, getPromotionOverlayWhatFromContactTitle, startsWithCaseInsensitive } from './searchMode';
import type { BoundingBox } from './types';

export type AllContactsOverlayFetchMode = 'all' | 'ambient';

export type AllContactsOverlayFetchPhase = 'visible' | 'buffer';

export type AllContactsOverlayFetchBbox = BoundingBox & {
	mode: AllContactsOverlayFetchMode;
	phase: AllContactsOverlayFetchPhase;
	zoom: number;
	seed: string;
};


export const AMBIENT_CONTACT_CATEGORY_TITLE_PREFIXES: readonly (readonly string[])[] = [
	['Radio Stations', 'College Radio'],
	['Wedding Planners', 'Wedding Venues'],
	['Coffee Shops'],
	['Music Festivals'],
	['Breweries', 'Distilleries', 'Wineries', 'Cideries'],
	['Music Venues'],
	['Restaurants'],
] as const;

export const RADIO_CONTACT_CATEGORY_INDEX = 0;

export const DASHBOARD_MAP_CAMERA_SCRUB_EVENT = 'murmur:dashboard-map-camera-scrub';


export type DashboardMapCameraScrubDetail = {
	progress?: number;
	// 'scrub' (default) drives the camera per-frame off a single progress value for BOTH the
	// live entry peek and the release return (the hook reverses by streaming scrub events back
	// to 0). 'commit' finalizes the camera at p=1 for the flip into interactive map mode.
	phase?: 'scrub' | 'commit';
};


export type DashboardMapCameraScrubState = {
	startCenter: [number, number];
	targetCenter: [number, number];
	startZoom: number;
	startPitch: number;
	startOffset: [number, number];
};


export const getAmbientContactCategoryIndexFromTitle = (
	title: string | null | undefined
): number => {
	if (!title) return -1;
	for (let i = 0; i < AMBIENT_CONTACT_CATEGORY_TITLE_PREFIXES.length; i += 1) {
		for (const prefix of AMBIENT_CONTACT_CATEGORY_TITLE_PREFIXES[i]) {
			if (startsWithCaseInsensitive(title, prefix)) return i;
		}
	}
	return -1;
};


export const getAmbientContactWhatFromTitle = (
	title: string | null | undefined
): string | null =>
	getBookingTitlePrefixFromContactTitle(title) ??
	getPromotionOverlayWhatFromContactTitle(title);
