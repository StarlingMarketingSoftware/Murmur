'use client';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { LandingHeroSearchBar } from '@/components/molecules/LandingHeroSearchBar/LandingHeroSearchBar';
import { useAdvancedScrollAnimations } from '@/hooks/useAdvancedScrollAnimations';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './landing-animations.css';

export default function HomePage() {
	const {
		addFadeIn,
		addParallax,
		addReveal,
		addSlideUp,
		addStagger,
		addTextReveal,
		addScaleIn,
	} = useAdvancedScrollAnimations();
	const heroRef = useRef<HTMLDivElement>(null);
	const heroVideoRef = useRef<any>(null);
	const heroVideoStyle = {
		// Fill the full hero width; crop (preferably bottom) as needed
		'--media-object-fit': 'cover',
		'--media-object-position': 'top',
		'--controls': 'none',
		'--play-button': 'none',
		'--center-play-button': 'none',
		'--mute-button': 'none',
		'--pip-button': 'none',
		'--airplay-button': 'none',
		'--cast-button': 'none',
		'--fullscreen-button': 'none',
	} as any;

	useEffect(() => {
		// Check if browser is Chrome before running GSAP animations
		const isChrome =
			/Chrome/.test(navigator.userAgent) &&
			/Google Inc/.test(navigator.vendor) &&
			!/Edg/.test(navigator.userAgent);

		if (!isChrome) {
			const browserInfo = {
				isSafari:
					/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
				isEdge: navigator.userAgent.includes('Edg'),
				vendor: navigator.vendor,
				userAgent: navigator.userAgent,
			};
			console.log(
				'[HomePage] Non-Chrome browser detected, skipping GSAP animations',
				browserInfo
			);
			if (heroRef.current) {
				heroRef.current.style.opacity = '1';
			}
			return;
		}

		// Simple hero fade in
		if (heroRef.current) {
			gsap.fromTo(
				heroRef.current,
				{
					opacity: 0,
				},
				{
					opacity: 1,
					duration: 1,
					ease: 'power2.out',
				}
			);
		}

		// No animations for hero text and subtitle - they appear immediately
	}, []);

	// Work around HLS loop "hiccup" by seeking back to the start *before* the stream ends.
	// This avoids hitting the "ended" state, which can cause a noticeable pause on some browsers.
	useEffect(() => {
		const player = heroVideoRef.current;
		if (!player) return;

		let rafId: number | null = null;
		let lastCheckTs = 0;
		let lastSeekTs = 0;
		const CHECK_EVERY_MS = 200;
		const LOOP_THRESHOLD_SECONDS = 0.35;

		const tick = (ts: number) => {
			try {
				// Throttle checks to reduce overhead.
				if (ts - lastCheckTs < CHECK_EVERY_MS) {
					rafId = window.requestAnimationFrame(tick);
					return;
				}
				lastCheckTs = ts;

				const duration = Number(player.duration);
				const currentTime = Number(player.currentTime);

				if (
					Number.isFinite(duration) &&
					duration > 0 &&
					Number.isFinite(currentTime) &&
					duration - currentTime <= LOOP_THRESHOLD_SECONDS &&
					// Avoid repeatedly seeking if the player is still processing a prior seek.
					ts - lastSeekTs > 1000
				) {
					lastSeekTs = ts;
					player.currentTime = 0;
					// Ensure playback continues after seeking.
					player.play?.();
				}
			} catch {
				// Ignore transient read/seek errors
			}

			rafId = window.requestAnimationFrame(tick);
		};

		rafId = window.requestAnimationFrame(tick);

		return () => {
			if (rafId) window.cancelAnimationFrame(rafId);
		};
	}, []);

	return (
		<main className="overflow-x-hidden">
			<div
				id="landing-hero"
				className="relative w-screen h-dvh overflow-hidden bg-background parallax-container"
				ref={heroRef}
				data-parallax-speed="0.3"
			>
				{/* SVG Filter for thinning text */}
				<svg width="0" height="0" className="absolute">
					<defs>
						<filter id="thin-text">
							<feMorphology operator="erode" radius="0.45" />
						</filter>
					</defs>
				</svg>

				{/* Hero frame (locked to the viewport height across breakpoints) */}
				<div className="relative w-full h-full">
					{/* Background video layer */}
					<div className="absolute inset-0 pointer-events-none bg-black">
						<MuxPlayer
							ref={heroVideoRef}
							className="h-full w-full"
							style={heroVideoStyle}
							playbackId="pKbGxKyrsRlE3NJPXUULvpu01wi00CBIBFn8UvbAjyvo4"
							streamType="on-demand"
							preload="auto"
							autoPlay="muted"
							muted
							playsInline
							nohotkeys
							aria-hidden="true"
						/>
						{/* Optional contrast layer to keep UI readable */}
						<div className="absolute inset-0 bg-black/35" />
					</div>

					{/* Content layer */}
					<div className="relative z-10 flex flex-col h-full min-h-[750px] w-full items-center px-4 pt-[164px]">
						<div className="w-full max-w-[1132px] flex flex-col items-center shrink-0">
							<h1
								className="font-primary text-white font-normal leading-[1.05] text-center text-[clamp(44px,8.5vw,88px)]"
								>
								Built to get you booked.
								<br />
								You deserve an audience.
							</h1>
						</div>
						<div className="flex-[0.5]" />
						<div className="w-full flex justify-center px-4 shrink-0">
							<LandingHeroSearchBar
								initialWhy="[Booking]"
								initialWhat="Wine, Beer, and Spirits"
								initialWhere="California"
								readOnly
							/>
						</div>
						<div className="flex-[2]" />
						<div className="flex flex-col justify-end pb-8 sm:pb-12 text-center shrink-0">
							<p className="font-inter font-normal text-[27px] text-[#C4C4C4] mb-2">
								Every Contact in One Place
							</p>
							<p className="font-inter font-normal text-[18px] text-[#B8B8B8] leading-tight">
								Murmur brings together more than 100,000+ venues, festivals, and
							</p>
							<p className="font-inter font-normal text-[18px] text-[#B8B8B8] leading-tight">
								radio stations, with tools to actually reach them.
							</p>
						</div>
					</div>
				</div>
			</div>
			{/* Video Carousel Section */}
			<div className="w-full bg-[#2a2a2a] py-16 overflow-hidden video-carousel-container">
				<div className="video-carousel-track">
					{/* First set of videos */}
					{[
						'0296ecdbfe566d2f84b26c0d11fd9ce4',
						'c632d11b941509127fc6ccfaa43f2eba',
						'a40138f71785012f227bf3430f2524fd',
						'c2efbb80b81b494eaa0c124707e74731',
						'73ed190ad2842b092efbeb5c3270edc9',
					].map((videoId, index) => (
						<div
							key={`video-1-${index}`}
							className="flex-shrink-0 w-[480px] h-[270px] mx-4 overflow-hidden"
						>
							<iframe
								src={`https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/iframe?poster=https%3A%2F%2Fcustomer-frd3j62ijq7wakh9.cloudflarestream.com%2F${videoId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`}
								loading="lazy"
								className="w-full h-full border-none"
								allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
								allowFullScreen
							/>
						</div>
					))}
					{/* Duplicate set for seamless loop */}
					{[
						'0296ecdbfe566d2f84b26c0d11fd9ce4',
						'c632d11b941509127fc6ccfaa43f2eba',
						'a40138f71785012f227bf3430f2524fd',
						'c2efbb80b81b494eaa0c124707e74731',
						'73ed190ad2842b092efbeb5c3270edc9',
					].map((videoId, index) => (
						<div
							key={`video-2-${index}`}
							className="flex-shrink-0 w-[480px] h-[270px] mx-4 overflow-hidden"
						>
							<iframe
								src={`https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/iframe?poster=https%3A%2F%2Fcustomer-frd3j62ijq7wakh9.cloudflarestream.com%2F${videoId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`}
								loading="lazy"
								className="w-full h-full border-none"
								allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
								allowFullScreen
							/>
						</div>
					))}
				</div>
			</div>

			{/* White space section */}
			<div className="w-full bg-white min-h-[200px]" />
		</main>
	);
}
