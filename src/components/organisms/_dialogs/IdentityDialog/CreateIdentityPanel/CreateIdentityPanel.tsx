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
import { FC } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import InfoTooltip from '@/components/atoms/InfoTooltip/InfoTooltip';

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

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="mx-auto" style={{ width: 'min(651px, 96vw)' }}>
					<div
						className="box-border w-full h-[326.05px] rounded-[8.81px] border-[2.2px] border-[#000000] p-4"
						style={{ backgroundColor: '#F4F9FF' }}
					>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="col-span-11 relative">
										<FormLabel className="font-secondary text-[14px]">
											{'Name (First and Last)*'}
										</FormLabel>
										<FormControl>
											<StyledInput field={field} />
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
											<StyledInput field={field} />
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
														width="w-full md:w-[510.01px]"
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
						</div>
					</div>

					{/* Verify button - desktop only */}
					<div className="-mt-[24px] hidden md:block">
						<Button
							disabled={!isCodeVerified}
							isLoading={isPendingSubmit}
							type="submit"
							className="relative -top-[10px] z-10 w-full h-[43.05px] rounded-[8.83px] border-[2px] text-white font-bold text-[18.77px] transition-colors hover:!bg-[#4C9E5C] active:!bg-[#428A51] active:translate-y-[1px] disabled:!opacity-100"
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

					{/* Spacer to prevent overlap with mobile sticky CTA */}
					<div className="md:hidden h-[64px]" />

					{/* Mobile sticky Save button via portal (matches dashboard style) */}
					{isMobile && typeof window !== 'undefined'
						? createPortal(
								<div className="mobile-sticky-cta" style={{ zIndex: 100500 }}>
									<Button
										disabled={!isCodeVerified}
										isLoading={isPendingSubmit}
										type="submit"
										className="w-full h-[53px] min-h-[53px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#050505] transition-colors !opacity-100 disabled:!opacity-100"
									>
										Save and continue
									</Button>
								</div>,
								document.body
						  )
						: null}

					{isEmailVerificationCodeSent && !isCodeVerified && (
						<FormField
							control={form.control}
							name="verificationCode"
							render={({ field }) => (
								<FormItem className="mt-1 mb-4">
									<FormLabel className="font-secondary text-[14px]">
										Verification Code
									</FormLabel>
									<div
										className="box-border w-full h-[120px] rounded-[8px] border-[2px] border-[#000000] flex flex-col items-center justify-center"
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
											<div className="mt-5 flex flex-col items-center">
												{/* Red base bar with gray overlay that grows from right to left */}
												<div className="relative w-[199px] h-[6px] bg-[#8F0A0A] rounded-full overflow-hidden">
													<div
														className="absolute right-0 top-0 h-full bg-[#EDD8D8]"
														style={{
															width: `${Math.max(
																0,
																Math.min(
																	100,
																	((countdownTotal - countdownSeconds) / countdownTotal) *
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
			</form>
		</FormProvider>
	);
};
