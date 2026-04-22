#!/usr/bin/env python3
"""
Generate a small set of local raster tiles for a subtle "clouds from space" overlay.

Why tiles instead of a DOM overlay?
- Mapbox globe projection will rotate/reproject the layer, so clouds stay glued to Earth.
- Keeps runtime simple (no custom WebGL layer, no external asset fetch).

Output defaults to: public/maps/clouds/{z}/{x}/{y}.png

Tune by editing constants below or passing CLI flags.
"""

from __future__ import annotations

import argparse
import math
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


def _fade(t: np.ndarray) -> np.ndarray:
	# Classic Perlin fade: smoothstep-ish curve.
	return t * t * (3.0 - 2.0 * t)


def _lerp(a: np.ndarray, b: np.ndarray, t: np.ndarray) -> np.ndarray:
	return a + t * (b - a)


def _hash3(xi: np.ndarray, yi: np.ndarray, zi: np.ndarray, seed: int) -> np.ndarray:
	"""
	Vectorized, deterministic integer hash from 3D integer lattice coords to [-1, 1].
	"""
	# Use uint32 arithmetic for deterministic overflow behavior.
	x = xi.astype(np.uint32)
	y = yi.astype(np.uint32)
	z = zi.astype(np.uint32)

	# Overflow is intentional here; silence numpy warnings for clarity.
	with np.errstate(over="ignore"):
		n = (
			x * np.uint32(374761393)
			+ y * np.uint32(668265263)
			+ z * np.uint32(2147483647)
			+ np.uint32(seed) * np.uint32(2246822519)
		)
		n ^= n >> np.uint32(13)
		n *= np.uint32(1274126177)
		n ^= n >> np.uint32(16)

	# Scale to [-1, 1]. Using float32 keeps memory down.
	return (n.astype(np.float32) / np.float32(0xFFFFFFFF)) * 2.0 - 1.0


def _value_noise_3d(x: np.ndarray, y: np.ndarray, z: np.ndarray, seed: int) -> np.ndarray:
	xi = np.floor(x).astype(np.int32)
	yi = np.floor(y).astype(np.int32)
	zi = np.floor(z).astype(np.int32)

	xf = (x - xi).astype(np.float32)
	yf = (y - yi).astype(np.float32)
	zf = (z - zi).astype(np.float32)

	u = _fade(xf)
	v = _fade(yf)
	w = _fade(zf)

	v000 = _hash3(xi, yi, zi, seed)
	v100 = _hash3(xi + 1, yi, zi, seed)
	v010 = _hash3(xi, yi + 1, zi, seed)
	v110 = _hash3(xi + 1, yi + 1, zi, seed)
	v001 = _hash3(xi, yi, zi + 1, seed)
	v101 = _hash3(xi + 1, yi, zi + 1, seed)
	v011 = _hash3(xi, yi + 1, zi + 1, seed)
	v111 = _hash3(xi + 1, yi + 1, zi + 1, seed)

	x00 = _lerp(v000, v100, u)
	x10 = _lerp(v010, v110, u)
	x01 = _lerp(v001, v101, u)
	x11 = _lerp(v011, v111, u)

	y0 = _lerp(x00, x10, v)
	y1 = _lerp(x01, x11, v)

	return _lerp(y0, y1, w)


def _fbm_3d(
	x: np.ndarray,
	y: np.ndarray,
	z: np.ndarray,
	seed: int,
	octaves: int,
	lacunarity: float = 2.0,
	gain: float = 0.5,
) -> np.ndarray:
	# Start at 0.5 so total amplitude sums to ~1.0 over infinite octaves.
	amp = 0.5
	freq = 1.0
	out = np.zeros_like(x, dtype=np.float32)

	for i in range(octaves):
		out += amp * _value_noise_3d(x * freq, y * freq, z * freq, seed + i * 97)
		freq *= lacunarity
		amp *= gain

	return out


def _mercator_y_to_lat_rad(y_norm: np.ndarray) -> np.ndarray:
	# Inverse WebMercator (y in [0,1] top->bottom).
	return np.arctan(np.sinh(np.pi * (1.0 - 2.0 * y_norm))).astype(np.float32)

def _wrap_delta_lon_deg(delta_lon_deg: np.ndarray) -> np.ndarray:
	# Wrap degrees into [-180, 180] for continuity across the antimeridian.
	return ((delta_lon_deg + 180.0) % 360.0) - 180.0


