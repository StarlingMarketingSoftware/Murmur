#!/usr/bin/env python3
"""
Generate small RGBA "lightning flash" stamp images used by the stormy globe mood.

These stamps are intended to be composited additively/screen on top of the clouds
canvas source at runtime. The look targets a crisp branching lightning channel
with a restrained cloud glow so small localized strikes still read as sharp bolts.

Output defaults to: public/maps/lightning_stamps/flash_{NN}.png
"""

from __future__ import annotations

import argparse
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def _clamp01(x: np.ndarray) -> np.ndarray:
	return np.clip(x, 0.0, 1.0).astype(np.float32)


def _jagged_polyline(
	p0: tuple[float, float],
	p1: tuple[float, float],
	displace: float,
	roughness: float,
	rng: random.Random,
	depth: int = 0,
	max_depth: int = 10,
) -> list[tuple[float, float]]:
	"""
	Midpoint-displacement style polyline. Offsets are applied mostly perpendicular
	to the segment direction so the stroke keeps a coherent overall direction.
	"""
	if displace < 1.0 or depth >= max_depth:
		return [p0, p1]

	mx = (p0[0] + p1[0]) * 0.5
	my = (p0[1] + p1[1]) * 0.5

	dx = p1[0] - p0[0]
	dy = p1[1] - p0[1]
	l = math.hypot(dx, dy)
	if l < 1e-6:
		l = 1.0

	# Perpendicular offset dominates (classic lightning zig-zag).
	perp_x = -dy / l
	perp_y = dx / l
	off = rng.uniform(-displace, displace)
	mx += perp_x * off
	my += perp_y * off

	# Tiny along-line jitter prevents perfectly even segment spacing.
	along = rng.uniform(-displace * 0.15, displace * 0.15)
	mx += (dx / l) * along
	my += (dy / l) * along

	mid = (mx, my)
	left = _jagged_polyline(p0, mid, displace * roughness, roughness, rng, depth + 1, max_depth)
	right = _jagged_polyline(mid, p1, displace * roughness, roughness, rng, depth + 1, max_depth)
	return left[:-1] + right


