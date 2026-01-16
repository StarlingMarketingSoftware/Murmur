'use client';

import Link from 'next/link';
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
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils';
import ResourceMapNav from '@/components/atoms/_svg/ResourceMapNav';
import ResourceResearchNav from '@/components/atoms/_svg/ResourceResearchNav';
import ResourceInboxNav from '@/components/atoms/_svg/ResourceInboxNav';
import ResourceDraftingNav from '@/components/atoms/_svg/ResourceDraftingNav';

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
		<div className="w-full">
			<section className="w-full bg-white">
				<div className="flex flex-col items-center justify-center py-12 sm:pt-24 sm:pb-12">
					<Typography
						variant="h1"
						className="text-center font-[var(--font-inter)] text-[32px] sm:text-[45px] font-light leading-none"
					>
						Resources
					</Typography>
					<div className="flex justify-center mt-[18px] sm:mt-[39px]">
						<Link
							href="/free-trial"
							className={cn(
								'w-[168px] h-[28px] rounded-[8px] border-[2px] border-[#118521]',
								'bg-transparent font-[var(--font-inter)] text-[14px] font-medium text-[#118521]',
								'flex items-center justify-center',
								'sm:w-[265px] sm:h-[40px] sm:rounded-[10px] sm:border-[3px] sm:text-[24px]'
							)}
						>
							Start Free Trial
						</Link>
					</div>
				</div>
			</section>

			<section className="w-full h-[560px] bg-[#F9F9F9]">
				<div className="mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex h-full flex-col items-center justify-center">
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
				</div>
			</section>

			<section className="w-full mt-[61px] h-[611px] bg-[#F9F9F9]">
				<div className="relative mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex flex-col items-center pt-0 sm:pt-8">
						<Typography
							variant="h2"
							className="text-center font-[var(--font-inter)] text-[32px] sm:text-[45px] font-light leading-none"
						>
							Learn more about murmur
						</Typography>
					</div>

					<div className="absolute left-1/2 -translate-x-1/2 bottom-[75px] grid grid-cols-2 gap-x-[31px] gap-y-[38px]">
						<Link href="/map" className="w-[276px] h-[185px] rounded-[8px] border-[2px] border-[#000000] bg-[#ADD8E7] overflow-hidden block">
							<div className="h-full flex flex-col">
								<div className="flex-1 flex items-center justify-center pt-2">
									<ResourceMapNav />
								</div>
								<div className="h-[70px] flex items-center justify-center">
									<p className="font-[var(--font-inter)] text-[28px] font-semibold text-black leading-none">
										Map
									</p>
								</div>
							</div>
						</Link>
						<Link href="/research" className="w-[276px] h-[185px] rounded-[8px] border-[2px] border-[#000000] bg-[#E9F7FF] overflow-hidden block">
							<div className="h-full flex flex-col">
								<div className="flex-1 flex items-center justify-center pt-3">
									<ResourceResearchNav />
								</div>
								<div className="h-[70px] flex items-center justify-center">
									<p className="font-[var(--font-inter)] text-[28px] font-semibold text-black leading-none">
										Research
									</p>
								</div>
							</div>
						</Link>
						<Link href="/inbox" className="w-[276px] h-[185px] rounded-[8px] border-[2px] border-[#000000] bg-[#6FA4E1] overflow-hidden block">
							<div className="h-full flex flex-col">
								<div className="flex-1 flex items-center justify-center pt-2">
									<ResourceInboxNav className="translate-x-[3px]" />
								</div>
								<div className="h-[70px] flex items-center justify-center">
									<p className="font-[var(--font-inter)] text-[28px] font-semibold text-black leading-none">
										Inbox
									</p>
								</div>
							</div>
						</Link>
						<Link href="/drafting" className="w-[276px] h-[185px] rounded-[8px] border-[2px] border-[#000000] bg-[#FFDC9E] overflow-hidden block">
							<div className="h-full flex flex-col">
								<div className="flex-1 flex items-center justify-center pt-4">
									<ResourceDraftingNav />
								</div>
								<div className="h-[70px] flex items-center justify-center">
									<p className="font-[var(--font-inter)] text-[28px] font-semibold text-black leading-none">
										Drafting
									</p>
								</div>
							</div>
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Resources;

