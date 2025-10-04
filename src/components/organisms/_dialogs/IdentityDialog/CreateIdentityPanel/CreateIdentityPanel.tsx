import {
	CreateIdentityPanelProps,
	UpsertIdentityFormValues,
	useCreateIdentityPanel,
} from './useCreateIdentityPanel';

import { Button } from '@/components/ui/button';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ControllerRenderProps, FormProvider } from 'react-hook-form';
import { CheckCircleIcon } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import React, { FC, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import InfoTooltip from '@/components/atoms/InfoTooltip/InfoTooltip';
import { cn } from '@/utils/ui';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

interface StyledInputProps {
	field: ControllerRenderProps<UpsertIdentityFormValues>;
	width?: string;
	paddingRight?: string;
	disabled?: boolean;
}

const StyledInput: FC<StyledInputProps> = ({
	field,
	width = 'w-full md:w-[615.75px]',
	paddingRight = '12px',
	disabled = false,
}) => {
	return (
		<div
			className={`${width} h-[44px] rounded-[7px] border-[#7D7D7D] border-[1px] bg-[#FFFFFF] flex items-center`}
		>
			<Input
				className="!bg-transparent !border-0 !outline-none !ring-0 !focus-visible:ring-0 !focus:ring-0 h-full w-full pl-[12px]"
				variant="light"
				rounded={false}
				style={{
					paddingRight: paddingRight,
				}}
				{...field}
				disabled={disabled}
			/>
		</div>
	);
};

export const CreateIdentityPanel: FC<CreateIdentityPanelProps> = (props) => {
	const {
		onSubmit,
		form,
		handleSendEmailVerificationCode,
		isPendingCreateEmailVerificationCode,
		isEmailVerificationCodeSent,
		handleVerifyCode,
		isPendingVerifyCode,
		isCodeVerified,
		countdownSeconds,
		countdownTotal,
		minutesRemaining,
		isCodeExpired,
		isPendingSubmit,
	} = useCreateIdentityPanel(props);

	const isMobile = useIsMobile();
	const [isLandscape, setIsLandscape] = useState(false);
	const [viewportHeight, setViewportHeight] = useState<number | null>(null);
	const [hasScrollableContent, setHasScrollableContent] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const updateOrientation = () => {
			if (typeof window === 'undefined') return;
			setIsLandscape(window.innerWidth > window.innerHeight);
			setViewportHeight(window.innerHeight);
		};
		updateOrientation();
		window.addEventListener('resize', updateOrientation);
		window.addEventListener('orientationchange', updateOrientation);
		return () => {
			window.removeEventListener('resize', updateOrientation);
			window.removeEventListener('orientationchange', updateOrientation);
		};
	}, []);

	// Check if content is scrollable
	useEffect(() => {
		const checkScrollable = () => {
			// Add a small delay to ensure DOM is updated
			setTimeout(() => {
				if (containerRef.current) {
					// Find the scrollable element within CustomScrollbar
					const scrollableElement = containerRef.current.querySelector(
						'.custom-scrollbar-content'
					);
					if (scrollableElement) {
						const { scrollHeight, clientHeight } = scrollableElement as HTMLElement;
						const isScrollable = scrollHeight > clientHeight;
						setHasScrollableContent(isScrollable);
					}
				}
			}, 100);
		};

		checkScrollable();
		window.addEventListener('resize', checkScrollable);

		// Also check when verification code section appears/disappears
		let observer: ResizeObserver | null = null;
		const setupObserver = () => {
			if (containerRef.current) {
				observer = new ResizeObserver(checkScrollable);
				observer.observe(containerRef.current);
			}
		};

		// Setup observer after a delay to ensure ref is attached
		setTimeout(setupObserver, 200);

		return () => {
			window.removeEventListener('resize', checkScrollable);
			if (observer) {
				observer.disconnect();
			}
		};
	}, [isMobile, isLandscape, isEmailVerificationCodeSent, isCodeVerified]);

	// Detect short landscape heights to compress layout further
	const isShortLandscape = isMobile && isLandscape && (viewportHeight ?? Infinity) <= 420;
	const isVeryShortLandscape =
		isMobile && isLandscape && (viewportHeight ?? Infinity) <= 360;

	// Panel height compresses with viewport height in landscape
	const panelHeightStyle =
		isMobile && isLandscape
			? {
					height: isVeryShortLandscape ? 'min(280px, 45vh)' : 'min(280px, 50vh)',
					maxHeight: isVeryShortLandscape ? 'min(280px, 45vh)' : 'min(280px, 50vh)',
					minHeight: '200px',
			  }
			: {
					height: '326.05px',
					maxHeight: '326.05px',
					minHeight: '200px',
			  };

	// Adjust spacing between form fields when height is constrained
	const formSpacingClass = isVeryShortLandscape
		? 'space-y-2'
		: isShortLandscape
		? 'space-y-3'
		: 'space-y-4';

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div
					className="mx-auto"
					style={{
						width: isMobile && isLandscape ? 'min(651px, 41.43vw)' : 'min(651px, 96vw)',
					}}
				>
					<div
						ref={containerRef}
						className={cn(
							'box-border w-full rounded-[8.81px] border-[2.2px] border-[#000000] relative',
							// Add subtle shadow when content is scrollable
							hasScrollableContent ? 'shadow-inner' : ''
						)}
						style={{
							backgroundColor: '#F4F9FF',
							...panelHeightStyle,
						}}
					>
						<CustomScrollbar
							className="w-full h-full rounded-[6px]"
							contentClassName={cn(
								'scrollbar-hide',
								isVeryShortLandscape ? 'p-3' : 'p-4',
								// Add right padding when scrollbar is visible to prevent overlap
								hasScrollableContent ? 'pr-6' : ''
							)}
							disableOverflowClass
							thumbWidth={2}
							thumbColor="#000000"
							trackColor="transparent"
							offsetRight={-5}
						>
							<div className={formSpacingClass} style={{ pointerEvents: 'auto' }}>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="col-span-11 relative">
											<FormLabel className="font-secondary text-[14px]">
												{'Name (First and Last)*'}
											</FormLabel>
											<FormControl>
												<StyledInput
													field={field}
													width={isMobile && isLandscape ? 'w-full' : undefined}
												/>
											</FormControl>
											<div className="absolute left-0 top-full mt-0.5">
												<FormMessage className="m-0 leading-4" />
											</div>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="website"
									render={({ field }) => (
										<FormItem className="col-span-11">
											<FormLabel className="font-secondary text-[14px]">
												Website Link
											</FormLabel>
											<FormControl>
												<StyledInput
													field={field}
													width={isMobile && isLandscape ? 'w-full' : undefined}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<div className="flex items-start gap-2">
												<FormLabel className="font-secondary text-[14px]">
													Email Address*
												</FormLabel>
												<InfoTooltip message="This is the address where you will receive your responses." />
											</div>
											<FormControl>
												<div className="flex gap-2 items-center">
													<div className="flex-1 relative">
														<StyledInput
															field={field}
															width={
																isMobile && isLandscape
																	? 'w-full'
																	: 'w-full md:w-[510.01px]'
															}
															paddingRight="32px"
															disabled={isCodeVerified}
														/>
														{isCodeVerified && (
															<CheckCircleIcon className="absolute top-1/2 -translate-y-1/2 right-2 stroke-primary" />
														)}
													</div>
													<Button
														className="whitespace-nowrap w-[100.24px] h-[44.06px] rounded-[7.28px] border-[0.91px] border-[#000000] !bg-[rgba(93,171,104,0.47)] text-black flex items-center justify-center font-secondary focus-visible:!ring-0 focus:!ring-0 !ring-0 focus-visible:!ring-transparent !ring-transparent focus-visible:!outline-none focus:!outline-none !outline-none focus-visible:!border-[#000000] focus:!border-[#000000] !shadow-none focus:!shadow-none active:!shadow-none"
														variant={isCodeVerified ? 'light' : 'light'}
														type="button"
														onClick={(e) => {
															e.preventDefault();
															handleSendEmailVerificationCode();
														}}
														isLoading={
															isPendingCreateEmailVerificationCode || isPendingVerifyCode
														}
														disabled={!field.value || !!form.formState.errors.email}
													>
														{isCodeVerified
															? 'Reset'
															: isEmailVerificationCodeSent && !isCodeExpired
															? 'Resend'
															: 'Verify'}
													</Button>
												</div>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{isEmailVerificationCodeSent &&
									!isCodeVerified &&
									!(isMobile && isLandscape) && (
										<FormField
											control={form.control}
											name="verificationCode"
											render={({ field }) => (
												<FormItem
													className={cn(
														'mt-1 mb-4',
														isVeryShortLandscape
															? 'mt-0.5 mb-2'
															: isShortLandscape
															? 'mt-0.5 mb-3'
															: ''
													)}
												>
													<FormLabel className="font-secondary text-[14px]">
														Verification Code
													</FormLabel>
													<div
														className={cn(
															'box-border w-full rounded-[8px] border-[2px] border-[#000000] flex flex-col items-center justify-center',
															isVeryShortLandscape
																? 'h-[90px]'
																: isShortLandscape
																? 'h-[100px]'
																: 'h-[120px]'
														)}
														style={{ borderStyle: 'solid' }}
													>
														<FormControl>
															<InputOTP
																maxLength={6}
																pattern="[0-9]*"
																{...field}
																disabled={isCodeExpired}
																onChange={(value) => {
																	field.onChange(value);
																	handleVerifyCode(value);
																}}
															>
																<InputOTPGroup className="gap-1.5">
																	<InputOTPSlot
																		index={0}
																		className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
																	/>
																	<InputOTPSlot
																		index={1}
																		className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
																	/>
																	<InputOTPSlot
																		index={2}
																		className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
																	/>
																	<InputOTPSlot
																		index={3}
																		className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
																	/>
																	<InputOTPSlot
																		index={4}
																		className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
																	/>
																	<InputOTPSlot
																		index={5}
																		className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
																	/>
																</InputOTPGroup>
															</InputOTP>
														</FormControl>
														{countdownSeconds !== null && !isCodeVerified && (
															<div
																className={cn(
																	'flex flex-col items-center',
																	isVeryShortLandscape
																		? 'mt-2'
																		: isShortLandscape
																		? 'mt-3'
																		: 'mt-5'
																)}
															>
																{/* Red base bar with gray overlay that grows from right to left */}
																<div className="relative w-[199px] h-[6px] bg-[#8F0A0A] rounded-full overflow-hidden">
																	<div
																		className="absolute right-0 top-0 h-full bg-[#EDD8D8]"
																		style={{
																			width: `${Math.max(
																				0,
																				Math.min(
																					100,
																					((countdownTotal - countdownSeconds) /
																						countdownTotal) *
																						100
																				)
																			)}%`,
																			transition: 'width 1s linear',
																		}}
																	/>
																</div>
																<Typography
																	font="secondary"
																	className="mt-1 text-black"
																	style={{ fontSize: '16.12px', fontWeight: 400 }}
																>
																	{minutesRemaining ?? 0}m
																</Typography>
															</div>
														)}
													</div>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
							</div>
						</CustomScrollbar>
					</div>

					{/* Save and continue button - desktop and mobile landscape (in-flow) */}
					<div
						className={cn(
							// Hide on mobile portrait where sticky portal is used
							isMobile && !isLandscape ? 'hidden' : '',
							// Match ExistingProfilesSection pull in mobile landscape
							isMobile && isLandscape ? '-mt-[36px]' : '-mt-[24px]',
							// Always show on desktop
							'md:block'
						)}
						style={{
							marginBottom: isMobile && isLandscape ? 0 : undefined,
						}}
					>
						<Button
							disabled={!isCodeVerified}
							isLoading={isPendingSubmit}
							type="submit"
							className={cn(
								'z-10 w-full h-[43.05px] rounded-[8.83px] border-[2px] text-white font-bold text-[18.77px] transition-colors hover:!bg-[#4C9E5C] active:!bg-[#428A51] active:translate-y-[1px] disabled:!opacity-100',
								// Nudge slightly lower in mobile landscape
								isMobile && isLandscape ? 'relative -top-[3px]' : 'relative -top-[2px]'
							)}
							style={{
								backgroundColor: '#5DAB68',
								borderColor: '#050505',
								color: '#FFFFFF',
								fontWeight: 700,
								fontSize: '18.77px',
								fontFamily: 'Times New Roman, Times, serif',
							}}
						>
							Save and continue
						</Button>
					</div>

					{/* Verification code section for mobile landscape - after Save button */}
					{isEmailVerificationCodeSent && !isCodeVerified && isMobile && isLandscape && (
						<div className="mt-4">
							<FormField
								control={form.control}
								name="verificationCode"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="font-secondary text-[14px]">
											Verification Code
										</FormLabel>
										<div
											className={cn(
												'box-border w-full rounded-[8px] border-[2px] border-[#000000] flex flex-col items-center justify-center',
												isVeryShortLandscape
													? 'h-[90px]'
													: isShortLandscape
													? 'h-[100px]'
													: 'h-[120px]'
											)}
											style={{ borderStyle: 'solid', backgroundColor: '#FFFFFF' }}
										>
											<FormControl>
												<InputOTP
													maxLength={6}
													pattern="[0-9]*"
													{...field}
													disabled={isCodeExpired}
													onChange={(value) => {
														field.onChange(value);
														handleVerifyCode(value);
													}}
												>
													<InputOTPGroup className="gap-1.5">
														<InputOTPSlot
															index={0}
															className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
														/>
														<InputOTPSlot
															index={1}
															className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
														/>
														<InputOTPSlot
															index={2}
															className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
														/>
														<InputOTPSlot
															index={3}
															className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
														/>
														<InputOTPSlot
															index={4}
															className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
														/>
														<InputOTPSlot
															index={5}
															className="box-border !w-[29px] !h-[33px] !aspect-auto !border-[1px] !border-[#000000] !rounded-[8px] first:!rounded-[8px] last:!rounded-[8px] !text-base !border-l data-[active=true]:!ring-0 data-[active=true]:!ring-transparent data-[active=true]:!border-[#000000] !outline-none focus:!outline-none focus:!ring-0 focus:!border-[#000000]"
														/>
													</InputOTPGroup>
												</InputOTP>
											</FormControl>
											{countdownSeconds !== null && !isCodeVerified && (
												<div
													className={cn(
														'flex flex-col items-center',
														isVeryShortLandscape
															? 'mt-2'
															: isShortLandscape
															? 'mt-3'
															: 'mt-5'
													)}
												>
													{/* Red base bar with gray overlay that grows from right to left */}
													<div className="relative w-[199px] h-[6px] bg-[#8F0A0A] rounded-full overflow-hidden">
														<div
															className="absolute right-0 top-0 h-full bg-[#EDD8D8]"
															style={{
																width: `${Math.max(
																	0,
																	Math.min(
																		100,
																		((countdownTotal - countdownSeconds) /
																			countdownTotal) *
																			100
																	)
																)}%`,
																transition: 'width 1s linear',
															}}
														/>
													</div>
													<Typography
														font="secondary"
														className="mt-1 text-black"
														style={{ fontSize: '16.12px', fontWeight: 400 }}
													>
														{minutesRemaining ?? 0}m
													</Typography>
												</div>
											)}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}

					{/* Spacer to prevent overlap with mobile sticky CTA (portrait only) */}
					{isMobile && !isLandscape ? <div className="md:hidden h-[64px]" /> : null}

					{/* Mobile sticky Save button via portal (portrait only) */}
					{isMobile && !isLandscape && typeof window !== 'undefined'
						? createPortal(
								<div
									className="mobile-sticky-cta"
									style={{
										zIndex: 100500,
										pointerEvents: 'auto',
									}}
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									<Button
										disabled={!isCodeVerified}
										isLoading={isPendingSubmit}
										onClick={(e) => {
											e.stopPropagation();
											// Since this button is outside the form, we need to manually trigger the submit
											form.handleSubmit(onSubmit)();
										}}
										onPointerDown={(e) => {
											e.stopPropagation();
										}}
										className="w-full h-[53px] min-h-[53px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#050505] transition-colors !opacity-100 disabled:!opacity-100"
										style={{
											pointerEvents: isCodeVerified ? 'auto' : 'none',
										}}
									>
										Save and continue
									</Button>
								</div>,
								document.body
						  )
						: null}
				</div>
			</form>
		</FormProvider>
	);
};
