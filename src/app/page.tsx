import { SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function HomePage() {
	const { userId } = await auth();
	const isSignedIn = !!userId;

	return (
		<div className="min-h-screen flex flex-col">
			{/* <header className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
					<h1 className="text-2xl font-bold text-gray-900">Flock</h1>
					<div className="flex items-center space-x-4">
						{isSignedIn ? (
							<>
								<Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
									Dashboard
								</Link>
								<UserButton afterSignOutUrl="/" />
							</>
						) : (
							<>
								<SignInButton mode="modal">
									<button className="text-gray-700 hover:text-gray-900">Sign In</button>
								</SignInButton>
								<SignUpButton mode="modal">
									<button className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800">
										Sign Up
									</button>
								</SignUpButton>
							</>
						)}
					</div>
				</div>
			</header> */}
			<main className="flex-grow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
					<div className="text-center">
						<h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
							Welcome to Flock
						</h2>
						<p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
							A Next.js 14 application with Clerk, Prisma, Tailwind, shadcn, and Stripe
						</p>
						{!isSignedIn && (
							<div className="mt-8 flex justify-center">
								<SignUpButton mode="modal">
									<button className="bg-black text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-gray-800">
										Get Started
									</button>
								</SignUpButton>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
