import React from 'react';

// Cinematic boot backdrop for the initial dashboard: a dark-charcoal starfield that
// covers the (still-loading) Mapbox canvas and fades out once the globe is ready.
// Pure DOM/SVG/CSS — intentionally zero-cost compared to the map it stands in for.
// All styling lives in globals.css (`.dashboard-boot-backdrop` block): styled-jsx is
// not SSR'd in this app, and this backdrop must be dark from the very first paint.

// Same generator as LandingPageGoogleMapBackground; fixed seed keeps the field
// SSR-stable (no render-time Math.random) and identical across visits.
const mulberry32 = (seed: number) => {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
};

interface BootStar {
	leftPct: number;
	topPct: number;
	r: number;
	opacity: number;
	twinkle: boolean;
	delayMs: number;
	durationMs: number;
}

const BOOT_STAR_COUNT = 150;

const BOOT_STARS: BootStar[] = (() => {
	const rng = mulberry32(0x4d75726d); // "Murm"
	return Array.from({ length: BOOT_STAR_COUNT }, (_, i) => ({
		leftPct: rng() * 100,
		topPct: rng() * 100,
		r: 0.4 + rng() * 0.9,
		opacity: 0.25 + rng() * 0.65,
		twinkle: i % 3 === 0,
		delayMs: Math.round(rng() * 4000),
		durationMs: Math.round(2400 + rng() * 2800),
	}));
})();

interface DashboardBootBackdropProps {
	/** Starts the 800ms opacity fade-out (the map underneath is ready). */
	fading?: boolean;
}

export function DashboardBootBackdrop({ fading = false }: DashboardBootBackdropProps) {
	return (
		<div
			aria-hidden="true"
			className={`dashboard-boot-backdrop${
				fading ? ' dashboard-boot-backdrop--fading' : ''
			}`}
		>
			<svg
				className="dashboard-boot-starfield"
				width="100%"
				height="100%"
				preserveAspectRatio="none"
			>
				{BOOT_STARS.map((star, i) => (
					<circle
						key={i}
						cx={`${star.leftPct}%`}
						cy={`${star.topPct}%`}
						r={star.r}
						fill="#fff"
						opacity={star.opacity}
						className={star.twinkle ? 'boot-star--twinkle' : undefined}
						style={
							star.twinkle
								? ({
										'--boot-star-o': star.opacity,
										animationDelay: `${star.delayMs}ms`,
										animationDuration: `${star.durationMs}ms`,
									} as React.CSSProperties)
								: undefined
						}
					/>
				))}
			</svg>
			<div className="dashboard-boot-vignette" />
		</div>
	);
}
