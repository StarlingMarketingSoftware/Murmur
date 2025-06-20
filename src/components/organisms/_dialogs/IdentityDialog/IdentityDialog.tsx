import { FC } from 'react';

import { IdentityDialogProps, useIdentityDialog } from './useIdentityDialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
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

export const IdentityDialog: FC<IdentityDialogProps> = (props) => {
	const {
		title,
		open,
		onOpenChange,
		text,
		onSubmit,
		children,
		triggerButton,
		isLoading,
		form,
		handleSendEmailVerificationCode,
		isPendingCreateEmailVerificationCode,
		isEmailVerificationCodeSent,
		handleVerifyCode,
		isPendingVerifyCode,
		isCodeVerified,
		countdownDisplay,
		isCodeExpired,
	} = useIdentityDialog(props);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				if (!open) {
					form.reset({
						name: '',
						email: '',
						website: '',
						verificationCode: '',
					});
				}
				onOpenChange(open);
			}}
		>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogDescription className="text-sm text-muted-foreground">
					{text ? text : children}
				</DialogDescription>
				<FormProvider {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="col-span-11">
										<FormLabel>{'Name (First and Last)'}</FormLabel>
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
							/>{' '}
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email Address</FormLabel>
										<FormControl>
											<div className="grid grid-cols-5 gap-2">
												<div className="col-span-4 relative">
													<Input {...field}></Input>
													{isCodeVerified && (
														<CheckCircleIcon className="absolute top-1/4 right-4 stroke-primary" />
													)}
												</div>
												<Button
													className="col-span-1 h-full"
													variant="primary-light"
													type="button"
													onClick={(e) => {
														e.preventDefault();
														handleSendEmailVerificationCode();
													}}
													isLoading={isPendingCreateEmailVerificationCode}
													disabled={
														isCodeVerified ||
														!field.value ||
														!!form.formState.errors.email
													}
												>
													{isEmailVerificationCodeSent && !isCodeExpired
														? 'Resend Code'
														: 'Verify Email'}
												</Button>
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							{isEmailVerificationCodeSent && (
								<FormField
									control={form.control}
									name="verificationCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email Verification Code</FormLabel>{' '}
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
											</FormControl>{' '}
											<FormMessage />
											{countdownDisplay && !isCodeVerified && (
												<p
													className={`text-sm ${
														isCodeExpired ? 'text-red-600' : 'text-muted-foreground'
													}`}
												>
													{isCodeExpired
														? 'Code has expired. Please request a new code.'
														: `Code expires in: ${countdownDisplay}`}
												</p>
											)}
											{isPendingVerifyCode && (
												<p className="text-sm text-muted-foreground">Verifying code...</p>
											)}
											{isCodeVerified && (
												<p className="text-sm text-green-600">
													Email verified successfully!
												</p>
											)}
										</FormItem>
									)}
								/>
							)}
						</div>
					</form>
				</FormProvider>
				<DialogFooter>
					<Button type="submit" onClick={() => onOpenChange(false)} variant="light">
						Cancel
					</Button>{' '}
					<Button
						disabled={!isCodeVerified}
						isLoading={isLoading}
						type="button"
						onClick={() => {
							onOpenChange(false);
						}}
					>
						Confirm
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
