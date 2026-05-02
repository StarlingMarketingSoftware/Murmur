import { WeatherMood } from './regions';

// Default warm "softbox key light" wash anchored to the upper-left.
// Used by all bright moods. Pairs with `mix-blend-mode: screen` (brightens).
export const SOFTBOX_WARM_KEY_BG =
	'radial-gradient(ellipse 150% 150% at -10% -10%, rgba(255, 238, 205, 0.38) 0%, rgba(255, 238, 205, 0.28) 28%, rgba(255, 238, 205, 0.16) 52%, rgba(255, 238, 205, 0.05) 78%, rgba(255, 238, 205, 0) 100%)';

// Dark pool anchored to the upper-left for storm moods. Same falloff
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
	 * canvas. 0 = current density. 1–3 = progressively denser.
	 */
	cloudExtraPasses: number;
	/**
	 * Multiplier for each extra pass' alpha. Most moods use 1 so the historical
	 * density behavior is preserved; stormy uses less so repeated structure
	 * doesn't read as stacked black sheets.
	 */
	cloudExtraPassAlpha: number;
	/**
	 * Scales the shifted extra cloud passes. Values above 1 spread repeated
	 * texture fills farther apart, making dense moods feel more dispersed.
	 */
	cloudLayerSpread: number;
	/**
	 * Grouped-mode opacity for the faster, sparser secondary cloud layer. This
	 * gives specific moods visible cloud-to-cloud layering without relying on
	 * storm wind as a proxy.
	 */
	cloudSecondaryLayerOpacity: number;
	/**
	 * Additional haze-only pass layered over the normal haze split. Used by
	 * overcast moods to make the cloud deck feel softer and more continuous.
	 */
	cloudHazeLayerOpacity: number;
	/**
	 * Extra light veil sampled from existing cloud textures, shifted separately
	 * from the main deck so cloudy can reveal a distinct high cloud layer.
	 */
	cloudFineVeilOpacity: number;
	/**
	 * Extra wind applied to storm-specific layers and turbulence. 1 preserves
	 * the normal drift field.
	 */
	cloudStormWindMultiplier: number;
	/**
	 * Localized darkening for dense storm cores. This is separate from global
	 * brightness/gloom so cloud edges can stay lighter.
	 */
	cloudCoreShadowOpacity: number;
	/**
	 * Localized lift for feathered cloud edges, keeping storm clouds from being
	 * uniformly dark.
	 */
	cloudEdgeLiftOpacity: number;
	/**
	 * Residual cloud opacity past the normal fade-out band (zoom > 10.5). Most
	 * moods set this to 0 — clouds disappear once you're at city detail. Stormy
	 * keeps a small floor so the storm "feels present" even when zoomed in.
	 */
	cloudDeepZoomOpacity: number;
	/**
	 * Snow-only world-canvas particle layer. Non-snow moods keep these at 0 so the
	 * layer can stay mounted and crossfade without affecting other moods.
	 */
	snowOpacity: number;
	snowDensity: number;
	snowFallSpeed: number;
	snowWind: number;
	snowDepthParallax: number;
	fogColor: string;
	fogHighColor: string;
	fogHorizonBlend: number;
	softboxOpacityMultiplier: number;
	shadowOpacityMultiplier: number;
	softboxBackground: string;
	softboxBlendMode: SoftboxBlendMode;
	/**
	 * Visual-only night influence. This lets storm moods borrow the darker,
	 * quieter night palette without turning on the actual night-lights overlay.
	 */
	nightVisualBlend: number;
	/**
	 * Strength of the dark "gloom wash" — a uniform multiply-blend overlay that
	 * darkens the entire viewport. Persists into city zoom (unlike the softbox
	 * + shadow overlays which fade by zoom 5), so stormy still feels
	 * overcast when the user zooms in. 0 disables it (default for bright moods).
	 */
	gloomWashOpacity: number;
	/**
	 * Whether this mood gets the warm-white "hot wash" overlay when it's >80°F.
	 * Sunny/normal: yes (clear hot day reads brighter). Cloudy/stormy/snowy:
	 * no — adding a brightening wash to overcast/wet/snowy weather looks wrong.
	 */
	hotWashEligible: boolean;
	lightning: boolean;
	lightningIntensity: number;
	lightningSpread: number;
	lightningBurstiness: number;
	lightningTint: [number, number, number];
};

