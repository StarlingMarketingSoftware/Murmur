'use client';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { twMerge } from 'tailwind-merge';
import { ArrowDown } from 'lucide-react';
import { GradientBanner } from '@/components/molecules/GradientBanner/GradientBanner';
import { StatBlock } from '@/components/molecules/StatBlock/StatBlock';
import { usePricingPage } from './usePricingPage';
import { FeaturesTable } from '@/components/molecules/FeaturesTable/FeaturesTable';

export default function Products() {
	const { billingCycle, setBillingCycle, tableRef, handleScrollToTable } =
		usePricingPage();

	return (
		<>
			<Typography variant="h1" className="text-center mt-[156px]">
				Pricing
			</Typography>
			<div className="w-fit mx-auto">
				<div className="flex justify-end mb-30">
					<Button
						className={twMerge(
							'h-[48px] w-[168px] text-[17px]',
							billingCycle === 'month' ? 'pointer-events-none' : 'text-dark'
						)}
						variant={billingCycle === 'month' ? 'muted' : 'light'}
						outline
						onClick={() => setBillingCycle('month')}
					>
						Billed Monthly
					</Button>
					<Button
						className={twMerge(
							'h-[48px] w-[168px] text-[17px]',
							billingCycle === 'year' && 'pointer-events-none'
						)}
						variant={billingCycle === 'year' ? 'muted' : 'light'}
						onClick={() => setBillingCycle('year')}
						outline
					>
						Billed Annually
					</Button>
				</div>
				<ProductList billingCycle={billingCycle} />
				<div className="flex justify-center my-40">
					<Button
						variant="ghost"
						size="lg"
						className="relative group"
						outline
						onClick={handleScrollToTable}
					>
						Compare all plan features
						<ArrowDown className="absolute right-3 size-5 group-hover:translate-y-1 transition duration-200" />
					</Button>
				</div>
				<GradientBanner className="mt-10">
					<Typography variant="h1" className="text-center">
						Outpace the competition
					</Typography>
					<Typography variant="h2" className="text-center max-w-[407px] mx-auto mt-10">
						Start Making Connections That Will Last a Lifetime
					</Typography>
				</GradientBanner>
			</div>

			<div className="mt-58 mb-48">
				<Typography
					variant="h3"
					className="text-center text-[30px] max-w-[400px] mx-auto font-bold"
				>
					More Cost Effective Than Other Email Platforms
				</Typography>
				<StatBlock
					stat="267%"
					description="More Opened Emails"
					size="lg"
					className="mt-12"
				/>
				<div className="flex justify-center items-center mt-10 gap-40">
					<StatBlock stat="99%" description="Email List Accuracy" />
					<StatBlock stat="5x" description="Verification Protocols" />
				</div>
			</div>
			<div className="h-22 w-full" ref={tableRef} />
			<FeaturesTable />
			<div className="max-w-[1059px] mx-auto w-9/10">
				<Typography className="text-center">
					No other campaign tool does personalization like we do. Say goodbye to
					“spray-and-pray” spam marketing and say hello to building meaningful
					relationships.
				</Typography>
			</div>
			<div className="max-w-[1059px] mx-auto mt-0 w-9/10">
				<Typography className="text-center max-w-[1059px] mx-auto mt-24 w-9/10">
					Say <i>hello</i> to having a <strong>Fortune 500</strong> marketing department
					in your pocket.
				</Typography>
			</div>
			{/* <div className="w-full flex items-center justify-center">
				{user?.stripeSubscriptionId ? (
					<ManageSubscriptionButton className="mx-auto my-8" />
				) : (
					<Button className="mx-auto my-8" disabled>
						You are not subscribed yet.
					</Button>
				)}
			</div> */}
		</>
	);
}
