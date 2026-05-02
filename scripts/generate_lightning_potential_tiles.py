#!/usr/bin/env python3
"""
Generate a low-res "lightning potential" raster used to bias localized lightning flashes.

This is intentionally not a physical lightning climatology. It is a cheap, stable
mask that roughly follows the thickest parts of the existing clouds overlay so
flashes feel attached to storm systems.

Default output: public/maps/lightning_potential/0/0/0.png
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def main() -> None:
	parser = argparse.ArgumentParser()
	parser.add_argument("--clouds-tile", default="public/maps/clouds/0/0/0.png")
	parser.add_argument("--out-dir", default="public/maps/lightning_potential")
	parser.add_argument("--tile-size", type=int, default=512)
	parser.add_argument("--blur1", type=float, default=5.0)
	parser.add_argument("--blur2", type=float, default=14.0)
	parser.add_argument("--alpha-gate", type=float, default=0.22)
	parser.add_argument("--gamma", type=float, default=2.0)
	parser.add_argument("--dry-run", action="store_true")
	args = parser.parse_args()

	clouds_path = Path(args.clouds_tile)
	out_dir = Path(args.out_dir)
	out_path = out_dir / "0/0/0.png"

	if args.dry_run:
		print(f"[dry-run] would read {clouds_path}")
		print(f"[dry-run] would write {out_path}")
		return

	im = Image.open(clouds_path).convert("RGBA")
	if im.size != (args.tile_size, args.tile_size):
		im = im.resize((args.tile_size, args.tile_size), resample=Image.Resampling.BILINEAR)

	alpha = im.getchannel("A")
	a = (np.asarray(alpha, dtype=np.float32) / 255.0).astype(np.float32)

	# Gate out very faint haze, then heavily bias toward thick storm cores.
	a = np.clip((a - np.float32(args.alpha_gate)) / np.float32(max(1e-6, 1.0 - args.alpha_gate)), 0.0, 1.0).astype(np.float32)
	a = np.power(a, np.float32(args.gamma)).astype(np.float32)

	# Multi-radius blur to make a smooth "storm cell" likelihood field.
	a_img = Image.fromarray((a * 255.0).astype(np.uint8), mode="L")
	blur1 = a_img.filter(ImageFilter.GaussianBlur(radius=float(args.blur1)))
	blur2 = a_img.filter(ImageFilter.GaussianBlur(radius=float(args.blur2)))
	b1 = (np.asarray(blur1, dtype=np.float32) / 255.0).astype(np.float32)
	b2 = (np.asarray(blur2, dtype=np.float32) / 255.0).astype(np.float32)

	potential = np.clip(b1 * 0.72 + b2 * 0.38, 0.0, 1.0).astype(np.float32)

	rgba = np.zeros((args.tile_size, args.tile_size, 4), dtype=np.uint8)
	# Premultiply a pale blue-white (same family as clouds) so "screen" compositing
	# behaves well if the texture is ever previewed directly.
	color = np.array([214.0, 228.0, 255.0], dtype=np.float32) / 255.0
	rgb = (potential[..., None] * color[None, None, :]).astype(np.float32)
	rgba[..., 0:3] = np.clip(rgb * 255.0, 0.0, 255.0).astype(np.uint8)
	rgba[..., 3] = np.clip(potential * 255.0, 0.0, 255.0).astype(np.uint8)

	out_path.parent.mkdir(parents=True, exist_ok=True)
	Image.fromarray(rgba, mode="RGBA").save(out_path, format="PNG", optimize=True, compress_level=9)
	print(f"wrote {out_path}")


if __name__ == "__main__":
	main()

