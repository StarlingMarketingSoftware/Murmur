'use client';

import { useEffect, useRef, useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { ProductList } from '@/components/organisms/ProductList/ProductList';
import { usePricingPage } from './usePricingPage';
import { cn } from '@/utils';
import Clock from '@/components/atoms/_svg/Clock';
import Graph from '@/components/atoms/_svg/Graph';
import Link from 'next/link';

type VenueColumns = [string[], string[], string[], string[]];

const VENUE_NAMES = [
	'Village Vangaurd',
	'Smalls',
	'Mezzrow',
	'Blue Note',
	'South',
	"Chris'",
	'TLA',
	'The Mann',
	'Time',
	'Nublu',
	'Ornithology',
	"Dizzy's",
	"Cliff Bell's",
	'Franklin Music Hall',
	'Union Transfer',
	'The Met',
	'Solar Myth',
];

const PIPELINE_COLUMNS = ['Contacts', 'Drafted', 'Sent', 'Replied'] as const;
const PIPELINE_FILLED_BG_CLASSES = [
	'bg-[#EB8586]', // Contacts
	'bg-[#FFCD73]', // Drafted
	'bg-[#53C076]', // Sent
	'bg-[#4B91E0]', // Replied
] as const;
const PIPELINE_ROWS = 7;

function mulberry32(seed: number) {
	let t = seed;
	return () => {
		t += 0x6d2b79f5;
		let x = t;
		x = Math.imul(x ^ (x >>> 15), x | 1);
		x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
		return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: T[], random: () => number = Math.random) {
	const array = [...items];
	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function getInitialVenueColumns(): VenueColumns {
	const rng = mulberry32(1337);
	const shuffledNames = shuffle(VENUE_NAMES, rng);
	const columns: VenueColumns = [[], [], [], []];

	// Ensure each column starts with at least 1 item.
	for (let col = 0; col < 4; col += 1) {
		const name = shuffledNames[col];
		if (name) columns[col].push(name);
	}

	shuffledNames.slice(4).forEach((name) => {
		const availableColumns = [0, 1, 2, 3].filter((col) => columns[col].length < PIPELINE_ROWS);
		const chosenCol =
			availableColumns[Math.floor(rng() * availableColumns.length)] ?? availableColumns[0] ?? 0;
		columns[chosenCol].push(name);
	});

	return columns;
}

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

function PipelineColumns({ venueColumns }: { venueColumns: VenueColumns }) {
	return (
		<>
			{PIPELINE_COLUMNS.map((title, boxIndex) => (
				<div
					key={title}
					className="relative shrink-0 w-[234px] h-[349px] rounded-[8px] border-2 border-black bg-transparent flex flex-col items-center pt-[37px] pb-[22px] gap-[8px]"
				>
					<div className="absolute top-[10px] left-[12px] font-[var(--font-inter)] text-[15px] font-normal leading-none text-black">
						{title}
					</div>

					{Array.from({ length: PIPELINE_ROWS }, (_, innerIndex) => {
						const name = venueColumns[boxIndex][innerIndex];
						const fillClassName = name ? PIPELINE_FILLED_BG_CLASSES[boxIndex] : 'bg-transparent';
						return (
							<div
								key={innerIndex}
								className={cn(
									'w-[222px] h-[34px] rounded-[8px] border-2 border-black flex items-center px-[11px]',
									fillClassName
								)}
							>
								<span className="font-[var(--font-inter)] text-[14px] leading-none text-black truncate">
									{name ?? '\u00A0'}
								</span>
							</div>
						);
					})}
				</div>
			))}
		</>
	);
}

export default function Products() {
	const { billingCycle, setBillingCycle } = usePricingPage();
	const [venueColumns, setVenueColumns] = useState<VenueColumns>(getInitialVenueColumns);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
		if (prefersReducedMotion) return;

		const stepIntervalMs = 950;

		const step = () => {
			// No sliding—items "teleport" between columns.
			// Keep each column packed from the top (no gaps) and never fully empty.
			setVenueColumns((prev) => {
				const next: VenueColumns = [
					[...prev[0]],
					[...prev[1]],
					[...prev[2]],
					[...prev[3]],
				];

				const MIN_PER_COLUMN = 1;

				// Target a balanced spread so we don't starve any column.
				// With 17 venues: [4, 4, 4, 5] (extra weight to the last column).
				const total = next.reduce((sum, col) => sum + col.length, 0);
				const base = Math.floor(total / 4);
				const remainder = total % 4;
				const targets = [base, base, base, base];
				for (let i = 0; i < remainder; i += 1) targets[3 - i] += 1;

				const counts = next.map((col) => col.length);
				const deviations = counts.map((count, idx) => Math.abs(count - targets[idx]));
				const maxDeviation = Math.max(...deviations);
				const totalDeviation = deviations.reduce((sum, d) => sum + d, 0);

				// Mostly move 1, but occasionally 2–3; more likely when we're far from target.
				let movesThisTick = 1;
				const r = Math.random();
				if (r < 0.82) movesThisTick = 1;
				else if (r < 0.95) movesThisTick = 2;
				else movesThisTick = 3;

				if (maxDeviation >= 3 || totalDeviation >= 7) {
					movesThisTick = Math.random() < 0.6 ? 2 : 3;
				}

				const scoreCounts = (c: number[]) =>
					c.reduce((sum, count, idx) => sum + (count - targets[idx]) ** 2, 0);

				const edges = [
					{ from: 0, to: 1 },
					{ from: 1, to: 2 },
					{ from: 2, to: 3 },
					{ from: 3, to: 0 },
				];

				for (let i = 0; i < movesThisTick; i += 1) {
					const currentCounts = next.map((col) => col.length);
					const beforeScore = scoreCounts(currentCounts);

					const candidates = edges
						.filter(
							(edge) =>
								next[edge.from].length > MIN_PER_COLUMN && next[edge.to].length < PIPELINE_ROWS
						)
						.map((edge) => {
							const afterCounts = [...currentCounts];
							afterCounts[edge.from] -= 1;
							afterCounts[edge.to] += 1;
							const afterScore = scoreCounts(afterCounts);
							const improvement = beforeScore - afterScore;

							// Small baseline weight to keep motion even when perfectly balanced.
							let weight = 0.15 + Math.max(0, improvement) * 2;

							// If Replied is overloaded and Contacts is light, wrap becomes more likely.
							if (edge.from === 3 && edge.to === 0) {
								const wrapNeed = (currentCounts[3] - targets[3]) - (currentCounts[0] - targets[0]);
								weight *= 0.25 + Math.max(0, wrapNeed) * 0.6;
							} else {
								// Favor forward flow slightly when not wrapping.
								weight *= 1.15;
							}

							// Tiny jitter to avoid repetitive patterns.
							weight *= 0.9 + Math.random() * 0.2;

							return { ...edge, afterScore, weight };
						});

					if (candidates.length === 0) break;

					const bestAfter = Math.min(...candidates.map((c) => c.afterScore));
					const top = candidates.filter((c) => c.afterScore <= bestAfter + 1);

					const totalWeight = top.reduce((sum, c) => sum + c.weight, 0);
					let threshold = Math.random() * totalWeight;
					let chosen = top[0]!;
					for (const c of top) {
						threshold -= c.weight;
						if (threshold <= 0) {
							chosen = c;
							break;
						}
					}

					const name = next[chosen.from].shift();
					if (!name) continue;
					next[chosen.to].push(name);
				}

				// Safety: if a column ever becomes empty, restore it immediately.
				for (let col = 0; col < 4; col += 1) {
					if (next[col].length > 0) continue;
					const donor = [0, 1, 2, 3]
						.filter((d) => d !== col && next[d].length > MIN_PER_COLUMN)
						.sort((a, b) => next[b].length - next[a].length)[0];
					if (typeof donor !== 'number') continue;
					const name = next[donor].shift();
					if (!name) continue;
					next[col].push(name);
				}

				return next;
			});
		};

		const intervalId = window.setInterval(step, stepIntervalMs);

		return () => {
			window.clearInterval(intervalId);
		};
	}, []);

	return (
		<div className="w-full">
			{/* First panel begins 450px from the very top of the page (accounts for 48px fixed navbar spacer) */}
			<section className="w-full bg-white min-[1145px]:h-[402px]">
				<div className="flex flex-col items-center justify-center py-12 sm:pt-24 sm:pb-12 min-[1145px]:pt-[235px] min-[1145px]:py-0">
					<Typography
						variant="h1"
						className="text-center font-[var(--font-inter)] text-[32px] sm:text-[45px] font-light leading-none"
					>
						Start Booking Today
					</Typography>
					<div className="flex justify-center mt-[18px] sm:mt-[39px]">
						<Link
							href="/free-trial"
							className={cn(
								'w-[168px] h-[28px] rounded-[8px] border-[2px] border-[#118521]',
								'bg-transparent font-[var(--font-inter)] text-[14px] font-medium text-[#118521]',
								'flex items-center justify-center',
								'sm:w-[265px] sm:h-[40px] sm:rounded-[10px] sm:border-[3px] sm:text-[24px]'
							)}
						>
							Start Free Trial
						</Link>
					</div>
				</div>
			</section>

			{/* 728px tall block of #EFF6F0 */}
			<section className="relative w-full bg-[#EFF6F0] overflow-hidden xl:h-[728px]">
				{/* Top-box placeholders (empty outline only) */}
				<div className="hidden xl:flex absolute top-[196px] left-1/2 -translate-x-[49px] gap-[11px] flex-nowrap z-10">
					<PipelineColumns venueColumns={venueColumns} />

					<div
						aria-hidden="true"
						className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
					>
						<div className="translate-x-[50px]">
							<Clock focusable="false" className="w-[560px] h-[560px]" />
						</div>
					</div>
				</div>

				<div className="mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex flex-col items-stretch pt-8 sm:pt-[54px] pb-10 sm:pb-[54px] xl:flex-row xl:h-full xl:pb-0">
						<div className="flex w-full max-w-[560px] flex-col mx-auto xl:mx-0 xl:pb-[54px]">
							<Typography
								variant="h2"
								className="text-center xl:text-left font-[var(--font-inter)] text-[36px] xl:text-[64px] leading-[1.05] text-black"
							>
								Get your time back
							</Typography>

							<div
								className={cn(
									'mt-4 grid w-fit grid-cols-[auto_1fr] gap-x-3 gap-y-4',
									'mx-auto -translate-x-9',
									'xl:mt-10 xl:mx-0 xl:w-auto xl:translate-x-0 xl:gap-x-8 xl:gap-y-5'
								)}
							>
								<div className="text-right font-[var(--font-inter)] text-[18px] xl:text-[32px] font-semibold leading-none text-black">
									<LiveNumber
										initialValue={210_000}
										incrementPerSecond={18}
										burstTargetMin={12}
										burstTargetMax={48}
									/>
								</div>
								<div className="font-[var(--font-inter)] text-[18px] xl:text-[32px] font-semibold leading-none text-black">
									Emails Sent
								</div>

								<div className="text-right font-[var(--font-inter)] text-[18px] xl:text-[32px] font-semibold leading-none text-black">
									<LiveNumber
										initialValue={25_999}
										incrementPerSecond={6}
										burstTargetMin={4}
										burstTargetMax={18}
									/>
								</div>
								<div className="font-[var(--font-inter)] text-[18px] xl:text-[32px] font-semibold leading-none text-black">
									Replies
								</div>

								<div className="text-right font-[var(--font-inter)] text-[18px] xl:text-[32px] font-semibold leading-none text-black">
									<LiveNumber initialValue={6_000} incrementPerSecond={0.2} />
								</div>
								<div className="font-[var(--font-inter)] text-[18px] xl:text-[32px] font-semibold leading-none text-black">
									Bookings
								</div>
							</div>

							{/* Mobile pipeline + clock graphic */}
							<div className="relative left-1/2 -translate-x-1/2 mt-6 w-screen overflow-hidden xl:hidden sm:mt-8">
								<div className="relative h-[320px] w-full sm:h-[360px]">
									<div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 z-0 sm:top-1/2">
										<div className="translate-x-7 sm:translate-x-0">
											<div className="origin-center scale-[0.58] translate-y-3 sm:translate-y-0">
												<div className="flex gap-[11px] flex-nowrap">
													<PipelineColumns venueColumns={venueColumns} />
												</div>
											</div>
										</div>
									</div>

									<div
										aria-hidden="true"
										className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-full aspect-square"
									>
										<div className="h-full w-full translate-x-8 sm:translate-x-0">
											<Clock focusable="false" scale={0.8} className="h-full w-full" />
										</div>
									</div>
								</div>
							</div>

							<Typography
								variant="p"
								className="mt-8 xl:mt-auto w-full xl:w-[660px] 2xl:w-[720px] font-[var(--font-inter)] text-[13px] 2xl:text-[23px] font-medium leading-[1.4] 2xl:leading-[1.25] text-black text-center xl:text-left"
							>
								{'Booking out your calendar can take months of back and forth. '}
								<br className="hidden 2xl:block" />
								{'With Murmur, most users spend about 5 hours a month and their '}
								<br className="hidden 2xl:block" />
								{'calendars are fully booked.'}
							</Typography>
						</div>
					</div>
				</div>
			</section>

			{/* 58px of white space */}
			<div className="w-full h-[58px] bg-white" />

			{/* 1028px tall block of #333333 */}
			<section className="relative w-full bg-[#333333] xl:h-[1028px]">
				<div className="mx-auto w-full max-w-[1200px] px-6 pt-[72px] pb-16 xl:pb-0">
					<Typography
						variant="h2"
						className="mx-auto w-full max-w-[562px] text-left xl:mx-0 xl:max-w-none font-[var(--font-inter)] text-[32px] xl:text-[64px] leading-[1.05] text-white"
					>
						Results that matter
					</Typography>

					<div className="mt-12 mx-auto w-full max-w-[562px] xl:absolute xl:bottom-[360px] xl:left-1/2 xl:-translate-x-[441px] xl:mt-0 xl:mx-0">
						<Graph aria-hidden="true" className="h-auto w-full" />
					</div>

					<div
						className={cn(
							'mt-10 mx-auto grid w-full max-w-[562px] grid-cols-2 justify-items-center gap-x-3 gap-y-16',
							'xl:absolute xl:top-[249px] xl:left-1/2 xl:mx-0 xl:mt-0 xl:w-auto xl:max-w-none xl:translate-x-[230px] xl:flex xl:flex-col xl:items-start xl:gap-[125px]'
						)}
					>
						<div className="relative h-[120px] w-full max-w-[262px]">
							<div className="absolute bottom-[calc(100%+6px)] left-0 w-full px-3 xl:px-6 text-left font-[var(--font-inter)] text-[12px] xl:text-[18px] leading-[1.2] text-[#C2C2C2]">
								users experience up to
							</div>
							<div className="flex h-full w-full flex-col justify-between rounded-[10px] border-[3px] border-[#20B135] bg-[#177110] px-3 xl:px-6 py-2 xl:py-[10px]">
								<div className="font-[var(--font-inter)] text-[44px] xl:text-[70px] font-medium leading-[0.9] text-white">
									5.7x
								</div>
								<div className="font-[var(--font-inter)] text-[18px] xl:text-[30px] leading-none text-[#CAC7C7]">
									more replies
								</div>
							</div>
							<div className="absolute top-[calc(100%+6px)] left-0 w-full px-3 xl:px-6 text-left font-[var(--font-inter)] text-[12px] xl:text-[18px] leading-[1.2] text-[#C2C2C2]">
								than musicians booking
								<br />
								on their own
							</div>
						</div>
						<div className="relative h-[120px] w-full max-w-[262px]">
							<div className="absolute bottom-[calc(100%+6px)] left-0 w-full px-3 xl:px-6 text-left font-[var(--font-inter)] text-[12px] xl:text-[18px] leading-[1.2] text-[#C2C2C2]">
								users hear back from
							</div>
							<div className="flex h-full w-full flex-col justify-between rounded-[10px] border-[3px] border-[#20B135] bg-[#177110] px-3 xl:px-6 py-2 xl:py-[10px]">
								<div className="font-[var(--font-inter)] text-[44px] xl:text-[70px] font-medium leading-[0.9] text-white">
									471%
								</div>
								<div className="font-[var(--font-inter)] text-[18px] xl:text-[30px] leading-none text-[#CAC7C7]">
									more venues
								</div>
							</div>
							<div className="absolute top-[calc(100%+6px)] left-0 w-full px-3 xl:px-6 text-left font-[var(--font-inter)] text-[12px] xl:text-[18px] leading-[1.2] text-[#C2C2C2]">
								than they’re used to
								<br />
								hearing from.
							</div>
						</div>
					</div>

					<div className="mt-12 -mx-6 w-[calc(100%+48px)] flex items-start rounded-none bg-[#666666] px-6 py-4 xl:absolute xl:bottom-[180px] xl:left-1/2 xl:mt-0 xl:h-[76px] xl:w-[1077px] xl:mx-0 xl:-translate-x-1/2 xl:items-center xl:rounded-[10px] xl:px-10 xl:py-0">
						<p className="mx-auto w-full max-w-[680px] xl:mx-0 xl:max-w-none font-[var(--font-inter)] text-[13px] xl:text-[22.5px] font-medium leading-[1.35] xl:leading-[1.2] text-white">
							<span className="block">
								This is because we help them find the right person to reach, give them the best way to
								structure
							</span>
							<span className="block">
								what they’re sending, and provide the correct info about each contact they send to.
							</span>
						</p>
					</div>
				</div>
			</section>

			{/* 58px white space */}
			<div className="w-full h-[58px] bg-white" />

			{/* 72px white space */}
			<div className="w-full h-[72px] bg-white" />

			{/* 1168px tall block of #F9F9F9 (product cards live here) */}
			<section className="w-full bg-[#F9F9F9] lg:h-[1168px]">
				<div className="mx-auto flex h-full w-full max-w-[90vw] flex-col pt-12 lg:pt-[135px]">
					<div className="relative w-fit mx-auto pt-[99px]">
						<div className="absolute top-0 right-0 lg:right-auto lg:left-[777px]">
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

					<div className="mt-[120px] flex flex-col items-center pb-[160px] lg:mt-auto lg:pb-[120px]">
						<p className="font-inter font-normal text-[clamp(32px,9vw,62px)] text-black text-center leading-[1.05]">
							Try Murmur Now
						</p>
						<div className="mt-[39px] flex justify-center">
							<Link
								href="/free-trial"
								className="w-[265px] h-[40px] rounded-[10px] border-[3px] border-[#118521] bg-transparent font-[var(--font-inter)] text-[24px] font-medium text-[#118521] flex items-center justify-center"
							>
								Start Free Trial
							</Link>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
