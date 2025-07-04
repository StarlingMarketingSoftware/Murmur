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
import { ReviewCard } from '@/components/molecules/ReviewCard/ReviewCard';
import { FAQ, Review } from '@/types';
import Image from 'next/image';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { FaqSection } from '@/components/molecules/FaqSection/FaqSection';
import { GradientBanner } from '@/components/molecules/GradientBanner/GradientBanner';
import { VideoPlayer } from '@/components/molecules/VideoPlayer/VideoPlayer';
import { ComparisonTable } from '@/components/molecules/ComparisonTable/ComparisonTable';

const REVIEWS: Review[] = [
	{
		text: 'When I was at Columbia founding Lotreck Music, a tool like Murmur would have been an absolute game changer!”',
		fullName: 'Robert Lotreck',
		company: 'Lotreck Music LLC',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: 'Talking to new folks is one of the biggest challenges to overcome as a small business owner. When my husband and I started using Murmur to help us book more events for our catering business, it brought us our busiest month to date!',
		fullName: 'Julia Bennett',
		company: 'Wilmington Catering',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: `It's nuts! So we use a bunch of AI related tools. We've even used tools that automate parts of email sending process. Starling's Murmur does this with a lot of precision and a lot of detail.`,
		fullName: 'Jeremy Ben-Meir',
		company: 'PointOne Technologies',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: `I was able to get done in a day what it took weeks to do in the past! It used to be a chore to get our emails out. We've alleviated a significant time constraint.`,
		fullName: 'Jack Carter',
		company: 'Radiance Pharmaceuticals',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
	{
		text: `After exhausting every marketing tool on the market, we found Murmur delivers exactly what we needed. The team is intelligent and responsive.`,
		fullName: 'Suki Lee',
		company: 'Nexora Solutions',
		photoUrl: '/photos/jeremyAvatar.jpg',
	},
];

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
		<main className="min-h-screen overflow-hidden">
			<div className="relative h-screen w-screen overflow-hidden">
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

				{/* Content layer - centered */}
				<div className="relative z-20 grid grid-rows-12 justify-items-center h-full gap-0">
					<div className="row-span-2" />
					<LogoIcon className="row-span-1" width="106px" height="84px" />
					<Typography variant="h1" className="row-span-1 !text-[100px] leading-[0.8]">
						Murmur
					</Typography>
					<div className="row-span-1 flex items-center gap-14">
						<Typography variant="p" className="text-sm">
							by
						</Typography>
						<StarlingLogo width="150px" />
					</div>
					<div className="row-span1" />
					<Typography variant="h2" className="row-span-3 text-center text-[46px] ">
						Cut Through The Noise.<br></br> Get Contacts. Get Work. Email Anyone.
					</Typography>
					<div className="row-span-2">
						{!isSignedIn ? (
							<SignUpButton mode="modal">
								<Button className="bg-black text-white px-6 py-3 rounded-md text-lg font-medium font-secondary hover:bg-gray-800">
									START
								</Button>
							</SignUpButton>
						) : (
							<Link href={urls.murmur.dashboard.index}>
								<Button
									variant="primary"
									size="lg"
									font="secondary"
									className="w-[194px]"
								>
									START
								</Button>
							</Link>
						)}
					</div>
				</div>
			</div>
			{/* Explanation */}
			<div className="mx-auto max-w-[1059px] text-center">
				<Typography variant="h2" className="row-span-3 text-center text-[52px]">
					Murmur helps you draft.<br></br> No ChatGPT. We built our own.
				</Typography>
				<Typography className="text-[26px] !mt-[42px]" variant="p">
					{`Our software gathers data on each contact every time you draft an email with
					advanced search algorithms. This allows Murmur to craft customized emails,
					getting you more responses and more work. Our algorithms are trained on many
					thousands of successful emails. We've made technology that lets you build a
					campaign that cuts through the noise. We know what it takes to succeed.`}
				</Typography>
			</div>

			{/* Video Section */}
			<div className="py-16 mt-[121px]">
				<div className="mx-auto w-fit">
					<div className="relative w-[1179px] aspect-video">
						<VideoPlayer
							playbackId="z015rWLTn4mlDbMX0021ale02ieVwttxqtZvzc2Z02nVotA"
							thumbnailTime={1.5}
							metadata={{
								video_title: 'Murmur Testimonials',
							}}
						/>
					</div>
					<div className="flex justify-center mt-12">
						<Button variant="muted" size="lg">
							Book a demo
						</Button>
					</div>
				</div>
			</div>

			<GradientBanner className=" mx-auto mt-24 flex justify-center items-center">
				<Typography variant="h2" className=" text-center text-[63px] leading-18">
					Generate accurate contact lists in seconds.<br></br> Save countless hours.
				</Typography>
			</GradientBanner>

			<div className="mt-24 mb-24 bg-light">
				<ComparisonTable />
			</div>

			<div className="mt-50 w-full bg-gradient-to-b from-gray-200 to-white py-28">
				<div className="relative w-[1179px] mx-auto">
					<Typography
						variant="h2"
						className="text-left text-[60px] max-w-[575px] w-full text-nowrap"
					>
						Send without Limits.<br></br> Dream without Boundaries.
					</Typography>
					<div className="rounded-lg w-fit h-fit aspect-video max-h-fit overflow-hidden mt-32">
						<VideoPlayer
							playbackId="z015rWLTn4mlDbMX0021ale02ieVwttxqtZvzc2Z02nVotA"
							thumbnailTime={1.5}
							metadata={{
								video_title: 'Murmur Testimonials',
							}}
						/>
					</div>
				</div>
				<Typography
					variant="p"
					className="w-[1130px] mx-auto !mt-32 text-center text-[26px]"
				>
					Major email providers have tight sending restrictions, our server has none.
					Focus your time and energy where it matters most, and leave the volume to us.
					With Murmur you no longer have to compromise between mass email and custom AI
					personalization, it does it all. Nothing else like it, Murmur helps you make
					meaningful connections, not forgettable spam, at a scale previously
					unimaginable. Dream big, we’ve got you.
				</Typography>
			</div>

			<div className="w-full flex gap-24 pt-17 pb-11">
				{REVIEWS.map((review, index) => (
					<div key={index}>
						<ReviewCard review={review} />
					</div>
				))}
			</div>

			<div className="max-w-[1608px] mx-auto mt-24">
				<Typography variant="h3" className="text-center text-[34px]">
					Trusted by countless businesses
				</Typography>
				<div className="bg-gradient-to-b from-gray-100 to-white pt-16 pb-48 rounded-md w-full mt-14 h-fit ">
					<div
						style={{
							maskImage:
								'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.2) 100%)',
							WebkitMaskImage:
								'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
						}}
					>
						<PromotionLogos />
					</div>
				</div>
			</div>

			<div className="w-full bg-gradient-to-b from-gray-200 to-white py-25">
				<Typography variant="p" className="text-center text-[60px] mx-auto">
					Not Another Email Tool. 
				</Typography>
				<Typography
					variant="p"
					className="w-8/10 max-w-[1233px] mx-auto !mt-10 text-center text-[26px]"
				>
					{`Murmur serves an entirely different purpose. While other email marketing tools like Mailchimp are great for keeping up an email newsletter, Murmur is designed specifically for entrepreneurs, business owners, and those with a vision to bring in leads and sell to new customers. Each email in a campaign is deeply personalized, and written in your own voice rather than using a stock template that falls through the cracks.
`}
				</Typography>
				<Image
					src="/photos/frontPhoto1.jpg"
					alt="Personalized Email"
					width={1173}
					height={782}
					className="mx-auto mt-12 rounded-sm"
				/>
			</div>

			<GradientBanner gloss className="mt-24 !py-3">
				<Typography variant="h2" className="text-center text-[75px] mx-auto py-8">
					{`Find the plan that's right for`} <span className="italic">you</span>
				</Typography>
			</GradientBanner>

			<div className="mt-28">
				<ProductList />
			</div>

			<div className="mt-41 flex justify-center">
				<Link href={urls.pricing.index}>
					<Button variant="muted" size="lg">
						Learn More
					</Button>
				</Link>
			</div>

			<FaqSection
				faqs={FAQS}
				header="Support"
				title="FAQs"
				description="Everything you need to know about Murmur!"
			/>
			<div className="h-24" />
		</main>
	);
}
