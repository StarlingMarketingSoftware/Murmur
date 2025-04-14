import { Button } from '@/components/ui/button';
import { TypographyH1, TypographyP } from '@/components/ui/typography';
import { urls } from '@/constants/urls';
import { SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';
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
		<div className="min-h-screen flex flex-col">
			<main className="flex-grow">
				<div className="py-16">
					<div className="text-center">
						<div className="h-[20vh] -translate-y-[15%] flex items-center justify-center">
							<TypographyH1 className=" tracking-wider">Murmur</TypographyH1>
						</div>
						<h2 className="!text-5xl font-extralight mt-10">
							Make Email Campaigns Personalized
						</h2>
						<div className="flex flex-row justify-center mt-8 w-full max-h-[500px]">
							{imageData.map((image, index) => (
								<div key={index} className="flex w-[calc(100vw/3)]">
									<Image
										src={image.url}
										alt={image.alt}
										width={image.width}
										height={image.height}
									/>
								</div>
							))}
						</div>
						<div className="flex flex-col items-center mt-24">
							<TypographyP className="mt-8 max-w-[600px]">
								Murmur is an AI-Driven email marketing interface optimized for deeper
								personalization, creating a meaningful connection with the client in
								outreach.
							</TypographyP>
						</div>
						<div className="mt-14 flex justify-center">
							{!isSignedIn ? (
								<SignUpButton mode="modal">
									<button className="bg-black text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-gray-800">
										Get Started
									</button>
								</SignUpButton>
							) : (
								<Link href={urls.murmur.dashboard.path}>
									<Button className="">Open Murmur</Button>
								</Link>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
