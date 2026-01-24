'use client';
import { LandingHeroSearchBar } from '@/components/molecules/LandingHeroSearchBar/LandingHeroSearchBar';
import LandingPageMap1 from '@/components/atoms/_svg/LandingPageMap1';
import { LandingPageGoogleMapBackground } from '@/components/molecules/LandingPageGoogleMapBackground/LandingPageGoogleMapBackground';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { urls } from '@/constants/urls';
import { ContactsExpandedList } from '@/app/murmur/campaign/[campaignId]/DraftingSection/Testing/ContactsExpandedList';
import { ContactResearchPanel } from '@/components/molecules/ContactResearchPanel/ContactResearchPanel';
import { ContactWithName } from '@/types/contact';
import InboxSection from '@/components/molecules/InboxSection/InboxSection';
import type { InboundEmailWithRelations } from '@/types';
import { ScaledToFit } from '@/components/atoms/ScaledToFit';

// Prevent SSR hydration mismatches from @dnd-kit IDs inside the drafting demo UI.
const LandingDraftingDemo = dynamic(
	() =>
		import('@/components/molecules/LandingDraftingDemo/LandingDraftingDemo').then(
			(m) => m.LandingDraftingDemo
		),
	{ ssr: false }
);

const DESKTOP_HERO_MUX_PLAYBACK_ID = 'pKbGxKyrsRlE3NJPXUULvpu01wi00CBIBFn8UvbAjyvo4';
const MOBILE_PORTRAIT_HERO_MUX_PLAYBACK_ID =
	'oJRmxjK84SC01hXrjMyuPg7oGbvbRxu1QLCugmaEuYks';
const MOBILE_PORTRAIT_MEDIA_QUERY = '(max-width: 767px) and (orientation: portrait)';

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

declare global {
	interface CloudflareStreamPlayer {
		addEventListener: (event: string, handler: () => void) => void;
		removeEventListener?: (event: string, handler: () => void) => void;
		play?: () => void;
		pause?: () => void;
		currentTime?: number;
		duration?: number;
	}

	interface Window {
		Stream?: (iframe: HTMLIFrameElement) => CloudflareStreamPlayer;
	}
}

