'use client';

import { useEffect, useRef } from 'react';

type OrbitLogo = {
	src: string;
	width: number;
	height: number;
	/** Multiplier for art that lacks the 50% gray opacity baked into the orbit SVGs. */
	baseOpacity?: number;
	/** Desaturates full-color art to match the grayscale orbit SVGs. */
	grayscale?: boolean;
};

// Adding a logo is one entry here; drop the asset in public/logos/orbit/ first.
// Grayscale SVGs exported from Figma carry opacity 0.5 in the artwork, so they
// need no overrides; PNG stand-ins get baseOpacity + grayscale to match.
const ORBIT_LOGOS: OrbitLogo[] = [
	{ src: '/logos/orbit/cushman-wakefield.svg', width: 110, height: 23 },
	{
		src: '/logos/nordstrom.png',
		width: 120,
		height: 40,
		baseOpacity: 0.5,
		grayscale: true,
	},
	{
		src: '/logos/massMutual.png',
		width: 120,
		height: 40,
		baseOpacity: 0.5,
		grayscale: true,
	},
	{
		src: '/logos/lutherCrest.png',
		width: 120,
		height: 40,
		baseOpacity: 0.5,
		grayscale: true,
	},
	{
		src: '/logos/pennsylvaniaMedical.png',
		width: 120,
		height: 40,
		baseOpacity: 0.5,
		grayscale: true,
	},
	{ src: '/logos/orbit/university-of-pennsylvania.svg', width: 65, height: 71 },
	{ src: '/logos/orbit/illusion-sound-lighting.svg', width: 119, height: 48 },
	{ src: '/logos/orbit/oxford-risk-management.svg', width: 110, height: 40 },
	{ src: '/logos/orbit/temple-university.svg', width: 145, height: 40 },
	{ src: '/logos/orbit/university-of-pittsburgh.svg', width: 75, height: 75 },
];

const LOOP_DURATION_S = 180;
// CSS opacity applied at the top/bottom of the loop, multiplied with each
// logo's baked-in 50% gray: bottom reads at full artwork strength, top fades
// to near-invisible.
const OPACITY_MIN = 0.08;
const OPACITY_MAX = 1;
// Bias > 1 keeps logos faint through the upper half of the loop.
const OPACITY_EXPONENT = 1.4;
// Loop geometry: a tight ellipse hugging the central card, anchored so the
// bottom arc passes a fixed distance below the content column ("Trusted by")
// and the top arc tucks behind the card's lower half.
const ORBIT_RX_PX = 410;
const ORBIT_RY_PX = 185;
// Fallback ellipse-center offset below the layer center when no anchor is set.
const ORBIT_CENTER_Y_OFFSET_PX = 200;
// Distance from the column's bottom edge to the lowest logo centers.
const BOTTOM_ARC_GAP_PX = 60;
// Half the widest logo plus breathing room, so logos never poke off-screen.
const EDGE_MARGIN_PX = 80;
// Keeps the bottom arc (plus logo half-height) inside the viewport.
const BOTTOM_EDGE_MARGIN_PX = 30;
// Clamp the frame delta so returning from a background tab doesn't jump.
const MAX_FRAME_DELTA_MS = 100;

/** Static trusted-by grid for viewports below the lg orbit breakpoint. */
export function TrustedByLogoGrid({ className = '' }: { className?: string }) {
	return (
		<div
			aria-hidden="true"
			className={`flex flex-wrap justify-center gap-y-7 ${className}`}
			style={{
				// Echo the orbit's fade-at-top: the first row reads faint under the copy.
				WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, #000 45%)',
				maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, #000 45%)',
			}}
		>
			{ORBIT_LOGOS.map((logo) => (
				<div key={logo.src} className="flex w-1/4 items-center justify-center px-2">
					{/* eslint-disable-next-line @next/next/no-img-element -- decorative trusted-by art; next/image adds nothing here */}
					<img
						src={logo.src}
						alt=""
						width={logo.width}
						height={logo.height}
						decoding="async"
						draggable={false}
						className="h-auto max-h-11 w-auto max-w-full"
						style={{
							...(logo.grayscale ? { filter: 'grayscale(1)' } : {}),
							...(logo.baseOpacity !== undefined ? { opacity: logo.baseOpacity } : {}),
						}}
					/>
				</div>
			))}
		</div>
	);
}

