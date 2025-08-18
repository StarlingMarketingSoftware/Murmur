 'use client';
 import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import { SignUpButton, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { PromotionLogos } from '@/components/molecules/PromotionLogos/PromotionLogos';
import { FAQ } from '@/types';
// import Image from 'next/image';
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
			<div className="relative w-screen min-h-screen bg-white">
				{/* Content layer */}
				<div className="relative justify-items-center h-full gap-0 flex flex-col items-center justify-start pt-9">
					{/* Exact dashboard structure */}
					<div className="mt-4 flex justify-center w-full px-4">
						<div className="text-center w-full max-w-[900px]">
							<div className="inline-block">
								<LogoIcon width="106px" height="84px" />
							</div>
							<Typography variant="h1" className="text-center mt-2 !text-[80px] leading-[0.8]">
								Murmur
							</Typography>
							<Typography variant="h2" className="text-center !text-[34px] leading-[1] mt-[72px] whitespace-nowrap" style={{ fontFamily: 'var(--font-zen-antique)' }}>
								Get Contacts. Get Work. Email Anyone.
							</Typography>
							<div className="w-[764px] h-[40px] mx-auto mt-2 flex items-center justify-center">
								<Typography className="text-center text-black font-inter !text-[26px] font-light">
									The Ultimate Database + Email Tool for Musicians
								</Typography>
							</div>
						</div>
					</div>
					
					<div className="mt-4 flex flex-col items-center">
						<LeadSender />
						<Link href={urls.murmur.dashboard.index} className="mt-0 mx-auto">
							<Button
								variant="primary"
								size="lg"
								font="secondary"
								noPadding
								className="!w-[490px] !h-[42px] !min-h-0 !py-0 !px-0 !font-normal"
								style={{ backgroundColor: '#289137', borderRadius: '7px', fontWeight: 400 }}
							>
								<span className="!font-normal">Launch</span>
							</Button>
						</Link>
						<Typography variant="p" className="text-center mt-4 tracking-[0.08em]">
							Full access for 7 days. Start today.
						</Typography>
					</div>
				</div>
			</div>
			{/* Explanation */}
			<div className="w-full bg-[#EBEBEB] pt-16 pb-4">
				<div className="mx-auto max-w-[1059px] text-center px-3 mt-0">
					<Typography variant="h2" className="text-center text-[30px] sm:text-[42px]">
						Not Another Email Tool.
					</Typography>

				</div>
				{/* Video Section */}
				<div className="pt-8 pb-6 mt-0 sm:mt-6 px-4">
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
						<Typography className="mt-8 mx-auto max-w-[943px]" variant="promoP" style={{ textAlign: 'justify' }}>
							{`Murmur serves an entirely different purpose. While other email marketing tools like Mailchimp are great for keeping up an email newsletter, Murmur is designed specifically for musicians and managers in the music industry. We've trained our system on industry knowledge to help you succeed`}
						</Typography>
						<div className="flex justify-center mt-24">
							<Link href={urls.contact.index}>
								<Button variant="muted" size="lg">
									Book a demo
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
			{/* Removed promo banner */}

			{/* Moved: Send without Limits + second video + description */}
			<div className="w-full bg-[#1C1C1C] pt-14 sm:pt-28 pb-2 sm:pb-4 px-4">
				<div className="mx-auto w-9/10 flex items-center justify-center flex-col">
					<Typography variant="banner" className="text-left w-full text-white">
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
					className="w-full max-w-[943px] mx-auto !mt-16 sm:!mt-32 text-white"
					style={{ textAlign: 'justify' }}
				>
					{`Our software gathers data on each contact every time you draft an email with
					advanced search algorithms. This allows Murmur to craft customized emails,
					getting you more responses and more work. Our algorithms are trained on many
					thousands of successful emails. We've made technology that lets you build a
					campaign that cuts through the noise. We know what it takes to succeed.`}
				</Typography>
			</div>

			<div className="mt-0 bg-[#1C1C1C] pb-8 sm:pb-12">
				<ComparisonTable />
			</div>


			<div className="w-full bg-white">
				<div className="max-w-[1608px] mx-auto pt-18 sm:pt-24">
					<Typography variant="h3" className="text-center text-[27px]">
						Trusted by countless businesses
					</Typography>
					<div className="pt-16 pb-16 sm:pb-48 w-full mt-8 sm:mt-14 h-fit">
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

				<ScrollingReviews />
			</div>

			<div className="w-full bg-gradient-to-b from-gray-200 to-white py-14 sm:py-25 px-4">
				<Typography variant="banner" className="text-center mx-auto">
					Murmur helps you draft.<br></br> No ChatGPT. We built our own.
				</Typography>
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

			<div className="mt-24">
				<Typography variant="banner" className="text-center mx-auto py-8">
					{`Find the plan that's right for`} <span className="italic">you</span>
				</Typography>
			</div>

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

			<div className="w-full bg-[#2B2B2B]">
				<FaqSection
					faqs={FAQS}
					header=""
					title="FAQs"
					description="Everything you need to know about Murmur!"
					showMoreLink=""
				/>
				<div className="h-24" />
			</div>
		</main>
	);
}
