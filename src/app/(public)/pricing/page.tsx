'use client';

import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { ArrowDown } from 'lucide-react';
import { GradientBanner } from '@/components/molecules/GradientBanner/GradientBanner';
import { StatBlock } from '@/components/molecules/StatBlock/StatBlock';
import { usePricingPage } from './usePricingPage';
import { FeaturesTable } from '@/components/molecules/FeaturesTable/FeaturesTable';
import { cn } from '@/utils';

export default function Products() {
	const { billingCycle, setBillingCycle, tableRef, handleScrollToTable } =
		usePricingPage();

	return (
		<>
			<Typography variant="h1" className="text-center mt-[156px]">
				Pricing
			</Typography>
			<div className="w-full max-w-[90vw] mx-auto mt-12">
				<div className="relative w-fit mx-auto pt-[99px]">
					<div
						className="absolute top-0 left-1/2 -translate-x-1/2 lg:left-[777px] lg:translate-x-0"
					>
						<div
							className="relative w-[278px] h-[76px] bg-black/75 rounded-[7px]"
							role="group"
							aria-label="Billing cycle"
						>
							<div className="relative h-[38px] w-full">
								<div
									aria-hidden="true"
									className={cn(
										'absolute top-[3px] left-[3px] w-[137px] h-[33px] bg-[#D9D9D9] rounded-[7px] transition-transform duration-200 ease-out',
										billingCycle === 'year' && 'translate-x-[135px]'
									)}
								/>
								<div className="absolute inset-0 flex">
									<button
										type="button"
										onClick={() => setBillingCycle('month')}
										aria-pressed={billingCycle === 'month'}
										className={cn(
											'relative z-10 w-[139px] h-[38px] flex items-center justify-center select-none',
											'text-[15px] leading-none font-secondary font-medium transition-colors',
											billingCycle === 'month' ? 'text-black' : 'text-white'
										)}
									>
										Monthly
									</button>
									<button
										type="button"
										onClick={() => setBillingCycle('year')}
										aria-pressed={billingCycle === 'year'}
										className={cn(
											'relative z-10 w-[139px] h-[38px] flex items-center justify-center select-none',
											'text-[15px] leading-none font-secondary font-medium transition-colors',
											billingCycle === 'year' ? 'text-black' : 'text-white'
										)}
									>
										Annual
									</button>
								</div>
							</div>
							<div
								aria-hidden="true"
								className="absolute right-[11px] bottom-[13px] w-[107px] h-[21px] rounded-[4px] border-2 border-[#5DAB68] flex items-center justify-center pointer-events-none"
							>
								<span className="font-secondary font-medium text-[16px] leading-none text-[#A0FFAE]">
									Save 56%
								</span>
							</div>
						</div>
					</div>
					<ProductList billingCycle={billingCycle} />
				</div>
				<div className="flex justify-center my-40">
					<Button
						variant="ghost"
						size="lg"
						className="relative group"
						outline
						onClick={handleScrollToTable}
					>
						<ArrowDown className="left-3 size-5 group-hover:translate-y-1 transition duration-200" />
						<Typography variant="h4" className="text-center">
							Compare all plan features
						</Typography>
						<ArrowDown className=" size-5 group-hover:translate-y-1 transition duration-200" />
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
				<div className="flex justify-center items-center mt-10 gap-20 md:gap-40">
					<StatBlock stat="99%" description="Email List Accuracy" />
					<StatBlock stat="5x" description="Verification Protocols" />
				</div>
			</div>
			<div className="h-22 w-full" ref={tableRef} />
			<div className="mx-4">
				<FeaturesTable />
			</div>
			<div className="max-w-[1059px] mx-auto w-9/10 mt-30">
				<Typography className="text-center" variant="promoP">
					No other campaign tool does personalization like we do. Say goodbye to
					“spray-and-pray” spam marketing and say hello to building meaningful
					relationships.
				</Typography>
			</div>
			<div className="max-w-[1059px] mx-auto mt-0 w-9/10 mb-20">
				<Typography
					className="text-center max-w-[1059px] mx-auto mt-24 w-9/10"
					variant="promoP"
				>
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
