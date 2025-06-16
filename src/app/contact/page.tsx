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
import { Card, CardContent } from '@/components/ui/card';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { Birds } from '@/components/atoms/_svg/Birds';
import { FAQS, useContactPage } from './useContactPage';
import { Typography } from '@/components/ui/typography';
import { FaqSection } from '@/components/molecules/FaqSection/FaqSection';

const Contact = () => {
	const { isPending, onSubmit, form } = useContactPage();

	return (
		<>
			<div className="absolute inset-0 -z-20">
				<div
					className="absolute inset-0 overflow-hidden"
					style={{
						maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
						WebkitMaskImage:
							'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
					}}
				>
					<Birds
						width="200%"
						height="200%"
						className="-translate-y-75 md:-translate-y-65 lg:-translate-y-100 -translate-x-65 min-w-[1500px]"
					/>
				</div>
			</div>
			<div
				className="absolute inset-0 backdrop-blur-lg -z-10"
				style={{
					maskImage:
						'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.95) 50%)',
					WebkitMaskImage:
						'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 30%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.9) 100%)',
				}}
			/>
			<Typography variant="h1" className="text-center mt-32">
				Having Trouble?
			</Typography>
			<Typography variant="h1" className="text-center mt-20">
				Get Help
			</Typography>
			<div className="mt-39">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="">
						<Card className="max-w-[1480px] mx-auto w-9/10 border-primary border-3 px-11 pb-15 pt-6">
							<CardContent>
								<div className="flex sm:flex-row flex-col items-center w-full gap-0 sm:gap-18 m-0">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem className="w-full sm:w-1/2">
												<FormLabel>Full Name*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem className="w-full sm:w-1/2">
												<FormLabel>Email Address*</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<FormField
									control={form.control}
									name="subject"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Subject*</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="message"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Message*</FormLabel>
											<FormControl>
												<RichTextEditor
													className="rounded-none"
													hideMenuBar
													value={field.value}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
						<div className="flex justify-center mt-22">
							<Button
								font="secondary"
								className="rounded-none w-[341px]"
								size="lg"
								type="submit"
								isLoading={isPending}
							>
								Submit
							</Button>
						</div>
					</form>
				</Form>
			</div>
			<div className="mt-46 mx-auto w-fit">
				<Typography bold className="text-[25px] text-center">
					Other Ways to Reach Us
				</Typography>
				<div className="mt-12 flex gap-30 text-[23px]">
					<Typography bold>Email:</Typography>
					<Typography font="secondary">starlingmarketingagency@gmail.com</Typography>
				</div>
				<div className="mt-6 flex gap-30 text-[23px]">
					<Typography bold>Hours:</Typography>
					<Typography font="secondary">24/7</Typography>
				</div>
			</div>
			<div className="w-full h-fit min-h-100 bg-gradient-to-b from-background from-0% to-light to-15% pt-4">
				<FaqSection
					header="Support"
					title="Help"
					description="Get your questions answered!"
					faqs={FAQS}
				/>
			</div>
		</>
	);
};

export default Contact;