export function TrustedByLogoOrbit({
	anchorRef,
}: {
	/** Content column the loop encircles; its bottom edge pins the bottom arc. */
	anchorRef?: React.RefObject<HTMLDivElement | null>;
}) {
	const layerRef = useRef<HTMLDivElement>(null);
	const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

	useEffect(() => {
		const layer = layerRef.current;
		if (!layer) return;

		let reducedMotion = false;
		try {
			reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			// matchMedia unavailable; keep animating.
		}

		const geom = { cx: 0, cy: 0, rx: 0, ry: 0 };
		let theta = 0;

		const applyFrame = () => {
			const count = ORBIT_LOGOS.length;
			for (let i = 0; i < count; i++) {
				const el = wrapperRefs.current[i];
				if (!el) continue;
				const angle = theta + (i / count) * Math.PI * 2;
				const x = geom.cx + geom.rx * Math.cos(angle);
				const y = geom.cy + geom.ry * Math.sin(angle);
				// sin(angle) is +1 at the bottom of the loop (screen y grows downward).
				const heightT = (Math.sin(angle) + 1) / 2;
				const orbitOpacity =
					OPACITY_MIN + (OPACITY_MAX - OPACITY_MIN) * Math.pow(heightT, OPACITY_EXPONENT);
				el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
				el.style.opacity = String(orbitOpacity * (ORBIT_LOGOS[i].baseOpacity ?? 1));
			}
		};

		const measure = () => {
			const w = layer.clientWidth;
			const h = layer.clientHeight;
			geom.cx = w / 2;
			geom.rx = Math.min(ORBIT_RX_PX, Math.max(w / 2 - EDGE_MARGIN_PX, 200));
			geom.ry = ORBIT_RY_PX;
			// Pin the bottom arc just below the content column so logos never
			// crowd the "Trusted by" line, clamped inside the viewport.
			const anchor = anchorRef?.current;
			let bottomY = h / 2 + ORBIT_CENTER_Y_OFFSET_PX + ORBIT_RY_PX;
			if (anchor) {
				const layerTop = layer.getBoundingClientRect().top;
				bottomY = anchor.getBoundingClientRect().bottom - layerTop + BOTTOM_ARC_GAP_PX;
			}
			geom.cy = Math.min(bottomY, h - BOTTOM_EDGE_MARGIN_PX) - geom.ry;
			// Static placement honors the same opacity-by-height rule.
			if (reducedMotion) applyFrame();
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(layer);
		if (anchorRef?.current) observer.observe(anchorRef.current);

		if (reducedMotion) {
			return () => observer.disconnect();
		}

		let cancelled = false;
		let rafId: number | null = null;
		let lastMs: number | null = null;

		const tick = (nowMs: number) => {
			if (cancelled) return;
			const dt = lastMs === null ? 0 : Math.min(nowMs - lastMs, MAX_FRAME_DELTA_MS);
			lastMs = nowMs;
			// Skip style writes while the layer is display:none (< lg) but keep
			// scheduling so it resumes when the viewport widens.
			if (layer.offsetParent !== null) {
				theta += (dt * Math.PI * 2) / (LOOP_DURATION_S * 1000);
				applyFrame();
			}
			rafId = window.requestAnimationFrame(tick);
		};
		rafId = window.requestAnimationFrame(tick);

		return () => {
			cancelled = true;
			if (rafId !== null) window.cancelAnimationFrame(rafId);
			observer.disconnect();
		};
	}, [anchorRef]);

	return (
		<div
			ref={layerRef}
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden lg:block"
		>
			{ORBIT_LOGOS.map((logo, index) => (
				<div
					key={logo.src}
					ref={(el) => {
						wrapperRefs.current[index] = el;
					}}
					className="absolute left-0 top-0 will-change-transform"
					style={{ opacity: 0 }}
				>
					{/* eslint-disable-next-line @next/next/no-img-element -- decorative background art positioned per-frame; next/image adds nothing here */}
					<img
						src={logo.src}
						alt=""
						width={logo.width}
						height={logo.height}
						decoding="async"
						draggable={false}
						style={logo.grayscale ? { filter: 'grayscale(1)' } : undefined}
					/>
				</div>
			))}
		</div>
	);
}
