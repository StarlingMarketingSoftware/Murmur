import { WeatherMood } from './regions';

// Default warm "softbox key light" wash anchored to the upper-left.
// Used by all bright moods. Pairs with `mix-blend-mode: screen` (brightens).
export const SOFTBOX_WARM_KEY_BG =
	'radial-gradient(ellipse 150% 150% at -10% -10%, rgba(255, 238, 205, 0.38) 0%, rgba(255, 238, 205, 0.28) 28%, rgba(255, 238, 205, 0.16) 52%, rgba(255, 238, 205, 0.05) 78%, rgba(255, 238, 205, 0) 100%)';

// Dark pool anchored to the upper-left for storm/rain moods. Same falloff
// shape as the warm key but cool-deep colors. Pairs with `mix-blend-mode:
// multiply` so the upper-left is darkened rather than brightened — bracketing
// the existing lower-right shadow so both corners read as gloom.
export const SOFTBOX_DARK_POOL_BG =
	'radial-gradient(ellipse 150% 150% at -10% -10%, rgba(8, 12, 30, 0.55) 0%, rgba(10, 16, 36, 0.40) 28%, rgba(14, 20, 42, 0.22) 52%, rgba(18, 26, 50, 0.08) 78%, rgba(0, 0, 0, 0) 100%)';

export type SoftboxBlendMode = 'screen' | 'multiply';

export type MoodVisualConfig = {
	cloudOpacityGlobeZoom: number;
	cloudOpacityDecorativeZoom: number;
	cloudDriftSpeedMultiplier: number;
	cloudTurbulenceMultiplier: number;
	cloudBrightnessMin: number;
	cloudBrightnessMax: number;
	/**
	 * Extra pattern fills layered on top of the base/group cloud passes, each
	 * shifted by a different offset so the same texture covers more of the
	 * canvas. 0 = current density. 1–3 = progressively denser. Each pass
	 * uses the same `globalAlpha` as the underlying draw, so coverage stacks
	 * additively (no extra Mapbox layers required).
	 */
	cloudExtraPasses: number;
	/**
	 * Residual cloud opacity past the normal fade-out band (zoom > 10.5). Most
	 * moods set this to 0 — clouds disappear once you're at city detail. Stormy
	 * keeps a small floor so the storm "feels present" even when zoomed in.
	 */
	cloudDeepZoomOpacity: number;
	fogColor: string;
	fogHighColor: string;
	fogHorizonBlend: number;
	softboxOpacityMultiplier: number;
	shadowOpacityMultiplier: number;
	softboxBackground: string;
	softboxBlendMode: SoftboxBlendMode;
	/**
	 * Visual-only night influence. This lets storm/rain moods borrow the darker,
	 * quieter night palette without turning on the actual night-lights overlay.
	 */
	nightVisualBlend: number;
	/**
	 * Strength of the dark "gloom wash" — a uniform multiply-blend overlay that
	 * darkens the entire viewport. Persists into city zoom (unlike the softbox
	 * + shadow overlays which fade by zoom 5), so rainy/stormy still feel
	 * overcast when the user zooms in. 0 disables it (default for bright moods).
	 */
	gloomWashOpacity: number;
	lightning: boolean;
};

const NORMAL: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.78,
	cloudOpacityDecorativeZoom: 0.66,
	cloudDriftSpeedMultiplier: 1.0,
	cloudTurbulenceMultiplier: 1.0,
	cloudBrightnessMin: 0.84,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 0,
	cloudDeepZoomOpacity: 0,
	fogColor: 'rgba(180, 210, 215, 0.32)',
	fogHighColor: 'rgb(18, 44, 78)',
	fogHorizonBlend: 0.022,
	softboxOpacityMultiplier: 1.0,
	shadowOpacityMultiplier: 1.0,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	lightning: false,
};

const SUNNY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.45,
	cloudOpacityDecorativeZoom: 0.4,
	cloudDriftSpeedMultiplier: 0.85,
	cloudTurbulenceMultiplier: 1.0,
	cloudBrightnessMin: 0.93,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 0,
	cloudDeepZoomOpacity: 0,
	fogColor: 'rgba(220, 215, 200, 0.28)',
	fogHighColor: 'rgb(18, 44, 78)',
	fogHorizonBlend: 0.022,
	softboxOpacityMultiplier: 1.28,
	shadowOpacityMultiplier: 0.92,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	lightning: false,
};

const CLOUDY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.92,
	cloudOpacityDecorativeZoom: 0.82,
	cloudDriftSpeedMultiplier: 0.7,
	cloudTurbulenceMultiplier: 1.0,
	cloudBrightnessMin: 0.75,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 2,
	cloudDeepZoomOpacity: 0,
	fogColor: 'rgba(165, 180, 190, 0.40)',
	fogHighColor: 'rgb(18, 44, 78)',
	fogHorizonBlend: 0.035,
	softboxOpacityMultiplier: 0.6,
	shadowOpacityMultiplier: 1.2,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	lightning: false,
};

const RAINY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.95,
	cloudOpacityDecorativeZoom: 0.85,
	cloudDriftSpeedMultiplier: 1.1,
	cloudTurbulenceMultiplier: 1.2,
	cloudBrightnessMin: 0.34,
	cloudBrightnessMax: 0.9,
	cloudExtraPasses: 1,
	cloudDeepZoomOpacity: 0,
	fogColor: 'rgba(150, 175, 195, 0.40)',
	fogHighColor: 'rgb(15, 35, 65)',
	fogHorizonBlend: 0.06,
	softboxOpacityMultiplier: 1.0,
	shadowOpacityMultiplier: 1.3,
	softboxBackground: SOFTBOX_DARK_POOL_BG,
	softboxBlendMode: 'multiply',
	nightVisualBlend: 0.18,
	gloomWashOpacity: 0.22,
	lightning: false,
};

const STORMY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 1.0,
	cloudOpacityDecorativeZoom: 0.98,
	cloudDriftSpeedMultiplier: 1.5,
	cloudTurbulenceMultiplier: 2.0,
	cloudBrightnessMin: 0.58,
	cloudBrightnessMax: 0.86,
	cloudExtraPasses: 6,
	cloudDeepZoomOpacity: 0.32,
	fogColor: 'rgba(165, 184, 198, 0.42)',
	fogHighColor: 'rgb(30, 54, 82)',
	fogHorizonBlend: 0.035,
	softboxOpacityMultiplier: 1.0,
	shadowOpacityMultiplier: 1.0,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	lightning: true,
};

const SNOWY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.85,
	cloudOpacityDecorativeZoom: 0.78,
	cloudDriftSpeedMultiplier: 0.6,
	cloudTurbulenceMultiplier: 0.8,
	cloudBrightnessMin: 0.95,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 1,
	cloudDeepZoomOpacity: 0,
	fogColor: 'rgba(225, 232, 238, 0.42)',
	fogHighColor: 'rgb(35, 60, 90)',
	fogHorizonBlend: 0.035,
	softboxOpacityMultiplier: 0.95,
	shadowOpacityMultiplier: 0.78,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	lightning: false,
};

export const MOOD_CONFIG: Record<WeatherMood, MoodVisualConfig> = {
	normal: NORMAL,
	sunny: SUNNY,
	cloudy: CLOUDY,
	rainy: RAINY,
	stormy: STORMY,
	snowy: SNOWY,
};

export function getMoodConfig(mood: WeatherMood): MoodVisualConfig {
	return MOOD_CONFIG[mood] ?? MOOD_CONFIG.normal;
}
