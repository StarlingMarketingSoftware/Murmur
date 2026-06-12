'use client';

import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { cn } from '@/utils';
import { useEffect } from 'react';
import { usePricingPage } from './usePricingPage';

export default function Products() {
	const { billingCycle, setBillingCycle } = usePricingPage();

	useEffect(() => {
		window.scrollTo(0, 0);

		const scrollContainers = [document.documentElement, document.body];
		const previousOverflowY = scrollContainers.map((element) => ({
			element,
			value: element.style.getPropertyValue('overflow-y'),
			priority: element.style.getPropertyPriority('overflow-y'),
		}));

		scrollContainers.forEach((element) => {
			element.style.setProperty('overflow-y', 'hidden', 'important');
		});

		return () => {
			previousOverflowY.forEach(({ element, value, priority }) => {
				if (value) {
					element.style.setProperty('overflow-y', value, priority);
					return;
				}

				element.style.removeProperty('overflow-y');
			});
		};
	}, []);

	return (
		<main
			className="w-full"
			style={{
				height: 'calc(100dvh / var(--pricing-zoom, 1))',
				overflow: 'hidden',
				background: 'linear-gradient(180deg, #FFF 0%, #FFF 50%, #D5F1FF 100%)',
			}}
		>
			<section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[90vw] flex-col items-center py-12 sm:py-16 lg:h-full lg:justify-center lg:py-0">
				<div className="relative w-fit pt-[99px]">
					<div className="absolute top-0 left-1/2 -translate-x-1/2">
						<div
							className="relative inline-flex h-[39px] items-center rounded-[6.621px] bg-black/75 py-[3px] pr-[172px] pl-[3px]"
							role="group"
							aria-label="Billing cycle"
						>
							<div
								aria-hidden="true"
								className={cn(
									'h-[33px] w-[169px] rounded-[4.966px] bg-[#D9D9D9] transition-transform duration-200 ease-out',
									billingCycle === 'month' && 'translate-x-[169px]'
								)}
							/>
							<div className="absolute inset-0 flex p-[3px]">
								<button
									type="button"
									onClick={() => setBillingCycle('year')}
									aria-pressed={billingCycle === 'year'}
									className={cn(
										'relative z-10 h-[33px] w-[169px] select-none whitespace-nowrap',
										'flex items-center justify-center font-secondary text-[16px] leading-none font-medium transition-colors',
										billingCycle === 'year' ? 'text-black' : 'text-white'
									)}
								>
									Annual (Save 56%)
								</button>
								<button
									type="button"
									onClick={() => setBillingCycle('month')}
									aria-pressed={billingCycle === 'month'}
									className={cn(
										'relative z-10 h-[33px] w-[169px] select-none whitespace-nowrap',
										'flex items-center justify-center font-secondary text-[16px] leading-none font-medium transition-colors',
										billingCycle === 'month' ? 'text-black' : 'text-white'
									)}
								>
									Monthly
								</button>
							</div>
						</div>
					</div>

					<ProductList billingCycle={billingCycle} />
				</div>
			</section>
		</main>
	);
}
