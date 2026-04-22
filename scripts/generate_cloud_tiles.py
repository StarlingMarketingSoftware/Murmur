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


def _smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
	"""
	Smoothly map x to [0,1] between edge0 and edge1 (supports edge1 < edge0).
	"""
	e0 = np.float32(edge0)
	e1 = np.float32(edge1)
	if float(e0) == float(e1):
		return (x >= e1).astype(np.float32)

	if float(e0) < float(e1):
		t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0).astype(np.float32)
	else:
		# Inverted range (useful for latitude ramps like Antarctica).
		t = np.clip((e0 - x) / (e0 - e1), 0.0, 1.0).astype(np.float32)
	return _fade(t).astype(np.float32)


def _ellipse_norm(
	lon_deg: np.ndarray,
	lat_deg: np.ndarray,
	center_lon_deg: float,
	center_lat_deg: float,
	rx_deg: float,
	ry_deg: float,
) -> np.ndarray:
	"""
	Normalized squared radius for an axis-aligned ellipse.
	- <= 1: inside the ellipse
	- > 1: outside (grows with squared distance)
	"""
	dlon = _wrap_delta_lon_deg(lon_deg - np.float32(center_lon_deg)).astype(np.float32)
	dlat = (lat_deg - np.float32(center_lat_deg)).astype(np.float32)
	return (dlon / np.float32(rx_deg)) ** 2 + (dlat / np.float32(ry_deg)) ** 2


def _softmin(values: np.ndarray, k: float) -> np.ndarray:
	"""
	Smooth approximation of min(values, axis=0) using a log-sum-exp softmin.
	`values` is expected to be shape (n, H, W) or (n, ...).
	"""
	kk = np.float32(k)
	# Stable: softmin(x) = m - log(sum(exp(-k*(x-m))))/k, where m = min(x)
	m = np.min(values, axis=0).astype(np.float32)
	with np.errstate(over="ignore", under="ignore", invalid="ignore"):
		ex = np.exp(-kk * (values.astype(np.float32) - m)).astype(np.float32)
		sum_ex = np.sum(ex, axis=0).astype(np.float32)
		sum_ex = np.maximum(sum_ex, np.float32(1e-12))
		return (m - np.log(sum_ex).astype(np.float32) / kk).astype(np.float32)


