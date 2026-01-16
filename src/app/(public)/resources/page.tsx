'use client';

import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { useResourcesPage } from './useResourcesPage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const stripHtmlToText = (html: string) =>
	html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const Resources = () => {
	const { isPending, onSubmit, form } = useResourcesPage();
	const values = form.watch();

	const hasName = Boolean(values.name?.trim());
	const hasEmail = Boolean(values.email?.trim() && EMAIL_REGEX.test(values.email.trim()));
	const hasSubject = Boolean(values.subject?.trim());
	const hasMessage = Boolean(stripHtmlToText(values.message ?? ''));
	const isReadyToSubmit = hasName && hasEmail && hasSubject && hasMessage;

	return (
		<div className="mt-24">
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col items-center">
					<div className="w-[850px] h-[393px] rounded-[8px] border-[2px] border-[#000000] bg-[#A6E2A8] overflow-hidden flex flex-col">
						<div className="flex-1 flex items-center justify-center">
							<div className="w-[791px] flex flex-col gap-[23px]">
								<div className="flex gap-[19px]">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="mb-0">
											<FormLabel className="sr-only">Full Name</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="Full Name"
													className="w-[386px] h-[38px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold"
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
										<FormItem className="mb-0">
											<FormLabel className="sr-only">Email Address</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="Email Address"
													className="w-[386px] h-[38px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold"
												/>
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
										<FormItem className="mb-0">
											<FormLabel className="sr-only">Subject</FormLabel>
											<FormControl>
												<Input
													{...field}
													placeholder="Subject"
													className="w-[791px] h-[38px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="message"
									render={({ field }) => (
										<FormItem className="mb-0">
											<FormLabel className="sr-only">Message</FormLabel>
											<FormControl>
												<RichTextEditor
													hideMenuBar
													placeholder="Message"
													value={field.value}
													onChange={field.onChange}
													className="w-[791px] min-h-[189px] h-[189px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</div>
						{isReadyToSubmit && (
							<div className="w-full">
								<div className="w-full h-[2px] bg-[#000000]" />
								<button
									type="submit"
									disabled={isPending}
									className="w-full h-[37px] bg-[#5DAB68] text-[#FFFFFF] font-secondary text-[20px] font-semibold flex items-center justify-center disabled:opacity-50"
								>
									Submit
								</button>
							</div>
						)}
					</div>
					{!isReadyToSubmit && (
						<div className="mt-6 text-center font-secondary text-[24px] text-[#989898]">
							Fill out form and submit
						</div>
					)}
				</form>
			</Form>
		</div>
	);
};

export default Resources;

