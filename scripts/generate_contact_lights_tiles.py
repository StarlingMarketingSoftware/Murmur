#!/usr/bin/env python3
"""
Generate local raster tiles for a "Black Marble"-style dot-only night lights overlay.

Important: this intentionally avoids heatmap kernels and large blur. Density is expressed
as "more/brighter dots", not "bigger blobs".

Input: a CSV file with header `lng,lat`.
Output: `public/maps/contact_lights/{z}/{x}/{y}.png` by default.
"""

from __future__ import annotations

import argparse
import csv
import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class BBox:
	lon_min: float
	lat_min: float
	lon_max: float
	lat_max: float


def _clamp(v: float, lo: float, hi: float) -> float:
	return lo if v < lo else hi if v > hi else v


def _hash_u32(x: int) -> int:
	x &= 0xFFFFFFFF
	x ^= x >> 16
	x = (x * 0x7FEB352D) & 0xFFFFFFFF
	x ^= x >> 15
	x = (x * 0x846CA68B) & 0xFFFFFFFF
	x ^= x >> 16
	return x & 0xFFFFFFFF


def _rand01(seed: int) -> float:
	return _hash_u32(seed) / float(0xFFFFFFFF)


def _lonlat_to_tile_xy(
	lon_deg: np.ndarray, lat_deg: np.ndarray, z: int
) -> tuple[np.ndarray, np.ndarray]:
	"""
	Vectorized lon/lat -> fractional tile coords at zoom z (WebMercator / XYZ).
	Returns x,y in tile space (0..2^z).
	"""
	n = np.float64(2**z)
	lon = lon_deg.astype(np.float64)
	lat = lat_deg.astype(np.float64)
	x = (lon + 180.0) / 360.0 * n

	lat_rad = np.deg2rad(lat)
	lat_rad = np.clip(lat_rad, -np.pi / 2 + 1e-6, np.pi / 2 - 1e-6)
	y = (1.0 - np.log(np.tan(lat_rad) + 1.0 / np.cos(lat_rad)) / np.pi) / 2.0 * n
	return x, y


