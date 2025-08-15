'use client';
import { Birds } from '@/components/atoms/_svg/Birds';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { StarlingLogo } from '@/components/atoms/_svg/StarlingLogo';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import { SignUpButton, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { PromotionLogos } from '@/components/molecules/PromotionLogos/PromotionLogos';
import { FAQ } from '@/types';
import Image from 'next/image';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { FaqSection } from '@/components/molecules/FaqSection/FaqSection';
import { GradientBanner } from '@/components/molecules/GradientBanner/GradientBanner';
import { VideoPlayer } from '@/components/molecules/VideoPlayer/VideoPlayer';
import { ComparisonTable } from '@/components/molecules/ComparisonTable/ComparisonTable';
import { ScrollingReviews } from '@/components/molecules/ScrollingReviews/ScrollingReviews';
import { LeadSender } from '@/components/organisms/LeadSender/LeadSender';

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
	const { isSignedIn } = useClerk();

	return (
		<main className="overflow-hidden">
			<div className="relative h-fit sm:min-h-screen w-screen overflow-hidden">
				{/* Background layer with Birds */}
				<div className="absolute inset-0 z-0">
					<div
						className="absolute inset-0 overflow-hidden"
						style={{
							maskImage:
								'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
							WebkitMaskImage:
								'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
						}}
					>
						<Birds
							width="150%"
							height="150%"
							className="-translate-y-75 md:-translate-y-65 lg:-translate-y-44 -translate-x-65 min-w-[1500px]"
						/>
					</div>
				</div>

				{/* Backdrop blur overlay */}
				<div
					className="absolute inset-0 backdrop-blur-lg z-10"
					style={{
						maskImage:
							'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.4) 100%)',
						WebkitMaskImage:
							'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.4) 100%)',
					}}
				/>

				{/* Content layer */}
				<div className="relative z-20 justify-items-center h-full gap-0">
					<div className="w-[55px] sm:w-[75px] md:w-[90px] lg:!w-[96px] h-[44px] sm:h-[60px] md:h-[72px] lg:h-[80px] mt-18 sm:mt-24 md:mt-30 lg:mt-36 mx-auto">
						<LogoIcon />
					</div>
					<Typography
						variant="h1"
						className="!text-[52px] sm:!text-[80px] leading-[0.8] text-center"
					>
						Murmur
					</Typography>
					<div className="flex items-center gap-8 sm:gap-14 mt-6 mx-auto text-center justify-center">
						<Typography className="!text-[12px]">by</Typography>
						<StarlingLogo width="110px" />
					</div>
					<Typography
						variant="h2"
						className="text-center text-[24px] sm:text-[37px] px-2 mt-8 mb-10 md:mb-20"
					>
						Cut Through The Noise.<br></br> Get Contacts. Get Work. Email Anyone.
					</Typography>
					<LeadSender />
					<div className="mt-10 md:mt-15 flex justify-center">
						{!isSignedIn ? (
							<SignUpButton mode="modal">
								<Button
									variant="primary"
									font="secondary"
									size="lg"
									className="w-[155px]"
								>
									START
								</Button>
							</SignUpButton>
						) : (
							<Link href={urls.murmur.dashboard.index}>
								<Button
									variant="primary"
									size="lg"
									font="secondary"
									className="w-[155px]"
								>
									START
								</Button>
							</Link>
						)}
					</div>
				</div>
			</div>
			{/* Explanation */}
			<div className="mx-auto max-w-[1059px] text-center px-3 mt-16">
				<Typography variant="h2" className="text-center text-[30px] sm:text-[42px]">
					Murmur helps you draft.<br></br> No ChatGPT. We built our own.
				</Typography>
				<Typography className="!mt-[42px]" variant="promoP">
					{`Our software gathers data on each contact every time you draft an email with
					advanced search algorithms. This allows Murmur to craft customized emails,
					getting you more responses and more work. Our algorithms are trained on many
					thousands of successful emails. We've made technology that lets you build a
					campaign that cuts through the noise. We know what it takes to succeed.`}
				</Typography>
			</div>

			{/* Video Section */}
			<div className="py-16 mt-2 sm:mt-32 px-4">
				<div className="mx-auto w-9/10 flex items-center justify-center flex-col">
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
					<div className="flex justify-center mt-12">
						<Link href={urls.contact.index}>
							<Button variant="muted" size="lg">
								Book a demo
							</Button>
						</Link>
					</div>
				</div>
			</div>

			<GradientBanner className="mx-auto mt-4 sm:mt-24 flex justify-center items-center">
				<Typography variant="banner" className="text-center">
					Generate accurate contact lists in seconds.<br></br> Save countless hours.
				</Typography>
			</GradientBanner>

			<div className="mt-24 bg-light">
				<ComparisonTable />
			</div>

			<div className="w-full bg-gradient-to-b from-gray-200 to-white py-14 sm:py-28 px-4">
				<div className="mx-auto w-9/10 flex items-center justify-center flex-col">
					<Typography variant="banner" className="text-left w-full">
						Send without Limits.<br></br> Dream without Boundaries.
					</Typography>
					<div className="relative max-w-[943px] w-full h-full aspect-video mt-16 sm:mt-32">
						<VideoPlayer
							playbackId="z015rWLTn4mlDbMX0021ale02ieVwttxqtZvzc2Z02nVotA"
							className="h-full w-full"
							thumbnailTime={1.5}
							metadata={{
								video_title: 'Murmur Testimonials',
							}}
						/>
					</div>
				</div>
				<Typography
					variant="promoP"
					className="w-full max-w-[1130px] mx-auto !mt-16 sm:!mt-32 text-center"
				>
					Major email providers have tight sending restrictions, our server has none.
					Focus your time and energy where it matters most, and leave the volume to us.
					With Murmur you no longer have to compromise between mass email and custom AI
					personalization, it does it all. Nothing else like it, Murmur helps you make
					meaningful connections, not forgettable spam, at a scale previously
					unimaginable. Dream big, we&apos;ve got you.
				</Typography>
			</div>

			<ScrollingReviews />

			<div className="max-w-[1608px] mx-auto mt-18 sm:mt-24">
				<Typography variant="h3" className="text-center text-[27px]">
					Trusted by countless businesses
				</Typography>
				<div className="bg-gradient-to-b from-gray-100 to-white pt-16 pb-16 sm:pb-48 rounded-md w-full mt-8 sm:mt-14 h-fit ">
					<div
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

			<div className="w-full bg-gradient-to-b from-gray-200 to-white py-14 sm:py-25 px-4">
				<Typography variant="banner" className="text-center mx-auto">
					Not Another Email Tool.
				</Typography>
				<Typography
					variant="promoP"
					className="w-full max-w-[1233px] mx-auto !mt-10 text-center"
				>
					{`Murmur serves an entirely different purpose. While other email marketing tools like Mailchimp are great for keeping up an email newsletter, Murmur is designed specifically for entrepreneurs, business owners, and those with a vision to bring in leads and sell to new customers. Each email in a campaign is deeply personalized, and written in your own voice rather than using a stock template that falls through the cracks.
`}
				</Typography>
				<Image
					src="/photos/frontPhoto1.jpg"
					alt="Personalized Email"
					width={943}
					height={626}
					className="mx-auto mt-12 rounded-sm"
				/>
			</div>

			<GradientBanner gloss className="mt-24 !py-3">
				<Typography variant="banner" className="text-center mx-auto py-8">
					{`Find the plan that's right for`} <span className="italic">you</span>
				</Typography>
			</GradientBanner>

			<div className="flex justify-center mt-18 lg:hidden">
				<Link href={urls.pricing.index}>
					<Button variant="muted" size="lg">
						Explore Plans
					</Button>
				</Link>
			</div>

			<div className="mt-6 hidden lg:block">
				<ProductList billingCycle="year" />
				<div className="mt-16 flex justify-center">
					<Link href={urls.pricing.index}>
						<Button variant="muted" size="lg">
							Learn More
						</Button>
					</Link>
				</div>
			</div>

			<FaqSection
				faqs={FAQS}
				header="Support"
				title="FAQs"
				description="Everything you need to know about Murmur!"
				showMoreLink={urls.contact.index}
			/>
			<div className="h-24" />
		</main>
	);
}