const NORMAL: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.78,
	cloudOpacityDecorativeZoom: 0.66,
	cloudDriftSpeedMultiplier: 1.0,
	cloudTurbulenceMultiplier: 1.0,
	cloudBrightnessMin: 0.84,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 0,
	cloudExtraPassAlpha: 1,
	cloudLayerSpread: 1,
	cloudSecondaryLayerOpacity: 0,
	cloudHazeLayerOpacity: 0,
	cloudFineVeilOpacity: 0,
	cloudStormWindMultiplier: 1,
	cloudCoreShadowOpacity: 0,
	cloudEdgeLiftOpacity: 0,
	cloudDeepZoomOpacity: 0,
	snowOpacity: 0,
	snowDensity: 0,
	snowFallSpeed: 0,
	snowWind: 0,
	snowDepthParallax: 0,
	fogColor: 'rgba(180, 210, 215, 0.32)',
	fogHighColor: 'rgb(18, 44, 78)',
	fogHorizonBlend: 0.022,
	softboxOpacityMultiplier: 1.0,
	shadowOpacityMultiplier: 1.0,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	hotWashEligible: true,
	lightning: false,
	lightningIntensity: 0,
	lightningSpread: 0,
	lightningBurstiness: 0,
	lightningTint: [210, 232, 255],
};

const SUNNY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.32,
	cloudOpacityDecorativeZoom: 0.28,
	cloudDriftSpeedMultiplier: 0.85,
	cloudTurbulenceMultiplier: 1.0,
	cloudBrightnessMin: 0.96,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 0,
	cloudExtraPassAlpha: 1,
	cloudLayerSpread: 1,
	cloudSecondaryLayerOpacity: 0,
	cloudHazeLayerOpacity: 0,
	cloudFineVeilOpacity: 0,
	cloudStormWindMultiplier: 1,
	cloudCoreShadowOpacity: 0,
	cloudEdgeLiftOpacity: 0,
	cloudDeepZoomOpacity: 0,
	snowOpacity: 0,
	snowDensity: 0,
	snowFallSpeed: 0,
	snowWind: 0,
	snowDepthParallax: 0,
	fogColor: 'rgba(220, 215, 200, 0.16)',
	fogHighColor: 'rgb(18, 44, 78)',
	fogHorizonBlend: 0.016,
	softboxOpacityMultiplier: 1.06,
	shadowOpacityMultiplier: 0.82,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	hotWashEligible: true,
	lightning: false,
	lightningIntensity: 0,
	lightningSpread: 0,
	lightningBurstiness: 0,
	lightningTint: [210, 232, 255],
};

const CLOUDY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.94,
	cloudOpacityDecorativeZoom: 0.84,
	cloudDriftSpeedMultiplier: 0.74,
	cloudTurbulenceMultiplier: 1.24,
	cloudBrightnessMin: 0.76,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 4.35,
	cloudExtraPassAlpha: 0.62,
	cloudLayerSpread: 1.38,
	cloudSecondaryLayerOpacity: 0.32,
	cloudHazeLayerOpacity: 0.3,
	cloudFineVeilOpacity: 0.24,
	cloudStormWindMultiplier: 1,
	cloudCoreShadowOpacity: 0,
	cloudEdgeLiftOpacity: 0.1,
	cloudDeepZoomOpacity: 0.055,
	snowOpacity: 0,
	snowDensity: 0,
	snowFallSpeed: 0,
	snowWind: 0,
	snowDepthParallax: 0,
	fogColor: 'rgba(165, 180, 190, 0.46)',
	fogHighColor: 'rgb(18, 44, 78)',
	fogHorizonBlend: 0.042,
	softboxOpacityMultiplier: 0.6,
	shadowOpacityMultiplier: 1.2,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	hotWashEligible: false,
	lightning: false,
	lightningIntensity: 0,
	lightningSpread: 0,
	lightningBurstiness: 0,
	lightningTint: [210, 232, 255],
};

