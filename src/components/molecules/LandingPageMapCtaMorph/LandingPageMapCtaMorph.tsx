'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles.css';

if (typeof window !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger);
}

type Props = {
	mapContainerRef: React.RefObject<HTMLElement | null>;
};

const BIG_CARD_WIDTH_PX = 912;
const BIG_CARD_HEIGHT_PX = 487;
const SMALL_CARD_WIDTH_PX = 485;
const SMALL_CARD_HEIGHT_PX = 219;
// The unscaled map container dimensions (from `.landing-map-container` CSS).
const MAP_CONTAINER_HEIGHT_PX = 1073;
const SMALL_CARD_LEFT_INSET_PX = 40; // from the map's left edge
const SMALL_CARD_BOTTOM_INSET_PX = -156; // from the map's bottom edge

// Keep this feeling directly tied to scroll (Apple-style).
const SCRUB_SMOOTHNESS: true | number = true;
const GLASS_IN_PORTION = 0.18; // keep big card fully intact while it turns to glass
// Point at which the small content starts fading in (placeholder fades out).
const CONTENT_CROSSFADE_END = 0.74;

export function LandingPageMapCtaMorph({ mapContainerRef }: Props) {
	const cardRef = useRef<HTMLDivElement | null>(null);
	const bigContentRef = useRef<HTMLDivElement | null>(null);
	const smallContentRef = useRef<HTMLDivElement | null>(null);
	const blurPlaceholderRef = useRef<HTMLDivElement | null>(null);
	const startMarkerRef = useRef<HTMLDivElement | null>(null);
	const endMarkerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const mapContainer = mapContainerRef.current;
		const card = cardRef.current;
		const bigContent = bigContentRef.current;
		const smallContent = smallContentRef.current;
		const blurPlaceholder = blurPlaceholderRef.current;
		const startMarker = startMarkerRef.current;
		const endMarker = endMarkerRef.current;
		if (!mapContainer || !card || !bigContent || !smallContent || !blurPlaceholder || !startMarker || !endMarker) return;

		// Desktop-only (match the `md:` breakpoint).
		const desktopMql = window.matchMedia('(min-width: 768px)');
		if (!desktopMql.matches) return;

		// Keep behavior consistent with the landing page: GSAP animations are tuned for Chrome.
		const isChrome =
			/Chrome/.test(navigator.userAgent) &&
			/Google Inc/.test(navigator.vendor) &&
			!/Edg/.test(navigator.userAgent);
		if (!isChrome) return;

		let refreshTimer: number | null = null;
		const ctx = gsap.context(() => {
			// Defaults (also doubles as "no JS" fallback values).
			gsap.set(card, {
				width: BIG_CARD_WIDTH_PX,
				height: BIG_CARD_HEIGHT_PX,
				left: '50%',
				top: '50%',
				// Keep the element centered even as width/height animate.
				xPercent: -50,
				yPercent: -50,
				x: 0,
				y: 0,
				css: {
					'--cta-bg-opacity': 1,
					'--cta-blur': 0,
					'--cta-border-opacity': 0,
				},
				willChange: 'transform, width, height, backdrop-filter',
			});

			gsap.set(bigContent, { opacity: 1 });
			gsap.set(smallContent, { opacity: 0 });
			gsap.set(blurPlaceholder, { opacity: 0 });
			bigContent.style.pointerEvents = 'auto';
			smallContent.style.pointerEvents = 'none';
			blurPlaceholder.style.pointerEvents = 'none';

			const computeEndPosition = () => {
				// Use the unscaled map container height (the container is CSS-scaled, but
				// our card positioning is *inside* the scaled context, so we use unscaled coords).
				const left = SMALL_CARD_LEFT_INSET_PX;
				const top = MAP_CONTAINER_HEIGHT_PX - SMALL_CARD_BOTTOM_INSET_PX - SMALL_CARD_HEIGHT_PX;
				return { left, top };
			};

			// Scroll-tied morph: big centered → glass → small bottom-left.
			const tl = gsap.timeline({
				defaults: { ease: 'none' },
				scrollTrigger: {
					// Start exactly when the bottom of the *original* (centered) big card hits the viewport bottom.
					trigger: startMarker,
					start: 'top bottom',
					// Finish exactly when the bottom of the map is visible (bottom edge hits viewport bottom).
					endTrigger: endMarker,
					end: 'top bottom',
					scrub: SCRUB_SMOOTHNESS,
					invalidateOnRefresh: true,
					onUpdate: (self) => {
						const p = self.progress;

						// Three phases:
						// 1. p < GLASS_IN_PORTION: big content fully visible
						// 2. GLASS_IN_PORTION <= p < CONTENT_CROSSFADE_END: blur placeholder visible (hides text overlap)
						// 3. p >= CONTENT_CROSSFADE_END: small content fades in

						const morphStart = GLASS_IN_PORTION;
						const morphEnd = CONTENT_CROSSFADE_END;

						if (p < morphStart) {
							// Phase 1: Big content fully visible
							gsap.set(bigContent, { opacity: 1 });
							gsap.set(blurPlaceholder, { opacity: 0 });
							gsap.set(smallContent, { opacity: 0 });
							bigContent.style.pointerEvents = 'auto';
							smallContent.style.pointerEvents = 'none';
						} else if (p < morphEnd) {
							// Phase 2: Blur placeholder visible, hide both text layers
							// Fade big content out quickly at the start
							const fadeOutProgress = (p - morphStart) / 0.08;
							const bigOpacity = gsap.utils.clamp(0, 1, 1 - fadeOutProgress);
							const placeholderOpacity = gsap.utils.clamp(0, 1, fadeOutProgress);
							gsap.set(bigContent, { opacity: bigOpacity });
							gsap.set(blurPlaceholder, { opacity: placeholderOpacity });
							gsap.set(smallContent, { opacity: 0 });
							bigContent.style.pointerEvents = 'none';
							smallContent.style.pointerEvents = 'none';
						} else {
							// Phase 3: Small content fades in, blur placeholder fades out
							const fadeInProgress = (p - morphEnd) / (1 - morphEnd);
							const smooth = Math.min(1, fadeInProgress * 2); // fade in over half the remaining progress
							gsap.set(bigContent, { opacity: 0 });
							gsap.set(blurPlaceholder, { opacity: 1 - smooth });
							gsap.set(smallContent, { opacity: smooth });
							bigContent.style.pointerEvents = 'none';
							smallContent.style.pointerEvents = smooth >= 0.5 ? 'auto' : 'none';
						}
					},
				},
			});

			// Phase 1: Glass-in while the *full* big card stays intact.
			tl.to(
				card,
				{
					css: {
						'--cta-bg-opacity': 0.22,
						'--cta-blur': 18,
						'--cta-border-opacity': 0.32,
					},
					duration: 0.18,
				},
				0
			);

			// Phase 2: Size + position morph (starts after glass-in begins).
			tl.to(
				card,
				{
					width: SMALL_CARD_WIDTH_PX,
					height: SMALL_CARD_HEIGHT_PX,
					left: () => computeEndPosition().left,
					top: () => computeEndPosition().top,
					xPercent: 0,
					yPercent: 0,
					duration: 1 - GLASS_IN_PORTION,
				},
				GLASS_IN_PORTION
			);

			// Glass-out near the end so the final small card is white again.
			tl.to(
				card,
				{
					css: {
						'--cta-bg-opacity': 1,
						'--cta-blur': 0,
						'--cta-border-opacity': 0,
					},
					duration: 0.22,
				},
				0.78
			);

			// Ensure ScrollTrigger uses the latest geometry after mount/layout settles.
			refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
		}, card);

		return () => {
			if (refreshTimer != null) window.clearTimeout(refreshTimer);
			ctx.revert();
		};
	}, [mapContainerRef]);

	return (
		<div className="pointer-events-none absolute inset-0 z-40 hidden md:block">
			{/* Scroll markers (used only to compute start/end positions) */}
			<div
				ref={startMarkerRef}
				className="absolute left-1/2 top-1/2"
				style={{ transform: `translate(-50%, ${BIG_CARD_HEIGHT_PX / 2}px)` }}
				aria-hidden="true"
			/>
			<div ref={endMarkerRef} className="absolute inset-x-0 bottom-0 h-0" aria-hidden="true" />

			<div
				ref={cardRef}
				className="landing-map-cta-card pointer-events-auto absolute left-1/2 top-1/2 w-[912px] h-[487px] -translate-x-1/2 -translate-y-1/2 rounded-[22px] overflow-hidden"
			>
				{/* Big (centered) layout */}
				<div ref={bigContentRef} className="absolute inset-0">
					<div className="relative w-full h-full">
						<div className="absolute left-[198px] top-[53px] w-[678px]">
							<h2 className="font-inter font-light text-[62px] leading-[1.05] text-black text-left">
								100,000+ Contacts
								<br />- Coast to Coast
							</h2>
						</div>

						<div className="absolute left-[200px] bottom-[39px] w-[678px]">
							<p className="font-inter font-normal text-[24px] leading-snug tracking-[0.02em] text-black text-left">
								Venues, Festivals, Wineries, Breweries, Coffee
								<br />
								Shops; Hundreds of thousands of contacts
								<br />
								thoroughly verified by musicians.
							</p>
							<Link
								href="/map"
								className="landing-learn-research-btn mt-[39px] inline-flex items-center justify-center w-[302px] h-[51px] rounded-[6px] bg-transparent"
							>
								<span className="font-inter font-normal text-[24px] text-[#5DAB68]">
									Learn about the Map
								</span>
							</Link>
						</div>
					</div>
				</div>

				{/* Small (bottom-left) layout */}
				<div ref={smallContentRef} className="absolute inset-0 opacity-0">
					<div className="h-full w-full p-[22px] flex flex-col">
						<h2 className="font-inter font-bold text-[25px] leading-[1.1] text-black text-left whitespace-nowrap">
							100,000+ Contacts - Coast to Coast
						</h2>
						<p className="mt-[10px] font-inter font-normal text-[20px] leading-[1.25] tracking-[0.02em] text-black text-left">
							Venues, Festivals, Wineries, Breweries, Coffee
							<br />
							Shops; Hundreds of thousands of contacts
							<br />
							thoroughly verified by musicians.
						</p>
						<Link
							href="/map"
							className="landing-learn-research-btn mt-auto inline-flex items-center justify-center w-[230px] h-[39px] rounded-[6px] bg-transparent"
						>
							<span className="font-inter font-normal text-[18px] text-[#5DAB68]">
								Learn about the Map
							</span>
						</Link>
					</div>
				</div>

				{/* Blurred placeholder - shown during morph to hide text overlap */}
				<div ref={blurPlaceholderRef} className="absolute inset-0 opacity-0">
					<div className="relative h-full w-full">
						{/* Headline block (mirrors big CTA positioning, but scales with the card) */}
						<div className="absolute left-[21.7%] top-[10.9%] w-[74.3%]">
							<div className="h-[clamp(18px,4vw,52px)] w-[92%] rounded-full bg-black/8 blur-[6px]" />
							<div className="mt-[clamp(8px,1.2vw,14px)] h-[clamp(18px,4vw,52px)] w-[68%] rounded-full bg-black/8 blur-[6px]" />
						</div>

						{/* Body + button block (left-aligned, like the real copy) */}
						<div className="absolute left-[21.9%] bottom-[8%] w-[74.3%]">
							<div className="h-[clamp(10px,1.5vw,18px)] w-[95%] rounded-full bg-black/5 blur-[4px]" />
							<div className="mt-[clamp(6px,1vw,10px)] h-[clamp(10px,1.5vw,18px)] w-[88%] rounded-full bg-black/5 blur-[4px]" />
							<div className="mt-[clamp(6px,1vw,10px)] h-[clamp(10px,1.5vw,18px)] w-[72%] rounded-full bg-black/5 blur-[4px]" />

							<div className="mt-[clamp(16px,2.4vw,28px)] h-[clamp(30px,3.2vw,51px)] w-[44.5%] rounded-[6px] bg-[#5DAB68]/14 blur-[4px]" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