def _domain_warp_sphere(
	sx: np.ndarray,
	sy: np.ndarray,
	sz: np.ndarray,
	seed: int,
	scale: float,
	strength: float,
	octaves: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
	"""
	Lightweight domain-warping in 3D sphere space.

	This helps the cloud fields read less like "classic FBM" and more like
	advected, weather-like structures (Blue Marble-ish) while remaining
	tile-seamless (the noise itself is continuous).
	"""
	wx = _fbm_3d(sx * scale, sy * scale, sz * scale, seed=seed + 11, octaves=octaves)
	wy = _fbm_3d(sx * scale, sy * scale, sz * scale, seed=seed + 2222, octaves=octaves)
	wz = _fbm_3d(sx * scale, sy * scale, sz * scale, seed=seed + 3333, octaves=octaves)

	sxw = (sx + np.float32(strength) * wx).astype(np.float32)
	syw = (sy + np.float32(strength) * wy).astype(np.float32)
	szw = (sz + np.float32(strength) * wz).astype(np.float32)

	# Re-project to the unit sphere so scaling/latitude behavior stays stable.
	norm = np.sqrt(sxw * sxw + syw * syw + szw * szw).astype(np.float32)
	norm = np.maximum(norm, np.float32(1e-6))
	return (sxw / norm).astype(np.float32), (syw / norm).astype(np.float32), (szw / norm).astype(
		np.float32
	)


def _ellipse_mask(
	lon_deg: np.ndarray,
	lat_deg: np.ndarray,
	center_lon_deg: float,
	center_lat_deg: float,
	rx_deg: float,
	ry_deg: float,
) -> np.ndarray:
	return _ellipse_norm(lon_deg, lat_deg, center_lon_deg, center_lat_deg, rx_deg, ry_deg) <= 1.0


def _compute_land_factor(lon_deg: np.ndarray, lat_deg: np.ndarray) -> np.ndarray:
	"""
	Very coarse land/ocean heuristic for stylized clouds.

	Goals:
	- Zero clouds over North America (per product UX preference: keep the US hemisphere clean).
	- Reduce clouds over other continents, but keep some (so it doesn't look unnaturally "ocean only").

	This is intentionally approximate; it's only used at globe zoom levels.
	"""
	factor = np.ones_like(lon_deg, dtype=np.float32)

	# North America: we still strongly suppress clouds here for product UX, but we
	# feather the boundary so it fades out smoothly instead of producing a hard arc.
	na_ellipses: tuple[tuple[float, float, float, float], ...] = (
		(-102, 49, 52, 26),  # US/Canada bulk
		(-150, 62, 22, 12),  # Alaska
		(-103, 21, 22, 14),  # Mexico/Central America
		(-60, 56, 26, 16),  # East Canada
		(-42, 73, 15, 9),  # Greenland
	)
	na_norms = []
	for clon, clat, rx, ry in na_ellipses:
		na_norms.append(_ellipse_norm(lon_deg, lat_deg, clon, clat, rx, ry).astype(np.float32))
	na_stack = np.stack(na_norms, axis=0).astype(np.float32)
	# Soft-union to avoid visible "seams" where ellipses overlap.
	na_soft = _softmin(na_stack, k=7.5)

	# Convert to linearized distance-like quantity so our fade band is perceptually smoother.
	na_r = np.sqrt(np.maximum(na_soft, np.float32(0.0))).astype(np.float32)  # 1 ~ boundary

	# Add a tiny noise warp to the boundary so the fade isn't a perfect contour line.
	lon_rad = (lon_deg * np.float32(np.pi / 180.0)).astype(np.float32)
	lat_rad = (lat_deg * np.float32(np.pi / 180.0)).astype(np.float32)
	cos_lat = np.cos(lat_rad).astype(np.float32)
	sx = (cos_lat * np.cos(lon_rad)).astype(np.float32)
	sy = np.sin(lat_rad).astype(np.float32)
	sz = (cos_lat * np.sin(lon_rad)).astype(np.float32)
	edge01 = ((_fbm_3d(sx * 2.2, sy * 2.2, sz * 2.2, seed=7781, octaves=2) + 1.0) * 0.5).astype(
		np.float32
	)
	jitter = ((edge01 - np.float32(0.5)) * np.float32(0.10)).astype(np.float32)
	na_rj = (na_r + jitter).astype(np.float32)

	# Main clear-out: broadened feather so it's hard to perceive the boundary.
	# 0 inside, 1 outside.
	na_clear = _smoothstep(1.0 - 0.28, 1.0 + 0.85, na_rj).astype(np.float32)

	# Allow a *tiny* amount of cloud spill into North America near the boundary
	# so it feels atmospheric rather than "clipped".
	na_min_factor = np.float32(0.02)
	na_factor = (na_min_factor + (np.float32(1.0) - na_min_factor) * na_clear).astype(np.float32)
	# Shoulder: only inside the boundary, peaking near the edge.
	shoulder = (_smoothstep(1.0 - 0.62, 1.0 - 0.10, na_rj) * (np.float32(1.0) - na_clear)).astype(
		np.float32
	)
	# Patchy spill pattern.
	spill = (shoulder * (np.float32(0.30) + np.float32(0.70) * np.power(edge01, 1.8))).astype(
		np.float32
	)
	na_factor = np.clip(na_factor + spill * np.float32(0.12), 0.0, 1.0).astype(np.float32)
	factor *= na_factor

	# Other continents: reduce but don't eliminate.
	other_land_factor = np.float32(0.45)
	other_ellipses: tuple[tuple[float, float, float, float], ...] = (
		(-60, -15, 23, 30),  # South America
		(20, 2, 24, 32),  # Africa
		# Eurasia (coarse but not "ocean-eating"): a few overlapping blobs.
		(15, 52, 25, 15),  # Europe
		(45, 30, 22, 12),  # Middle East
		(80, 35, 45, 22),  # Central/South Asia
		(120, 35, 45, 18),  # East Asia
		(105, 10, 35, 16),  # SE Asia
		(100, 62, 60, 16),  # Russia / north band
		(134, -25, 20, 14),  # Australia
	)
	other_min = np.full_like(lon_deg, np.float32(1e9), dtype=np.float32)
	for clon, clat, rx, ry in other_ellipses:
		other_min = np.minimum(
			other_min, _ellipse_norm(lon_deg, lat_deg, clon, clat, rx, ry)
		).astype(np.float32)

	# Reduce clouds over non-NA land, with a feathered edge so boundaries don't show.
	other_t = _smoothstep(0.98, 1.33, other_min).astype(np.float32)  # 0 inside, 1 outside
	other_factor = (other_land_factor + (np.float32(1.0) - other_land_factor) * other_t).astype(
		np.float32
	)
	factor *= other_factor

	# Antarctica: avoid a hard horizontal cutoff at -60°.
	ant = _smoothstep(-55.0, -68.0, lat_deg).astype(np.float32)  # 0 north, 1 far south
	factor *= (np.float32(1.0) - ant * (np.float32(1.0) - other_land_factor)).astype(np.float32)

	return factor.astype(np.float32)


@dataclass(frozen=True)
class CloudParams:
	seed: int = 1337
	# Higher cutoff -> fewer clouds. We keep this fairly high and then remove low-alpha haze
	# after shaping so the result reads as distinct puffs (Google Earth-ish) without being dense.
	cutoff: float = 0.61
	# Width of the post-cutoff ramp. Smaller -> clouds reach high opacity sooner (stronger cores).
	ramp_width: float = 0.18
	# Spatial variability: modulate cutoff/ramp so different ocean regions have
	# noticeably different cloud density (without globally increasing coverage).
	density_scale: float = 0.95
	density_octaves: int = 4
	cutoff_variability: float = 0.14  # +/- around `cutoff`
	cutoff_min: float = 0.52
	cutoff_max: float = 0.70
	ramp_min: float = 0.14
	ramp_max: float = 0.26
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
	# Extra scattered cumulus fields (adds random larger + smaller puffs across oceans).
	ocean_cells_scale: float = 1.15
	ocean_cells_octaves: int = 3
	ocean_cells_detail_scale: float = 2.7
	ocean_cells_detail_octaves: int = 2
	ocean_cells_strength: float = 0.26
	# Domain warp: breaks up "FBM blob" look into more weather-like fields.
	warp_scale: float = 1.4
	warp_octaves: int = 3
	warp_strength: float = 0.22
	warp_detail_scale: float = 3.0
	warp_detail_octaves: int = 2
	warp_detail_strength: float = 0.10
	# Cirrus (wispy high clouds) — thin filaments inside broad sheets.
	cirrus_sheet_scale: float = 3.8
	cirrus_sheet_octaves: int = 4
	cirrus_fiber_scale: float = 18.0
	cirrus_fiber_octaves: int = 2
	cirrus_cutoff: float = 0.62
	cirrus_ramp_width: float = 0.20
	cirrus_strength: float = 0.30
	cirrus_haze_floor: float = 0.02


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
	# Southern Ocean "comma" systems (bigger, dramatic swirls like the reference screenshots).
	Storm(lon_deg=-155, lat_deg=-48, radius_deg=28, arms=2, spin=0.58, intensity=0.82, phase=1.9),
	Storm(lon_deg=10, lat_deg=-52, radius_deg=26, arms=2, spin=0.6, intensity=0.78, phase=0.4),
)


