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
			<div className="flex flex-col items-center w-full px-4">
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-row justify-center w-full max-w-[500px] relative mx-auto"
				>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem className="relative w-full">
								<FormControl>
									<Input
										className="!h-[42px] !w-full !bg-gray-200 !border-black font-primary !text-[14px] sm:!text-[18px] !text-foreground placeholder:!text-black !pr-[120px] sm:!pr-[160px]"
										style={{ borderRadius: '7px' }}
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
						className="!absolute !right-[2px] !top-[2px] !h-[38px] !opacity-100 !w-[100px] sm:!w-[150px] px-3 sm:px-6 hover:bg-gray-100 !border-l !border-l-black !border-r-0 !border-t-0 !border-b-0 text-foreground !text-[14px] sm:!text-[18px]"
						style={{ backgroundColor: '#FFFFFF', borderRadius: '7px' }}
					>
						Try for Free
					</Button>
				</form>
			</div>
		</Form>
	);
};
