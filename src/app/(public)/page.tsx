'use client';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
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
import { LeadSender } from '@/components/organisms/LeadSender/LeadSender';
import { LaunchButton } from '@/components/atoms/LaunchButton/LaunchButton';
import { useScrollAnimations } from '@/hooks/useScrollAnimations';
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
	const { addTextSlide, addFadeIn } = useScrollAnimations();
	const heroRef = useRef<HTMLDivElement>(null);

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
	}, []);

	return (
		<main className="overflow-hidden">
			<div
				className="relative w-screen bg-background py-12 sm:py-16 md:py-20 lg:py-24"
				ref={heroRef}
			>
				{/* Content layer */}
				<div className="relative justify-items-center gap-0 flex flex-col items-center justify-start">
					{/* Exact dashboard structure */}
					<div className="flex justify-center w-full px-4">
						<div className="text-center w-full max-w-[900px]">
							<div
								className="inline-block"
								data-transition-element="logo-start"
								data-hero-element
							>
								<LogoIcon width="106px" height="84px" />
							</div>
							<Typography
								variant="h1"
								className="text-center mt-2 !text-[60px] sm:!text-[70px] md:!text-[80px] leading-[0.8]"
								data-transition-element="title-start"
								data-hero-element
							>
								Murmur
							</Typography>
							<Typography
								className="text-center !text-[24px] sm:!text-[28px] md:!text-[34px] leading-[1] mt-8 sm:mt-12 md:mt-16 lg:mt-[72px] whitespace-normal sm:whitespace-nowrap font-tertiary font-normal"
								data-hero-element
							>
								Get Contacts. Get Work. Email Anyone.
							</Typography>
							<div
								className="w-full max-w-[764px] mx-auto mt-2 flex items-center justify-center px-4"
								data-hero-element
							>
								<Typography
									variant="p"
									className="text-center text-black font-secondary !text-[14px] sm:!text-[22px] md:!text-[26px] whitespace-nowrap font-[300]"
								>
									The Ultimate Database + Email Tool for Musicians
								</Typography>
							</div>
						</div>
					</div>

					<div
						className="mt-8 sm:mt-10 md:mt-12 flex flex-col items-center"
						data-hero-element
					>
						<LeadSender />
						<div className="mt-0 mx-auto w-full max-w-[490px] px-4 luxury-cta">
							<LaunchButton />
						</div>
						<Typography variant="p" className="text-center mt-4 tracking-[0.08em]">
							Full access for 7 days. Start today.
						</Typography>
					</div>
				</div>
				<div className="h-16 sm:h-20 md:h-24"></div>
			</div>
			{/* Explanation */}
			<div className="w-full bg-gray-200 pt-16 pb-4">
				{/* Video Section */}
				<div className="pt-0 pb-6 px-4">
					<div className="mx-auto max-w-[943px] flex items-center justify-center flex-col">
						<div ref={(el) => addTextSlide(el)}>
							<Typography
								variant="h2"
								className="text-center sm:text-left text-[30px] sm:text-[42px] w-full mb-8 font-tertiary"
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
						<div ref={(el) => addTextSlide(el)}>
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
						<div ref={(el) => addTextSlide(el)}>
							<Typography
								variant="h2"
								className="text-center sm:text-left w-full text-background text-[30px] sm:text-[42px] font-tertiary"
							>
								Send without Limits.<br></br> Dream without Boundaries.
							</Typography>
						</div>
						<div
							className="relative max-w-[943px] w-full h-full aspect-video mt-8 sm:mt-12"
							ref={(el) => addFadeIn(el)}
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
					<div ref={(el) => addTextSlide(el)} data-persistent-content>
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
				<div className="pb-8 sm:pb-12 overflow-hidden" ref={(el) => addFadeIn(el)}>
					<ComparisonTable />
				</div>
			</div>

			<div className="w-full bg-background">
				<div className="max-w-[1608px] mx-auto pt-18 sm:pt-24">
					<div ref={(el) => addTextSlide(el)}>
						<Typography variant="h3" className="text-center text-[27px] font-secondary">
							Trusted by countless professionals
						</Typography>
					</div>
					<div
						className="pt-16 pb-16 sm:pb-48 w-full mt-8 sm:mt-14 h-fit flex justify-center"
						ref={(el) => addFadeIn(el)}
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

				<div ref={(el) => addFadeIn(el)}>
					<ScrollingReviews />
				</div>
			</div>

			<div className="w-full bg-gradient-to-b from-gray-200 to-white py-14 sm:py-25 px-4">
				<div className="mx-auto max-w-[943px]">
					<div ref={(el) => addTextSlide(el)} data-persistent-content>
						<Typography
							variant="h2"
							className="text-center sm:text-left text-[30px] sm:text-[42px] font-tertiary"
						>
							Murmur helps you draft.<br></br> No ChatGPT. We built our own.
						</Typography>
					</div>
				</div>
				<div ref={(el) => addTextSlide(el)} data-persistent-content>
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
				<div ref={(el) => addTextSlide(el)}>
					<Typography
						variant="h2"
						className="text-center mx-auto py-8 text-[30px] sm:text-[42px] font-tertiary"
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
				<div ref={(el) => addFadeIn(el)} data-product-list>
					<ProductList billingCycle="year" />
				</div>
				<div className="mt-16 flex justify-center">
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
				<div ref={(el) => addFadeIn(el)} data-faq-section>
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
