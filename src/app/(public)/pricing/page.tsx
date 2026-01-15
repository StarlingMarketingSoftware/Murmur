'use client';

import { useEffect, useRef, useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { usePricingPage } from './usePricingPage';
import { cn } from '@/utils';
import Link from 'next/link';

function formatCount(value: number) {
	return value.toLocaleString('en-US');
}

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function useLiveCounter(
	initialValue: number,
	incrementPerSecond: number,
	burstTargetMin?: number,
	burstTargetMax?: number
) {
	const [value, setValue] = useState(initialValue);
	const remainderRef = useRef(0);
	const burstTargetRef = useRef<number | null>(null);
	const runRemainingRef = useRef(0);
	const runTimeoutRef = useRef<number | null>(null);

	useEffect(() => {
		setValue(initialValue);
		remainderRef.current = 0;
		runRemainingRef.current = 0;
		if (runTimeoutRef.current !== null) {
			window.clearTimeout(runTimeoutRef.current);
			runTimeoutRef.current = null;
		}
	}, [initialValue]);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
		if (prefersReducedMotion) return;

		let cancelled = false;

		const useBursts =
			typeof burstTargetMin === 'number' &&
			typeof burstTargetMax === 'number' &&
			burstTargetMax > 0;

		burstTargetRef.current = useBursts ? randomInt(burstTargetMin, burstTargetMax) : null;

		const runStep = () => {
			if (cancelled) return;

			if (document.hidden) {
				runTimeoutRef.current = window.setTimeout(runStep, 200);
				return;
			}

			if (runRemainingRef.current <= 0) {
				runTimeoutRef.current = null;
				return;
			}

			runRemainingRef.current -= 1;
			setValue((v) => v + 1);

			if (runRemainingRef.current <= 0) {
				runTimeoutRef.current = null;
				return;
			}

			const pause = Math.random() < 0.12 ? randomInt(350, 1200) : 0;
			const delayMs = randomInt(180, 520) + pause;
			runTimeoutRef.current = window.setTimeout(runStep, delayMs);
		};

		const startSlowRun = (steps: number) => {
			if (steps <= 0) return;
			if (runRemainingRef.current > 0) return;
			runRemainingRef.current = steps;
			if (runTimeoutRef.current === null) {
				runTimeoutRef.current = window.setTimeout(runStep, randomInt(120, 420));
			}
		};

		let last = performance.now();

		const intervalId = window.setInterval(() => {
			const now = performance.now();
			if (document.hidden) {
				last = now;
				return;
			}

			const deltaSec = (now - last) / 1000;
			last = now;

			remainderRef.current += deltaSec * incrementPerSecond;

			if (useBursts && burstTargetRef.current !== null) {
				let safety = 0;
				while (remainderRef.current >= burstTargetRef.current && safety < 3) {
					const burstSize = burstTargetRef.current;
					remainderRef.current -= burstSize;
					setValue((v) => v + burstSize);
					burstTargetRef.current = randomInt(burstTargetMin!, burstTargetMax!);
					safety += 1;
				}

				// Mix in the occasional slow, consecutive count-up between bursts.
				const canStartRun = runRemainingRef.current <= 0 && runTimeoutRef.current === null;
				const maxAffordableSteps = Math.min(6, Math.floor(remainderRef.current));
				if (
					canStartRun &&
					maxAffordableSteps >= 2 &&
					burstTargetRef.current !== null &&
					remainderRef.current < burstTargetRef.current &&
					Math.random() < 0.02
				) {
					const steps = randomInt(2, maxAffordableSteps);
					remainderRef.current -= steps;
					startSlowRun(steps);
				}
			} else if (remainderRef.current >= 1) {
				const increment = Math.floor(remainderRef.current);
				remainderRef.current -= increment;
				setValue((v) => v + increment);
			}
		}, 100);

		return () => {
			cancelled = true;
			window.clearInterval(intervalId);
			if (runTimeoutRef.current !== null) {
				window.clearTimeout(runTimeoutRef.current);
				runTimeoutRef.current = null;
			}
			runRemainingRef.current = 0;
		};
	}, [incrementPerSecond, burstTargetMin, burstTargetMax]);

	return value;
}

function LiveNumber({
	initialValue,
	incrementPerSecond,
	burstTargetMin,
	burstTargetMax,
}: {
	initialValue: number;
	incrementPerSecond: number;
	burstTargetMin?: number;
	burstTargetMax?: number;
}) {
	const value = useLiveCounter(initialValue, incrementPerSecond, burstTargetMin, burstTargetMax);

	return <span className="tabular-nums">{formatCount(value)}</span>;
}

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
			<section className="relative w-full h-[728px] bg-[#EFF6F0]">
				{/* Top-box placeholders (empty outline only) */}
				<div className="hidden lg:flex absolute top-[196px] left-1/2 -translate-x-[49px] gap-[11px] flex-nowrap z-10">
					<div className="w-[234px] h-[349px] rounded-[8px] border-2 border-black bg-transparent" />
					<div className="w-[234px] h-[349px] rounded-[8px] border-2 border-black bg-transparent" />
					<div className="w-[234px] h-[349px] rounded-[8px] border-2 border-black bg-transparent" />
					<div className="w-[234px] h-[349px] rounded-[8px] border-2 border-black bg-transparent" />
				</div>

				<div className="mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex h-full items-start pt-[104px]">
						<div className="w-full max-w-[560px]">
							<Typography
								variant="h2"
								className="font-[var(--font-inter)] text-[48px] sm:text-[64px] leading-[1.05] text-black"
							>
								Get your time back
							</Typography>

							<div className="mt-10 grid grid-cols-[auto_1fr] gap-x-8 gap-y-5">
								<div className="text-right font-[var(--font-inter)] text-[24px] sm:text-[32px] font-semibold leading-none text-black">
									<LiveNumber
										initialValue={210_000}
										incrementPerSecond={18}
										burstTargetMin={12}
										burstTargetMax={48}
									/>
								</div>
								<div className="font-[var(--font-inter)] text-[24px] sm:text-[32px] font-semibold leading-none text-black">
									Emails Sent
								</div>

								<div className="text-right font-[var(--font-inter)] text-[24px] sm:text-[32px] font-semibold leading-none text-black">
									<LiveNumber
										initialValue={25_999}
										incrementPerSecond={6}
										burstTargetMin={4}
										burstTargetMax={18}
									/>
								</div>
								<div className="font-[var(--font-inter)] text-[24px] sm:text-[32px] font-semibold leading-none text-black">
									Replies
								</div>

								<div className="text-right font-[var(--font-inter)] text-[24px] sm:text-[32px] font-semibold leading-none text-black">
									<LiveNumber initialValue={6_000} incrementPerSecond={0.2} />
								</div>
								<div className="font-[var(--font-inter)] text-[24px] sm:text-[32px] font-semibold leading-none text-black">
									Bookings
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

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
