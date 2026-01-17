'use client';

import * as React from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
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
import SearchStep from '@/components/atoms/_svg/SearchStep';
import SelectContactsMap from '@/components/atoms/_svg/SelectContactsMap';
import SelectedContactsResource from '@/components/atoms/_svg/SelectedContactsResource';
import CreateCampaign from '@/components/atoms/_svg/CreateCampaign';
import ResourcePageProfile from '@/components/atoms/_svg/ResourcePageProfile';
import FineTuneResource from '@/components/atoms/_svg/FineTuneResource';
import ResourceDraftBox from '@/components/atoms/_svg/ResourceDraftBox';
import ResourceTestDraft from '@/components/atoms/_svg/ResourceTestDraft';
import DraftReviewDemo from '@/components/atoms/_svg/DraftReviewDemo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const stripHtmlToText = (html: string) =>
	html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

type ScaledBoxProps = {
	scale: number;
	baseWidth: number;
	baseHeight: number;
	children: React.ReactNode;
};

const ScaledBox = ({ scale, baseWidth, baseHeight, children }: ScaledBoxProps) => {
	return (
		<div
			className="relative"
			style={{
				width: baseWidth * scale,
				height: baseHeight * scale,
			}}
		>
			<div
				className="absolute left-0 top-0"
				style={{
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
			>
				{children}
			</div>
		</div>
	);
};

const Resources = () => {
	const [stepCardsScale, setStepCardsScale] = React.useState(1);

	const { isPending, onSubmit, form } = useResourcesPage();
	const values = form.watch();

	const hasName = Boolean(values.name?.trim());
	const hasEmail = Boolean(values.email?.trim() && EMAIL_REGEX.test(values.email.trim()));
	const hasSubject = Boolean(values.subject?.trim());
	const hasMessage = Boolean(stripHtmlToText(values.message ?? ''));
	const isReadyToSubmit = hasName && hasEmail && hasSubject && hasMessage;

	React.useEffect(() => {
		const BASE_CARD_WIDTH_PX = 797;
		const HORIZONTAL_PADDING_PX = 48; // matches `px-6` on the step sections container

		const updateScale = () => {
			const availableWidth = Math.max(0, window.innerWidth - HORIZONTAL_PADDING_PX);
			setStepCardsScale(Math.min(1, availableWidth / BASE_CARD_WIDTH_PX));
		};

		updateScale();
		window.addEventListener('resize', updateScale);
		return () => window.removeEventListener('resize', updateScale);
	}, []);

	const getScaledStepPaddingStyle = React.useCallback(
		(basePaddingTopPx: number, basePaddingBottomPx: number) =>
			({
				paddingTop: basePaddingTopPx * stepCardsScale,
				paddingBottom: basePaddingBottomPx * stepCardsScale,
			}) as React.CSSProperties,
		[stepCardsScale]
	);

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

			<section className="w-full min-h-[560px] h-auto lg:h-[560px] bg-[#F9F9F9] py-12 lg:py-0">
				<div className="mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex h-full flex-col items-center justify-center">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col items-center w-full">
								<div className="w-full max-w-[calc(100vw-48px)] sm:max-w-[850px] h-auto min-h-[393px] rounded-[8px] border-[2px] border-[#000000] bg-[#A6E2A8] overflow-hidden flex flex-col py-8 lg:py-0 transition-none">
									<div className="flex-1 flex items-center justify-center px-4 lg:px-0">
										<div className="w-full min-w-0 lg:w-[791px] flex flex-col gap-[16px] lg:gap-[23px]">
											<div className="flex flex-col lg:flex-row gap-[16px] lg:gap-[19px]">
												<FormField
													control={form.control}
													name="name"
													render={({ field }) => (
														<FormItem className="mb-0 w-full min-w-0 lg:w-auto">
															<FormLabel className="sr-only">Full Name</FormLabel>
															<FormControl>
																<Input
																	{...field}
																	placeholder="Full Name"
																	className="w-full lg:w-[386px] h-[38px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold transition-none"
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
														<FormItem className="mb-0 w-full min-w-0 lg:w-auto">
															<FormLabel className="sr-only">Email Address</FormLabel>
															<FormControl>
																<Input
																	{...field}
																	placeholder="Email Address"
																	className="w-full lg:w-[386px] h-[38px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold transition-none"
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
													<FormItem className="mb-0 min-w-0">
														<FormLabel className="sr-only">Subject</FormLabel>
														<FormControl>
															<Input
																{...field}
																placeholder="Subject"
																className="w-full lg:w-[791px] h-[38px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold transition-none"
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
													<FormItem className="mb-0 min-w-0">
														<FormLabel className="sr-only">Message</FormLabel>
														<FormControl>
															<RichTextEditor
																hideMenuBar
																placeholder="Message"
																value={field.value}
																onChange={field.onChange}
																className="w-full lg:w-[791px] min-h-[189px] h-[189px] bg-[#FFFFFF] border-[#000000] border-[2px] rounded-[8px] placeholder:text-[#000000] placeholder:font-semibold font-semibold transition-none"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</div>
									{isReadyToSubmit && (
										<div className="w-full mt-6 lg:mt-0">
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

			<section className="w-full mt-[61px] h-auto min-[1100px]:h-[611px] bg-[#F9F9F9] pb-12 min-[1100px]:pb-0">
				<div className="relative mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex flex-col items-center pt-0 sm:pt-8">
						<Typography
							variant="h2"
							className="text-center font-[var(--font-inter)] text-[32px] sm:text-[45px] font-light leading-none"
						>
							Learn more about murmur
						</Typography>
					</div>

					<div className="mt-8 min-[1100px]:mt-0 min-[1100px]:absolute min-[1100px]:left-1/2 min-[1100px]:-translate-x-1/2 min-[1100px]:bottom-[75px] grid grid-cols-1 min-[1100px]:grid-cols-2 gap-[74px] min-[1100px]:gap-x-[31px] min-[1100px]:gap-y-[38px] justify-items-center">
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

			<section className="w-full mt-[73px] h-[86px] bg-[#F9F9F9]">
				<div className="mx-auto h-full w-full max-w-[1200px] px-6">
					<div className="flex h-full items-center justify-center">
						<Typography
							variant="h2"
							className="text-center font-[var(--font-inter)] text-[32px] sm:text-[45px] font-light leading-none"
						>
							Step by Step
						</Typography>
					</div>
				</div>
			</section>

			<section className="w-full mt-[20px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(18, 12)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={639}>
						<div className="absolute left-0 top-0 w-[797px] h-[639px] rounded-[6px] border-[2px] border-[#000000] bg-[#ADD8E7] overflow-hidden">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#DAF5FF] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Search</span>
						</div>
						<div className="absolute top-[77px] left-1/2 -translate-x-1/2 w-[732px] h-[290px] rounded-[6px] border-[2px] border-[#000000] bg-[#E9F9FF] flex items-center justify-center">
							<SearchStep />
						</div>
						<div className="absolute top-[413px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[16px] pb-[24px] flex flex-col gap-[32px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								Start by doing a search for the type of venue and location you're looking to book.
							</p>
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								There are two "why" options, and "promotion" will help you more so with radio stations.
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[24px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(9, 16)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={943}>
						<div className="absolute left-0 top-0 w-[797px] h-[943px] rounded-[6px] border-[2px] border-[#000000] bg-[#EB8586]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#FEC5C5] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Select Contacts</span>
						</div>
						<div className="absolute top-[77px] left-1/2 -translate-x-1/2">
							<SelectContactsMap />
						</div>
						<div className="absolute top-[420px] left-1/2 -translate-x-1/2 w-[732px] h-[288px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFE0E0] overflow-hidden">
							<SelectedContactsResource className="w-full h-full block" />
						</div>
						<div className="absolute top-[734px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[30px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								You can select contacts by either clicking on them on the map or by clicking them in the right side panel in the map. The selection is for what contacts you're looking to actually reach out to.
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[24px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(13, 18)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={639}>
						<div className="absolute left-0 top-0 w-[797px] h-[639px] rounded-[6px] border-[2px] border-[#000000] bg-[#D4F1DB]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#EDF5EF] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Create Campaign</span>
						</div>
						<div className="absolute top-[77px] left-1/2 -translate-x-1/2">
							<CreateCampaign />
						</div>
						<div className="absolute top-[398px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[30px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								You'll see a button at the bottom of the map, and when you click it, all of your selected contacts are brought into your campaign.
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[30px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(11, 25)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={853}>
						<div className="absolute left-0 top-0 w-[797px] h-[853px] rounded-[6px] border-[2px] border-[#000000] bg-[#58A6E5]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#C9E0F3] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Create a Profile</span>
						</div>
						<div className="absolute top-[77px] left-1/2 -translate-x-1/2 w-[732px] h-[500px] rounded-[6px] border-[2px] border-[#000000] bg-[#ACCCE6] flex items-center justify-center">
							<ResourcePageProfile />
						</div>
						<div className="absolute top-[639px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[30px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								You'll see a button at the bottom of the map, and when you click it, all of your selected contacts are brought into your campaign.
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[23px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(18, 19)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={639}>
						<div className="absolute left-0 top-0 w-[797px] h-[639px] rounded-[6px] border-[2px] border-[#000000] bg-[#A6E2A8]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#EDF5EF] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Fine tune your drafting settings</span>
						</div>
						<div className="absolute top-[77px] left-1/2 -translate-x-1/2 w-[727px] h-[288px] rounded-[6px] border-[2px] border-[#000000] bg-[#D0FAD2] overflow-hidden flex items-center justify-center">
							<FineTuneResource />
						</div>
						<div className="absolute top-[413px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-white px-[20px] pt-[16px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								Now you can switch back to one of the three drafting modes, though we would likely recommend "Auto" to start, as it's trained on all of the venue data. You can then set a calendar date range, and even add in custom instructions.
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[23px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(25, 17)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={879}>
						<div className="absolute left-0 top-0 w-[797px] h-[879px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFDC9E]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#FFEAC4] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Test Draft</span>
						</div>
						<div className="absolute top-[77px] left-1/2 -translate-x-1/2 w-[732px] h-[606px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFF1D9] flex items-center justify-center">
							<ResourceTestDraft />
						</div>
						<div className="absolute top-[725px] left-1/2 -translate-x-1/2 w-[774px] h-[124px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[16px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								Try doing a test draft, and if you don't feel that the first try got it right, try modifying information you're putting it to get a better results
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[25px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(36, 18)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={639}>
						<div className="absolute left-0 top-0 w-[797px] h-[639px] rounded-[6px] border-[2px] border-[#000000] bg-[#A6E2A8]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#EDF5EF] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Draft a batch</span>
						</div>
						<div className="absolute top-[79px] left-1/2 -translate-x-1/2 w-[732px] h-[288px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFF1D9]">
							<ResourceDraftBox className="absolute left-1/2 -translate-x-1/2 top-0" />
						</div>
						<div className="absolute top-[413px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[16px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								In order to draft, contacts must be selected. If you're on the "write" tab, you'll see your campaign contacts in this table, you can click on them in order to select them, after which you can then click the "Draft" button at the bottom and it will meticulously compose drafts for that set of contacts
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			<section className="w-full mt-[26px] bg-[#F9F9F9]">
				<div
					className="mx-auto w-full max-w-[1200px] px-6 flex justify-center"
					style={getScaledStepPaddingStyle(22, 43)}
				>
					<ScaledBox scale={stepCardsScale} baseWidth={797} baseHeight={1131}>
						<div className="absolute left-0 top-0 w-[797px] h-[1131px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFDC9E]">
						<div className="absolute top-[9px] left-0 right-0 h-[44px] bg-[#FFEAC4] border-y-[2px] border-[#000000] flex items-center">
							<span className="ml-[30px] font-[var(--font-inter)] text-[22.5px] font-semibold">Review your drafts</span>
						</div>
						<div className="absolute top-[83px] left-1/2 -translate-x-1/2 w-[732px] h-[772px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFF1D9] flex items-center justify-center">
							<DraftReviewDemo className="block" />
						</div>
						<div className="absolute top-[922px] left-1/2 -translate-x-1/2 w-[774px] h-[186px] rounded-[6px] border-[2px] border-[#000000] bg-[#FFFFFF] px-[20px] pt-[16px] pb-[24px]">
							<p className="font-[var(--font-inter)] text-[22.5px] font-medium leading-snug">
								Now head over to the drafts tab! Once you're here, you can click directly on one of the drafts and it will bring you into a review. You can approve and reject drafted emails in this view, and when you exit out of the draft review mode, you'll then see every email filtered by how you've approved and rejected them.
							</p>
						</div>
						</div>
					</ScaledBox>
				</div>
			</section>

			{/* Try Murmur Now CTA Section */}
			<div className="w-full bg-white flex flex-col items-center justify-center py-20 sm:py-0 sm:h-[747px]">
				<p className="font-[var(--font-inter)] font-normal text-[clamp(32px,9vw,62px)] text-black text-center leading-[1.05]">
					Try Murmur Now
				</p>
				<Link
					href={urls.freeTrial.index}
					className="flex items-center justify-center cursor-pointer text-center text-white font-[var(--font-inter)] font-medium text-[14px]"
					style={{
						marginTop: '32px',
						width: '219px',
						height: '33px',
						backgroundColor: '#53B060',
						border: '1px solid #118521',
						borderRadius: '8px',
					}}
				>
					Start Free Trial
				</Link>
			</div>
		</div>
	);
};

export default Resources;

