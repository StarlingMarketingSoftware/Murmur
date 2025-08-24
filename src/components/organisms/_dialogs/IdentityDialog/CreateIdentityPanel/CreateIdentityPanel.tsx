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
				<div className="space-y-4 max-w-[639px] mx-auto">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem className="col-span-11">
								<FormLabel>{'Name (First and Last)*'}</FormLabel>
								<FormControl>
									<Input className="flex-grow" {...field} />
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
								<FormLabel>Website Link</FormLabel>
								<FormControl>
									<Input className="flex-grow" {...field} />
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
									<FormLabel>Email Address*</FormLabel>
									<InfoTooltip message="This is the address where you will receive your responses." />
								</div>
								<FormControl>
									<div className="flex gap-2 items-center">
										<div className="flex-1 relative">
											<Input {...field} disabled={isCodeVerified} />
											{isCodeVerified && (
												<CheckCircleIcon className="absolute top-1/4 right-4 stroke-primary" />
											)}
										</div>
										<Button
											className="col-span-1 min-w-0 w-full"
											variant={isCodeVerified ? 'light' : 'primary-light'}
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
												? 'Resend Code'
												: 'Verify'}
										</Button>
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{isEmailVerificationCodeSent && !isCodeVerified && (
						<FormField
							control={form.control}
							name="verificationCode"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Verification Code</FormLabel>
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
						className="w-full mt-3"
					>
						Save
					</Button>
				</div>
			</form>
		</FormProvider>
	);
};