@dataclass(frozen=True)
class MegaCloud:
	"""
	A few huge, soft-edged stratiform systems to break up the "all small puffs" look.
	These are intentionally stylized (not meteorologically accurate), and are constrained
	to open ocean via `ocean_only` weighting.
	"""

	lon_deg: float
	lat_deg: float
	rx_deg: float
	ry_deg: float
	angle_deg: float
	intensity: float


DEFAULT_MEGA_CLOUDS: tuple[MegaCloud, ...] = (
	# Thick stratiform deck (big coherent mass) — this is what gives that "Blue Marble" feel.
	MegaCloud(lon_deg=-150, lat_deg=10, rx_deg=78, ry_deg=32, angle_deg=14, intensity=0.48),
	# Big North Pacific sheet (west of North America, but still over ocean).
	MegaCloud(lon_deg=-170, lat_deg=33, rx_deg=46, ry_deg=18, angle_deg=-16, intensity=0.50),
	# Big South Pacific sheet.
	MegaCloud(lon_deg=-125, lat_deg=-28, rx_deg=44, ry_deg=17, angle_deg=24, intensity=0.46),
	# Broad North Atlantic sheet.
	MegaCloud(lon_deg=-35, lat_deg=42, rx_deg=34, ry_deg=14, angle_deg=-10, intensity=0.42),
)


@dataclass(frozen=True)
class FrontBand:
	"""
	Long, thin frontal/jetstream-like cloud bands (the 'streaks' visible in Blue Marble).
	Defined in a local equirectangular approximation around a center.
	"""

	lon_deg: float
	lat_deg: float
	length_deg: float
	width_deg: float
	angle_deg: float
	intensity: float
	meander_amp_deg: float
	meander_cycles: float
	phase: float


