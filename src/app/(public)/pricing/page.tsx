'use client';

import { Typography } from '@/components/ui/typography';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { usePricingPage } from './usePricingPage';
import { cn } from '@/utils';
import Link from 'next/link';

export default function Products() {
	const { billingCycle, setBillingCycle } = usePricingPage();

	return (
		<div className="w-full">
			{/* First panel begins 450px from the very top of the page (accounts for 48px fixed navbar spacer) */}
			<section className="w-full h-[402px] bg-white">
				<div className="flex flex-col items-center pt-[185px]">
					<Typography
						variant="h1"
						className="text-center font-[var(--font-inter)] text-[45px] font-light leading-none"
					>
						Start Booking Today
					</Typography>
					<div className="flex justify-center mt-[39px]">
						<Link
							href="/free-trial"
							className="w-[265px] h-[40px] rounded-[10px] border-[3px] border-[#118521] bg-transparent font-[var(--font-inter)] text-[24px] font-medium text-[#118521] flex items-center justify-center"
						>
							Start Free Trial
						</Link>
					</div>
				</div>
			</section>

			{/* 728px tall block of #EFF6F0 */}
			<section className="w-full h-[728px] bg-[#EFF6F0]" />

			{/* 58px of white space */}
			<div className="w-full h-[58px] bg-white" />

			{/* 1028px tall block of #333333 */}
			<section className="w-full h-[1028px] bg-[#333333]" />

			{/* 58px white space */}
			<div className="w-full h-[58px] bg-white" />

			{/* 72px white space */}
			<div className="w-full h-[72px] bg-white" />

			{/* 1168px tall block of #F9F9F9 (product cards live here) */}
			<section className="w-full h-[1168px] bg-[#F9F9F9]">
				<div className="w-full max-w-[90vw] mx-auto pt-12">
					<div className="relative w-fit mx-auto pt-[99px]">
						<div className="absolute top-0 left-1/2 -translate-x-1/2 lg:left-[777px] lg:translate-x-0">
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
				</div>
			</section>
		</div>
	);
}
