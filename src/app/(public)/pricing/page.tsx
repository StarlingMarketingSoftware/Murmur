'use client';

import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { cn } from '@/utils';
import { useEffect } from 'react';
import { usePricingPage } from './usePricingPage';

export default function Products() {
	const { billingCycle, setBillingCycle } = usePricingPage();

	useEffect(() => {
		window.scrollTo(0, 0);

		// Desktop (lg+) is a viewport-fit, no-scroll design. Below lg the cards
		// stack in one column and the page must scroll natively.
		const desktopQuery = window.matchMedia('(min-width: 1024px)');
		const scrollContainers = [document.documentElement, document.body];
		let previousOverflowY:
			| { element: HTMLElement; value: string; priority: string }[]
			| null = null;

		const lock = () => {
			if (previousOverflowY) return;
			previousOverflowY = scrollContainers.map((element) => ({
				element,
				value: element.style.getPropertyValue('overflow-y'),
				priority: element.style.getPropertyPriority('overflow-y'),
			}));
			scrollContainers.forEach((element) => {
				element.style.setProperty('overflow-y', 'hidden', 'important');
			});
			window.scrollTo(0, 0);
		};

		const unlock = () => {
			if (!previousOverflowY) return;
			previousOverflowY.forEach(({ element, value, priority }) => {
				if (value) {
					element.style.setProperty('overflow-y', value, priority);
					return;
				}

				element.style.removeProperty('overflow-y');
			});
			previousOverflowY = null;
		};

		const applyForViewport = () => {
			if (desktopQuery.matches) {
				lock();
			} else {
				unlock();
			}
		};

		applyForViewport();
		desktopQuery.addEventListener('change', applyForViewport);

		return () => {
			desktopQuery.removeEventListener('change', applyForViewport);
			unlock();
		};
	}, []);

	return (
		<main
			className="pricing-landing w-full min-h-dvh lg:h-[calc(100dvh/var(--pricing-zoom,1))] lg:overflow-hidden"
			style={{
				background: 'linear-gradient(180deg, #FFF 0%, #FFF 50%, #D5F1FF 100%)',
			}}
		>
			<section className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-[90vw] flex-col items-center py-12 sm:py-16 lg:h-full lg:justify-center lg:py-0">
				<div className="relative w-fit pt-[99px]">
					<div className="absolute top-0 left-1/2 -translate-x-1/2">
						<div
							className="relative inline-flex h-[39px] items-center rounded-[6.621px] bg-black/75 p-[3px]"
							role="group"
							aria-label="Billing cycle"
						>
							<div
								aria-hidden="true"
								className={cn(
									'absolute top-[3px] left-[3px] h-[33px] w-[calc(50%-3px)] rounded-[4.966px] bg-[#D9D9D9] transition-transform duration-200 ease-out',
									billingCycle === 'month' && 'translate-x-full'
								)}
							/>
							<button
								type="button"
								onClick={() => setBillingCycle('year')}
								aria-pressed={billingCycle === 'year'}
								className={cn(
									'relative z-10 grid h-[33px] min-w-[169px] place-items-center px-2 select-none whitespace-nowrap',
									'font-secondary text-[16px] leading-none font-medium transition-colors',
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
									'relative z-10 grid h-[33px] min-w-[169px] place-items-center px-2 select-none whitespace-nowrap',
									'font-secondary text-[16px] leading-none font-medium transition-colors',
									billingCycle === 'month' ? 'text-black' : 'text-white'
								)}
							>
								{/* invisible copy of the longer label keeps both halves equal width,
								    so the 50%-wide slider always lines up */}
								<span aria-hidden="true" className="invisible [grid-area:1/1]">
									Annual (Save 56%)
								</span>
								<span className="[grid-area:1/1]">Monthly</span>
							</button>
						</div>
					</div>

					<ProductList billingCycle={billingCycle} />
				</div>
			</section>
		</main>
	);
}
