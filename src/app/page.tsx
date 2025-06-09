'use client';
import { Birds } from '@/components/atoms/_svg/Birds';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { StarlingLogo } from '@/components/atoms/_svg/StarlingLogo';
import { Button } from '@/components/ui/button';
import { TypographyH2, TypographyH3, TypographyP } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import { SignUpButton, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LogoList } from '@/components/molecules/PromotionLogos/LogoList';
import { PromotionLogos } from '@/components/molecules/PromotionLogos/PromotionLogos';

const ReactPlayer = dynamic(() => import('react-player/youtube'), {});

// const imageData = [
// 	{
// 		url: '/frontPhoto1.jpg',
// 		alt: 'Automated email marketing campaign user.',
// 		width: 4583,
// 		height: 3055,
// 	},
// 	{
// 		url: '/frontPhoto2.jpg',
// 		alt: 'Automated email marketing campaign user',
// 		width: 5353,
// 		height: 3569,
// 	},
// 	{
// 		url: '/frontPhoto3.jpg',
// 		alt: 'Automated email marketing campaign user.',
// 		width: 3180,
// 		height: 2120,
// 	},
// ];

const emailStats = [
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
		label: 'More Connection',
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
					<h1 className="row-span-1 !text-[100px] font-normal tracking-wide leading-[0.8]">
						Murmur
					</h1>
					<div className="row-span-1 flex items-center gap-14">
						<TypographyP className="text-sm">by</TypographyP>
						<StarlingLogo width="150px" />
					</div>
					<div className="row-span1" />
					<TypographyH2 className="row-span-3 text-center text-[46px]">
						Email Campaigns Reimagined.<br></br> AI Personalization. No Contacts Required.
					</TypographyH2>
					<div className="row-span-2">
						{!isSignedIn ? (
							<SignUpButton mode="modal">
								<Button className="bg-black text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-gray-800">
									START
								</Button>
							</SignUpButton>
						) : (
							<Link href={urls.murmur.dashboard.index}>
								<Button variant="default" size="lg">
									START
								</Button>
							</Link>
						)}
					</div>{' '}
				</div>
			</div>
			{/* Explanation */}
			<div className="mx-auto max-w-[1059px] text-center mb-[121px]">
				<TypographyH2 className="row-span-3 text-center text-[46px]">
					A dedicated AI-Integrated email tool.
				</TypographyH2>
				<TypographyP>
					Murmur is an email marketing tool that utilizes the most cutting-edge Machine
					Learning and AI technology to help you put your personal touch on every email in
					your campaign, no matter the size. Paired with state of the art list-generation,
					we have made outreach truly seamless.
				</TypographyP>
			</div>{' '}
			{/* Video Section */}
			<div className="py-16">
				<div className="mx-auto max-w-4xl px-8">
					<div className="relative w-full pb-[56%]">
						<ReactPlayer
							url="https://www.youtube.com/watch?v=M6sXcpvGoqk&rel=0&modestbranding=1&showinfo=0"
							width="100%"
							height="100%"
							style={{ position: 'absolute', top: 0, left: 0 }}
							controls={true}
						/>
					</div>{' '}
					<div className="flex justify-center mt-12">
						<Button variant="light" size="lg">
							Book a demo
						</Button>
					</div>
					<div className="h-[250px] w-full bg-gradient-to-r from-white via-gray-100 to-white max-w-[569px] mx-auto mt-24 flex justify-center items-center">
						<TypographyH2 className="text-center text-[60px] leading-18">
							Get the competitive edge you’ve been looking for
						</TypographyH2>
					</div>
					<div className="h-[200px] w-full mx-auto mt-24">
						<div className="flex items-center justify-center gap-40">
							{emailStats.map((stat, index) => (
								<div key={index} className="text-center flex flex-col">
									<TypographyH2 className="text-[60px] font-extrabold tracking-wide p-0">
										{stat.value}
									</TypographyH2>
									<TypographyP className="text-lg font-bold !mt-0">
										{stat.label}
									</TypographyP>
								</div>
							))}
						</div>
					</div>
					<TypographyH3>Trusted by countless businesses</TypographyH3>
					<div className="bg-gradient-to-b from-gray-100 to-white py-16 rounded-md w-[966px]">
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
			</div>
		</main>
	);
}
