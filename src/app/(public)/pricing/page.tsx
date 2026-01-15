'use client';

import { Typography } from '@/components/ui/typography';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { usePricingPage } from './usePricingPage';
import { cn } from '@/utils';

export default function Products() {
	const { billingCycle, setBillingCycle } = usePricingPage();

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
			</div>
		</>
	);
}
