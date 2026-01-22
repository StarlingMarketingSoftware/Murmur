/**
 * Campaign loading wave sync
 * --------------------------
 * The campaign page uses a page-level skeleton while large chunks load. Several real
 * components (ContactsExpandedList, ContactResearchPanel) also render "loading wave"
 * placeholders.
 *
 * When we swap from the skeleton to the real components, CSS animations normally restart,
 * which feels jumpy. We fix that by storing a shared "wave start" timestamp on `window`
 * when the skeleton mounts, then computing negative `animation-delay` values for the real
 * components so their wave phase matches what the skeleton was showing.
 */

export const CAMPAIGN_LOADING_WAVE_START_MS_KEY = '__murmurCampaignLoadingWaveStartMs';

type WindowWithCampaignWaveStart = Window & {
	[CAMPAIGN_LOADING_WAVE_START_MS_KEY]?: number;
};

export const setCampaignLoadingWaveStartNow = (): number | null => {
	if (typeof window === 'undefined') return null;
	const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
	(window as WindowWithCampaignWaveStart)[CAMPAIGN_LOADING_WAVE_START_MS_KEY] = now;
	return now;
};

export const getCampaignLoadingWaveStartMs = (): number | null => {
	if (typeof window === 'undefined') return null;
	const raw = (window as WindowWithCampaignWaveStart)[CAMPAIGN_LOADING_WAVE_START_MS_KEY];
	return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
};

/**
 * Returns elapsed seconds since the skeleton wave start, or null if the skeleton
 * hasn't set a start timestamp (meaning there is nothing to sync to).
 */
export const getCampaignLoadingWaveElapsedSeconds = (): number | null => {
	const startMs = getCampaignLoadingWaveStartMs();
	if (startMs === null) return null;
	const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
	return (nowMs - startMs) / 1000;
};

/**
 * Computes a negative `animation-delay` string that matches the wave phase at the time
 * the skeleton is swapped out.
 *
 * - `durationSeconds` should match the CSS animation duration.
 * - `index/stepSeconds` reproduce the existing "staggered wave" look.
 */
export const getSyncedWaveDelay = (params: {
	elapsedSeconds: number;
	durationSeconds: number;
	index: number;
	stepSeconds: number;
}): string => {
	const { elapsedSeconds, durationSeconds, index, stepSeconds } = params;
	if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return '0s';

	// Base stagger used throughout the app: duration - index * step.
	const baseOffset = durationSeconds - index * stepSeconds;
	const baseNorm =
		((baseOffset % durationSeconds) + durationSeconds) % durationSeconds; // [0, duration)
	const phase = (elapsedSeconds + baseNorm) % durationSeconds; // [0, duration)
	const delaySeconds = -phase; // negative delay sets initial phase
	return `${delaySeconds.toFixed(3)}s`;
};