def _bbox_tile_range(bbox: BBox, z: int) -> tuple[int, int, int, int]:
	"""
	Return inclusive tile x/y ranges covering bbox at zoom z.
	"""
	n = 2**z

	def lon_to_x(lon: float) -> int:
		return int(math.floor(((lon + 180.0) / 360.0) * n))

	def lat_to_y(lat: float) -> int:
		lat_rad = math.radians(_clamp(lat, -85.05112878, 85.05112878))
		y = (1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0
		return int(math.floor(y * n))

	x0 = lon_to_x(float(bbox.lon_min))
	x1 = lon_to_x(float(bbox.lon_max))
	# y grows downward; north (lat_max) is smaller y.
	y0 = lat_to_y(float(bbox.lat_max))
	y1 = lat_to_y(float(bbox.lat_min))

	x_min = max(0, min(x0, x1))
	x_max = min(n - 1, max(x0, x1))
	y_min = max(0, min(y0, y1))
	y_max = min(n - 1, max(y0, y1))
	return x_min, x_max, y_min, y_max


def _read_coords_csv(path: Path) -> tuple[np.ndarray, np.ndarray]:
	lons: list[float] = []
	lats: list[float] = []
	with path.open("r", newline="") as f:
		reader = csv.DictReader(f)
		fields = reader.fieldnames or []
		if "lng" not in fields or "lat" not in fields:
			raise ValueError(f"Expected CSV header lng,lat. Got: {fields}")
		for row in reader:
			try:
				lon = float(row["lng"])
				lat = float(row["lat"])
			except Exception:
				continue
			if not (math.isfinite(lon) and math.isfinite(lat)):
				continue
			lons.append(lon)
			lats.append(lat)
	return np.array(lons, dtype=np.float32), np.array(lats, dtype=np.float32)


def _dot_kernel_for_zoom(z: int) -> list[tuple[int, int, float]]:
	# Base: crisp core + micro halo (never a large blur).
	base = [
		(0, 0, 1.00),
		(-1, 0, 0.30),
		(1, 0, 0.30),
		(0, -1, 0.30),
		(0, 1, 0.30),
		(-1, -1, 0.18),
		(1, -1, 0.18),
		(-1, 1, 0.18),
		(1, 1, 0.18),
	]

	# At the most zoomed-out levels the raster gets heavily downsampled; widen the
	# halo slightly so the pattern still reads as a faint glow.
	if z <= 2:
		# Keep weights very small so this reads as a sparkle/glow, not a blob.
		return base + [
			(-2, 0, 0.12),
			(2, 0, 0.12),
			(0, -2, 0.12),
			(0, 2, 0.12),
			(-2, -1, 0.08),
			(-1, -2, 0.08),
			(1, -2, 0.08),
			(2, -1, 0.08),
			(2, 1, 0.08),
			(1, 2, 0.08),
			(-1, 2, 0.08),
			(-2, 1, 0.08),
			(-2, -2, 0.05),
			(2, -2, 0.05),
			(-2, 2, 0.05),
			(2, 2, 0.05),
			(-3, 0, 0.06),
			(3, 0, 0.06),
			(0, -3, 0.06),
			(0, 3, 0.06),
			(-3, -1, 0.04),
			(-1, -3, 0.04),
			(1, -3, 0.04),
			(3, -1, 0.04),
			(3, 1, 0.04),
			(1, 3, 0.04),
			(-1, 3, 0.04),
			(-3, 1, 0.04),
			(-3, -2, 0.03),
			(-2, -3, 0.03),
			(2, -3, 0.03),
			(3, -2, 0.03),
			(3, 2, 0.03),
			(2, 3, 0.03),
			(-2, 3, 0.03),
			(-3, 2, 0.03),
			(-3, -3, 0.02),
			(3, -3, 0.02),
			(-3, 3, 0.02),
			(3, 3, 0.02),
		]

	return base


def _render_tile_rgba(
	counts: np.ndarray,
	tile_size: int,
	cell_px: int,
	seed_base: int,
	z: int,
	tile_x: int,
	max_dots_per_cell: int,
	dots_gain: float,
	dots_gamma: float,
	alpha_min: int,
	alpha_max: int,
	rgb: tuple[int, int, int],
	kernel: list[tuple[int, int, float]],
	log_scale: float,
	contrast_gamma: float,
	alpha_gamma: float,
	dots_floor: float,
	additive: bool,
	additive_alpha_mul: float,
	reveal: bool,
	reveal_x_min: float,
	reveal_x_max: float,
	reveal_strength: float,
	reveal_jitter: float,
) -> np.ndarray:
	img = np.zeros((tile_size, tile_size, 4), dtype=np.uint8)

	grid_w = tile_size // cell_px
	grid_h = tile_size // cell_px
	if grid_w <= 0 or grid_h <= 0:
		return img

	# Dot kernel is passed in so we can slightly widen the halo at low zoom,
	# where the tiles are heavily downsampled on screen.

	r, g, b = rgb
	nonzero = np.nonzero(counts)[0]

	# Precompute world-x span of this tile at zoom z (0..1 in WebMercator x space).
	n = float(2**z)
	tile_x0 = float(tile_x) / n
	tile_w = 1.0 / n
	reveal_span = max(1e-9, float(reveal_x_max) - float(reveal_x_min))

	for idx in nonzero.tolist():
		c = int(counts[idx])
		if c <= 0:
			continue

		# Density -> dots + brightness.
		# - Use log scaling so metro cores do not become continuous blobs.
		# - Use separate curves for dot count vs brightness: we want "sparkle" across
		#   the whole footprint, but dense areas should still pop harder.
		logc = math.log1p(float(c))
		x_base = _clamp(logc / float(log_scale), 0.0, 1.0)
		x_bright = math.pow(x_base, float(contrast_gamma))
		x_dots = math.pow(x_base, float(dots_gamma))

		# Dot count (stipple density). Low zoom wants a "sparkle floor" so the country
		# reads from space; higher zoom wants more definition (less uniform noise), so
		# we allow very sparse areas to emit 0 dots.
		expected_dots = float(dots_floor) + x_dots * float(max_dots_per_cell - dots_floor) * float(dots_gain)
		expected_dots = _clamp(expected_dots, 0.0, float(max_dots_per_cell))
		dots = int(math.floor(expected_dots))
		frac = expected_dots - float(dots)
		if dots < max_dots_per_cell and _rand01(seed_base + idx * 911 + 17) < frac:
			dots += 1
		dots = min(max_dots_per_cell, max(0, dots))
		if dots <= 0:
			continue

		intensity = math.pow(x_bright, float(alpha_gamma))
		base_alpha = int(round(alpha_min + intensity * (alpha_max - alpha_min)))

		cell_x = idx % grid_w
		cell_y = idx // grid_w
		origin_x = cell_x * cell_px
		origin_y = cell_y * cell_px

		for k in range(dots):
			s0 = seed_base + idx * 131 + k * 9973
			jitter = 0.85 + _rand01(s0 + 19) * 0.30
			alpha_mul = float(additive_alpha_mul) if additive else 1.0
			a_core = int(_clamp(base_alpha * jitter * alpha_mul, 0, 255))
			if a_core <= 0:
				continue

			rx = _rand01(s0 + 3)
			ry = _rand01(s0 + 7)
			px = origin_x + int(rx * cell_px)
			py = origin_y + int(ry * cell_px)

			if reveal:
				# Intro tiles: bias visibility west->east (left-to-right reveal) with small randomness.
				x_world = tile_x0 + (float(px) / float(tile_size)) * tile_w
				x_norm = (x_world - float(reveal_x_min)) / reveal_span
				x_norm = _clamp(x_norm, 0.0, 1.0)
				jx = (_rand01(s0 + 43) - 0.5) * float(reveal_jitter)
				xj = _clamp(x_norm + jx, 0.0, 1.0)
				# West (xj=0) => 1.0, East (xj=1) => 0.0.
				westness = 1.0 - xj
				westness = math.pow(_clamp(westness, 0.0, 1.0), 1.35)
				min_mul = 0.18
				m = (1.0 - float(reveal_strength)) + float(reveal_strength) * (
					min_mul + (1.0 - min_mul) * westness
				)
				a_core = int(_clamp(a_core * m, 0, 255))
				if a_core <= 0:
					continue

			# Composite: use additive alpha at far zoom so dense areas read from space,
			# and max-composite at closer zoom to keep it crisp/dotty.
			for ox, oy, mul in kernel:
				x = px + ox
				y = py + oy
				if x < 0 or x >= tile_size or y < 0 or y >= tile_size:
					continue
				a = int(a_core * mul)
				if a <= 0:
					continue
				if additive:
					prev = int(img[y, x, 3])
					# Screen-blend alpha: builds brightness in dense clusters without
					# instantly saturating (keeps more headroom for major metros).
					next_a = prev + a - (prev * a) // 255
					if next_a > 255:
						next_a = 255
					if next_a > prev:
						img[y, x, 0] = r
						img[y, x, 1] = g
						img[y, x, 2] = b
						img[y, x, 3] = next_a
				else:
					if a > int(img[y, x, 3]):
						img[y, x, 0] = r
						img[y, x, 1] = g
						img[y, x, 2] = b
						img[y, x, 3] = a

	return img


def _write_png(path: Path, rgba: np.ndarray) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	im = Image.fromarray(rgba, mode="RGBA")
	im.save(path, format="PNG", optimize=True)


def main() -> int:
	parser = argparse.ArgumentParser(description="Generate dot-only contact lights tiles from coords CSV.")
	parser.add_argument("--input", required=True, help="CSV with header lng,lat")
	parser.add_argument("--out", default="public/maps/contact_lights", help="Output directory")
	parser.add_argument("--z-min", type=int, default=2, help="Minimum zoom (inclusive)")
	parser.add_argument("--z-max", type=int, default=6, help="Maximum zoom (inclusive)")
	parser.add_argument("--tile-size", type=int, default=512, help="Tile size in pixels")
	parser.add_argument("--cell-px", type=int, default=8, help="Coarse bin cell size in pixels (must divide tile-size)")
	parser.add_argument("--seed", type=int, default=1907, help="Deterministic seed base")
	parser.add_argument("--max-dots-per-cell", type=int, default=10, help="Hard cap of dots per cell")
	parser.add_argument(
		"--dots-gain",
		type=float,
		default=0.8,
		help="Overall dot count multiplier (after density normalization)",
	)
	parser.add_argument(
		"--dots-gamma",
		type=float,
		default=0.7,
		help="Dot-count curve exponent (lower => more dots in mid-density areas)",
	)
	parser.add_argument(
		"--scale-quantile",
		type=float,
		default=0.995,
		help="Quantile of nonzero cell counts treated as 'full intensity' for a given zoom",
	)
	parser.add_argument(
		"--contrast-gamma",
		type=float,
		default=1.8,
		help="Contrast curve exponent (higher => dense areas pop more, sparse areas fade)",
	)
	parser.add_argument(
		"--alpha-gamma",
		type=float,
		default=0.75,
		help="Alpha curve exponent applied after contrast scaling",
	)
	parser.add_argument("--alpha-min", type=int, default=64, help="Minimum dot core alpha")
	parser.add_argument("--alpha-max", type=int, default=255, help="Maximum dot core alpha")
	parser.add_argument("--color", default="255,245,220", help="Dot RGB, e.g. 255,245,220")
	parser.add_argument(
		"--bbox",
		default="-125.5,24.0,-66.0,50.0",
		help="Lon/lat bounds (lonMin,latMin,lonMax,latMax) to generate tiles for",
	)
	parser.add_argument(
		"--reveal",
		action="store_true",
		help="Generate 'intro reveal' tiles (alpha biased west->east so a global fade reads left-to-right).",
	)
	parser.add_argument(
		"--reveal-strength",
		type=float,
		default=0.9,
		help="How strongly reveal tiles bias brightness west->east (0=no bias, 1=full).",
	)
	parser.add_argument(
		"--reveal-jitter",
		type=float,
		default=0.22,
		help="Randomness added to west->east reveal ordering (0=perfect sweep).",
	)
	parser.add_argument("--skip-existing", action="store_true", help="Skip tiles that already exist on disk")
	args = parser.parse_args()

	tile_size = int(args.tile_size)
	cell_px = int(args.cell_px)
	if tile_size % cell_px != 0:
		raise SystemExit(f"--cell-px must divide --tile-size (got {cell_px} and {tile_size})")

	color_parts = [p.strip() for p in str(args.color).split(",")]
	if len(color_parts) != 3:
		raise SystemExit(f"Invalid --color (expected 3 comma-separated ints): {args.color}")
	rgb = (int(color_parts[0]), int(color_parts[1]), int(color_parts[2]))

	bbox_parts = [p.strip() for p in str(args.bbox).split(",")]
	if len(bbox_parts) != 4:
		raise SystemExit(f"Invalid --bbox (expected 4 comma-separated numbers): {args.bbox}")
	bbox = BBox(
		lon_min=float(bbox_parts[0]),
		lat_min=float(bbox_parts[1]),
		lon_max=float(bbox_parts[2]),
		lat_max=float(bbox_parts[3]),
	)
	reveal_x_min = (bbox.lon_min + 180.0) / 360.0
	reveal_x_max = (bbox.lon_max + 180.0) / 360.0

	input_path = Path(args.input)
	out_dir = Path(args.out)

	print(f"Reading coords from {input_path} ...")
	lons, lats = _read_coords_csv(input_path)
	print(f"Loaded {len(lons)} points")

	mask = (
		(lons >= bbox.lon_min)
		& (lons <= bbox.lon_max)
		& (lats >= bbox.lat_min)
		& (lats <= bbox.lat_max)
	)
	lons = lons[mask]
	lats = lats[mask]
	print(f"Filtered to {len(lons)} points in bbox")

	for z in range(int(args.z_min), int(args.z_max) + 1):
		n = 2**z
		print(f"Zoom {z} ...")
		kernel = _dot_kernel_for_zoom(z)
		# "Space" tuning at the most zoomed-out level:
		# - Use a finer binning grid at z2 so more cells get dots (sparkle coverage).
		# - Use gentle additive compositing at z2 so peak metros build brightness without
		#   turning the whole map into a uniform glow sheet.
		cell_px_z = cell_px
		if z <= 2:
			candidate = max(4, cell_px // 2)
			if tile_size % candidate == 0:
				cell_px_z = candidate
		additive = z <= 2

		x_tile_f, y_tile_f = _lonlat_to_tile_xy(lons, lats, z)
		x_tile = np.floor(x_tile_f).astype(np.int32)
		y_tile = np.floor(y_tile_f).astype(np.int32)

		valid = (x_tile >= 0) & (x_tile < n) & (y_tile >= 0) & (y_tile < n)
		x_tile_f = x_tile_f[valid]
		y_tile_f = y_tile_f[valid]
		x_tile = x_tile[valid]
		y_tile = y_tile[valid]

		x_pix = (x_tile_f - x_tile.astype(np.float64)) * float(tile_size)
		y_pix = (y_tile_f - y_tile.astype(np.float64)) * float(tile_size)

		# Bin points into a coarse grid so we can stipple density into discrete dots.
		grid_w = tile_size // cell_px_z
		grid_h = tile_size // cell_px_z
		cx = np.floor(x_pix / float(cell_px_z)).astype(np.int32)
		cy = np.floor(y_pix / float(cell_px_z)).astype(np.int32)
		cx = np.clip(cx, 0, grid_w - 1)
		cy = np.clip(cy, 0, grid_h - 1)
		cell_idx = cy * grid_w + cx

		# Group points by tile via sort.
		key = x_tile.astype(np.int64) + y_tile.astype(np.int64) * np.int64(n)
		order = np.argsort(key, kind="mergesort")
		key = key[order]
		cell_idx = cell_idx[order]

		unique_keys, start_idx = np.unique(key, return_index=True)
		end_idx = np.append(start_idx[1:], np.array([len(key)], dtype=np.int64))

		tile_counts: dict[int, np.ndarray] = {}
		all_nonzero_counts: list[np.ndarray] = []
		for uk, s, e in zip(unique_keys.tolist(), start_idx.tolist(), end_idx.tolist()):
			counts = np.bincount(cell_idx[s:e], minlength=grid_w * grid_h).astype(np.int32)
			tile_counts[int(uk)] = counts
			nz = counts[counts > 0]
			if nz.size:
				all_nonzero_counts.append(nz)

		x_min, x_max, y_min, y_max = _bbox_tile_range(bbox, z)
		print(f"  Tiles: x={x_min}..{x_max}, y={y_min}..{y_max}")

		scale_q = float(args.scale_quantile)
		scale_q = _clamp(scale_q, 0.5, 0.9999)
		# Low-zoom normalization: use a higher quantile so only the true peak metros
		# reach full intensity (avoids "everything maxed out" at space zoom).
		if z <= 2:
			scale_q = _clamp(scale_q + 0.004, 0.5, 0.9999)
		if all_nonzero_counts:
			flat = np.concatenate(all_nonzero_counts)
			scale_count = float(np.quantile(flat.astype(np.float64), scale_q))
		else:
			scale_count = 1.0
		scale_count = max(1.0, scale_count)
		log_scale = max(1e-6, math.log1p(scale_count))
		print(f"  Scale: q={scale_q} -> count={scale_count:.2f}, log_scale={log_scale:.4f}")

		# Per-zoom parameter tuning.
		max_dots_per_cell = int(args.max_dots_per_cell)
		dots_gain = float(args.dots_gain)
		dots_gamma = float(args.dots_gamma)
		contrast_gamma = float(args.contrast_gamma)
		alpha_gamma = float(args.alpha_gamma)
		alpha_min = int(args.alpha_min)
		alpha_max = int(args.alpha_max)
		dots_floor = 0.0
		additive_alpha_mul = 1.0

		if z <= 2:
			# Space view: emphasize density contrast (metros brighter than rural).
			max_dots_per_cell = min(20, max(1, int(round(max_dots_per_cell * 1.8))))
			dots_gamma = max(0.05, dots_gamma * 2.6)
			contrast_gamma = max(0.05, contrast_gamma * 1.55)
			# Increase baseline alpha at z2 so the US reads clearly from the fully-zoomed-out
			# globe view (low-density areas are otherwise too dim after downsampling).
			alpha_min = max(48, int(round(alpha_min * 1.15)))
			dots_floor = 1.0
			# A small boost to additive compositing helps dense metros glow without becoming
			# a continuous heatmap sheet.
			additive_alpha_mul = 1.18

		if z == 3:
			# Medium zoom: avoid "hair texture" by thinning low-density noise and
			# boosting contrast for the peaks.
			max_dots_per_cell = min(16, max(1, int(round(max_dots_per_cell * 1.2))))
			dots_gain = _clamp(dots_gain * 0.9, 0.05, 10.0)
			dots_gamma = max(0.05, dots_gamma * 1.7)
			contrast_gamma = max(0.05, contrast_gamma * 1.35)
			alpha_min = max(18, int(round(alpha_min * 0.55)))
			dots_floor = 0.0

		if z == 4:
			# State-ish zoom: we want recognizable clusters/corridors, not uniform speckle.
			max_dots_per_cell = min(14, max(1, int(round(max_dots_per_cell * 1.1))))
			dots_gain = _clamp(dots_gain * 0.8, 0.05, 10.0)
			dots_gamma = max(0.05, dots_gamma * 1.85)
			contrast_gamma = max(0.05, contrast_gamma * 1.45)
			alpha_min = max(14, int(round(alpha_min * 0.42)))
			dots_floor = 0.0

		if z == 5:
			# Default interactive zoom: keep dots subtle (search markers should dominate).
			max_dots_per_cell = min(12, max(1, int(round(max_dots_per_cell * 1.0))))
			dots_gain = _clamp(dots_gain * 0.75, 0.05, 10.0)
			dots_gamma = max(0.05, dots_gamma * 1.55)
			contrast_gamma = max(0.05, contrast_gamma * 1.35)
			alpha_min = max(18, int(round(alpha_min * 0.38)))
			dots_floor = 0.0

		if z == 6:
			# Closer zoom: slightly more detail, but still avoid noise.
			max_dots_per_cell = min(12, max(1, int(round(max_dots_per_cell * 1.0))))
			dots_gain = _clamp(dots_gain * 0.8, 0.05, 10.0)
			dots_gamma = max(0.05, dots_gamma * 1.35)
			contrast_gamma = max(0.05, contrast_gamma * 1.25)
			alpha_min = max(22, int(round(alpha_min * 0.42)))
			dots_floor = 0.0

		print(
			"  Params: "
			f"cell_px={cell_px_z}, additive={additive}, "
			f"maxDots={max_dots_per_cell}, dotsGain={dots_gain:.2f}, dotsGamma={dots_gamma:.2f}, "
			f"contrastGamma={contrast_gamma:.2f}, alphaGamma={alpha_gamma:.2f}, "
			f"alphaMin={alpha_min}, alphaMax={alpha_max}, dotsFloor={dots_floor:.2f}, "
			f"additiveMul={additive_alpha_mul:.2f}, "
			f"reveal={bool(args.reveal)}"
		)

		written = 0
		empty_counts = np.zeros((grid_w * grid_h,), dtype=np.int32)
		for ty in range(y_min, y_max + 1):
			for tx in range(x_min, x_max + 1):
				out_path = out_dir / str(z) / str(tx) / f"{ty}.png"
				if args.skip_existing and out_path.exists():
					continue

				k = int(tx + ty * n)
				counts = tile_counts.get(k) if tile_counts else None
				if counts is None:
					counts = empty_counts

				seed_base = int(args.seed + z * 991 + tx * 31337 + ty * 1337)
				rgba = _render_tile_rgba(
					counts,
					tile_size=tile_size,
					cell_px=cell_px_z,
					seed_base=seed_base,
					z=z,
					tile_x=tx,
					max_dots_per_cell=max_dots_per_cell,
					dots_gain=dots_gain,
					dots_gamma=dots_gamma,
					alpha_min=alpha_min,
					alpha_max=alpha_max,
					rgb=rgb,
					kernel=kernel,
					log_scale=log_scale,
					contrast_gamma=contrast_gamma,
					alpha_gamma=alpha_gamma,
					dots_floor=dots_floor,
					additive=additive,
					additive_alpha_mul=additive_alpha_mul,
					reveal=bool(args.reveal),
					reveal_x_min=float(reveal_x_min),
					reveal_x_max=float(reveal_x_max),
					reveal_strength=float(args.reveal_strength),
					reveal_jitter=float(args.reveal_jitter),
				)

				_write_png(out_path, rgba)
				written += 1

		print(f"  Wrote {written} tiles for zoom {z}")

	print(f"Done. Tiles written to {out_dir}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