def _ellipse_mask(
	lon_deg: np.ndarray,
	lat_deg: np.ndarray,
	center_lon_deg: float,
	center_lat_deg: float,
	rx_deg: float,
	ry_deg: float,
) -> np.ndarray:
	dlon = _wrap_delta_lon_deg(lon_deg - np.float32(center_lon_deg)).astype(np.float32)
	dlat = (lat_deg - np.float32(center_lat_deg)).astype(np.float32)
	return (dlon / np.float32(rx_deg)) ** 2 + (dlat / np.float32(ry_deg)) ** 2 <= 1.0


def _compute_land_factor(lon_deg: np.ndarray, lat_deg: np.ndarray) -> np.ndarray:
	"""
	Very coarse land/ocean heuristic for stylized clouds.

	Goals:
	- Zero clouds over North America (per product UX preference: keep the US hemisphere clean).
	- Reduce clouds over other continents, but keep some (so it doesn't look unnaturally "ocean only").

	This is intentionally approximate; it's only used at globe zoom levels.
	"""
	factor = np.ones_like(lon_deg, dtype=np.float32)

	# North America (union of a few broad ellipses). This is the only region we hard-zero.
	na = (
		_ellipse_mask(lon_deg, lat_deg, -102, 49, 52, 26)  # US/Canada bulk
		| _ellipse_mask(lon_deg, lat_deg, -150, 62, 22, 12)  # Alaska
		| _ellipse_mask(lon_deg, lat_deg, -103, 21, 22, 14)  # Mexico/Central America
		| _ellipse_mask(lon_deg, lat_deg, -60, 56, 26, 16)  # East Canada
		| _ellipse_mask(lon_deg, lat_deg, -42, 73, 15, 9)  # Greenland
	)
	factor = np.where(na, 0.0, factor)

	# Other continents: reduce but don't eliminate.
	other_land_factor = np.float32(0.45)
	other_land = (
		_ellipse_mask(lon_deg, lat_deg, -60, -15, 23, 30)  # South America
		| _ellipse_mask(lon_deg, lat_deg, 20, 2, 24, 32)  # Africa
		# Eurasia (coarse but not "ocean-eating"): a few overlapping blobs.
		| _ellipse_mask(lon_deg, lat_deg, 15, 52, 25, 15)  # Europe
		| _ellipse_mask(lon_deg, lat_deg, 45, 30, 22, 12)  # Middle East
		| _ellipse_mask(lon_deg, lat_deg, 80, 35, 45, 22)  # Central/South Asia
		| _ellipse_mask(lon_deg, lat_deg, 120, 35, 45, 18)  # East Asia
		| _ellipse_mask(lon_deg, lat_deg, 105, 10, 35, 16)  # SE Asia
		| _ellipse_mask(lon_deg, lat_deg, 100, 62, 60, 16)  # Russia / north band
		| _ellipse_mask(lon_deg, lat_deg, 134, -25, 20, 14)  # Australia
		| (lat_deg <= np.float32(-60.0))  # Antarctica
	)

	factor = np.where(other_land & ~na, factor * other_land_factor, factor)
	return factor.astype(np.float32)


@dataclass(frozen=True)
class CloudParams:
	seed: int = 1337
	# Higher cutoff -> fewer clouds. We keep this fairly high and then remove low-alpha haze
	# after shaping so the result reads as distinct puffs (Google Earth-ish) without being dense.
	cutoff: float = 0.61
	# Width of the post-cutoff ramp. Smaller -> clouds reach high opacity sooner (stronger cores).
	ramp_width: float = 0.18
	coverage_scale: float = 2.2
	coverage_octaves: int = 5
	detail_scale: float = 6.0
	detail_octaves: int = 3
	breakup_scale: float = 12.0
	breakup_octaves: int = 2
	contrast: float = 1.8  # widen noise range so we get actual cloud "puffs" (not haze)
	power: float = 1.85  # higher = puffier, less haze
	# Remove low-alpha haze so clouds read as scattered puffs instead of a milky veil.
	haze_floor: float = 0.07


@dataclass(frozen=True)
class Storm:
	lon_deg: float
	lat_deg: float
	radius_deg: float
	arms: int
	spin: float
	intensity: float
	phase: float