DEFAULT_FRONT_BANDS: tuple[FrontBand, ...] = (
	# South Pacific diagonal band (matches the long thin streak feeling in the references).
	FrontBand(
		lon_deg=-105,
		lat_deg=-35,
		length_deg=95,
		width_deg=5.5,
		angle_deg=-22,
		intensity=0.42,
		meander_amp_deg=6.5,
		meander_cycles=1.35,
		phase=0.6,
	),
	# North Pacific band.
	FrontBand(
		lon_deg=170,
		lat_deg=42,
		length_deg=82,
		width_deg=5.0,
		angle_deg=18,
		intensity=0.36,
		meander_amp_deg=5.0,
		meander_cycles=1.15,
		phase=2.4,
	),
	# South Atlantic / Indian band.
	FrontBand(
		lon_deg=35,
		lat_deg=-40,
		length_deg=78,
		width_deg=4.7,
		angle_deg=28,
		intensity=0.32,
		meander_amp_deg=4.8,
		meander_cycles=1.05,
		phase=1.2,
	),
)


def _generate_mega_cloud_alpha(
	lon_deg: np.ndarray,
	lat_deg: np.ndarray,
	coverage01: np.ndarray,
	detail01: np.ndarray,
	land_factor: np.ndarray,
	params: CloudParams,
	mega: tuple[MegaCloud, ...] = DEFAULT_MEGA_CLOUDS,
) -> np.ndarray:
	out = np.zeros_like(lon_deg, dtype=np.float32)

	coverage01 = np.clip(coverage01.astype(np.float32), 0.0, 1.0)
	detail01 = np.clip(detail01.astype(np.float32), 0.0, 1.0)
	land_factor = np.clip(land_factor.astype(np.float32), 0.0, 1.0)

	# 1 over ocean, 0 over "other land" (0.45) and also 0 over North America (0.0).
	ocean_only = np.clip((land_factor - np.float32(0.6)) / np.float32(0.4), 0.0, 1.0).astype(
		np.float32
	)

	# Low-frequency internal texture so the massive sheets don't read as flat blobs.
	tex = (np.float32(0.72) * coverage01 + np.float32(0.28) * detail01).astype(np.float32)
	tex = np.clip((tex - np.float32(0.30)) / np.float32(0.70), 0.0, 1.0).astype(np.float32)
	tex = np.power(tex, np.float32(1.15)).astype(np.float32)

	for m in mega:
		dlon = _wrap_delta_lon_deg(lon_deg - np.float32(m.lon_deg)).astype(np.float32)
		dlat = (lat_deg - np.float32(m.lat_deg)).astype(np.float32)
		cos_lat0 = np.float32(math.cos(math.radians(m.lat_deg)))
		dx = dlon * cos_lat0
		dy = dlat

		ang = np.float32(math.radians(m.angle_deg))
		ca = np.float32(math.cos(float(ang)))
		sa = np.float32(math.sin(float(ang)))
		xr = (dx * ca - dy * sa).astype(np.float32)
		yr = (dx * sa + dy * ca).astype(np.float32)

		# Soft Gaussian-ish core (no hard cutoff — we rely on exponential tail so the
		# edge fades out naturally instead of forming visible arcs).
		r2 = (xr / np.float32(m.rx_deg)) ** 2 + (yr / np.float32(m.ry_deg)) ** 2
		base = np.exp(-r2 * np.float32(2.55)).astype(np.float32)
		# Slight shaping: keeps the center substantial while letting the edge feather out.
		base = np.power(base, np.float32(0.88)).astype(np.float32)

		# Carve holes + add mottling so it reads like a real satellite sheet.
		holes = np.clip((detail01 - np.float32(0.40)) / np.float32(0.60), 0.0, 1.0).astype(
			np.float32
		)
		holes = np.power(holes, np.float32(1.55)).astype(np.float32)
		mottled = (np.float32(0.56) + np.float32(0.44) * tex * holes).astype(np.float32)

		sys = (base * mottled * np.float32(m.intensity)).astype(np.float32)
		sys *= ocean_only

		# Union combine.
		out = (np.float32(1.0) - (np.float32(1.0) - out) * (np.float32(1.0) - sys)).astype(
			np.float32
		)

	# Keep it subtle: massive sheets should be present but not overpower everything.
	out = np.clip(out, 0.0, 1.0).astype(np.float32)
	out = np.power(out, np.float32(1.05)).astype(np.float32)
	out *= np.float32(0.66)
	return out


