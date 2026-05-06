import type { MoodVisualConfig } from '@/lib/weather/moodConfig';
import { mixCssColorString } from './color';
import { clamp, lerp } from './math';
import type { RuntimeMoodVisualConfig } from './types';

// Visual night never goes below the mood's `nightVisualBlend` floor — stormy,
// for example, lifts the perceived "night" even at noon so the basemap reads
// as overcast.
export const computeMoodVisualNightT = (nightT: number, cfg: MoodVisualConfig) =>
	clamp(Math.max(nightT, cfg.nightVisualBlend), 0, 1);

// `MoodVisualConfig` only knows the chosen blend mode for the softbox. The
// runtime needs a per-mode opacity multiplier so we can crossfade between
// screen-blend and multiply-blend variants without swapping `mix-blend-mode`.
export const toRuntimeMoodConfig = (cfg: MoodVisualConfig): RuntimeMoodVisualConfig => ({
	...cfg,
	warmSoftboxOpacityMultiplier:
		cfg.softboxBlendMode === 'screen' ? cfg.softboxOpacityMultiplier : 0,
	darkSoftboxOpacityMultiplier:
		cfg.softboxBlendMode === 'multiply' ? cfg.softboxOpacityMultiplier : 0,
	lightningIntensity: cfg.lightning ? cfg.lightningIntensity : 0,
});

// Continuous (`c`) animates smoothly across the transition; discrete (`d`)
// snaps for things that don't lerp gracefully (extra-pass count, snow density,
// lightning flag). Anything tied to draw-loop appearance gets `c`; anything
// tied to system enable/disable gets `d`.
export const blendRuntimeMoodConfig = (
	from: RuntimeMoodVisualConfig,
	to: RuntimeMoodVisualConfig,
	continuousT: number,
	discreteT: number
): RuntimeMoodVisualConfig => {
	const c = clamp(continuousT, 0, 1);
	const d = clamp(discreteT, 0, 1);

	return {
		...to,
		cloudOpacityGlobeZoom: lerp(from.cloudOpacityGlobeZoom, to.cloudOpacityGlobeZoom, c),
		cloudOpacityDecorativeZoom: lerp(
			from.cloudOpacityDecorativeZoom,
			to.cloudOpacityDecorativeZoom,
			c
		),
		cloudDriftSpeedMultiplier: lerp(
			from.cloudDriftSpeedMultiplier,
			to.cloudDriftSpeedMultiplier,
			c
		),
		cloudTurbulenceMultiplier: lerp(
			from.cloudTurbulenceMultiplier,
			to.cloudTurbulenceMultiplier,
			c
		),
		cloudBrightnessMin: lerp(from.cloudBrightnessMin, to.cloudBrightnessMin, c),
		cloudBrightnessMax: lerp(from.cloudBrightnessMax, to.cloudBrightnessMax, c),
		cloudExtraPasses: lerp(from.cloudExtraPasses, to.cloudExtraPasses, d),
		cloudExtraPassAlpha: lerp(from.cloudExtraPassAlpha, to.cloudExtraPassAlpha, c),
		cloudLayerSpread: lerp(from.cloudLayerSpread, to.cloudLayerSpread, c),
		cloudSecondaryLayerOpacity: lerp(
			from.cloudSecondaryLayerOpacity,
			to.cloudSecondaryLayerOpacity,
			c
		),
		cloudHazeLayerOpacity: lerp(from.cloudHazeLayerOpacity, to.cloudHazeLayerOpacity, c),
		cloudFineVeilOpacity: lerp(
			from.cloudFineVeilOpacity,
			to.cloudFineVeilOpacity,
			c
		),
		cloudStormWindMultiplier: lerp(
			from.cloudStormWindMultiplier,
			to.cloudStormWindMultiplier,
			c
		),
		cloudCoreShadowOpacity: lerp(
			from.cloudCoreShadowOpacity,
			to.cloudCoreShadowOpacity,
			c
		),
		cloudEdgeLiftOpacity: lerp(from.cloudEdgeLiftOpacity, to.cloudEdgeLiftOpacity, c),
		cloudDeepZoomOpacity: lerp(from.cloudDeepZoomOpacity, to.cloudDeepZoomOpacity, d),
		snowOpacity: lerp(from.snowOpacity, to.snowOpacity, d),
		snowDensity: lerp(from.snowDensity, to.snowDensity, d),
		snowFallSpeed: lerp(from.snowFallSpeed, to.snowFallSpeed, c),
		snowWind: lerp(from.snowWind, to.snowWind, c),
		snowDepthParallax: lerp(from.snowDepthParallax, to.snowDepthParallax, c),
		fogColor: mixCssColorString(from.fogColor, to.fogColor, c),
		fogHighColor: mixCssColorString(from.fogHighColor, to.fogHighColor, c),
		fogHorizonBlend: lerp(from.fogHorizonBlend, to.fogHorizonBlend, c),
		softboxOpacityMultiplier: lerp(
			from.softboxOpacityMultiplier,
			to.softboxOpacityMultiplier,
			c
		),
		shadowOpacityMultiplier: lerp(
			from.shadowOpacityMultiplier,
			to.shadowOpacityMultiplier,
			c
		),
		nightVisualBlend: lerp(from.nightVisualBlend, to.nightVisualBlend, c),
		gloomWashOpacity: lerp(from.gloomWashOpacity, to.gloomWashOpacity, c),
		lightningSpread: lerp(from.lightningSpread, to.lightningSpread, c),
		lightningBurstiness: lerp(from.lightningBurstiness, to.lightningBurstiness, c),
		lightningTint: [
			lerp(from.lightningTint[0], to.lightningTint[0], c),
			lerp(from.lightningTint[1], to.lightningTint[1], c),
			lerp(from.lightningTint[2], to.lightningTint[2], c),
		],
		warmSoftboxOpacityMultiplier: lerp(
			from.warmSoftboxOpacityMultiplier,
			to.warmSoftboxOpacityMultiplier,
			c
		),
		darkSoftboxOpacityMultiplier: lerp(
			from.darkSoftboxOpacityMultiplier,
			to.darkSoftboxOpacityMultiplier,
			c
		),
		lightningIntensity: lerp(from.lightningIntensity, to.lightningIntensity, d),
		lightning: to.lightning,
	};
};
