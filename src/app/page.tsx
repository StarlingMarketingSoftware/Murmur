import { Birds } from '@/components/atoms/_svg/Birds';
import LogoIcon from '@/components/atoms/_svg/LogoIcon';
import { StarlingLogo } from '@/components/atoms/_svg/StarlingLogo';
import { Button } from '@/components/ui/button';
import { TypographyH1, TypographyP } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import { SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

const imageData = [
	{
		url: '/frontPhoto1.jpg',
		alt: 'Automated email marketing campaign user.',
		width: 4583,
		height: 3055,
	},
	{
		url: '/frontPhoto2.jpg',
		alt: 'Automated email marketing campaign user',
		width: 5353,
		height: 3569,
	},
	{
		url: '/frontPhoto3.jpg',
		alt: 'Automated email marketing campaign user.',
		width: 3180,
		height: 2120,
	},
];

export default async function HomePage() {
	const { userId } = await auth();
	const isSignedIn = !!userId;
	return (
		<main className="min-h-screen overflow-hidden">
			<div className="h-screen w-screen overflow-hidden">
				<div className="flex flex-col">
					<LogoIcon size="250px" />
					<TypographyH1 className="text-5xl">Murmur</TypographyH1>
					<div className="flex items-center gap-14">
						<TypographyP className="text-xl">by</TypographyP>
						<StarlingLogo size="300px" />
					</div>
				</div>
				<div
					className="absolute backdrop-blur-lg w-full h-full z-10"
					style={{
						maskImage:
							'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.4) 100%)',
						WebkitMaskImage:
							'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.4) 100%)',
					}}
				/>
				<div
					className="overflow-hidden z-0"
					style={{
						maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
						WebkitMaskImage:
							'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
					}}
				>
					<Birds
						size="150%"
						className="-translate-y-75 md:-translate-y-65 lg:-translate-y-44 -translate-x-65 min-w-[1500px]"
					/>
				</div>
			</div>
			{!isSignedIn ? (
				<SignUpButton mode="modal">
					<button className="bg-black text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-gray-800">
						Get Started
					</button>
				</SignUpButton>
			) : (
				<Link href={urls.murmur.dashboard.index}>
					<Button variant="default" size="lg" className="py-7 w-[250px]">
						Get Started
					</Button>
				</Link>
			)}
		</main>
	);
}