export default function HomePage() {
	const heroRef = useRef<HTMLDivElement>(null);
	const heroVideoRef = useRef<any>(null);
	const videoCarouselContainerRef = useRef<HTMLDivElement>(null);
	const landingMapWrapperRef = useRef<HTMLDivElement>(null);
	const heroLastVisibleHeightPxRef = useRef<number | null>(null);
	const [heroPlaybackId, setHeroPlaybackId] = useState(DESKTOP_HERO_MUX_PLAYBACK_ID);
	const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
	const [displayIndex, setDisplayIndex] = useState(1); // Offset by 1 for the prepended last video
	const [skipTransition, setSkipTransition] = useState(false);
	const [activeCarouselVideoProgress, setActiveCarouselVideoProgress] = useState(0);
	const [isActiveCarouselVideoPlaying, setIsActiveCarouselVideoPlaying] = useState(false);
	const [hoveredContact, setHoveredContact] = useState<ContactWithName | null>(sampleContacts[0]);
	const [shouldMountLandingGoogleMap, setShouldMountLandingGoogleMap] = useState(false);
	const [isLandingGoogleMapReady, setIsLandingGoogleMapReady] = useState(false);
	const [landingMapScale, setLandingMapScaleState] = useState(1);
	const landingMapScaleRef = useRef(1);
	
	const videoIds = [
		'217455815bac246b922e15ebd83dacf6',
		'de693044d2ee6f2968a5eb92d73cacaf',
		'5e867125be06a82c81c9bec4ed1f502a',
		'f5ec9f11f866731a70ebf8543d5ecf5a',
		'f4e119c7abb95bb18c011311fe640f4e',
	];

	const carouselStartTimeByVideoId: Record<string, string> = {
		'5e867125be06a82c81c9bec4ed1f502a': '0.5',
	};

	const carouselPosterTimeByVideoId: Record<string, string> = {
		// 2nd video
		'5e867125be06a82c81c9bec4ed1f502a': '3s',
		// 3rd video
		'de693044d2ee6f2968a5eb92d73cacaf': '5.5s',
		// 5th video (previously last; reordering won't break this)
		'f5ec9f11f866731a70ebf8543d5ecf5a': '14.8s',
	};
	
	// Handle seamless looping when wrapping from last->first and first->last
	const prevVideoIndexRef = useRef(0);
	useEffect(() => {
		const prevIndex = prevVideoIndexRef.current;
		const newIndex = currentVideoIndex;
		prevVideoIndexRef.current = newIndex;
		
		// Going from last video (4) to first video (0)
		if (prevIndex === videoIds.length - 1 && newIndex === 0) {
			// First, scroll to the duplicate first video at the end (displayIndex = videoIds.length + 1)
			setDisplayIndex(videoIds.length + 1);
			
			// After animation completes, instantly reset to the real first video position
			setTimeout(() => {
				setSkipTransition(true);
				setDisplayIndex(1);
				// Re-enable transitions after the instant reset
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						setSkipTransition(false);
					});
				});
			}, 650); // Slightly longer than the 600ms CSS transition
		// Going from first video (0) to last video (4)
		} else if (prevIndex === 0 && newIndex === videoIds.length - 1) {
			// First, scroll to the duplicate last video at the beginning (displayIndex = 0)
			setDisplayIndex(0);

			// After animation completes, instantly reset to the real last video position
			setTimeout(() => {
				setSkipTransition(true);
				setDisplayIndex(videoIds.length);
				// Re-enable transitions after the instant reset
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						setSkipTransition(false);
					});
				});
			}, 650); // Slightly longer than the 600ms CSS transition
		} else {
			// Normal transition: displayIndex = currentVideoIndex + 1
			setDisplayIndex(newIndex + 1);
		}
	}, [currentVideoIndex, videoIds.length]);
	const heroVideoStyle = {
		// Fill the full hero width; crop (preferably bottom) as needed
		'--media-object-fit': 'cover',
		'--media-object-position': 'var(--landing-hero-video-object-position, top)',
		'--controls': 'none',
		'--play-button': 'none',
		'--center-play-button': 'none',
		'--mute-button': 'none',
		'--pip-button': 'none',
		'--airplay-button': 'none',
		'--cast-button': 'none',
		'--fullscreen-button': 'none',
	} as any;

	// Swap the hero background video only for the mobile portrait breakpoint.
	useEffect(() => {
		const mql = window.matchMedia(MOBILE_PORTRAIT_MEDIA_QUERY);

		const update = () => {
			setHeroPlaybackId(
				mql.matches
					? MOBILE_PORTRAIT_HERO_MUX_PLAYBACK_ID
					: DESKTOP_HERO_MUX_PLAYBACK_ID
			);
		};

		update();

		// MediaQueryList event APIs vary across older Safari versions.
		const add = (mql as any).addEventListener?.bind(mql) as
			| ((type: 'change', listener: () => void) => void)
			| undefined;
		const remove = (mql as any).removeEventListener?.bind(mql) as
			| ((type: 'change', listener: () => void) => void)
			| undefined;
		if (typeof add === 'function' && typeof remove === 'function') {
			add('change', update);
			return () => remove('change', update);
		}

		const addListener = (mql as any).addListener?.bind(mql) as
			| ((listener: () => void) => void)
			| undefined;
		const removeListener = (mql as any).removeListener?.bind(mql) as
			| ((listener: () => void) => void)
			| undefined;
		if (typeof addListener === 'function' && typeof removeListener === 'function') {
			addListener(update);
			return () => removeListener(update);
		}

		return;
	}, []);

	useEffect(() => {
		const heroEl = heroRef.current;
		if (!heroEl) return;

		const readVisibleHeightPx = () => {
			const vvHeight = window.visualViewport?.height;
			const raw =
				typeof vvHeight === 'number' && vvHeight > 0 ? vvHeight : window.innerHeight;
			return Math.round(raw);
		};

		const setHeroVisibleHeightPx = (heightPx: number) => {
			if (!Number.isFinite(heightPx) || heightPx <= 0) return;
			if (heroLastVisibleHeightPxRef.current === heightPx) return;
			heroLastVisibleHeightPxRef.current = heightPx;
			heroEl.style.setProperty('--landing-hero-visible-height', `${heightPx}px`);
		};

		const isTextInputFocused = () => {
			const active = document.activeElement;
			if (!active) return false;
			return (
				active instanceof HTMLInputElement ||
				active instanceof HTMLTextAreaElement ||
				(active instanceof HTMLElement && active.isContentEditable)
			);
		};

		let rafId: number | null = null;
		const scheduleUpdate = () => {
			if (rafId != null) return;
			rafId = window.requestAnimationFrame(() => {
				rafId = null;
				// Avoid reacting to on-screen keyboard changes.
				if (isTextInputFocused()) return;
				setHeroVisibleHeightPx(readVisibleHeightPx());
			});
		};

		// Initial set (and re-set after HMR without needing refresh)
		scheduleUpdate();

		// iOS Safari "rubber band" can change viewport metrics during scroll without a reliable
		// resize-to-restore event. Listening to scroll keeps us from getting stuck.
		window.addEventListener('resize', scheduleUpdate);
		window.addEventListener('orientationchange', scheduleUpdate);
		window.addEventListener('scroll', scheduleUpdate, { passive: true });
		window.visualViewport?.addEventListener('resize', scheduleUpdate);
		window.visualViewport?.addEventListener('scroll', scheduleUpdate);

		return () => {
			if (rafId != null) window.cancelAnimationFrame(rafId);
			window.removeEventListener('resize', scheduleUpdate);
			window.removeEventListener('orientationchange', scheduleUpdate);
			window.removeEventListener('scroll', scheduleUpdate);
			window.visualViewport?.removeEventListener('resize', scheduleUpdate);
			window.visualViewport?.removeEventListener('scroll', scheduleUpdate);
		};
	}, []);

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

	// Keep the framed map scaling responsive without "cancelling" browser zoom.
	// The previous vw-based transform kept the map the same physical size when zooming.
	useEffect(() => {
		const baseDpr = window.devicePixelRatio || 1;

		const DESIGN_WIDTH_PX = 1884;
		const SCALE_BREAKPOINT_PX = 1582;
		const MOBILE_BREAKPOINT_PX = 767;
		const SIDE_PADDING_DESKTOP_PX = 32;
		const MAP_BORDER_PX = 3;
		const MAP_PADDING_DESKTOP_PX = 16;
		const MAP_PADDING_MOBILE_PX = 0;

		const getLandingZoom = (el: HTMLElement) => {
			const zoomVar = getComputedStyle(el).getPropertyValue('--landing-zoom');
			const zoom = Number.parseFloat(zoomVar);
			return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
		};

		const setLandingMapScale = () => {
			const wrapper = landingMapWrapperRef.current;
			if (!wrapper) return;

			// Normalize to the initial DPR so zooming doesn't increase the computed width.
			const normalizedViewportWidthPx =
				window.innerWidth * ((window.devicePixelRatio || 1) / baseDpr);

			const landingZoom = getLandingZoom(wrapper);
			const isMobile = normalizedViewportWidthPx <= MOBILE_BREAKPOINT_PX;
			// Only mount the live Google Map background on desktop.
			const shouldMountGoogleMap = !isMobile;
			setShouldMountLandingGoogleMap(shouldMountGoogleMap);
			if (!shouldMountGoogleMap) {
				setIsLandingGoogleMapReady(false);
			}
			const sidePaddingPx = isMobile ? 0 : SIDE_PADDING_DESKTOP_PX;
			const mapPaddingPx = isMobile ? MAP_PADDING_MOBILE_PX : MAP_PADDING_DESKTOP_PX;

			// Fit the *outer* framed map (content + padding + border) to the viewport.
			const mapOuterWidthPx = DESIGN_WIDTH_PX + (MAP_BORDER_PX + mapPaddingPx) * 2;
			const availableWidthPx = Math.max(0, normalizedViewportWidthPx - sidePaddingPx);
			const fitScale = availableWidthPx / (mapOuterWidthPx * landingZoom);

			let scale = 1;
			if (normalizedViewportWidthPx <= SCALE_BREAKPOINT_PX) {
				// Fill the viewport width (no mobile side gutters), never exceed 1:1.
				scale = Math.max(0, Math.min(1, fitScale));
			}

			// Clamp precision to avoid churn from tiny float diffs (helps avoid extra rerenders).
			const nextScale = Math.round(scale * 10000) / 10000;
			wrapper.style.setProperty('--landing-map-scale', String(nextScale));
			if (Math.abs(nextScale - landingMapScaleRef.current) > 0.0001) {
				landingMapScaleRef.current = nextScale;
				setLandingMapScaleState(nextScale);
			}
		};

		setLandingMapScale();
		window.addEventListener('resize', setLandingMapScale);

		return () => {
			window.removeEventListener('resize', setLandingMapScale);
		};
	}, []);

	const landingMapMobileCopyScale =
		Number.isFinite(landingMapScale) && landingMapScale > 0
			? Math.max(1, 0.6 / landingMapScale)
			: 1;

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

	// Reset the progress fill when we advance to a new carousel video
	useEffect(() => {
		setActiveCarouselVideoProgress(0);
		setIsActiveCarouselVideoPlaying(false);
	}, [currentVideoIndex]);

	// Initialize the active video's player and set up ended handler
	useEffect(() => {
		const container = videoCarouselContainerRef.current;
		if (!container) return;

		let isUnmounted = false;
		let currentPlayer: ReturnType<NonNullable<typeof window.Stream>> | null = null;
		let onEnded: (() => void) | null = null;
		let onTimeUpdate: (() => void) | null = null;
		let onPlay: (() => void) | null = null;
		let onPause: (() => void) | null = null;
		let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
		let didInit = false;

		const initActivePlayer = () => {
			if (didInit) return true;
			const Stream = window.Stream;
			if (!Stream) return false;

			const iframe = container.querySelector<HTMLIFrameElement>(
				`iframe[data-video-index="${currentVideoIndex}"]`
			);
			if (!iframe) return false;

			try {
				currentPlayer = Stream(iframe);
			} catch {
				return false;
			}
			if (!currentPlayer) return false;

			onEnded = () => {
				if (isUnmounted) return;
				setIsActiveCarouselVideoPlaying(false);
				setActiveCarouselVideoProgress(1);
				// Move to next video, looping back to start
				setCurrentVideoIndex((prev) => (prev + 1) % videoIds.length);
			};

			onTimeUpdate = () => {
				if (isUnmounted || !currentPlayer) return;
				const duration = Number(currentPlayer.duration);
				const currentTime = Number(currentPlayer.currentTime);
				if (!Number.isFinite(duration) || duration <= 0) {
					setActiveCarouselVideoProgress(0);
					return;
				}
				if (!Number.isFinite(currentTime) || currentTime < 0) {
					setActiveCarouselVideoProgress(0);
					return;
				}
				setIsActiveCarouselVideoPlaying(currentTime > 0.05);
				setActiveCarouselVideoProgress(Math.min(1, Math.max(0, currentTime / duration)));
			};

			onPlay = () => {
				if (isUnmounted) return;
				setIsActiveCarouselVideoPlaying(true);
			};

			onPause = () => {
				if (isUnmounted) return;
				// If paused at the very beginning (autoplay didn't kick in), keep the poster overlay visible.
				const currentTime = Number(currentPlayer?.currentTime);
				if (!Number.isFinite(currentTime) || currentTime <= 0.05) {
					setIsActiveCarouselVideoPlaying(false);
				}
			};

			try {
				currentPlayer.addEventListener('ended', onEnded);
				currentPlayer.addEventListener('timeupdate', onTimeUpdate);
				currentPlayer.addEventListener('play', onPlay);
				currentPlayer.addEventListener('pause', onPause);
				onTimeUpdate();
			} catch {
				// SDK may not support event listeners
			}

			// Autoplay fallback: some embeds don't always start on their own.
			// Try to start playback after the player is initialized.
			setTimeout(() => {
				if (isUnmounted) return;
				try {
					currentPlayer?.play?.();
				} catch {
					// ignore
				}
			}, 75);

			didInit = true;
			return true;
		};

		const ensureStreamSdk = () => {
			const startInitLoop = () => {
				const MAX_ATTEMPTS = 25;
				const RETRY_MS = 80;

				let attempts = 0;
				const attempt = () => {
					if (isUnmounted) return;
					if (initActivePlayer()) return;
					attempts += 1;
					if (attempts >= MAX_ATTEMPTS) return;
					retryTimeoutId = setTimeout(attempt, RETRY_MS);
				};

				attempt();
			};

			if (window.Stream) {
				startInitLoop();
				return;
			}

			const existing = document.querySelector<HTMLScriptElement>(
				'script[data-cloudflare-stream-sdk="true"]'
			);
			if (existing) {
				existing.addEventListener('load', startInitLoop, { once: true });
				return;
			}

			const script = document.createElement('script');
			script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
			script.async = true;
			script.dataset.cloudflareStreamSdk = 'true';
			script.onload = () => startInitLoop();
			document.body.appendChild(script);
		};

		// Delay to ensure iframe is rendered after state change
		const timeoutId = setTimeout(ensureStreamSdk, 200);

		return () => {
			isUnmounted = true;
			clearTimeout(timeoutId);
			if (retryTimeoutId) clearTimeout(retryTimeoutId);
			if (currentPlayer && onEnded) {
				try {
					currentPlayer.removeEventListener?.('ended', onEnded);
					if (onTimeUpdate) currentPlayer.removeEventListener?.('timeupdate', onTimeUpdate);
					if (onPlay) currentPlayer.removeEventListener?.('play', onPlay);
					if (onPause) currentPlayer.removeEventListener?.('pause', onPause);
				} catch {
					// ignore
				}
			}
		};
	}, [currentVideoIndex, displayIndex, videoIds.length]);

	return (
		<main className="overflow-x-hidden">
			<div className="landing-zoom-80">
				<div
					id="landing-hero"
					className="landing-hero relative w-full overflow-hidden bg-background parallax-container"
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
							playbackId={heroPlaybackId}
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
					<div className="relative z-10 flex flex-col h-full min-h-0 md:min-h-[750px] w-full items-center px-4 pt-[90px] md:pt-[164px] [@media(orientation:landscape)_and_(max-height:500px)]:pt-[60px]">
						<div className="w-full max-w-[1132px] flex flex-col items-center shrink-0">
							<h1
								className="font-primary text-white font-normal leading-[1.05] text-center text-[clamp(36px,8.5vw,88px)] [@media(orientation:landscape)_and_(max-height:500px)]:text-[clamp(36px,8.5vmin,88px)]"
								>
								Built to get you booked.
								<br />
								You deserve an audience.
							</h1>
						</div>
						<div className="flex-[0.5]" />
						<div className="hidden md:flex w-full justify-center px-4 shrink-0">
							<LandingHeroSearchBar
								initialWhy="[Booking]"
								initialWhat="Wine, Beer, and Spirits"
								initialWhere="California"
								readOnly
							/>
						</div>
						<div className="flex-1 md:flex-[2]" />
						{/* Mobile-only spacer to push content down toward the bottom */}
						<div
							className="md:hidden"
							style={{ height: 'calc(140px / var(--landing-zoom, 1))' }}
						/>
						<div className="flex flex-col justify-end pb-8 sm:pb-12 text-center shrink-0 w-full items-center">
							<div className="w-full max-w-[603px]">
								<p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-[#C4C4C4] mb-2 [@media(orientation:landscape)_and_(max-height:500px)]:!text-[22px]">
									Every Contact in One Place
								</p>
							<p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-[#B8B8B8] leading-tight [@media(orientation:landscape)_and_(max-height:500px)]:!text-[11.5px]">
								Murmur brings together more than 100,000+ venues, festivals, and
							</p>
							<p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-[#B8B8B8] leading-tight [@media(orientation:landscape)_and_(max-height:500px)]:!text-[11.5px]">
								radio stations, with tools to actually reach them.
							</p>
							</div>
							{/* Mobile-only CTA anchored to bottom of the hero/video area */}
							<div className="w-full flex justify-center md:hidden mt-4">
								<Link
									href={urls.freeTrial.index}
									className="landing-hero-free-trial-btn h-[56px] flex items-center justify-center text-white font-inter font-semibold text-[18px] bg-[#53B060] border-2 border-[#118521] rounded-[8px]"
								>
									Start Free Trial
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
			{/* Video Carousel Section */}
			<div
				ref={videoCarouselContainerRef}
				className="w-full bg-[#EBEBEB] py-16 overflow-hidden video-carousel-container"
			>
				{(() => {
					// Render extra repeated thumbnails on both sides so you don't see "empty space"
					// when the viewport gets very wide (e.g. browser zoomed far out).
					// Only the active item mounts an iframe; the rest are poster thumbnails.
					const CAROUSEL_REPEAT_SEGMENTS_PER_SIDE = 10;

					// Base segment supports seamless looping: [last, ...all, first]
					const baseVideos = [
						{ videoId: videoIds[videoIds.length - 1], originalIndex: videoIds.length - 1 },
						...videoIds.map((id, i) => ({ videoId: id, originalIndex: i })),
						{ videoId: videoIds[0], originalIndex: 0 },
					];

					// Repeat the same seamless segment on both sides.
					// This avoids visible seams like "... last, last ..." when zoomed way out.
					const repeatedBase = Array.from(
						{ length: CAROUSEL_REPEAT_SEGMENTS_PER_SIDE },
						() => baseVideos
					).flat();

					const baseOffset = repeatedBase.length; // index where the "main" segment starts
					const activeDisplayIndex = baseOffset + displayIndex;
					const renderVideos = [...repeatedBase, ...baseVideos, ...repeatedBase];
					
					return (
						<div 
							className={`video-carousel-track ${skipTransition ? 'no-transition' : ''}`}
							style={{
								// Center the active video relative to the carousel container (zoom-safe).
								transform: `translateX(calc(-${activeDisplayIndex} * (var(--video-carousel-item-width) + var(--video-carousel-gap)) - (var(--video-carousel-item-width) / 2)))`,
							}}
						>
							{renderVideos.map(({ videoId, originalIndex }, idx) => {
								const isActive = idx === activeDisplayIndex;
								// Start time offsets for specific videos (in seconds)
								const startAt = carouselStartTimeByVideoId[videoId];
								const startTime = startAt ? `&startTime=${startAt}` : '';
								// Get poster thumbnail time (can be different from startTime)
								const posterTime = carouselPosterTimeByVideoId[videoId] ?? '';
								const posterUrl = posterTime
									? `https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=${posterTime}&height=600`
									: `https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?height=600`;
								const showPosterOverlay = !isActive || !isActiveCarouselVideoPlaying;
								return (
									<div
										key={`video-display-${idx}`}
										className={`video-carousel-item ${isActive ? 'active' : ''}`}
										role={!isActive ? 'button' : undefined}
										tabIndex={!isActive ? 0 : undefined}
										aria-label={
											!isActive
												? `Play video ${originalIndex + 1}`
												: `Video ${originalIndex + 1}`
										}
										onClick={() => {
											if (isActive) return;
											setActiveCarouselVideoProgress(0);
											setIsActiveCarouselVideoPlaying(false);
											setCurrentVideoIndex(originalIndex);
										}}
										onKeyDown={(e) => {
											if (isActive) return;
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												setActiveCarouselVideoProgress(0);
												setIsActiveCarouselVideoPlaying(false);
												setCurrentVideoIndex(originalIndex);
											}
										}}
									>
										{/* Overlay to hide play button and show thumbnail on non-active videos */}
										<div 
											className={`absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none ${showPosterOverlay ? 'opacity-100' : 'opacity-0'}`}
											style={{
												backgroundColor: '#000',
												backgroundImage: `url(${posterUrl})`,
												backgroundSize: 'cover',
												backgroundPosition: 'center',
											}}
										/>
										{isActive ? (
											<iframe
												key={`iframe-${idx}`}
												id={`landing-carousel-video-${videoId}-${idx}`}
												data-cf-stream-video="true"
												data-video-index={originalIndex}
												src={`https://customer-frd3j62ijq7wakh9.cloudflarestream.com/${videoId}/iframe?autoplay=true&muted=true&preload=auto${startTime}`}
												className="w-full h-full border-none"
												allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
												allowFullScreen
												title={`Murmur video ${originalIndex + 1}`}
											/>
										) : null}
									</div>
								);
							})}
						</div>
					);
				})()}

				{/* Carousel progress dots */}
				<div className="video-carousel-indicators" aria-label="Video carousel navigation">
					{videoIds.map((_, idx) => {
						const isActive = idx === currentVideoIndex;
						return (
							<button
								key={`carousel-indicator-${idx}`}
								type="button"
								className={`video-carousel-indicator ${isActive ? 'active' : ''}`}
								aria-label={`Go to video ${idx + 1}`}
								aria-current={isActive ? true : undefined}
								onClick={() => {
									if (idx === currentVideoIndex) return;
									setActiveCarouselVideoProgress(0);
									setIsActiveCarouselVideoPlaying(false);
									setCurrentVideoIndex(idx);
								}}
							>
								{isActive ? (
									<div
										className="video-carousel-indicator-fill"
										style={{ width: `${activeCarouselVideoProgress * 100}%` }}
									/>
								) : null}
							</button>
						);
					})}
				</div>
			</div>

			{/* Start Free Trial Button Section */}
			<div className="landing-map-section w-full bg-white flex flex-col items-center">
				<Link
					href={urls.freeTrial.index}
					className="landing-free-trial-btn hidden md:flex items-center justify-center bg-transparent cursor-pointer text-center"
				>
					Start Free Trial
				</Link>
				<div className="landing-map-wrapper" ref={landingMapWrapperRef}>
					<div
						className={`landing-map-container ${
							isLandingGoogleMapReady ? 'landing-map-container--google' : ''
						}`}
					>
						{/* Desktop-only: live Google Map background (SVG raster stays until map is ready) */}
						{shouldMountLandingGoogleMap ? (
							<div
								className="absolute inset-[16px] z-0"
								aria-hidden="true"
							>
								<LandingPageGoogleMapBackground
									className="w-full h-full"
									onReady={() => setIsLandingGoogleMapReady(true)}
								/>
							</div>
						) : null}
						<LandingPageMap1
							// Crop out extra SVG padding so the framed map box sits centered/snug.
							viewBox="0 0 1858 1044"
							preserveAspectRatio="xMidYMid meet"
							width="100%"
							height="100%"
							mobileCopyScale={landingMapMobileCopyScale}
							className="landing-map-svg relative z-10 block md:pointer-events-none"
						/>
						{/* Overlay "Learn about the Map" button with anti-scaling logic */}
						<Link
							href="/map"
							className="landing-learn-research-btn hidden md:flex items-center justify-center bg-[#F1F1F1] z-20"
							style={{
								position: 'absolute',
								// Matches SVG position x=38 y=638 plus container padding/border offset
								left: '55px',
								top: '652px',
								width: '302px',
								height: '51px',
								borderRadius: '6px',
								cursor: 'pointer',
								transformOrigin: 'top left',
								// When map scales down, scale this button up (clamped) to remain readable
								transform: 'scale(calc(max(1, 0.65 / var(--landing-map-scale, 1))))',
							}}
						>
							<span className="font-inter font-normal text-[24px] text-[#5DAB68]">
								Learn about the Map
							</span>
						</Link>
					</div>
				</div>

				{/* Block below map */}
				{/* Narrow layout: stack text on top, demo below */}
				<div className="landing-after-map 2xl:hidden w-full px-[14%]">
					<div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA]">
						{/* Text */}
						<div className="bg-[#EFEFEF] rounded-[8px] px-6 py-6">
							<p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
								We Did The Research
							</p>
							<p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
								Take a look through every contact, and you&apos;ll get to see information on what styles they
								book, their live music schedules, and even how to actually find the right person.
							</p>
							<Link
								href="/research"
								className="landing-learn-research-btn mt-4 inline-flex h-[40px] px-4 items-center justify-center border-2 border-[#5DAB68] rounded-[6px] bg-transparent"
							>
								<span className="font-inter font-normal text-[16px] xs:text-[18px] text-[#5DAB68]">
									Learn about research
								</span>
							</Link>
						</div>

						{/* Demo */}
						<div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-6 pt-8 pb-10 overflow-hidden">
							<ScaledToFit baseWidth={709} baseHeight={635}>
								<div className="flex gap-6">
									<div className="mt-[76px]">
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
							</ScaledToFit>
						</div>
					</div>
				</div>

				{/* Wide layout: original design */}
				<div
					className="hidden 2xl:block"
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
							Take a look through every contact, and you&apos;ll get to see information on what styles they book, their live music schedules, and even how to actually find the right person.
						</p>
						{/* Learn about research button */}
						<Link href="/research">
							<div
								className="landing-learn-research-btn"
								style={{
									position: 'absolute',
									left: '22px',
									bottom: '75px',
									width: '302px',
									height: '51px',
									borderRadius: '6px',
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
				{/* Narrow layout: stack text on top, demo below */}
				<div className="2xl:hidden w-full px-[14%]" style={{ marginTop: '82px' }}>
					<div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA]">
						{/* Text */}
						<div className="bg-[#EFEFEF] rounded-[8px] px-6 py-6">
							<p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
								Every Reply
							</p>
							<p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
								Never miss a reply! Get full context on each response, including what campaign it came from,
								all in one place.
							</p>
							<Link
								href="/inbox"
								className="landing-learn-research-btn mt-4 inline-flex h-[40px] px-4 items-center justify-center border-2 border-[#5DAB68] rounded-[6px] bg-transparent"
							>
								<span className="font-inter font-normal text-[16px] xs:text-[18px] text-[#5DAB68]">
									Learn about Inbox
								</span>
							</Link>
						</div>

						{/* Demo */}
						<div className="mt-6 bg-[#F1F1F1] rounded-[8px] px-4 xs:px-6 pt-6 xs:pt-8 pb-8 xs:pb-10 overflow-hidden">
							<ScaledToFit baseWidth={856} baseHeight={535}>
								<InboxSection
									noOuterPadding
									forceDesktopLayout
									demoMode
									desktopWidth={856}
									desktopHeight={535}
									allowedSenderEmails={Object.keys(sampleContactsByEmail)}
									contactByEmail={sampleContactsByEmail}
									sampleData={{
										inboundEmails: sampleInboundEmails,
										sentEmails: sampleSentEmails,
									}}
								/>
							</ScaledToFit>
						</div>
					</div>
				</div>

				{/* Wide layout: original design */}
				<div
					className="hidden 2xl:block"
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
							Never miss a reply! Get full context on each response, including what campaign it came from,
							all in one place.
						</p>
						{/* Learn about Inbox button */}
						<Link href="/inbox">
							<div
								className="landing-learn-research-btn"
								style={{
									position: 'absolute',
									left: '31px',
									bottom: '45px',
									width: '260px',
									height: '51px',
									borderRadius: '6px',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									cursor: 'pointer',
								}}
							>
								<span className="font-inter font-normal text-[25px] text-[#5DAB68]">
									Learn about Inbox
								</span>
							</div>
						</Link>
					</div>
				</div>

				{/* Third block below map */}
				{/* Narrow layout: stack text on top, demo below */}
				<div className="2xl:hidden w-full px-[14%]" style={{ marginTop: '75px' }}>
					<div className="mx-auto w-full max-w-[904px] bg-[#FAFAFA]">
						{/* Text */}
						<div className="bg-[#EFEFEF] rounded-[8px] px-6 py-6">
							<p className="font-inter font-normal text-[22px] xs:text-[24px] sm:text-[27px] text-black leading-tight">
								Emails That Land
							</p>
							<p className="font-inter font-normal text-[11.5px] xs:text-[12.5px] sm:text-[18px] text-black leading-tight mt-2 break-words">
								Emails not getting responses? Ditch the templates. Murmur drafts pitches based on your bio and date range that venues actually respond to.
							</p>
							<Link
								href="/drafting"
								className="landing-learn-research-btn mt-4 inline-flex h-[40px] px-4 items-center justify-center border-2 border-[#5DAB68] rounded-[6px] bg-transparent"
							>
								<span className="font-inter font-normal text-[16px] xs:text-[18px] text-[#5DAB68]">
									Learn about Drafting
								</span>
							</Link>
						</div>

						{/* Demo */}
						<div className="mt-6 bg-[#F1F1F1] rounded-[8px] overflow-hidden">
							<ScaledToFit baseWidth={904} baseHeight={712}>
								<LandingDraftingDemo />
							</ScaledToFit>
						</div>
					</div>
				</div>

				{/* Wide layout: original design */}
				<div
					className="hidden 2xl:block"
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
								className="landing-learn-research-btn"
								style={{
									position: 'absolute',
									left: '47px',
									bottom: '26px',
									width: '288px',
									height: '51px',
									borderRadius: '6px',
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
			<div className="w-full bg-white flex flex-col items-center justify-center h-[280px] md:h-[450px] lg:h-[747px]">
				<p className="font-inter font-normal text-[clamp(32px,9vw,62px)] text-black text-center leading-[1.05]">
					Try Murmur Now
				</p>
				<Link
					href={urls.freeTrial.index}
					className="landing-bottom-free-trial-btn flex items-center justify-center cursor-pointer text-center text-white font-inter font-medium text-[14px]"
					style={{
						marginTop: '32px',
						width: '219px',
						height: '33px',
					}}
				>
					Start Free Trial
				</Link>
			</div>
			</div>
		</main>
	);
}