def _generate_front_bands_alpha(
	lon_deg: np.ndarray,
	lat_deg: np.ndarray,
	detail01: np.ndarray,
	micro01: np.ndarray,
	land_factor: np.ndarray,
	bands: tuple[FrontBand, ...] = DEFAULT_FRONT_BANDS,
) -> np.ndarray:
	out = np.zeros_like(lon_deg, dtype=np.float32)

	detail01 = np.clip(detail01.astype(np.float32), 0.0, 1.0)
	micro01 = np.clip(micro01.astype(np.float32), 0.0, 1.0)
	land_factor = np.clip(land_factor.astype(np.float32), 0.0, 1.0)
	ocean_only = np.clip((land_factor - np.float32(0.6)) / np.float32(0.4), 0.0, 1.0).astype(
		np.float32
	)

	# Ridged micro for fibrous streak texture.
	ridge = (np.float32(1.0) - np.abs(np.float32(2.0) * micro01 - np.float32(1.0))).astype(
		np.float32
	)
	ridge = np.power(ridge, np.float32(4.2)).astype(np.float32)

	for b in bands:
		dlon = _wrap_delta_lon_deg(lon_deg - np.float32(b.lon_deg)).astype(np.float32)
		dlat = (lat_deg - np.float32(b.lat_deg)).astype(np.float32)
		cos_lat0 = np.float32(math.cos(math.radians(b.lat_deg)))
		dx = dlon * cos_lat0
		dy = dlat

		ang = np.float32(math.radians(b.angle_deg))
		ca = np.float32(math.cos(float(ang)))
		sa = np.float32(math.sin(float(ang)))
		xr = (dx * ca - dy * sa).astype(np.float32)  # along-band
		yr = (dx * sa + dy * ca).astype(np.float32)  # across-band

		u = (xr / np.float32(b.length_deg)).astype(np.float32)  # roughly [-1, 1]
		# Meander the centerline for an advected/jetstream feel.
		meander = (
			np.float32(b.meander_amp_deg)
			* np.sin(np.float32(b.meander_cycles) * np.float32(math.pi) * u + np.float32(b.phase))
		).astype(np.float32)
		v = ((yr - meander) / np.float32(b.width_deg)).astype(np.float32)

		# Length taper + soft cross-section.
		taper = np.clip(np.float32(1.0) - np.abs(u), 0.0, 1.0).astype(np.float32)
		taper = np.power(taper, np.float32(1.25)).astype(np.float32)
		band = (np.exp(-v * v * np.float32(1.55)).astype(np.float32) * taper).astype(np.float32)
		# No hard threshold here — feather edges via power shaping instead.
		band = np.power(band, np.float32(1.15)).astype(np.float32)

		# Break it up with internal streak texture + patchiness.
		patch = np.clip((detail01 - np.float32(0.22)) / np.float32(0.78), 0.0, 1.0).astype(
			np.float32
		)
		patch = np.power(patch, np.float32(1.35)).astype(np.float32)
		band *= (
			np.float32(0.45)
			+ np.float32(0.55)
			* (np.float32(0.55) * patch + np.float32(0.45) * ridge)
		).astype(np.float32)
		band *= ocean_only
		band *= np.float32(b.intensity)

		out = (np.float32(1.0) - (np.float32(1.0) - out) * (np.float32(1.0) - band)).astype(
			np.float32
		)

	return np.clip(out, 0.0, 1.0).astype(np.float32)


