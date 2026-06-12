import type { ParsedCssColor, RgbColor } from './types';
import { clamp, lerp } from './math';

// CSS rgb()/rgba() parsing & formatting.

export const parseCssColor = (value: string): ParsedCssColor | null => {
	const match = value
		.trim()
		.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
	if (!match) return null;
	const r = clamp(Number(match[1]), 0, 255);
	const g = clamp(Number(match[2]), 0, 255);
	const b = clamp(Number(match[3]), 0, 255);
	const a = match[4] == null ? 1 : clamp(Number(match[4]), 0, 1);
	if (![r, g, b, a].every(Number.isFinite)) return null;
	return [r, g, b, a];
};

export const formatCssColor = ([r, g, b, a]: ParsedCssColor) =>
	a >= 0.999
		? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
		: `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Number(a.toFixed(3))})`;

export const mixCssColorString = (from: string, to: string, t: number) => {
	const a = parseCssColor(from);
	const b = parseCssColor(to);
	if (!a || !b) return t < 0.5 ? from : to;
	const p = clamp(t, 0, 1);
	return formatCssColor([
		lerp(a[0], b[0], p),
		lerp(a[1], b[1], p),
		lerp(a[2], b[2], p),
		lerp(a[3], b[3], p),
	]);
};

export const mixCssRgb = (
	from: [number, number, number],
	to: [number, number, number],
	t: number
) => {
	const p = clamp(t, 0, 1);
	return `rgb(${Math.round(from[0] + (to[0] - from[0]) * p)}, ${Math.round(
		from[1] + (to[1] - from[1]) * p
	)}, ${Math.round(from[2] + (to[2] - from[2]) * p)})`;
};

// Hex color parsing/conversion.

export const parseHexColor = (hex: string): RgbColor | null => {
	const trimmed = hex.trim();
	if (!trimmed.startsWith('#')) return null;
	const raw = trimmed.slice(1);
	const isShort = raw.length === 3;
	const isLong = raw.length === 6;
	if (!isShort && !isLong) return null;

	const expand = (c: string) => `${c}${c}`;
	const rHex = isShort ? expand(raw[0]!) : raw.slice(0, 2);
	const gHex = isShort ? expand(raw[1]!) : raw.slice(2, 4);
	const bHex = isShort ? expand(raw[2]!) : raw.slice(4, 6);

	const r = Number.parseInt(rHex, 16);
	const g = Number.parseInt(gHex, 16);
	const b = Number.parseInt(bHex, 16);
	if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
	return { r, g, b };
};

export const toHexByte = (n: number): string => {
	const clamped = clamp(Math.round(n), 0, 255);
	return clamped.toString(16).padStart(2, '0').toUpperCase();
};

export const washOutHexColor = (hex: string, mixToWhite: number): string => {
	const rgb = parseHexColor(hex);
	if (!rgb) return hex;
	const t = clamp(mixToWhite, 0, 1);

	// Blend toward white → lighter and less saturated (pastel).
	const r = rgb.r + (255 - rgb.r) * t;
	const g = rgb.g + (255 - rgb.g) * t;
	const b = rgb.b + (255 - rgb.b) * t;

	return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
};

export const hashStringToStableKey = (input: string): string => {
	// Small deterministic hash for cache keys / image ids.
	// (Not cryptographically secure; just stable and fast.)
	let hash = 5381;
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 33) ^ input.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
};
