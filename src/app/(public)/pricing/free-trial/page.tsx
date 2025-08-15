'use client';

import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import { Typography } from '@/components/ui/typography';
import { useFreeTrial } from './useFreeTrial';
import { SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { urls } from '@/constants/urls';
import { StripeSubscriptionStatus } from '@/types';

export default function FreeTrial() {
	const {
		handleCreateCheckoutSession,
		isPendingCreateCheckoutSession,
		isLoadingUser,
		user,
		subscriptionTier,
		getButtonText,
		getExplanatoryText,
		getHeaderText,
	} = useFreeTrial();

	return (
		<AppLayout>
			<Typography variant="h1" className="text-center mt-[156px]">
				Free Trial
			</Typography>
			<Card className="max-w-[500px] min-w-[400px] w-1/2 mx-auto mt-12">
				<CardContent>
					{isLoadingUser ? (
						<>
							<Typography variant="h2" className="text-center mt-8">
								Preparing your free trial...
							</Typography>
							<Spinner className="mt-8" />
						</>
					) : (
						<>
							{user ? (
								<>
									<Typography variant="h2" className="text-center mt-8">
										{getHeaderText()}
									</Typography>
									<Typography
										variant="p"
										className="text-center mt-4 text-muted-foreground"
									>
										{getExplanatoryText()}
									</Typography>
									{subscriptionTier && (
										<Typography
											variant="p"
											bold
											className="text-center mt-4 text-muted-foreground"
										>
											{`Your subscription tier: ${subscriptionTier?.name}`}
										</Typography>
									)}

									<div className="flex justify-center mt-8">
										<Button
											disabled={
												!!subscriptionTier ||
												user.stripeSubscriptionStatus ===
													StripeSubscriptionStatus.CANCELED
											}
											variant="primary"
											size="lg"
											onClick={handleCreateCheckoutSession}
											isLoading={isPendingCreateCheckoutSession}
										>
											{getButtonText()}
										</Button>
									</div>
								</>
							) : (
								<>
									<Typography variant="h2" className="text-center mt-8">
										Create an account
									</Typography>
									<Typography
										variant="p"
										className="text-center mt-4 text-muted-foreground"
									>
										Create an account to access your free trial and start using Murmur.
									</Typography>
									<div className="flex justify-center mt-8">
										<SignUpButton
											mode="redirect"
											forceRedirectUrl={urls.pricing.freeTrial.index}
										>
											<Button variant="primary" size="lg">
												Create Account
											</Button>
										</SignUpButton>
									</div>
								</>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</AppLayout>
	);
}
