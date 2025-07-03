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
import { twMerge } from 'tailwind-merge';
import { ReviewCard } from '@/components/molecules/ReviewCard/ReviewCard';
import { FAQ, Review } from '@/types';
import Image from 'next/image';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { FaqSection } from '@/components/molecules/FaqSection/FaqSection';
import { GradientBanner } from '@/components/molecules/GradientBanner/GradientBanner';
import { StatBlock } from '@/components/molecules/StatBlock/StatBlock';
import dynamic from 'next/dynamic';
import MuxPlayer from '@mux/mux-player-react';

const ReactPlayer = dynamic(() => import('react-player'), {
	ssr: false,
});
const EMAIL_STATS = [
	{
		value: '115%',
		label: 'More Responses',
	},
	{
		value: '99.7%',
		label: 'Delivery Rate',
	},
	{
		value: '10x',
		label: 'More Connections',
	},
];

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
					<Typography variant="h2" className="row-span-3 text-center text-[46px]">
						Email Campaigns Reimagined.<br></br> AI Personalization. No Contacts Required.
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
					A dedicated AI-Integrated email tool.
				</Typography>
				<Typography className="text-[26px] !mt-[42px]" variant="p">
					Murmur is an email marketing tool that utilizes the most cutting-edge Machine
					Learning and AI technology to help you put your personal touch on every email in
					your campaign, no matter the size. Paired with state of the art list-generation,
					we have made outreach truly seamless.
				</Typography>
			</div>

			{/* Video Section */}
			<div className="py-16 mt-[121px]">
				<div className="mx-auto w-fit">
					<div className="relative w-[1179px] aspect-video pb-[56%]">
						<MuxPlayer
							accentColor="var(--color-primary)"
							playbackId="z015rWLTn4mlDbMX0021ale02ieVwttxqtZvzc2Z02nVotA"
							metadata={{
								video_title: 'Murmur Testimonials',
								viewer_user_id: 'Placeholder (optional)',
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

			<GradientBanner className="  mx-auto mt-24 flex justify-center items-center">
				<Typography
					variant="h2"
					className="max-w-[569px] text-center text-[60px] leading-18"
				>
					Get the competitive edge you’ve been looking for
				</Typography>
			</GradientBanner>

			<div className="h-[200px] w-full mx-auto mt-36">
				<div className="flex items-center justify-center gap-40">
					{EMAIL_STATS.map((stat, index) => (
						<StatBlock key={index} stat={stat.value} description={stat.label}></StatBlock>
					))}
				</div>
			</div>
			<div className="max-w-[966px] mx-auto mt-24">
				<Typography variant="h3" className="text-center text-[34px]">
					Trusted by countless businesses
				</Typography>
				<div className="bg-gradient-to-b from-gray-100 to-white py-16 rounded-md w-full mt-14">
					<div
						style={{
							maskImage:
								'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
							WebkitMaskImage:
								'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
						}}
					>
						<PromotionLogos />
					</div>
				</div>
			</div>

			<div className="mx-auto mt-50 w-full bg-gradient-to-b from-gray-200 to-white py-28">
				<Typography variant="h2" className="text-left text-[60px] max-w-[575px] mx-auto ">
					Build a campaign that is truly simple.
				</Typography>
				<div className="relative w-[1179px] aspect-video mx-auto mt-32">
					<MuxPlayer
						accentColor="var(--color-primary)"
						playbackId="z015rWLTn4mlDbMX0021ale02ieVwttxqtZvzc2Z02nVotA"
						thumbnailTime={1.5}
						metadata={{
							video_title: 'Murmur Testimonials',
							viewer_user_id: 'Placeholder (optional)',
						}}
					/>
				</div>
				<Typography
					variant="p"
					className="w-[1130px] mx-auto !mt-32 text-center text-[26px]"
				>
					{`Streamlined at every step, you can leave behind the days of cluttered
					interfaces, and complicated workflows of traditional mass-email tools. We worked
					hard to make Murmur simple and easy to use. No longer is it frustrating to
					manage a campaign, with Murmur it's just a few clicks and we do the rest. Giving
					you more time to do what you love, and less busywork.`}
				</Typography>
			</div>

			<div className="w-full flex gap-24 pt-17 pb-11">
				{REVIEWS.map((review, index) => (
					<div key={index}>
						<ReviewCard review={review} />
					</div>
				))}
			</div>

			<div className="w-full bg-gradient-to-b from-gray-200 to-white py-25">
				<Typography variant="p" className="text-center text-[60px] mx-auto">
					Every email is personalized.
				</Typography>
				<Image
					src="/photos/frontPhoto1.jpg"
					alt="Personalized Email"
					width={942}
					height={628}
					className="mx-auto mt-24 rounded-sm"
				/>
				<Typography
					variant="p"
					className="w-8/10 max-w-[1233px] mx-auto !mt-32 text-center text-[26px]"
				>
					{`Our technological approach to email marketing allows us to build your campaigns so that every email in the campaign is differentiated from the last. Let Murmur AI gather information about the companies and recipients you're writing to and help you craft the perfect email.`}
				</Typography>
			</div>

			<GradientBanner gloss>
				<Typography variant="h2" className="text-center text-[60px] mx-auto py-8">
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
		</main>
	);
}
