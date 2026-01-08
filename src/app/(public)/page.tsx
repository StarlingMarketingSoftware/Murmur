'use client';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import Link from 'next/link';
import { PromotionLogos } from '@/components/molecules/PromotionLogos/PromotionLogos';
import { FAQ } from '@/types';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { FaqSection } from '@/components/molecules/FaqSection/FaqSection';
import { VideoPlayer } from '@/components/molecules/VideoPlayer/VideoPlayer';
import { ComparisonTable } from '@/components/molecules/ComparisonTable/ComparisonTable';
import { ScrollingReviews } from '@/components/molecules/ScrollingReviews/ScrollingReviews';
import { LandingHeroSearchBar } from '@/components/molecules/LandingHeroSearchBar/LandingHeroSearchBar';
import { useAdvancedScrollAnimations } from '@/hooks/useAdvancedScrollAnimations';
import MuxPlayer from '@mux/mux-player-react';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './landing-animations.css';

const FAQS: FAQ[] = [
	{
		question: 'What are my email sending limits?',
		answer:
			'You can send different amounts of emails based on your subscription tier (see pricing). Most users opt for the "Standard" tier which allows for 500 outbound emails per month.',
	},
	{
		question: 'How does Murmur personalize emails?',
		answer: `Murmur utilizes a large number of AI models to aid in search; in other words, when you want to reach a recipient, Murmur is doing a series of web searches on their company to allow you, the user, to better address who you're reaching out to. This approach has been shown to radically increase open rates.`,
	},
	{
		question: 'How many email addresses can I gather in Murmur?',
		answer: `Each user can make as many searches as needed to find their desired targeted audience with extensive limits. Each search provides approximately <110 results with contacts that have been extensively validated/verified to ensure you're not reaching out to bounced emails. `,
	},
	{
		question: 'How does Murmur never end up in the spam folder?',
		answer: `We've worked hard to ensure all of the emails sent out from murmur are of a high quality where they seldom will be in a spam folder. We have done extensive development work to ensure this outcome.`,
	},
];

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
								className="font-crimson text-white font-normal leading-[1.05] text-center text-[clamp(44px,8.5vw,88px)]"
								style={{ filter: 'url(#thin-text)' }}
							>
								Built to get you booked.
								<br />
								You deserve an audience.
							</h1>
						</div>
						<div className="flex-[0.5]" />
						<div className="w-full flex justify-center px-4 shrink-0">
							<LandingHeroSearchBar />
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
			{/* Explanation */}
			<div className="w-full bg-gray-200 pt-16 pb-4">
				{/* Video Section */}
				<div className="pt-0 pb-6 px-4">
					<div className="mx-auto max-w-[943px] flex items-center justify-center flex-col">
						<div ref={(el) => addReveal(el)}>
							<Typography
								variant="h2"
								className="text-center sm:text-left text-[30px] sm:text-[42px] w-full mb-8 !font-zen"
							>
								Not Another Email Tool.
							</Typography>
						</div>
						<div className="relative max-w-[943px] w-full h-full aspect-video">
							<VideoPlayer
								playbackId="aBYYjecc99ZfIWP016iEXTwZvyg1HQV700haM1c6Ll9wQ"
								className="h-full w-full"
								thumbnailTime={1.5}
								metadata={{
									video_title: 'Murmur Testimonials',
								}}
							/>
						</div>
						<div ref={(el) => addTextReveal(el)}>
							<Typography
								className="mt-8 mx-auto max-w-[943px] !text-justify"
								variant="promoP"
							>
								{`Murmur serves an entirely different purpose. While other email marketing tools like Mailchimp are great for keeping up an email newsletter, Murmur is designed specifically for musicians and managers in the music industry. We've trained our system on industry knowledge to help you succeed`}
							</Typography>
						</div>
						<div className="flex justify-center mt-24">
							<Link href={urls.contact.index}>
								<Button
									size="lg"
									className="bg-black text-background hover:bg-[#000000]/90 px-12 font-tertiary rounded-[5.59px] luxury-hover luxury-shadow"
								>
									Book a demo
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>

			<div className="w-full bg-[#1C1C1C]">
				<div className="pt-14 sm:pt-28 pb-2 sm:pb-4 px-4">
					<div className="mx-auto max-w-[943px] flex items-center justify-center flex-col">
						<div ref={(el) => addTextReveal(el)}>
							<Typography
								variant="h2"
								className="text-center sm:text-left w-full text-background text-[30px] sm:text-[42px] !font-zen"
							>
								Send without Limits.<br></br> Dream without Boundaries.
							</Typography>
						</div>
						<div
							className="relative max-w-[943px] w-full h-full aspect-video mt-8 sm:mt-12"
							ref={(el) => addReveal(el)}
							data-parallax-speed="0.5"
						>
							<VideoPlayer
								playbackId="z015rWLTn4mlDbMX0021ale02ieVwttxqtZvzc2Z02nVotA"
								className="h-full w-full"
								thumbnailTime={0}
								metadata={{
									video_title: 'Murmur Demo Video',
									video_id: 'murmur-demo-2',
								}}
							/>
						</div>
					</div>
					<div ref={(el) => addSlideUp(el)} data-persistent-content>
						<Typography
							variant="promoP"
							className="w-full max-w-[943px] mx-auto !mt-16 sm:!mt-32 text-background px-4"
							style={{ textAlign: 'justify' }}
						>
							{`Our software gathers data on each contact every time you draft an email with
							advanced search algorithms. This allows Murmur to craft customized emails,
							getting you more responses and more work. Our algorithms are trained on many
							thousands of successful emails. We've made technology that lets you build a
							campaign that cuts through the noise. We know what it takes to succeed.`}
						</Typography>
					</div>
				</div>
				<div className="pb-8 sm:pb-12 overflow-hidden" ref={(el) => addReveal(el)}>
					<ComparisonTable />
				</div>
			</div>

			<div className="w-full bg-background">
				<div className="max-w-[1608px] mx-auto pt-18 sm:pt-24">
					<div ref={(el) => addTextReveal(el)}>
						<Typography variant="h3" className="text-center text-[27px] font-inter">
							Trusted by countless professionals
						</Typography>
					</div>
					<div
						className="pt-16 pb-16 sm:pb-48 w-full mt-8 sm:mt-14 h-fit flex justify-center"
						ref={(el) => addStagger(el)}
					>
						<div
							className="w-full max-w-[1000px]"
							style={{
								maskImage:
									'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 100%)',
								WebkitMaskImage:
									'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)',
							}}
						>
							<PromotionLogos />
						</div>
					</div>
				</div>

				<div ref={(el) => addReveal(el)} className="parallax-container">
					<div ref={(el) => addParallax(el)} data-parallax-speed="0.2">
						<ScrollingReviews />
					</div>
				</div>
			</div>

			<div className="w-full bg-gradient-to-b from-gray-200 to-background py-14 sm:py-25 px-4">
				<div className="mx-auto max-w-[943px]">
					<div ref={(el) => addSlideUp(el)} data-persistent-content>
						<Typography
							variant="h2"
							className="text-center sm:text-left text-[30px] sm:text-[42px] !font-zen"
						>
							Murmur helps you draft.<br></br> No ChatGPT. We built our own.
						</Typography>
					</div>
				</div>
				<div ref={(el) => addSlideUp(el)} data-persistent-content>
					<Typography
						variant="promoP"
						className="w-full max-w-[943px] mx-auto !mt-10"
						style={{ textAlign: 'justify' }}
					>
						{`Our software gathers data on each contact every time you draft an email with
						advanced search algorithms. This allows Murmur to craft customized emails,
						getting you more responses and more work. Our algorithms are trained on many
						thousands of successful emails. We've made technology that lets you build a
						campaign that cuts through the noise. We know what it takes to succeed.`}
					</Typography>
				</div>
			</div>

			<div className="mt-24">
				<div ref={(el) => addTextReveal(el)}>
					<Typography
						variant="h2"
						className="text-center mx-auto py-8 text-[30px] sm:text-[42px] !font-zen"
					>
						{`Find the plan that's right for`} <span className="italic">you</span>
					</Typography>
				</div>
			</div>

			<div className="flex justify-center mt-18 lg:hidden">
				<Link href={urls.pricing.index}>
					<Button variant="muted" size="lg">
						Explore Plans
					</Button>
				</Link>
			</div>

			<div className="mt-6 hidden lg:block">
				<div ref={(el) => addStagger(el)} data-product-list>
					<ProductList billingCycle="year" />
				</div>
				<div className="mt-16 flex justify-center" ref={(el) => addScaleIn(el)}>
					<Link href={urls.pricing.index}>
						<Button
							size="lg"
							className="bg-[#000000] text-background hover:bg-[#000000]/90 px-12 font-tertiary rounded-[5.59px] luxury-hover luxury-shadow"
						>
							Learn More
						</Button>
					</Link>
				</div>
			</div>

			<div className="w-full bg-[#2B2B2B]">
				<div ref={(el) => addReveal(el)} data-faq-section>
					<FaqSection
						faqs={FAQS}
						header=""
						title="FAQs"
						description="Everything you need to know about Murmur!"
						showMoreLink={urls.contact.index}
					/>
				</div>
				<div className="h-24" />
			</div>
		</main>
	);
}