def _render_stamp(size: int, seed: int) -> np.ndarray:
	rng = random.Random(seed)

	# 8-bit intensity canvas; we'll build the final premultiplied RGBA via numpy.
	intensity = Image.new("L", (size, size), 0)
	draw = ImageDraw.Draw(intensity)

	# Main channel: generally top->bottom with gentle lateral drift.
	start = (rng.uniform(size * 0.35, size * 0.65), rng.uniform(size * 0.06, size * 0.22))
	end = (rng.uniform(size * 0.25, size * 0.75), rng.uniform(size * 0.72, size * 0.94))
	main = _jagged_polyline(
		start,
		end,
		displace=size * 0.18,
		roughness=0.56,
		rng=rng,
		max_depth=10,
	)

	# Glow pass first, then bright cores on top. Drawing the wide pass after the
	# core would replace the white channel with gray in Pillow's L mode.
	draw.line(main, fill=58, width=max(2, size // 92), joint="curve")
	draw.line(main, fill=250, width=max(1, size // 155), joint="curve")
	draw.line(main, fill=255, width=1, joint="curve")

	# Branches: smaller offshoots in the mid/lower section.
	branch_count = rng.randint(1, 3)
	for _ in range(branch_count):
		i = rng.randint(int(len(main) * 0.25), int(len(main) * 0.8))
		p = main[i]
		# Branch direction: mostly sideways, slightly downward.
		ang = rng.uniform(-math.pi * 0.85, math.pi * 0.85)
		length = rng.uniform(size * 0.10, size * 0.26)
		b_end = (p[0] + math.cos(ang) * length, p[1] + abs(math.sin(ang)) * length * 0.55)
		branch = _jagged_polyline(
			p,
			b_end,
			displace=size * 0.08,
			roughness=0.58,
			rng=rng,
			max_depth=8,
		)
		draw.line(branch, fill=68, width=max(1, size // 135), joint="curve")
		draw.line(branch, fill=250, width=1, joint="curve")

	# Convert intensity to float and build a diffuse "cloud illumination" envelope.
	core = (np.asarray(intensity, dtype=np.float32) / 255.0).astype(np.float32)
	blur1 = np.asarray(intensity.filter(ImageFilter.GaussianBlur(radius=max(2, size * 0.03))), dtype=np.float32) / 255.0
	blur2 = np.asarray(intensity.filter(ImageFilter.GaussianBlur(radius=max(4, size * 0.07))), dtype=np.float32) / 255.0

	# A large, low-frequency glow blob centered near the bolt's midpoint.
	mid_i = max(0, min(len(main) - 1, int(len(main) * rng.uniform(0.35, 0.65))))
	cx, cy = main[mid_i]
	cx += rng.uniform(-size * 0.08, size * 0.08)
	cy += rng.uniform(-size * 0.06, size * 0.06)
	sx = rng.uniform(size * 0.16, size * 0.28)
	sy = rng.uniform(size * 0.14, size * 0.26)

	ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
	blob = np.exp(-(((xs - cx) ** 2) / (2 * sx * sx) + ((ys - cy) ** 2) / (2 * sy * sy))).astype(np.float32)

	# Gentle patchiness so the glow isn't a perfect ellipse.
	patch = rng.random() * 0.35 + 0.65
	noise = (rng.random() * 0.25 + 0.75) * (np.random.default_rng(seed ^ 0xBADC0FFEE).random((size, size), dtype=np.float32) * 2.0 - 1.0)
	noise_img = Image.fromarray(((noise * 0.5 + 0.5) * 255).astype(np.uint8), mode="L")
	noise_blur = np.asarray(noise_img.filter(ImageFilter.GaussianBlur(radius=max(2, size * 0.06))), dtype=np.float32) / 255.0
	blob *= (0.55 + 0.45 * noise_blur) * patch

	# Combine: prioritize the tight core, with only enough glow to feel luminous.
	combined = _clamp01(core * 1.45 + blur1 * 0.18 + blur2 * 0.04 + blob * 0.12)

	# Shape alpha so the channel stays crisp and the halo falls off quickly.
	alpha = _clamp01(np.maximum(core * 1.0, np.power(combined, np.float32(1.75)) * np.float32(0.78)))

	# Store straight-alpha PNG pixels. Browsers/canvas premultiply at draw time;
	# writing premultiplied RGB here makes the soft halo carry low-RGB alpha,
	# which reads as gray/dark blotches when Mapbox samples the canvas raster.
	color = np.array([248.0, 252.0, 255.0], dtype=np.float32)
	rgba = np.zeros((size, size, 4), dtype=np.uint8)
	rgba[..., 0:3] = color.astype(np.uint8)
	rgba[..., 3] = np.clip(alpha * 255.0, 0.0, 255.0).astype(np.uint8)
	return rgba


def main() -> None:
	parser = argparse.ArgumentParser()
	parser.add_argument("--out-dir", default="public/maps/lightning_stamps")
	parser.add_argument("--count", type=int, default=12)
	parser.add_argument("--size", type=int, default=256)
	parser.add_argument("--seed", type=int, default=4242)
	parser.add_argument("--dry-run", action="store_true")
	args = parser.parse_args()

	out_dir = Path(args.out_dir)
	out_dir.mkdir(parents=True, exist_ok=True)

	count = int(args.count)
	size = int(args.size)
	seed = int(args.seed)

	for i in range(count):
		name = f"flash_{i:02d}.png"
		path = out_dir / name
		if args.dry_run:
			print(f"[dry-run] would write {path}")
			continue
		rgba = _render_stamp(size=size, seed=seed + i * 97)
		Image.fromarray(rgba, mode="RGBA").save(path, format="PNG", optimize=True, compress_level=9)
		print(f"wrote {path}")


if __name__ == "__main__":
	main()
