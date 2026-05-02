#!/usr/bin/env python3
"""
Generate tiny transparent PNG ice-crystal stamps for the snowy globe mood.

Modeled after the procedural map asset scripts in this repo:
- deterministic seeded output
- numpy + Pillow rendering
- tunable CLI flags
- stable checked-in path under public/maps/

The runtime map code animates these stamps across a Mapbox world canvas. The
stamps themselves should read as sharp, low-opacity ice: thin crystalline arms,
small glints, and transparent edges.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def _fade(t: np.ndarray) -> np.ndarray:
	return t * t * (3.0 - 2.0 * t)


def _smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
	if edge0 == edge1:
		return (x >= edge1).astype(np.float32)
	t = np.clip((x - np.float32(edge0)) / np.float32(edge1 - edge0), 0.0, 1.0)
	return _fade(t).astype(np.float32)


def _line_mask(
	nx: np.ndarray,
	ny: np.ndarray,
	angle: float,
	half_len: float,
	half_width: float,
) -> np.ndarray:
	ca = np.float32(np.cos(angle))
	sa = np.float32(np.sin(angle))
	axis = nx * ca + ny * sa
	perp = -nx * sa + ny * ca
	length = 1.0 - _smoothstep(half_len * 0.82, half_len, np.abs(axis))
	width = 1.0 - _smoothstep(half_width * 0.32, half_width, np.abs(perp))
	return (length * width).astype(np.float32)


def _ray_mask(
	nx: np.ndarray,
	ny: np.ndarray,
	angle: float,
	start: float,
	length: float,
	half_width: float,
) -> np.ndarray:
	ca = np.float32(np.cos(angle))
	sa = np.float32(np.sin(angle))
	axis = nx * ca + ny * sa
	perp = -nx * sa + ny * ca
	center = np.float32(start + length * 0.5)
	half_len = np.float32(length * 0.5)
	along = 1.0 - _smoothstep(half_len * 0.78, half_len, np.abs(axis - center))
	width = 1.0 - _smoothstep(half_width * 0.35, half_width, np.abs(perp))
	return (along * width).astype(np.float32)


def _render_crystal(size: int, seed: int, index: int) -> np.ndarray:
	rng = np.random.default_rng(seed + index * 9973)
	ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
	c = np.float32((size - 1) * 0.5)
	nx = (xs - c) / c
	ny = (ys - c) / c

	rotation = float(rng.uniform(0.0, np.pi / 3.0))
	main_len = float(rng.uniform(0.48, 0.78))
	main_width = float(rng.uniform(0.010, 0.022))
	arm_count = 6
	arms = np.zeros_like(nx, dtype=np.float32)
	branches = np.zeros_like(nx, dtype=np.float32)
	for arm in range(arm_count):
		theta = rotation + arm * np.pi / 3.0
		length_jitter = main_len * float(rng.uniform(0.86, 1.08))
		width_jitter = main_width * float(rng.uniform(0.82, 1.18))
		arms = np.maximum(arms, _ray_mask(nx, ny, theta, 0.02, length_jitter, width_jitter))
		if rng.random() < 0.9:
			for side in (-1.0, 1.0):
				branch_angle = theta + side * float(rng.uniform(0.56, 0.82))
				branch_start = float(rng.uniform(0.22, 0.46)) * length_jitter
				branch_len = float(rng.uniform(0.12, 0.25))
				branch_width = width_jitter * float(rng.uniform(0.55, 0.78))
				branches = np.maximum(
					branches,
					_ray_mask(nx, ny, branch_angle, branch_start, branch_len, branch_width),
				)

	# Add one or two very faint shard lines so each stamp feels hand-cut, not cloned.
	shards = np.zeros_like(nx, dtype=np.float32)
	for _ in range(int(rng.integers(1, 3))):
		shards = np.maximum(
			shards,
			_line_mask(
				nx,
				ny,
				float(rotation + rng.uniform(-0.42, 0.42)),
				float(rng.uniform(0.18, 0.42)),
				float(rng.uniform(0.004, 0.009)),
			),
		)

	r2 = (nx**2 + ny**2).astype(np.float32)
	core = np.exp(-r2 / np.float32(rng.uniform(0.0045, 0.008))).astype(np.float32)
	glint = np.exp(
		-(
			((nx - rng.uniform(-0.035, 0.035)) ** 2) / 0.006
			+ ((ny - rng.uniform(-0.035, 0.035)) ** 2) / 0.008
		)
	).astype(np.float32)
	halo = np.exp(-r2 / np.float32(0.28)).astype(np.float32) * np.float32(0.012)
	alpha_strength = np.float32(rng.uniform(0.46, 0.60))
	alpha = np.clip(
		arms * alpha_strength
		+ branches * np.float32(0.26)
		+ shards * np.float32(0.11)
		+ core * np.float32(0.34)
		+ glint * np.float32(0.08)
		+ halo,
		0.0,
		0.56,
	).astype(np.float32)
	alpha = np.where(alpha < np.float32(0.024), np.float32(0.0), alpha)

	img_alpha = Image.fromarray(np.clip(alpha * 255.0, 0, 255).astype(np.uint8))
	blur_radius = float(rng.uniform(0.0, 0.06))
	img_alpha = img_alpha.filter(ImageFilter.GaussianBlur(radius=blur_radius))
	alpha_u8 = np.asarray(img_alpha, dtype=np.uint8)

	tint = np.array(
		[
			rng.integers(238, 250),
			rng.integers(246, 254),
			rng.integers(252, 256),
		],
		dtype=np.uint8,
	)
	rgba = np.zeros((size, size, 4), dtype=np.uint8)
	rgba[..., 0:3] = tint
	rgba[..., 3] = alpha_u8
	return rgba


def _digest(arr: np.ndarray) -> str:
	return hashlib.sha256(arr.tobytes()).hexdigest()


def main() -> None:
	parser = argparse.ArgumentParser()
	parser.add_argument("--out-dir", default="public/maps/snowflake_stamps")
	parser.add_argument("--count", type=int, default=20)
	parser.add_argument("--size", type=int, default=32)
	parser.add_argument("--seed", type=int, default=9017)
	parser.add_argument("--dry-run", action="store_true")
	args = parser.parse_args()

	out_dir = Path(args.out_dir)
	count = max(1, int(args.count))
	size = max(16, int(args.size))
	seed = int(args.seed)

	if not args.dry_run:
		out_dir.mkdir(parents=True, exist_ok=True)

	digests: set[str] = set()
	for i in range(count):
		rgba = _render_crystal(size=size, seed=seed, index=i)
		alpha_nonzero = int(np.count_nonzero(rgba[..., 3]))
		digest = _digest(rgba)
		if digest in digests:
			raise RuntimeError(f"duplicate generated stamp digest at index {i}")
		if alpha_nonzero <= 0:
			raise RuntimeError(f"empty alpha generated for stamp index {i}")
		digests.add(digest)

		path = out_dir / f"drop_{i:02d}.png"
		if args.dry_run:
			print(f"[dry-run] would write {path} ({size}x{size}, alpha pixels={alpha_nonzero})")
			continue
		Image.fromarray(rgba).save(path)
		print(f"wrote {path} ({size}x{size}, alpha pixels={alpha_nonzero})")

	print(f"generated {count} unique ice crystal stamps")


if __name__ == "__main__":
	main()
