import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useLeadSender } from './useLeadSender';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';

export const LeadSender = () => {
	const { form, onSubmit, isPending } = useLeadSender();
	return (
		<Form {...form}>
			<div className="flex flex-col items-center">
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-row justify-center w-full max-w-2xl"
				>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem className="w-full translate-x-2">
								<FormControl>
									<Input
										className="!h-[50px] sm:!h-[68px] !w-full !min-w-0 sm:!min-w-[400px] lg:!min-w-[500px] !bg-gray-200 !border-black !rounded-md font-primary !text-[16px] sm:!text-[20px] lg:!text-[25px] !text-foreground placeholder:!text-black"
										{...field}
										placeholder="Enter your email"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						type="submit"
						variant="ghost"
						isLoading={isPending}
						className="!h-[50px] !opacity-100 sm:!h-[68px] px-4 sm:px-6 bg-background hover:bg-gray-100 !border-foreground border-1 text-foreground !text-[16px] sm:!text-[20px] lg:!text-[25px] -translate-x-2"
					>
						Try for Free
					</Button>
				</form>
				<Typography variant="p" className="text-center -mt-4">
					Full access for 7 days. Start today.
				</Typography>
			</div>
		</Form>
	);
};
