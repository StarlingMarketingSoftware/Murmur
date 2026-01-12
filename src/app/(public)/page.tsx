'use client';
import { LandingHeroSearchBar } from '@/components/molecules/LandingHeroSearchBar/LandingHeroSearchBar';
import LandingPageMap1 from '@/components/atoms/_svg/LandingPageMap1';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { ContactsExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { ContactWithName } from '@/types/contact';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import type { InboundEmailWithRelations } from '@/types';
import { LandingDraftingDemo } from '@/components/molecules/LandingDraftingDemo/LandingDraftingDemo';

// Sample contacts for landing page demo (company-only, no names)
const sampleContacts: ContactWithName[] = [
	{
		id: 1,
		email: 'info@villagevanguard.com',
		firstName: null,
		lastName: null,
		company: 'Village Vanguard',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 178 7th Avenue South in Greenwich Village [2] Legendary jazz club opened in 1935, one of the oldest in NYC [3] Intimate basement venue with capacity of about 123 seats [4] Shows typically at 8:30pm and 10:30pm, reservations recommended [5] No food service, two-drink minimum per set

The Village Vanguard is the most prestigious jazz club in the world, having hosted virtually every major jazz artist since the 1950s. The triangular basement room has exceptional acoustics and an intimate atmosphere. Artists have recorded over 100 live albums here.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 2,
		email: 'info@bluenotejazz.com',
		firstName: null,
		lastName: null,
		company: 'Blue Note Jazz Club',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 131 W 3rd Street in Greenwich Village [2] Premier jazz venue opened in 1981, known for world-class acts [3] Capacity of approximately 240 seats with table seating [4] Two shows nightly at 8pm and 10:30pm, late night jam sessions on weekends [5] Full dinner and cocktail menu available during shows

Blue Note NYC is one of the world's most famous jazz clubs, featuring top international artists nightly. The venue offers an upscale dining experience with excellent sightlines from every seat. They also have a jazz brunch on Sundays.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 3,
		email: 'info@smallsjazzclub.com',
		firstName: null,
		lastName: null,
		company: 'Smalls',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 183 W 10th Street in the West Village [2] Underground jazz club known for nurturing young talent since 1994[3] Cozy basement space with capacity of about 60 people [4] Live music from 7:30pm until 4am, jam sessions after midnight[5] BYOB policy, $20 cover includes all sets for the evening

Smalls is famous for its marathon sessions and launching careers of now-famous musicians. The intimate space creates an electric atmosphere where audience and musicians share the experience. Known for straight-ahead and bebop jazz.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 4,
		email: 'info@nublu.net',
		firstName: null,
		lastName: null,
		company: 'Nublu',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 151 Avenue C in the East Village [2] Eclectic venue mixing jazz, electronic, and world music since 2002 [3] Standing room venue with capacity around 150 people [4] Shows typically start at 9pm or 10pm, often going until 4am [5] Full bar, casual atmosphere with a dance floor

Nublu is known for its experimental and genre-bending programming. The venue has been central to the downtown avant-garde jazz scene and regularly features musicians who blur lines between jazz, electronic, and global sounds.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 5,
		email: 'info@thestonenyc.com',
		firstName: null,
		lastName: null,
		company: 'The Stone',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at The New School, 55 W 13th Street [2] Founded by John Zorn in 2005, dedicated to avant-garde music [3] Small listening room with seating for about 75 people [4] Two shows nightly at 8pm and 10pm, curated by rotating artists [5] Suggested donation, no food or drink service

The Stone is a non-profit performance space focusing on experimental and avant-garde music. Each week features a different artist-curator who programs both sets every night. Known for presenting cutting-edge improvisation and new compositions.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 6,
		email: 'info@mezzrow.com',
		firstName: null,
		lastName: null,
		company: 'Mezzrow',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 163 W 10th Street, sister club to Smalls [2] Opened in 2014, named after jazz clarinetist Mezz Mezzrow [3] Ultra-intimate space with only 40 seats around a grand piano [4] Piano-focused jazz, shows at 7:30pm and 9pm, late sets on weekends [5] Premium spirits and wine, no food service, $20 cover

Mezzrow specializes in piano jazz and features a beautiful Steinway grand. The room was designed for optimal acoustics with the audience seated around the piano. Perfect for duo and trio performances in an elegant speakeasy atmosphere.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 7,
		email: 'info@55bar.com',
		firstName: null,
		lastName: null,
		company: '55 Bar',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 55 Christopher Street in the West Village [2] Legendary dive bar with live jazz since 1919 (speakeasy era) [3] Tiny venue with capacity around 50 people, no stage [4] Two sets nightly, typically at 7pm and 10pm, no cover most nights [5] Cash-only bar, no food, relaxed neighborhood vibe

55 Bar is one of NYC's oldest continuously operating bars. The no-frills atmosphere and lack of stage means musicians play at eye level with the audience. Known for launching careers and attracting top players for low-key gigs.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 8,
		email: 'info@ornithologyjazz.com',
		firstName: null,
		lastName: null,
		company: 'Ornithology',
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at 6 Suydam Street in Bushwick, Brooklyn [2] Named after the Charlie Parker composition, opened in 2017 [3] Industrial-chic space with capacity around 80 people [4] Live jazz nightly starting at 8pm, late night sets on weekends [5] Full cocktail menu and small plates, no cover for early sets

Ornithology brought serious jazz to Brooklyn's Bushwick neighborhood. The venue attracts both established players and rising stars, with a focus on creative and contemporary jazz. The backyard garden is open in warmer months.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
	{
		id: 9,
		email: 'info@dizzys.com',
		firstName: null,
		lastName: null,
		company: "Dizzy's",
		title: 'Music Venue',
		city: 'New York',
		state: 'New York',
		name: null,
		country: 'USA',
		createdAt: new Date(),
		updatedAt: new Date(),
		phone: null,
		website: null,
		contactListId: null,
		address: null,
		apolloPersonId: null,
		emailValidatedAt: null,
		emailValidationStatus: 'unknown',
		emailValidationSubStatus: null,
		headline: null,
		linkedInUrl: null,
		photoUrl: null,
		metadata: `[1] Located at Jazz at Lincoln Center, Broadway at 60th Street [2] Part of Jazz at Lincoln Center, opened in 2004 [3] Stunning room with 140 seats and floor-to-ceiling windows overlooking Central Park [4] Shows at 7:30pm and 9:30pm, student discounts available [5] Southern-inspired menu and craft cocktails, dinner reservations recommended

Dizzy's Club offers one of the most spectacular settings for jazz in the world. The backdrop of Columbus Circle and Central Park through massive windows creates an unforgettable experience. Programming ranges from traditional to contemporary jazz.`,
		userId: null,
		isPrivate: false,
		hasVectorEmbedding: false,
		userContactListCount: 0,
		manualDeselections: 0,
		companyFoundedYear: null,
		companyIndustry: null,
		companyKeywords: [],
		companyLinkedInUrl: null,
		companyPostalCode: null,
		companyTechStack: [],
		companyType: null,
		lastResearchedDate: null,
		latitude: null,
		longitude: null,
	},
];

// Sample inbox data for landing page demo (uses the real InboxSection UI)
const sampleContactsByEmail: Record<string, ContactWithName> = Object.fromEntries(
	sampleContacts
		.filter((c): c is ContactWithName & { email: string } => Boolean(c.email))
		.map((c) => [c.email.toLowerCase().trim(), c])
);

const sampleInboundEmails = [
	{
		id: 101,
		sender: 'info@villagevanguard.com',
		senderName: 'Village Vanguard',
		subject: 'July 4th Celebration — booking inquiry',
		bodyPlain:
			"Thanks so much for reaching out and for your interest in playing here. At the moment, we're not booking new acts for July 4th, but please follow up with alternate dates and a link to live video.",
		strippedText:
			"Thanks so much for reaching out and for your interest in playing here. At the moment, we're not booking new acts for July 4th, but please follow up with alternate dates and a link to live video.",
		bodyHtml: null,
		receivedAt: new Date('2025-12-11T14:12:00Z'),
		contact: null,
		campaign: null,
		originalEmail: null,
	},
	{
		id: 102,
		sender: 'info@bluenotejazz.com',
		senderName: 'Blue Note',
		subject: 'Re: Live jazz performance at Blue Note',
		bodyPlain:
			"Appreciate the note. Please send a one-sheet, a short bio, and 2–3 live clips. If you have a draw in NYC, include recent ticket numbers and preferred weekdays.",
		strippedText:
			"Appreciate the note. Please send a one-sheet, a short bio, and 2–3 live clips. If you have a draw in NYC, include recent ticket numbers and preferred weekdays.",
		bodyHtml: null,
		receivedAt: new Date('2025-12-01T15:05:00Z'),
		contact: null,
		campaign: null,
		originalEmail: null,
	},
] as unknown as InboundEmailWithRelations[];

const sampleSentEmails = [
	{
		id: 201,
		sender: 'info@smallsjazzclub.com',
		senderName: 'Smalls',
		subject: 'Re: Spring dates (Mar–Apr)',
		bodyPlain:
			"Hi there — sharing a quick note about available spring dates. We’d love to be considered for a set in late March or early April. Here are 2 live clips and our one-sheet.",
		strippedText:
			"Hi there — sharing a quick note about available spring dates. We’d love to be considered for a set in late March or early April. Here are 2 live clips and our one-sheet.",
		bodyHtml: null,
		receivedAt: new Date('2025-11-20T19:31:00Z'),
		contact: null,
		campaign: null,
		originalEmail: null,
		isSent: true,
	},
] as unknown as Array<InboundEmailWithRelations & { isSent?: boolean }>;

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
	const [hoveredContact, setHoveredContact] = useState<ContactWithName | null>(sampleContacts[0]);
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
					href={urls.freeTrial.index}
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

				{/* Block below map */}
				<div
					style={{
						marginTop: '145px',
						width: '1866px',
						height: '771px',
						backgroundColor: '#FAFAFA',
						position: 'relative',
					}}
				>
					{/* Inner box - left */}
				<div
					style={{
						position: 'absolute',
						left: '39px',
						top: '200px',
						width: '792px',
						height: '417px',
						backgroundColor: '#EFEFEF',
						borderRadius: '8px',
						paddingLeft: '22px',
						paddingRight: '40px',
						paddingTop: '40px',
						paddingBottom: '40px',
					}}
				>
						<p className="font-inter font-normal text-[62px] text-black leading-tight">
							We Did The Research
						</p>
						<p className="font-inter font-normal text-[25px] text-black mt-6">
							Take a look through every contact, and you'll get to see information on what styles they book, their live music schedules, and even how to actually find the right person.
						</p>
						{/* Learn about research button */}
						<Link href="/research">
							<div
								style={{
									position: 'absolute',
									left: '22px',
									bottom: '75px',
									width: '302px',
									height: '51px',
									border: '2px solid #5DAB68',
									borderRadius: '6px',
									backgroundColor: 'transparent',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									cursor: 'pointer'
								}}
							>
								<span className="font-inter font-normal text-[25px] text-[#5DAB68]">Learn about research</span>
							</div>
						</Link>
					</div>
					{/* Inner box - right - Contacts and Research panels */}
					<div
						style={{
							position: 'absolute',
							right: '74px',
							top: '29px',
							width: '904px',
							height: '712px',
							backgroundColor: '#F1F1F1',
							borderRadius: '8px',
						}}
					>
						{/* Contacts list */}
						<div
							style={{
								position: 'absolute',
								left: '141px',
								top: '108px',
								bottom: '91px',
							}}
						>
							<ContactsExpandedList
								contacts={sampleContacts}
								width={326}
								height={513}
								minRows={9}
								onContactHover={(contact) => {
									if (contact) {
										setHoveredContact(contact);
									}
								}}
							/>
						</div>
						{/* Research panel */}
						<div
							style={{
								position: 'absolute',
								right: '52px',
								top: '31px',
								bottom: '46px',
							}}
						>
						<ContactResearchPanel
							contact={hoveredContact}
							width={359}
							boxWidth={344}
							height={635}
							fixedHeightBoxSpacingPx={60}
							fixedHeightBulletOuterHeightPx={52}
							fixedHeightBulletInnerHeightPx={44}
							expandSummaryToFillHeight
							disableExpansion
							className="!block"
						/>
						</div>
					</div>
				</div>

				{/* Second block below map */}
				<div
					style={{
						marginTop: '82px',
						width: '1866px',
						height: '771px',
						backgroundColor: '#FAFAFA',
						position: 'relative',
					}}
				>
					{/* Inner box - left */}
					<div
						style={{
							position: 'absolute',
							left: '35px',
							top: '26px',
							width: '1130px',
							height: '712px',
							backgroundColor: '#F1F1F1',
							borderRadius: '8px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<InboxSection
							noOuterPadding
							desktopWidth={998}
							desktopHeight={535}
							allowedSenderEmails={Object.keys(sampleContactsByEmail)}
							contactByEmail={sampleContactsByEmail}
							sampleData={{
								inboundEmails: sampleInboundEmails,
								sentEmails: sampleSentEmails,
							}}
						/>
					</div>
					{/* Inner box - right */}
					<div
						style={{
							position: 'absolute',
							right: '42px',
							top: '199px',
							width: '542px',
							height: '459px',
							backgroundColor: '#EFEFEF',
							borderRadius: '8px',
							padding: '40px',
						}}
					>
						<p className="font-inter font-normal text-[62px] text-black leading-tight">
							Every Reply
						</p>
						<p className="font-inter font-normal text-[25px] text-black mt-10">
							Never miss a reply! Get full context on each response, including what campaign it came from, all in one place.
						</p>
						{/* Learn about Inbox button */}
						<Link href="/inbox">
							<div
								style={{
									position: 'absolute',
									left: '31px',
									bottom: '45px',
									width: '260px',
									height: '51px',
									border: '2px solid #5DAB68',
									borderRadius: '6px',
									backgroundColor: 'transparent',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									cursor: 'pointer'
								}}
							>
								<span className="font-inter font-normal text-[25px] text-[#5DAB68]">Learn about Inbox</span>
							</div>
						</Link>
					</div>
				</div>

				{/* Third block below map */}
				<div
					style={{
						marginTop: '75px',
						width: '1866px',
						height: '771px',
						backgroundColor: '#FAFAFA',
						position: 'relative',
					}}
				>
					{/* Inner box - left */}
					<div
						style={{
							position: 'absolute',
							left: '39px',
							top: '140px',
							width: '738px',
							height: '447px',
							backgroundColor: '#EFEFEF',
							borderRadius: '8px',
							padding: '40px',
						}}
					>
						<p className="font-inter font-normal text-[62px] text-black leading-tight">
							Emails That Land
						</p>
						<p className="font-inter font-normal text-[25px] text-black mt-14">
							Emails not getting responses? Ditch the templates. Murmur drafts pitches based on your bio and date range that venues actually respond to.
						</p>
						{/* Learn about Drafting button */}
						<Link href="/drafting">
							<div
								style={{
									position: 'absolute',
									left: '47px',
									bottom: '26px',
									width: '288px',
									height: '51px',
									border: '2px solid #5DAB68',
									borderRadius: '6px',
									backgroundColor: 'transparent',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									cursor: 'pointer'
								}}
							>
								<span className="font-inter font-normal text-[25px] text-[#5DAB68]">Learn about Drafting</span>
							</div>
						</Link>
					</div>
					{/* Inner box - right */}
					<div
						style={{
							position: 'absolute',
							right: '47px',
							top: '27px',
							width: '904px',
							height: '712px',
							backgroundColor: '#F1F1F1',
							borderRadius: '8px',
						}}
					>
						<LandingDraftingDemo />
					</div>
				</div>
			</div>

			{/* Try Murmur Now CTA Section */}
			<div className="w-full bg-white flex flex-col items-center pt-40 pb-24">
				<p className="font-inter font-normal text-[62px] text-black text-center">
					Try Murmur Now
				</p>
				<Link
					href={urls.freeTrial.index}
					className="flex items-center justify-center cursor-pointer text-center text-white font-inter font-medium text-[14px]"
					style={{
						marginTop: '32px',
						width: '219px',
						height: '33px',
						backgroundColor: '#53B060',
						border: '1px solid #118521',
						borderRadius: '8px',
					}}
				>
					Start Free Trial
				</Link>
			</div>
		</main>
	);
}