DEFAULT_STORMS: tuple[Storm, ...] = (
	# North Pacific
	Storm(lon_deg=-160, lat_deg=35, radius_deg=22, arms=2, spin=0.62, intensity=0.78, phase=0.8),
	Storm(lon_deg=170, lat_deg=32, radius_deg=20, arms=2, spin=0.68, intensity=0.72, phase=2.1),
	# South Pacific
	Storm(lon_deg=-120, lat_deg=-35, radius_deg=18, arms=3, spin=0.82, intensity=0.7, phase=1.4),
	# North Atlantic
	Storm(lon_deg=-42, lat_deg=40, radius_deg=18, arms=2, spin=0.74, intensity=0.7, phase=0.3),
	# Indian Ocean
	Storm(lon_deg=80, lat_deg=-25, radius_deg=16, arms=3, spin=0.9, intensity=0.66, phase=2.6),
)


def _generate_storm_alpha(
	lon_deg: np.ndarray,
	lat_deg: np.ndarray,
	noise01: np.ndarray,
	micro01: np.ndarray,
	storms: tuple[Storm, ...] = DEFAULT_STORMS,
) -> np.ndarray:
	"""
	Procedural spiral storms. `noise01` should be in [0,1].
	"""
	out = np.zeros_like(lon_deg, dtype=np.float32)

	noise01 = np.clip(noise01.astype(np.float32), 0.0, 1.0)
	micro01 = np.clip(micro01.astype(np.float32), 0.0, 1.0)
	warp = (noise01 - np.float32(0.5)).astype(np.float32)
	micro_warp = (micro01 - np.float32(0.5)).astype(np.float32)
	# Noise-based phase wobble so storms don't look perfectly symmetric.
	phase_wobble = (
		warp * np.float32(2.0 * np.pi) * np.float32(0.9)
		+ micro_warp * np.float32(2.0 * np.pi) * np.float32(0.28)
	).astype(np.float32)
	# Ridged micro noise for filamentary structure.
	filament = (np.float32(1.0) - np.abs(np.float32(2.0) * micro01 - np.float32(1.0))).astype(
		np.float32
	)
	filament = np.power(filament, np.float32(3.0)).astype(np.float32)

	for s in storms:
		# Local equirectangular approximation around the storm center.
		dlon = _wrap_delta_lon_deg(lon_deg - np.float32(s.lon_deg)).astype(np.float32)
		dlat = (lat_deg - np.float32(s.lat_deg)).astype(np.float32)

		cos_lat0 = np.float32(math.cos(math.radians(s.lat_deg)))
		dx = dlon * cos_lat0
		dy = dlat
		r = np.sqrt(dx * dx + dy * dy).astype(np.float32)  # degrees

		# Soft edge falloff to keep storms localized.
		w = np.clip(1.0 - r / np.float32(s.radius_deg), 0.0, 1.0).astype(np.float32)
		w = (w * w).astype(np.float32)
		t = np.clip(r / np.float32(s.radius_deg), 0.0, 1.0).astype(np.float32)

		theta = np.arctan2(dy, dx).astype(np.float32)  # [-pi, pi]
		# Hemisphere-dependent swirl direction for variety (not meteorologically perfect).
		dir_sign = np.float32(1.0 if s.lat_deg >= 0 else -1.0)

		# Break symmetry: jitter radius + angle, strongest toward the center.
		theta_warp = (
			theta
			+ warp * np.float32(1.15) * (np.float32(1.0) - t)
			+ micro_warp * np.float32(0.85) * (np.float32(1.0) - t)
		).astype(np.float32)
		r_warp = (
			r
			+ warp * np.float32(s.radius_deg) * np.float32(0.10)
			+ micro_warp * np.float32(s.radius_deg) * np.float32(0.08)
		).astype(np.float32)

		# Let the "arm count" vary slightly across the storm to avoid perfect pinwheels.
		arms_eff = (np.float32(s.arms) + warp * np.float32(0.9)).astype(np.float32)

		# Log-spiral coordinate reads more natural at this stylized resolution than linear r.
		logr = np.log(np.maximum(r_warp, np.float32(0.35))).astype(np.float32)

		spiral = (
			theta_warp * arms_eff
			+ dir_sign * logr * (np.float32(s.spin) * np.float32(3.6))
			+ np.float32(s.phase)
			+ phase_wobble
			+ micro_warp * np.float32(2.4)
		).astype(np.float32)

		band_a = (np.float32(0.5) + np.float32(0.5) * np.sin(spiral)).astype(np.float32)
		band_b = (
			np.float32(0.5)
			+ np.float32(0.5) * np.sin(spiral * np.float32(0.73) + warp * np.float32(2.1))
		).astype(np.float32)
		bands = np.maximum(band_a, band_b * np.float32(0.85)).astype(np.float32)

		# Noise-driven threshold so bands break up irregularly.
		thresh = (np.float32(0.56) + warp * np.float32(0.10) + micro_warp * np.float32(0.16)).astype(
			np.float32
		)
		bands = np.clip((bands - thresh) / np.maximum(np.float32(1e-6), (np.float32(1.0) - thresh)), 0.0, 1.0).astype(
			np.float32
		)
		bands = np.power(bands, np.float32(2.25)).astype(np.float32)

		# Patchy texture inside the bands.
		patch_coarse = np.clip((noise01 - np.float32(0.25)) / np.float32(0.75), 0.0, 1.0).astype(
			np.float32
		)
		patch_coarse = np.power(patch_coarse, np.float32(1.35)).astype(np.float32)
		patch = (patch_coarse * np.float32(0.6) + filament * np.float32(0.4)).astype(np.float32)
		bands *= (np.float32(0.52) + np.float32(0.48) * patch).astype(np.float32)

		# Core (thicker cloud mass near the center), with a soft eye reduction.
		core = np.clip(1.0 - r_warp / np.float32(s.radius_deg * 0.36), 0.0, 1.0).astype(np.float32)
		eye = np.clip(
			(r_warp - np.float32(s.radius_deg * 0.11)) / np.float32(s.radius_deg * 0.10),
			0.0,
			1.0,
		).astype(np.float32)
		core = (np.power(core, np.float32(1.1)) * eye).astype(np.float32)
		core *= (np.float32(0.65) + np.float32(0.35) * patch).astype(np.float32)

		storm = (w * np.float32(s.intensity) * np.maximum(core * np.float32(0.9), bands)).astype(
			np.float32
		)

		# Union-combine storms so overlapping centers don't blow out too easily.
		out = (np.float32(1.0) - (np.float32(1.0) - out) * (np.float32(1.0) - storm)).astype(np.float32)

	return np.clip(out, 0.0, 1.0).astype(np.float32)


