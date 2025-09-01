import {
	CreateIdentityPanelProps,
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
import { FormProvider } from 'react-hook-form';
import { CheckCircleIcon } from 'lucide-react';
import { Typography } from '@/components/ui/typography';
import { FC } from 'react';
import InfoTooltip from '@/components/atoms/InfoTooltip/InfoTooltip';

// Reusable styled input component
const StyledInput: FC<{
	field: any;
	width?: string;
	pr?: string;
	disabled?: boolean;
}> = ({ field, width = '616px', pr = '12px', disabled = false }) => (
	<div
		className="h-[44px] rounded-[7px] border-[#7D7D7D] border-1 bg-[#F3F6FF] flex items-center"
		style={{ width }}
	>
		<Input
			className="!bg-transparent !border-0 !outline-none !ring-0 !focus-visible:ring-0 !focus:ring-0 h-full w-full pl-3"
			style={{
				paddingRight: pr,
			}}
			{...field}
			disabled={disabled}
		/>
	</div>
);

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
					<div className="box-border w-[651px] h-[326px] rounded-[9px] border-[2px] border-black p-4">
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="col-span-11">
										<FormLabel className="font-secondary text-[14px]">
											{'Name (First and Last)*'}
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
														width="510.01px"
														pr="32px"
														disabled={isCodeVerified}
													/>
													{isCodeVerified && (
														<CheckCircleIcon className="absolute top-1/2 -translate-y-1/2 right-2 stroke-primary" />
													)}
												</div>
												<Button
													className="whitespace-nowrap w-[100px] h-[44px] rounded-[7px] border-1 border-black !bg-[rgba(93,171,104,0.47)] text-black font-secondary"
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

					{isEmailVerificationCodeSent && !isCodeVerified && (
						<FormField
							control={form.control}
							name="verificationCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="font-secondary text-[14px]">
										Verification Code
									</FormLabel>
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
												{Array.from({ length: 6 }).map((_, index) => (
													<InputOTPSlot index={index} key={index} />
												))}
											</InputOTPGroup>
										</InputOTP>
									</FormControl>
									<FormMessage />
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
								</FormItem>
							)}
						/>
					)}
					<Button
						disabled={!isCodeVerified}
						isLoading={isPendingSubmit}
						type="submit"
						className="w-full mt-3 rounded-[9px] border-1 text-black bg-[rgba(93,171,104,0.49)] border-[#5DAB68]"
					>
						Save and continue
					</Button>
				</div>
			</form>
		</FormProvider>
	);
};