def _generate_ocean_cells_alpha(
	sx: np.ndarray,
	sy: np.ndarray,
	sz: np.ndarray,
	sx_d: np.ndarray,
	sy_d: np.ndarray,
	sz_d: np.ndarray,
	detail01: np.ndarray,
	micro01: np.ndarray,
	density01: np.ndarray,
	land_factor: np.ndarray,
	params: CloudParams,
) -> np.ndarray:
	"""
	Scattered ocean cumulus fields: adds variability so some ocean regions have
	a few larger puffs and lots of smaller faint puffs, with different fade levels.
	"""
	detail01 = np.clip(detail01.astype(np.float32), 0.0, 1.0)
	micro01 = np.clip(micro01.astype(np.float32), 0.0, 1.0)
	density01 = np.clip(density01.astype(np.float32), 0.0, 1.0)
	land_factor = np.clip(land_factor.astype(np.float32), 0.0, 1.0)

	# 1 over open ocean, 0 over land (and the NA carve-out).
	ocean_only = np.clip((land_factor - np.float32(0.6)) / np.float32(0.4), 0.0, 1.0).astype(
		np.float32
	)

	base = ((_fbm_3d(
		sx * np.float32(params.ocean_cells_scale),
		sy * np.float32(params.ocean_cells_scale),
		sz * np.float32(params.ocean_cells_scale),
		seed=params.seed + 65000,
		octaves=params.ocean_cells_octaves,
	) + 1.0) * 0.5).astype(np.float32)

	detail = ((_fbm_3d(
		sx_d * np.float32(params.ocean_cells_detail_scale),
		sy_d * np.float32(params.ocean_cells_detail_scale),
		sz_d * np.float32(params.ocean_cells_detail_scale),
		seed=params.seed + 65200,
		octaves=params.ocean_cells_detail_octaves,
	) + 1.0) * 0.5).astype(np.float32)

	# Big sparse patches (larger clouds) + smaller higher-threshold speckle.
	big = _smoothstep(0.66, 0.90, base).astype(np.float32)
	small = _smoothstep(0.80, 0.97, detail).astype(np.float32)
	# Emphasize "randomness": push towards isolated blobs.
	big = np.power(big, np.float32(1.10)).astype(np.float32)
	small = np.power(small, np.float32(1.35)).astype(np.float32)

	# Fluff texture for cumulus.
	fluff = (np.float32(1.0) - np.abs(np.float32(2.0) * micro01 - np.float32(1.0))).astype(
		np.float32
	)
	fluff = np.power(fluff, np.float32(2.6)).astype(np.float32)

	patch = np.clip((detail01 - np.float32(0.32)) / np.float32(0.68), 0.0, 1.0).astype(np.float32)
	patch = np.power(patch, np.float32(1.25)).astype(np.float32)

	# Different fade levels: some cells are barely-there, others stronger.
	strength = (np.float32(0.25) + np.float32(0.75) * np.power(base, np.float32(1.15))).astype(
		np.float32
	)
	# Prefer adding cells in regions already "weatherier", but still allow surprises.
	weather = (np.float32(0.35) + np.float32(0.65) * density01).astype(np.float32)

	cells = (np.float32(0.62) * big + np.float32(0.38) * small).astype(np.float32)
	cells *= (np.float32(0.38) + np.float32(0.62) * fluff).astype(np.float32)
	cells *= (np.float32(0.45) + np.float32(0.55) * patch).astype(np.float32)
	cells *= strength * weather
	cells *= np.float32(params.ocean_cells_strength)
	cells *= ocean_only

	return np.clip(cells, 0.0, 1.0).astype(np.float32)


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
	sx0 = (cos_lat * np.cos(lon_rad)).astype(np.float32)
	sy0 = np.sin(lat_rad).astype(np.float32)
	sz0 = (cos_lat * np.sin(lon_rad)).astype(np.float32)

	# Domain warp in sphere space (two stages: big-field warp + smaller detail warp).
	sx, sy, sz = _domain_warp_sphere(
		sx0,
		sy0,
		sz0,
		seed=params.seed + 41000,
		scale=params.warp_scale,
		strength=params.warp_strength,
		octaves=params.warp_octaves,
	)
	sx_d, sy_d, sz_d = _domain_warp_sphere(
		sx,
		sy,
		sz,
		seed=params.seed + 42000,
		scale=params.warp_detail_scale,
		strength=params.warp_detail_strength,
		octaves=params.warp_detail_octaves,
	)

	coverage = (_fbm_3d(
		sx * params.coverage_scale,
		sy * params.coverage_scale,
		sz * params.coverage_scale,
		seed=params.seed,
		octaves=params.coverage_octaves,
	) + 1.0) * 0.5

	detail = (_fbm_3d(
		sx_d * params.detail_scale,
		sy_d * params.detail_scale,
		sz_d * params.detail_scale,
		seed=params.seed + 10000,
		octaves=params.detail_octaves,
	) + 1.0) * 0.5

	breakup = (_fbm_3d(
		sx_d * params.breakup_scale,
		sy_d * params.breakup_scale,
		sz_d * params.breakup_scale,
		seed=params.seed + 20000,
		octaves=params.breakup_octaves,
	) + 1.0) * 0.5
	# High-frequency micro noise for filament texture (cheap: 1 octave).
	micro = (_fbm_3d(
		sx_d * 90.0,
		sy_d * 90.0,
		sz_d * 90.0,
		seed=params.seed + 30000,
		octaves=1,
	) + 1.0) * 0.5

	# Lon/lat degrees (reused by multiple passes).
	lon_deg = (lon_rad * np.float32(180.0 / np.pi)).astype(np.float32)
	lat_deg = (lat_rad * np.float32(180.0 / np.pi)).astype(np.float32)
	land_factor = _compute_land_factor(lon_deg, lat_deg)

	# Spatial density field: modulates cutoff/ramp so some ocean regions have
	# higher cloud coverage and others stay sparse (more natural variability).
	density01 = ((_fbm_3d(
		sx * np.float32(params.density_scale),
		sy * np.float32(params.density_scale),
		sz * np.float32(params.density_scale),
		seed=params.seed + 61000,
		octaves=params.density_octaves,
	) + 1.0) * 0.5).astype(np.float32)
	density01 = np.clip(density01, 0.0, 1.0).astype(np.float32)
	density01 = np.power(density01, np.float32(1.12)).astype(np.float32)

	# Weighted sum: big patches + a touch of internal texture.
	v = (0.72 * coverage + 0.28 * detail).astype(np.float32)
	# Increase contrast so a smaller % of pixels become clouds, but with a stronger peak opacity.
	v = np.clip((v - 0.5) * params.contrast + 0.5, 0.0, 1.0).astype(np.float32)

	# Shape into discrete puffs: threshold + eased ramp.
	cutoff_local = (np.float32(params.cutoff) - (density01 - np.float32(0.5)) * np.float32(params.cutoff_variability)).astype(
		np.float32
	)
	cutoff_local = np.clip(
		cutoff_local, np.float32(params.cutoff_min), np.float32(params.cutoff_max)
	).astype(np.float32)
	ramp_local = (np.float32(params.ramp_width) * (np.float32(0.90) + np.float32(0.65) * (np.float32(1.0) - density01))).astype(
		np.float32
	)
	ramp_local = np.clip(ramp_local, np.float32(params.ramp_min), np.float32(params.ramp_max)).astype(
		np.float32
	)
	alpha_puffs = np.clip((v - cutoff_local) / np.maximum(np.float32(1e-6), ramp_local), 0.0, 1.0)
	alpha_puffs = np.power(alpha_puffs, params.power).astype(np.float32)

	# Break up large sheets so it doesn't feel like uniform haze.
	alpha_puffs *= np.clip((breakup - 0.25) / 0.75, 0.0, 1.0).astype(np.float32)

	# Latitude weighting: slightly fewer clouds at poles (still present).
	lat_norm = (np.abs(lat_rad) / (0.5 * np.pi)).astype(np.float32)  # 0..1
	lat_weight = (0.65 + 0.35 * (1.0 - np.power(lat_norm, 1.6))).astype(np.float32)
	alpha_puffs *= lat_weight

	# Add a handful of spiral storms over open oceans to break up the "samey" noise look.
	# Use a stable noise mix for phase wobble so storms don't look perfectly symmetric.
	noise01 = (
		detail * np.float32(0.58)
		+ breakup * np.float32(0.28)
		+ micro * np.float32(0.14)
	).astype(np.float32)
	storms = _generate_storm_alpha(lon_deg, lat_deg, noise01, micro01=micro, storms=DEFAULT_STORMS)
	alpha_puffs = (
		np.float32(1.0) - (np.float32(1.0) - alpha_puffs) * (np.float32(1.0) - storms)
	).astype(np.float32)

	# Hard-kill low opacity haze so the layer reads like satellite clouds (puffs, not fog).
	# This is applied after breakup/latitude weighting so it respects those effects.
	alpha_puffs = np.clip(
		(alpha_puffs - params.haze_floor) / max(1e-6, (1.0 - params.haze_floor)),
		0.0,
		1.0,
	)

	# Cirrus: filament ridges inside broad sheets (reads closer to Blue Marble high cloud wisps).
	c_sheet = (_fbm_3d(
		sx * params.cirrus_sheet_scale,
		sy * params.cirrus_sheet_scale,
		sz * params.cirrus_sheet_scale,
		seed=params.seed + 50000,
		octaves=params.cirrus_sheet_octaves,
	) + 1.0) * 0.5
	c_fiber = (_fbm_3d(
		sx_d * params.cirrus_fiber_scale,
		sy_d * params.cirrus_fiber_scale,
		sz_d * params.cirrus_fiber_scale,
		seed=params.seed + 52000,
		octaves=params.cirrus_fiber_octaves,
	) + 1.0) * 0.5
	# Ridged "stringy" structure.
	c_ridge = (np.float32(1.0) - np.abs(np.float32(2.0) * c_fiber - np.float32(1.0))).astype(
		np.float32
	)
	c_ridge = np.power(c_ridge, np.float32(3.6)).astype(np.float32)
	c_base = np.clip(
		(c_sheet - np.float32(params.cirrus_cutoff))
		/ max(1e-6, np.float32(params.cirrus_ramp_width)),
		0.0,
		1.0,
	).astype(np.float32)
	c_base = np.power(c_base, np.float32(1.25)).astype(np.float32)
	cirrus = (c_base * c_ridge).astype(np.float32)
	# Favor mid-lat storm tracks a bit; keep some everywhere.
	mid_lat = np.exp(-np.power((np.abs(lat_deg) - np.float32(32.0)) / np.float32(24.0), 2.0)).astype(
		np.float32
	)
	cirrus *= (np.float32(0.25) + np.float32(0.75) * mid_lat).astype(np.float32)
	# Keep only meaningful wisps (but don't nuke them like the puffs haze cut).
	cirrus = np.clip(
		(cirrus - np.float32(params.cirrus_haze_floor))
		/ max(1e-6, (np.float32(1.0) - np.float32(params.cirrus_haze_floor))),
		0.0,
		1.0,
	).astype(np.float32)
	cirrus *= np.float32(params.cirrus_strength)

	# Union-combine puffs + cirrus so thin wisps can sit on top without washing the whole layer.
	alpha = (np.float32(1.0) - (np.float32(1.0) - alpha_puffs) * (np.float32(1.0) - cirrus)).astype(
		np.float32
	)

	# Land suppression (stylized). Apply after haze-cut so we reduce clouds over land
	# without nuking them entirely (except North America, which is intentionally cleared).
	alpha *= land_factor

	# Add scattered ocean cumulus fields (adds local variability + occasional larger puffs).
	ocean_cells = _generate_ocean_cells_alpha(
		sx=sx,
		sy=sy,
		sz=sz,
		sx_d=sx_d,
		sy_d=sy_d,
		sz_d=sz_d,
		detail01=detail,
		micro01=micro,
		density01=density01,
		land_factor=land_factor,
		params=params,
	)
	alpha = (np.float32(1.0) - (np.float32(1.0) - alpha) * (np.float32(1.0) - ocean_cells)).astype(
		np.float32
	)

	# Add a couple massive ocean cloud systems to complement the smaller puff field.
	# Use the same land_factor to constrain these to open ocean.
	mega = _generate_mega_cloud_alpha(
		lon_deg=lon_deg,
		lat_deg=lat_deg,
		coverage01=coverage,
		detail01=detail,
		land_factor=land_factor,
		params=params,
		mega=DEFAULT_MEGA_CLOUDS,
	)
	alpha = (np.float32(1.0) - (np.float32(1.0) - alpha) * (np.float32(1.0) - mega)).astype(
		np.float32
	)

	fronts = _generate_front_bands_alpha(
		lon_deg=lon_deg,
		lat_deg=lat_deg,
		detail01=detail,
		micro01=micro,
		land_factor=land_factor,
		bands=DEFAULT_FRONT_BANDS,
	)
	alpha = (np.float32(1.0) - (np.float32(1.0) - alpha) * (np.float32(1.0) - fronts)).astype(
		np.float32
	)

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
	alpha = np.clip(alpha, 0.0, 1.0).astype(np.float32)
	alpha_u8 = (alpha * 255.0).astype(np.uint8)

	rgba = np.zeros((size, size, 4), dtype=np.uint8)
	# Slight cool tint + thickness shading so clouds read less flat (closer to Blue Marble).
	# Note: the map layer desaturates this raster; we rely on luminance variation.
	thickness = np.power(alpha, np.float32(0.65)).astype(np.float32)
	# 0..1 -> subtle brightness variation (kept small to avoid looking like a sticker).
	bright = (np.float32(0.90) + np.float32(0.10) * thickness).astype(np.float32)
	r = (np.float32(244.0) * bright).astype(np.uint8)
	g = (np.float32(250.0) * bright).astype(np.uint8)
	b = (np.float32(255.0) * bright).astype(np.uint8)
	rgba[..., 0] = r
	rgba[..., 1] = g
	rgba[..., 2] = b
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