def generate_cloud_alpha(
	lon_rad: np.ndarray, lat_rad: np.ndarray, params: CloudParams
) -> np.ndarray:
	cos_lat = np.cos(lat_rad).astype(np.float32)
	sx = cos_lat * np.cos(lon_rad).astype(np.float32)
	sy = np.sin(lat_rad).astype(np.float32)
	sz = cos_lat * np.sin(lon_rad).astype(np.float32)

	coverage = (_fbm_3d(
		sx * params.coverage_scale,
		sy * params.coverage_scale,
		sz * params.coverage_scale,
		seed=params.seed,
		octaves=params.coverage_octaves,
	) + 1.0) * 0.5

	detail = (_fbm_3d(
		sx * params.detail_scale,
		sy * params.detail_scale,
		sz * params.detail_scale,
		seed=params.seed + 10000,
		octaves=params.detail_octaves,
	) + 1.0) * 0.5

	breakup = (_fbm_3d(
		sx * params.breakup_scale,
		sy * params.breakup_scale,
		sz * params.breakup_scale,
		seed=params.seed + 20000,
		octaves=params.breakup_octaves,
	) + 1.0) * 0.5
	# High-frequency micro noise for filament texture (cheap: 1 octave).
	micro = (_fbm_3d(
		sx * 90.0,
		sy * 90.0,
		sz * 90.0,
		seed=params.seed + 30000,
		octaves=1,
	) + 1.0) * 0.5

	# Weighted sum: big patches + a touch of internal texture.
	v = (0.72 * coverage + 0.28 * detail).astype(np.float32)
	# Increase contrast so a smaller % of pixels become clouds, but with a stronger peak opacity.
	v = np.clip((v - 0.5) * params.contrast + 0.5, 0.0, 1.0).astype(np.float32)

	# Shape into discrete puffs: threshold + eased ramp.
	alpha = np.clip((v - params.cutoff) / max(1e-6, params.ramp_width), 0.0, 1.0)
	alpha = np.power(alpha, params.power).astype(np.float32)

	# Break up large sheets so it doesn't feel like uniform haze.
	alpha *= np.clip((breakup - 0.25) / 0.75, 0.0, 1.0).astype(np.float32)

	# Latitude weighting: slightly fewer clouds at poles (still present).
	lat_norm = (np.abs(lat_rad) / (0.5 * np.pi)).astype(np.float32)  # 0..1
	lat_weight = (0.65 + 0.35 * (1.0 - np.power(lat_norm, 1.6))).astype(np.float32)
	alpha *= lat_weight

	# Add a handful of spiral storms over open oceans to break up the "samey" noise look.
	# Use a stable noise mix for phase wobble so storms don't look perfectly symmetric.
	noise01 = (
		detail * np.float32(0.58)
		+ breakup * np.float32(0.28)
		+ micro * np.float32(0.14)
	).astype(np.float32)
	lon_deg = (lon_rad * np.float32(180.0 / np.pi)).astype(np.float32)
	lat_deg = (lat_rad * np.float32(180.0 / np.pi)).astype(np.float32)
	storms = _generate_storm_alpha(lon_deg, lat_deg, noise01, micro01=micro, storms=DEFAULT_STORMS)
	alpha = (np.float32(1.0) - (np.float32(1.0) - alpha) * (np.float32(1.0) - storms)).astype(np.float32)

	# Hard-kill low opacity haze so the layer reads like satellite clouds (puffs, not fog).
	# This is applied after breakup/latitude weighting so it respects those effects.
	alpha = np.clip((alpha - params.haze_floor) / max(1e-6, (1.0 - params.haze_floor)), 0.0, 1.0)

	# Land suppression (stylized). Apply after haze-cut so we reduce clouds over land
	# without nuking them entirely (except North America, which is intentionally cleared).
	land_factor = _compute_land_factor(lon_deg, lat_deg)
	alpha *= land_factor

	return np.clip(alpha, 0.0, 1.0).astype(np.float32)


