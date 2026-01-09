'use client';
import { LandingHeroSearchBar } from '@/components/molecules/LandingHeroSearchBar/LandingHeroSearchBar';
import LandingPageMap1 from '@/components/atoms/_svg/LandingPageMap1';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import './landing-animations.css';

declare global {
	interface Window {
		Stream?: (iframe: HTMLIFrameElement) => {
			addEventListener: (event: string, handler: () => void) => void;
			removeEventListener?: (event: string, handler: () => void) => void;
			play?: () => void;
			pause?: () => void;
		};
	}
}

export default function HomePage() {
	const heroRef = useRef<HTMLDivElement>(null);
	const heroVideoRef = useRef<any>(null);
	const videoCarouselContainerRef = useRef<HTMLDivElement>(null);
	const [isVideoCarouselPaused, setIsVideoCarouselPaused] = useState(false);
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

	useEffect(() => {
		const container = videoCarouselContainerRef.current;
		if (!container) return;

		let isUnmounted = false;
		const playingKeys = new Set<string>();
		const playersByKey = new Map<string, ReturnType<NonNullable<typeof window.Stream>>>();
		const cleanupFns: Array<() => void> = [];

		const updatePaused = () => {
			if (isUnmounted) return;
			setIsVideoCarouselPaused(playingKeys.size > 0);
		};

		const initStreamPlayers = () => {
			const Stream = window.Stream;
			if (!Stream) return;

			const iframes = Array.from(
				container.querySelectorAll<HTMLIFrameElement>('iframe[data-cf-stream-video="true"]')
			);
			if (iframes.length === 0) return;

			const setupPlayer = (iframe: HTMLIFrameElement) => {
				const key = iframe.getAttribute('data-cf-stream-key') || iframe.id;
				if (!key) return;

				// Store original src to reload iframe back to unplayed state
				const originalSrc = iframe.src;

				let player: ReturnType<NonNullable<typeof window.Stream>> | null = null;
				try {
					player = Stream(iframe);
				} catch {
					player = null;
				}
				if (!player) return;

				playersByKey.set(key, player);

				const onPlay = () => {
					// Ensure only one carousel video can play at a time.
					playingKeys.clear();
					playingKeys.add(key);
					updatePaused();

					for (const [otherKey, otherPlayer] of playersByKey.entries()) {
						if (otherKey === key) continue;
						try {
							otherPlayer.pause?.();
						} catch {
							// ignore
						}
					}
				};
				const onPause = () => {
					playingKeys.delete(key);
					updatePaused();
				};
				const onEnded = () => {
					playingKeys.delete(key);
					updatePaused();
					// Reload iframe to reset to unplayed state with poster and play button
					iframe.src = originalSrc;
					// Re-initialize player after iframe reloads
					const onLoad = () => {
						iframe.removeEventListener('load', onLoad);
						setupPlayer(iframe);
					};
					iframe.addEventListener('load', onLoad);
				};

				try {
					player.addEventListener('play', onPlay);
					player.addEventListener('pause', onPause);
					player.addEventListener('ended', onEnded);
				} catch {
					// If the SDK fails to attach listeners, just skip pausing behavior.
					return;
				}

				cleanupFns.push(() => {
					try {
						player?.removeEventListener?.('play', onPlay);
						player?.removeEventListener?.('pause', onPause);
						player?.removeEventListener?.('ended', onEnded);
					} catch {
						// ignore
					}
				});
			};

			for (const iframe of iframes) {
				setupPlayer(iframe);
			}
		};

		const ensureStreamSdk = () => {
			if (window.Stream) {
				initStreamPlayers();
				return;
			}

			const existing = document.querySelector<HTMLScriptElement>(
				'script[data-cloudflare-stream-sdk="true"]'
			);
			if (existing) {
				const onLoad = () => initStreamPlayers();
				existing.addEventListener('load', onLoad, { once: true });
				cleanupFns.push(() => existing.removeEventListener('load', onLoad));
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
			script.async = true;
			script.dataset.cloudflareStreamSdk = 'true';
			script.onload = () => initStreamPlayers();
			document.body.appendChild(script);
			cleanupFns.push(() => {
				script.onload = null;
			});
		};

		ensureStreamSdk();

		return () => {
			isUnmounted = true;
			playingKeys.clear();
			for (const fn of cleanupFns) fn();
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
			<div
				ref={videoCarouselContainerRef}
				data-paused={isVideoCarouselPaused ? 'true' : 'false'}
				className="w-full h-[661px] bg-[#EBEBEB] py-16 overflow-hidden video-carousel-container"
			>
				<div className="video-carousel-track">
					{/* First set of videos */}
					{[
						'0296ecdbfe566d2f84b26c0d11fd9ce4',
						'c632d11b941509127fc6ccfaa43f2eba',
						'c2efbb80b81b494eaa0c124707e74731',
						'a40138f71785012f227bf3430f2524fd',
						'73ed190ad2842b092efbeb5c3270edc9',
					].map((videoId, index) => (
						<div
							key={`video-1-${index}`}
							className="flex-shrink-0 w-[946px] h-[532px] mx-4 overflow-hidden"
						>
							<iframe
								id={`landing-carousel-video-1-${videoId}-${index}`}
								data-cf-stream-video="true"
								data-cf-stream-key={`landing-carousel-video-1-${videoId}-${index}`}
								src={`https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/iframe?poster=https%3A%2F%2Fcustomer-frd3j62ijq7wakh9.cloudflarestream.com%2F${videoId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D${videoId === 'c632d11b941509127fc6ccfaa43f2eba' ? '1s' : videoId === '0296ecdbfe566d2f84b26c0d11fd9ce4' ? '9s' : ''}%26height%3D600`}
								loading="lazy"
								className="w-full h-full border-none"
								allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
								allowFullScreen
								title={`Murmur video ${index + 1}`}
							/>
						</div>
					))}
					{/* Duplicate set for seamless loop */}
					{[
						'0296ecdbfe566d2f84b26c0d11fd9ce4',
						'c632d11b941509127fc6ccfaa43f2eba',
						'c2efbb80b81b494eaa0c124707e74731',
						'a40138f71785012f227bf3430f2524fd',
						'73ed190ad2842b092efbeb5c3270edc9',
					].map((videoId, index) => (
						<div
							key={`video-2-${index}`}
							className="flex-shrink-0 w-[946px] h-[532px] mx-4 overflow-hidden"
						>
							<iframe
								id={`landing-carousel-video-2-${videoId}-${index}`}
								data-cf-stream-video="true"
								data-cf-stream-key={`landing-carousel-video-2-${videoId}-${index}`}
								src={`https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/iframe?poster=https%3A%2F%2Fcustomer-frd3j62ijq7wakh9.cloudflarestream.com%2F${videoId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D${videoId === 'c632d11b941509127fc6ccfaa43f2eba' ? '1s' : videoId === '0296ecdbfe566d2f84b26c0d11fd9ce4' ? '9s' : ''}%26height%3D600`}
								loading="lazy"
								className="w-full h-full border-none"
								allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
								allowFullScreen
								title={`Murmur video ${index + 1} (duplicate)`}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Start Free Trial Button Section */}
			<div className="w-full bg-white flex flex-col items-center" style={{ paddingTop: '124px' }}>
				<Link
					href={urls.pricing.freeTrial.index}
					className="flex items-center justify-center bg-transparent cursor-pointer text-center"
					style={{
						width: '707px',
						height: '57px',
						border: '4px solid #118521',
						borderRadius: '10px',
						color: '#238731',
						fontSize: '18px',
						fontWeight: 500,
						textAlign: 'center',
					}}
				>
					Start Free Trial
				</Link>
				<div
					className="relative flex items-center justify-center"
					style={{
						marginTop: '125px',
						width: '1884px',
						height: '1073px',
						border: '3px solid #000000',
						borderRadius: '8px',
						backgroundColor: '#AFD6EF',
						padding: '16px',
						overflow: 'hidden',
					}}
				>
					<LandingPageMap1
						// Crop out extra SVG padding so the framed map box sits centered/snug.
						viewBox="0 0 1858 1044"
						preserveAspectRatio="xMidYMid meet"
						width="100%"
						height="100%"
						className="block"
					/>
				</div>
			</div>

			{/* White space section */}
			<div className="w-full bg-white min-h-[200px]" />
		</main>
	);
}
