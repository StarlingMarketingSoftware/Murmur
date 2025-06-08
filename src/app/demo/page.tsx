'use client';

import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeading from '@/components/atoms/_text/PageHeading';
import { AppLayout } from '@/components/molecules/_layouts/AppLayout/AppLayout';
import { TypographyP } from '@/components/ui/typography';
import { useDemo } from './useDemo';

const Demo = () => {
	const { onSubmit, isPending, form } = useDemo();
	return (
		<AppLayout>
			<PageHeading>Sign up for a Demo</PageHeading>
			<TypographyP>
				If you have received a trial code from us, please enter it below to activate your
				trial.
			</TypographyP>
			<Card>
				<CardHeader className="">
					<CardTitle>Demo Signup</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)}>
							<div className="flex sm:flex-row flex-col items-center w-full gap-0 sm:gap-4 m-0">
								<FormField
									control={form.control}
									name="trialCode"
									render={({ field }) => (
										<FormItem className="w-full sm:w-1/2">
											<FormLabel>Trial Code</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button size="lg" type="submit" isLoading={isPending}>
									Submit
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</AppLayout>
	);
};

export default Demo;