def render_tile_rgba(z: int, x: int, y: int, size: int, params: CloudParams) -> np.ndarray:
	n = 1 << z

	# Sample at pixel centers to avoid systematic edge bias.
	xs = (x + (np.arange(size, dtype=np.float32) + 0.5) / size) / n
	ys = (y + (np.arange(size, dtype=np.float32) + 0.5) / size) / n
	u, v = np.meshgrid(xs, ys)

	lon = (u * (2.0 * np.pi) - np.pi).astype(np.float32)
	lat = _mercator_y_to_lat_rad(v)

	alpha = generate_cloud_alpha(lon, lat, params)

	# Keep it subtle in the texture itself: cap alpha so the layer opacity can be higher
	# without ever looking like an "overlay sticker".
	alpha_u8 = (np.clip(alpha, 0.0, 1.0) * 255.0).astype(np.uint8)

	rgba = np.zeros((size, size, 4), dtype=np.uint8)
	# Slight cool tint reads better on our warm land palette (and feels more "atmospheric").
	rgba[..., 0] = 244
	rgba[..., 1] = 250
	rgba[..., 2] = 255
	rgba[..., 3] = alpha_u8
	return rgba


def main() -> None:
	parser = argparse.ArgumentParser()
	parser.add_argument("--out-dir", default="public/maps/clouds")
	parser.add_argument("--tile-size", type=int, default=512)
	parser.add_argument("--max-zoom", type=int, default=3)
	parser.add_argument("--seed", type=int, default=1337)
	parser.add_argument("--cutoff", type=float, default=0.61)
	parser.add_argument("--dry-run", action="store_true")
	args = parser.parse_args()

	out_dir = Path(args.out_dir)
	size = int(args.tile_size)
	max_zoom = int(args.max_zoom)

	params = CloudParams(seed=int(args.seed), cutoff=float(args.cutoff))

	total = sum((1 << z) * (1 << z) for z in range(max_zoom + 1))
	done = 0

	for z in range(max_zoom + 1):
		n = 1 << z
		for x in range(n):
			for y in range(n):
				rel = Path(str(z)) / str(x) / f"{y}.png"
				path = out_dir / rel
				done += 1
				if args.dry_run:
					print(f"[dry-run] {done}/{total} -> {path}")
					continue

				path.parent.mkdir(parents=True, exist_ok=True)
				rgba = render_tile_rgba(z=z, x=x, y=y, size=size, params=params)
				img = Image.fromarray(rgba, mode="RGBA")
				# Optimize for size; content is low-frequency so PNG compression is effective.
				img.save(path, format="PNG", optimize=True, compress_level=9)
				if done % 5 == 0 or done == total:
					print(f"{done}/{total} wrote {path}")


if __name__ == "__main__":
	main()
