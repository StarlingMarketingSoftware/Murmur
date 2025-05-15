import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { PromotionLogos } from '@/components/molecules/PromotionLogos/PromotionLogos';
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
							<TypographyH1>Murmur</TypographyH1>
						</div>
						<h2 className="!text-5xl font-extralight mt-10 mx-4">
							Email Marketing Made Personalized
						</h2>
						<div className="flex flex-col md:flex-row justify-center mt-8 w-full md:max-h-[500px]">
							{imageData.map((image, index) => (
								<div key={index} className="flex w-full md:w-[calc(100vw/3)]">
									<Image
										src={image.url}
										alt={image.alt}
										width={image.width}
										height={image.height}
									/>
								</div>
							))}
						</div>
						<AppLayout>
							<div className="flex flex-col items-center mt-24 max-w-[800px] mx-auto">
								<TypographyP>
									<strong>A dedicated AI-Integrated email tool.</strong> Murmur utilizes
									the most cutting-edge Machine Learning and AI technology to help you
									with <strong>every email.</strong> From start to finish, our technology
									uses intelligence to bring email campaigns into the future.
								</TypographyP>
								<TypographyP>
									<strong>A fundamentally different framework.</strong> Unlike other email
									marketing tools, Murmur is built for the Intelligence Revolution. Making
									each email a sincere connection, and leaving unwanted spam behind. No
									longer does the individual have to choose between painstakingly
									handwriting emails to have a chance of cutting through the noise.
									Eliminating unwanted solicitation, and creating new genuine connections,
									business deals, and sales.
								</TypographyP>
								<TypographyP>
									<strong>Every email is personalized.</strong> Our technological approach
									to email marketing allows us to build your campaigns so that every email
									in the campaign is differentiated from the last. Let Murmur AI gather
									information about the companies and recipients you’re writing to and
									help you craft the perfect email.
								</TypographyP>
								<TypographyP>
									<strong> Build a campaign that is truly simple.</strong> Streamlined at
									every step, you can leave behind the days of cluttered interfaces, and
									complicated workflows of traditional mass-email tools. We worked hard to
									make Murmur simple and easy to use. No longer is it frustrating to
									manage a campaign, with Murmur it’s just a few clicks and we do the
									rest. Giving you more time to do what you love, and less doing what you
									don’t.
								</TypographyP>
								<TypographyP>
									<strong>Dedication to improvement.</strong> We commit ourselves to
									excellence and growth, every version being a substantial leap from the
									last. This is only the beginning, it is our hope to continue to innovate
									at every step. With a stockpile of revolutionary ideas, our only
									constraint is time. Look forward to more features in the future, and
									we’ll grow together to provide you more valuable features.
								</TypographyP>
							</div>
							<TypographyH1 className="mt-12">Starling Has Worked With</TypographyH1>
							<PromotionLogos />
						</AppLayout>
						<div className="mt-14 flex justify-center">
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
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
