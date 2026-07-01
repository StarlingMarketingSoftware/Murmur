'use client';

import type { MutableRefObject } from 'react';
import {
	NIGHT_FACE_SHADE_BG,
	NIGHT_LOWER_LEFT_SHADOW_BG,
	NIGHT_MOONLIGHT_KEY_BG,
	NIGHT_MOON_RIM_BG,
	NIGHT_VIGNETTE_BG,
	SUN_TRANSITION_SPACE_GLOW_BG,
	UNSUBSCRIBE_BURN_GLOW_BG,
	UNSUBSCRIBE_BURN_WASH_COLOR,
} from './constants';
import { SOFTBOX_DARK_POOL_BG, SOFTBOX_WARM_KEY_BG } from '@/lib/weather/moodConfig';

export interface MapLightingOverlaysProps {
	lightingOverlayWarmKeyRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayDarkKeyRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayShadowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlaySunSpaceGlowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayHotWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightDarkWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightLowerLeftShadowRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightMoonlightRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightShadeRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayMoonRimRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayGloomWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayNightVignetteRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayBurnWashRef: MutableRefObject<HTMLDivElement | null>;
	lightingOverlayBurnGlowRef: MutableRefObject<HTMLDivElement | null>;
}

// The 14 ref-anchored, zero-handler lighting overlay divs; opacity and
// backgrounds are driven imperatively by the lighting applier hooks.
export const MapLightingOverlays = ({
	lightingOverlayWarmKeyRef,
	lightingOverlayDarkKeyRef,
	lightingOverlayShadowRef,
	lightingOverlaySunSpaceGlowRef,
	lightingOverlayHotWashRef,
	lightingOverlayNightDarkWashRef,
	lightingOverlayNightLowerLeftShadowRef,
	lightingOverlayNightMoonlightRef,
	lightingOverlayNightShadeRef,
	lightingOverlayMoonRimRef,
	lightingOverlayGloomWashRef,
	lightingOverlayNightVignetteRef,
	lightingOverlayBurnWashRef,
	lightingOverlayBurnGlowRef,
}: MapLightingOverlaysProps) => (
	<>
			{/*
			  Softbox lighting overlay. Two stacked viewport-anchored radial gradients
			  paint the "lit sphere" feel directly on top of the map. Because these
			  are DOM layers on the container, they stay locked to the viewer no
			  matter how the globe is panned, zoomed, or rotated.

			  Layer 1a (screen): warm highlight radiating from the upper-left.
			  Layer 1b (multiply): stormy dark-pool key in the same upper-left slot.
			  Keeping both layers mounted lets mood transitions crossfade instead of
			  swapping an un-animatable mix-blend-mode.
			  Layer 2 (multiply): cool deep-shadow pooling in the lower-right.
			*/}
			<div
				ref={lightingOverlayWarmKeyRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					// Anchor the radial "hot spot" offscreen past the upper-left so the
					// visible gradient reads as ambient warm wash rather than a disc.
					// Peaks are cranked up because the hot center is offscreen.
					background: SOFTBOX_WARM_KEY_BG,
					mixBlendMode: 'screen',
					// opacity intentionally unset — see applyLightingOverlayOpacity above.
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayDarkKeyRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: SOFTBOX_DARK_POOL_BG,
					mixBlendMode: 'multiply',
					// opacity intentionally unset — see applyLightingOverlayOpacity above.
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayShadowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					// Push the dark pool offscreen past the lower-right corner so only
					// the broad outer falloff is in the viewport — no obvious radial
					// "eye" of shadow in the corner. Peaks are strong to keep the
					// shaded hemisphere readable at globe zoom.
					background:
						'radial-gradient(ellipse 160% 160% at 115% 115%, rgba(6, 10, 28, 0.70) 0%, rgba(6, 10, 28, 0.50) 28%, rgba(10, 16, 36, 0.28) 55%, rgba(20, 28, 56, 0.08) 78%, rgba(0, 0, 0, 0) 100%)',
					mixBlendMode: 'multiply',
					// opacity intentionally unset — see applyLightingOverlayOpacity above.
					zIndex: 1,
				}}
			/>
			{/*
			  Sunrise space glow. A very faint screen-blend bloom in the surrounding
			  "space" so dawn feels present on the page without becoming a full wash.
			  Opacity is owned by applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlaySunSpaceGlowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: SUN_TRANSITION_SPACE_GLOW_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Hot-weather wash. Uniform warm-white screen-blend overlay that
			  brightens the entire globe. Opacity is owned by
			  applyLightingOverlayOpacity (0 when temp is below the hot
			  threshold OR when the mood is a dark-pool variant).
			*/}
			<div
				ref={lightingOverlayHotWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: 'rgb(255, 240, 215)',
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Night dark wash. A neutral overlay that slightly lowers value while
			  preserving the normal day map hues. Opacity is owned by
			  applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlayNightDarkWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: 'rgb(0, 0, 0)',
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			{/*
			  Night composition. The moon key comes from the upper-right while the
			  counter-shade pools in the lower-left, opposite the daytime lighting.
			  Opacity is owned by applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlayNightLowerLeftShadowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_LOWER_LEFT_SHADOW_BG,
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayNightMoonlightRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_MOONLIGHT_KEY_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Night silhouette (multiply). Darkens the visible face of the globe so the
			  moon backlight can read as true rear lighting instead of a generic glow.
			  Opacity owned by applyLightingOverlayOpacity.
			*/}
			<div
				ref={lightingOverlayNightShadeRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_FACE_SHADE_BG,
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			<div
				ref={lightingOverlayMoonRimRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_MOON_RIM_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
				}}
			/>
			{/*
			  Gloom wash. Uniform dark multiply-blend overlay for stormy
			  that persists into city zoom (longer fade curve than the softbox/
			  shadow). Opacity owned by applyLightingOverlayOpacity; bright
			  moods set gloomWashOpacity=0 so this is a no-op for them.
			*/}
			<div
				ref={lightingOverlayGloomWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: 'rgb(20, 28, 50)',
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			{/*
			  Night vignette. Soft viewport-anchored darkening at the corners that
			  pulls the eye toward the globe and gives the night sky an intimate,
			  cinematic frame. Sits on top of the night lighting overlays so the
			  cornering applies even where moonlight or rim light brightens. Opacity
			  is owned by applyLightingOverlayOpacity and is gated on true night.
			*/}
			<div
				ref={lightingOverlayNightVignetteRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: NIGHT_VIGNETTE_BG,
					mixBlendMode: 'multiply',
					zIndex: 1,
				}}
			/>
			{/*
			  Unsubscribe burn washes. The flow's "globe on fire" effect: a uniform
			  multiply char that reddens/darkens what the basemap paint can't reach
			  (clouds, lighting overlays), plus a late-stage screen-blend ember
			  under-glow. Opacities owned by applyLightingOverlayOpacity; both stay
			  0 outside the unsubscribe flow, so initial opacity is set explicitly
			  to avoid a dark-red first paint before the first apply runs.
			*/}
			<div
				ref={lightingOverlayBurnWashRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: UNSUBSCRIBE_BURN_WASH_COLOR,
					mixBlendMode: 'multiply',
					zIndex: 1,
					opacity: 0,
				}}
			/>
			<div
				ref={lightingOverlayBurnGlowRef}
				aria-hidden
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					background: UNSUBSCRIBE_BURN_GLOW_BG,
					mixBlendMode: 'screen',
					zIndex: 1,
					opacity: 0,
				}}
			/>
	</>
);