const STORMY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.94,
	cloudOpacityDecorativeZoom: 0.84,
	cloudDriftSpeedMultiplier: 1.6,
	cloudTurbulenceMultiplier: 2.45,
	cloudBrightnessMin: 0.48,
	cloudBrightnessMax: 0.96,
	cloudExtraPasses: 2.35,
	cloudExtraPassAlpha: 0.34,
	cloudLayerSpread: 0.92,
	cloudSecondaryLayerOpacity: 0.18,
	cloudHazeLayerOpacity: 0.06,
	cloudFineVeilOpacity: 0,
	cloudStormWindMultiplier: 1.38,
	cloudCoreShadowOpacity: 0.56,
	cloudEdgeLiftOpacity: 0.2,
	cloudDeepZoomOpacity: 0.12,
	snowOpacity: 0,
	snowDensity: 0,
	snowFallSpeed: 0,
	snowWind: 0,
	snowDepthParallax: 0,
	fogColor: 'rgba(138, 160, 178, 0.44)',
	fogHighColor: 'rgb(22, 42, 66)',
	fogHorizonBlend: 0.048,
	softboxOpacityMultiplier: 0.58,
	shadowOpacityMultiplier: 1.2,
	softboxBackground: SOFTBOX_DARK_POOL_BG,
	softboxBlendMode: 'multiply',
	// Bumped from 0.13 so the night-palette borrow actually shows up in
	// the moonlight overlay and fog/space-color tint at full daylight.
	nightVisualBlend: 0.2,
	gloomWashOpacity: 0.05,
	hotWashEligible: false,
	lightning: true,
	lightningIntensity: 1,
	lightningSpread: 0.86,
	lightningBurstiness: 0.34,
	lightningTint: [242, 246, 255],
};

const SNOWY: MoodVisualConfig = {
	cloudOpacityGlobeZoom: 0.68,
	cloudOpacityDecorativeZoom: 0.58,
	cloudDriftSpeedMultiplier: 0.6,
	cloudTurbulenceMultiplier: 0.8,
	cloudBrightnessMin: 0.92,
	cloudBrightnessMax: 1.0,
	cloudExtraPasses: 1.6,
	cloudExtraPassAlpha: 0.5,
	cloudLayerSpread: 1,
	cloudSecondaryLayerOpacity: 0,
	cloudHazeLayerOpacity: 0,
	cloudFineVeilOpacity: 0,
	cloudStormWindMultiplier: 1,
	cloudCoreShadowOpacity: 0,
	cloudEdgeLiftOpacity: 0,
	cloudDeepZoomOpacity: 0.03,
	snowOpacity: 0.94,
	snowDensity: 1,
	snowFallSpeed: 0.48,
	snowWind: 0.24,
	snowDepthParallax: 0.4,
	fogColor: 'rgba(238, 246, 252, 0.5)',
	fogHighColor: 'rgb(42, 66, 96)',
	fogHorizonBlend: 0.044,
	softboxOpacityMultiplier: 0.96,
	shadowOpacityMultiplier: 0.66,
	softboxBackground: SOFTBOX_WARM_KEY_BG,
	softboxBlendMode: 'screen',
	nightVisualBlend: 0,
	gloomWashOpacity: 0,
	hotWashEligible: false,
	lightning: false,
	lightningIntensity: 0,
	lightningSpread: 0,
	lightningBurstiness: 0,
	lightningTint: [210, 232, 255],
};

export const MOOD_CONFIG: Record<WeatherMood, MoodVisualConfig> = {
	normal: NORMAL,
	sunny: SUNNY,
	cloudy: CLOUDY,
	stormy: STORMY,
	snowy: SNOWY,
};

export function getMoodConfig(mood: WeatherMood): MoodVisualConfig {
	return MOOD_CONFIG[mood] ?? MOOD_CONFIG.normal;
}
