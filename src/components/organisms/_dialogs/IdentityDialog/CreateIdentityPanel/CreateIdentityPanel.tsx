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
import InfoTooltip from '@/components/atoms/InfoTooltip/InfoTooltip';

interface StyledInputProps {
	field: ControllerRenderProps<UpsertIdentityFormValues>;
	width?: string;
	paddingRight?: string;
	disabled?: boolean;
}

const StyledInput: FC<StyledInputProps> = ({
	field,
	width = 'w-[615.75px]',
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
		countdownDisplay,
		isCodeExpired,
		isPendingSubmit,
	} = useCreateIdentityPanel(props);

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<div className="w-[651px] mx-auto">
					<div
						className="box-border w-[651px] h-[326.05px] rounded-[8.81px] border-[2.2px] border-[#000000] p-4"
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
														width="w-[510.01px]"
														paddingRight="32px"
														disabled={isCodeVerified}
													/>
													{isCodeVerified && (
														<CheckCircleIcon className="absolute top-1/2 -translate-y-1/2 right-2 stroke-primary" />
													)}
												</div>
												<Button
													className="whitespace-nowrap w-[100.24px] h-[44.06px] rounded-[7.28px] border-[0.91px] border-[#000000] !bg-[rgba(93,171,104,0.47)] text-black flex items-center justify-center font-secondary"
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

					{/* Verify button */}
					<div className="-mt-[24px]">
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

					{isEmailVerificationCodeSent && !isCodeVerified && (
						<FormField
							control={form.control}
							name="verificationCode"
							render={({ field }) => (
								<FormItem className="mt-1 mb-0">
									<FormLabel className="font-secondary text-[14px]">
										Verification Code
									</FormLabel>
									<div className="box-border w-[650px] h-[120px] rounded-[8px] flex flex-col items-center justify-center overflow-hidden">
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
												<InputOTPGroup>
													<InputOTPSlot index={0} />
													<InputOTPSlot index={1} />
													<InputOTPSlot index={2} />
													<InputOTPSlot index={3} />
													<InputOTPSlot index={4} />
													<InputOTPSlot index={5} />
												</InputOTPGroup>
											</InputOTP>
										</FormControl>
										{countdownDisplay && !isCodeVerified && (
											<Typography
												font="secondary"
												className={`text-xs mt-2 ${
													isCodeExpired ? 'text-destructive' : 'text-muted-foreground'
												}`}
											>
												{isCodeExpired
													? 'Code has expired. Please request a new code.'
													: `Code expires in: ${countdownDisplay}`}
											</Typography>
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
