import { FC, ReactNode, useRef, useState, useEffect } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { Button } from '@/components/ui/button';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Form,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/organisms/_dialogs/ConfirmDialog/ConfirmDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { Typography } from '@/components/ui/typography';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { DraftingMode, EmailStatus } from '@prisma/client';
import { cn } from '@/utils';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { Trash2 } from 'lucide-react';
import ViewEditEmailDialog from '@/components/organisms/_dialogs/ViewEditEmailDialog/ViewEditEmailDialog';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { ConfirmSendDialog } from '@/components/organisms/_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import { useMe } from '@/hooks/useMe';

// Helper component for scrolling text
const ScrollableText = ({
	text,
	className,
	style,
}: {
	text: string;
	className?: string;
	style?: React.CSSProperties;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const checkOverflow = () => {
			if (containerRef.current && textRef.current) {
				// Check if the text width exceeds the container width
				const containerWidth = containerRef.current.offsetWidth;
				const textWidth = textRef.current.scrollWidth;
				setIsOverflowing(textWidth > containerWidth);
			}
		};

		checkOverflow();
		// Recheck on window resize
		window.addEventListener('resize', checkOverflow);

		// Also check when text changes
		const observer = new ResizeObserver(checkOverflow);
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => {
			window.removeEventListener('resize', checkOverflow);
			observer.disconnect();
		};
	}, [text]);

	return (
		<div
			ref={containerRef}
			className={
				isOverflowing ? 'hover-scroll-container' : 'overflow-hidden relative w-full'
			}
			style={style}
		>
			<span
				ref={textRef}
				className={
					isOverflowing
						? `hover-scroll-text ${className || ''}`
						: `inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full w-full ${
								className || ''
						  }`
				}
				data-text={text}
			>
				{text}
			</span>
		</div>
	);
};

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		autosaveStatus,
		campaign,
		cancelGeneration,
		contacts,
		draftingMode,
		form,
		generationProgress,
		handleGenerateDrafts,
		handleGenerateTestDrafts,
		isAiSubject,
		isConfirmDialogOpen,
		isGenerationDisabled,
		isJustSaved,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
		setGenerationProgress,
		setIsConfirmDialogOpen,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
	} = useDraftingSection(props);

	const {
		formState: { isDirty },
	} = form;

	// Fetch draft emails for the campaign
	const { data: emails, isPending: isPendingEmails } = useGetEmails({
		filters: {
			campaignId: campaign.id,
		},
	});

	// Filter for draft emails only
	const draftEmails = emails?.filter((email) => email.status === EmailStatus.draft) || [];

	// State for viewing/editing email
	type EmailType = typeof draftEmails extends (infer T)[] ? T : never;
	const [selectedDraft, setSelectedDraft] = useState<EmailType | null>(null);
	const [isDraftDialogOpen, setIsDraftDialogOpen] = useState(false);

	// Delete email hook
	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	// User info for send functionality
	const { user, isFreeTrial } = useMe();
	const [sendingProgress, setSendingProgress] = useState(-1);
	const isSendingDisabled = isFreeTrial || user?.sendingCredits === 0;

	// Handle draft click to view/edit
	const handleDraftClick = (draft: EmailType) => {
		setSelectedDraft(draft);
		setIsDraftDialogOpen(true);
	};

	// Handle draft deletion
	const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
		e.stopPropagation(); // Prevent opening the draft dialog
		try {
			await deleteEmail(draftId);
		} catch (error) {
			console.error('Failed to delete draft:', error);
		}
	};

	const getAutosaveStatusDisplay = (): ReactNode => {
		switch (autosaveStatus) {
			case 'saving':
				return (
					<Badge size="small" variant="secondary" className="text-xs">
						Saving...
					</Badge>
				);
			case 'saved':
				return (
					<Badge size="small" variant="default" className="text-xs">
						Saved
					</Badge>
				);
			case 'error':
				return (
					<Badge size="small" variant="destructive" className="text-xs">
						Save failed
					</Badge>
				);
			case 'idle':
				return (
					<>
						{!isJustSaved && isDirty && autosaveStatus === 'idle' && (
							<Badge size="small" variant="warning" className="text-xs">
								Unsaved
							</Badge>
						)}
					</>
				);
			default:
				return null;
		}
	};

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div className="w-[892px]">
						<div className="mb-4">
							<FormField
								control={form.control}
								name="subject"
								rules={{
									required: isAiSubject,
								}}
								render={({ field }) => (
									<FormItem className="w-[892px]">
										<div className="flex items-center gap-2">
											<FormLabel>Subject</FormLabel>
											<Separator orientation="vertical" className="!h-5" />
											<Switch
												checked={isAiSubject}
												disabled={draftingMode === DraftingMode.handwritten}
												onCheckedChange={(val: boolean) =>
													form.setValue('isAiSubject', val)
												}
												className="data-[state=checked]:bg-primary -translate-y-[2px]"
											/>
											<FormLabel className="">Automated Subject</FormLabel>
										</div>
										<FormControl>
											<Input
												className="w-full h-[44px]"
												placeholder={
													isAiSubject ? 'Automated subject...' : 'Enter subject...'
												}
												disabled={isAiSubject}
												{...field}
												onFocus={(e) =>
													!isAiSubject && trackFocusedField('subject', e.target)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="mb-3">
							<FormLabel className="font-inter font-normal">Email Structure</FormLabel>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								<HybridPromptInput
									trackFocusedField={trackFocusedField}
									testMessage={campaign?.testMessage}
								/>
							</div>
						</div>
						<div className="flex justify-end mt-2 mb-2">
							<Button
								type="button"
								onClick={handleGenerateTestDrafts}
								disabled={isGenerationDisabled()}
								className={cn(
									'w-[94px] h-[39px] bg-[rgba(93,171,104,0.08)] border-2 border-[#5DAB68] text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary',
									isGenerationDisabled() ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
								)}
								style={{
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
							</Button>
						</div>

						{/* New section matching Email Template box style */}
						<div className="mb-3 mt-6">
							<FormLabel className="font-inter font-normal">Drafting</FormLabel>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								{/* Empty content area - to be filled later */}
								<div
									className="bg-white relative"
									style={{
										width: '892px',
										height: '530px',
										border: '3px solid #000000',
										borderRadius: '8px',
										overflowX: 'hidden',
									}}
								>
									{/* Left table - Contacts list */}
									<div
										className="absolute bg-white border border-gray-300 overflow-auto custom-scroll"
										style={{
											width: '336px',
											height: '441px',
											left: '22px',
											bottom: '16px',
											overflowX: 'hidden',
											overflowY: 'auto',
											paddingRight: '10px',
										}}
									>
										{contacts && contacts.length > 0 ? (
											<div style={{ overflow: 'visible', width: '316px' }}>
												{contacts.map((contact) => (
													<div
														key={contact.id}
														className="border-b border-gray-200"
														style={{
															display: 'grid',
															gridTemplateColumns: '158px 158px',
															gridTemplateRows: '24.5px 24.5px',
															width: '316px',
															height: '49px',
															overflow: 'visible',
														}}
													>
														{(() => {
															const fullName =
																contact.name ||
																`${contact.firstName || ''} ${
																	contact.lastName || ''
																}`.trim();

															// Left column - Name and Company
															if (fullName) {
																// Has name - show name in top, company in bottom
																return (
																	<>
																		{/* Top Left - Name */}
																		<div
																			style={{
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			<ScrollableText
																				text={fullName}
																				className="font-bold text-xs"
																				style={{ width: '100%' }}
																			/>
																		</div>

																		{/* Top Right - Title */}
																		<div
																			style={{
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																				overflow: 'visible',
																			}}
																		>
																			{contact.headline ? (
																				<div
																					style={{
																						height: '20.54px',
																						borderRadius: '6.64px',
																						padding: '0 8px',
																						display: 'flex',
																						alignItems: 'center',
																						width: 'fit-content',
																						maxWidth: 'calc(100% - 8px)',
																						backgroundColor: '#E8EFFF',
																						border: '0.83px solid #000000',
																					}}
																				>
																					<ScrollableText
																						text={contact.headline}
																						className="text-xs text-black"
																					/>
																				</div>
																			) : (
																				<div style={{ width: '100%' }}></div>
																			)}
																		</div>

																		{/* Bottom Left - Company */}
																		<div
																			style={{
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			<ScrollableText
																				text={contact.company || ''}
																				className="text-xs text-black"
																				style={{ width: '100%' }}
																			/>
																		</div>

																		{/* Bottom Right - Location */}
																		<div
																			style={{
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			{contact.city || contact.state ? (
																				<ScrollableText
																					text={[contact.city, contact.state]
																						.filter(Boolean)
																						.join(', ')}
																					className="text-xs text-black"
																					style={{ width: '100%', paddingLeft: '8px' }}
																				/>
																			) : (
																				<div style={{ width: '100%' }}></div>
																			)}
																		</div>
																	</>
																);
															} else {
																// No name - vertically center company on left side
																return (
																	<>
																		{/* Left column - Company vertically centered */}
																		<div
																			style={{
																				gridRow: '1 / 3',
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			<ScrollableText
																				text={contact.company || 'Contact'}
																				className="font-bold text-xs text-black"
																				style={{ width: '100%' }}
																			/>
																		</div>

																		{/* Right column - Title or Location */}
																		{contact.headline ? (
																			<>
																				{/* Top Right - Title */}
																				<div
																					style={{
																						padding: '4px',
																						display: 'flex',
																						alignItems: 'center',
																						overflow: 'visible',
																					}}
																				>
																					<div
																						style={{
																							height: '20.54px',
																							borderRadius: '6.64px',
																							padding: '0 8px',
																							display: 'flex',
																							alignItems: 'center',
																							width: 'fit-content',
																							maxWidth: '100%',
																							backgroundColor: '#E8EFFF',
																							border: '0.83px solid #000000',
																						}}
																					>
																						<ScrollableText
																							text={contact.headline}
																							className="text-xs text-black"
																						/>
																					</div>
																				</div>

																				{/* Bottom Right - Location */}
																				<div
																					style={{
																						padding: '4px',
																						display: 'flex',
																						alignItems: 'center',
																					}}
																				>
																					{contact.city || contact.state ? (
																						<ScrollableText
																							text={[contact.city, contact.state]
																								.filter(Boolean)
																								.join(', ')}
																							className="text-xs text-black"
																							style={{
																								width: '100%',
																								paddingLeft: '8px',
																							}}
																						/>
																					) : (
																						<div style={{ width: '100%' }}></div>
																					)}
																				</div>
																			</>
																		) : (
																			// No title - vertically center location
																			<div
																				style={{
																					gridRow: '1 / 3',
																					padding: '4px',
																					display: 'flex',
																					alignItems: 'center',
																				}}
																			>
																				{contact.city || contact.state ? (
																					<ScrollableText
																						text={[contact.city, contact.state]
																							.filter(Boolean)
																							.join(', ')}
																						className="text-xs text-black"
																						style={{
																							width: '100%',
																							paddingLeft: '8px',
																						}}
																					/>
																				) : (
																					<div style={{ width: '100%' }}></div>
																				)}
																			</div>
																		)}
																	</>
																);
															}
														})()}
													</div>
												))}
											</div>
										) : (
											<div className="flex items-center justify-center h-full text-black">
												No contacts selected
											</div>
										)}
									</div>

									{/* Generate Drafts Button - Center between tables */}
									<div
										className="absolute flex items-center justify-center"
										style={{
											left: '50%',
											top: '50%',
											transform: 'translate(-50%, -50%)',
										}}
									>
										<Button
											type="button"
											onClick={() => setIsConfirmDialogOpen(true)}
											disabled={isGenerationDisabled()}
											className={cn(
												'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black font-inter font-medium rounded-[6px] cursor-pointer transition-all duration-200 hover:bg-[rgba(93,171,104,0.6)] hover:border-[#4a8d56] active:bg-[rgba(93,171,104,0.7)] active:border-[#3d7346] h-[52px] w-[87px]',
												isGenerationDisabled()
													? 'opacity-50 cursor-not-allowed hover:bg-[rgba(93,171,104,0.47)] hover:border-[#5DAB68]'
													: ''
											)}
											noPadding
											style={{
												width: '87px',
												height: '52px',
												WebkitAppearance: 'none',
												appearance: 'none',
												fontSize: '14px',
												fontWeight: '500',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												padding: '0',
												margin: '0',
												lineHeight: 'normal',
												boxSizing: 'border-box',
												textAlign: 'center',
											}}
										>
											{isPendingGeneration && !isTest ? (
												<Spinner size="small" />
											) : (
												'Draft'
											)}
										</Button>
									</div>

									{/* Right table - Generated Drafts */}
									<div
										className="absolute bg-white border border-gray-300 overflow-auto custom-scroll"
										style={{
											width: '336px',
											height: '441px',
											right: '22px',
											bottom: '16px',
											overflowX: 'hidden',
											overflowY: 'auto',
											paddingRight: '10px',
										}}
									>
										{isPendingEmails ? (
											<div className="flex items-center justify-center h-full">
												<Spinner size="small" />
											</div>
										) : draftEmails.length > 0 ? (
											<div style={{ overflow: 'visible', width: '316px' }}>
												{draftEmails.map((draft) => {
													const contact = contacts?.find((c) => c.id === draft.contactId);
													const contactName = contact
														? contact.name ||
														  `${contact.firstName || ''} ${
																contact.lastName || ''
														  }`.trim() ||
														  contact.company ||
														  'Contact'
														: 'Unknown Contact';

													return (
														<div
															key={draft.id}
															className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
															onClick={() => handleDraftClick(draft)}
															style={{
																padding: '12px',
																position: 'relative',
															}}
														>
															{/* Delete button */}
															<button
																onClick={(e) => handleDeleteDraft(e, draft.id)}
																className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded transition-colors"
																style={{
																	zIndex: 10,
																}}
															>
																<Trash2
																	size={14}
																	className="text-gray-500 hover:text-red-500"
																/>
															</button>

															{/* Contact name */}
															<div className="font-bold text-xs mb-1 pr-8">
																{contactName}
															</div>

															{/* Email subject */}
															<div className="text-xs text-gray-600 mb-1 pr-8">
																<span className="font-semibold">Subject:</span>{' '}
																{draft.subject || 'No subject'}
															</div>

															{/* Preview of message */}
															<div className="text-xs text-gray-500 pr-8">
																{draft.message
																	? draft.message
																			.replace(/<[^>]*>/g, '')
																			.substring(0, 60) + '...'
																	: 'No content'}
															</div>
														</div>
													);
												})}
											</div>
										) : (
											<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
												<div className="text-sm font-semibold mb-2">
													No drafts generated
												</div>
												<div className="text-xs text-center">
													Click &quot;Generate Drafts&quot; to create emails for the
													selected contacts
												</div>
											</div>
										)}
										{isPendingDeleteEmail && (
											<div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
												<Spinner size="small" />
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex flex-col gap-4 mt-4">
								{getAutosaveStatusDisplay() && (
									<div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
										{getAutosaveStatusDisplay()}
									</div>
								)}
								{/* Send button - appears when there are drafts */}
								{draftEmails.length > 0 && (
									<div className="flex justify-end">
										{isSendingDisabled ? (
											<UpgradeSubscriptionDrawer
												triggerButtonText="Send"
												className="!w-[891px] !h-[39px] !bg-[rgba(93,171,104,0.47)] !border-2 !border-[#5DAB68] !text-black hover:!bg-[rgba(93,171,104,0.6)] hover:!border-[#5DAB68] active:!bg-[rgba(93,171,104,0.7)]"
												message={
													isFreeTrial
														? `Your free trial subscription does not include the ability to send emails. To send the emails you've drafted, please upgrade your subscription to the paid version.`
														: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
												}
											/>
										) : (
											<ConfirmSendDialog
												setSendingProgress={setSendingProgress}
												campaign={campaign}
												draftEmails={draftEmails}
											/>
										)}
									</div>
								)}
							</div>
							<ConfirmDialog
								title="Confirm Batch Generation of Emails"
								confirmAction={handleGenerateDrafts}
								open={isConfirmDialogOpen}
								onOpenChange={setIsConfirmDialogOpen}
							>
								<Typography>
									Are you sure you want to generate emails for all selected recipients?
									<br /> <br />
									This action will automatically create a custom email for each recipient
									based on the prompt you provided and will count towards your monthly
									usage limits.
								</Typography>
							</ConfirmDialog>
							<ProgressIndicator
								progress={generationProgress}
								setProgress={setGenerationProgress}
								total={contacts?.length || 0}
								pendingMessage="Generating {{progress}} emails..."
								completeMessage="Finished generating {{progress}} emails."
								cancelAction={cancelGeneration}
							/>
							<ProgressIndicator
								progress={sendingProgress}
								setProgress={setSendingProgress}
								total={draftEmails.length}
								pendingMessage="Sending {{progress}} emails..."
								completeMessage="Finished sending {{progress}} emails."
							/>
						</div>
					</div>
				</form>
			</Form>

			<UpgradeSubscriptionDrawer
				message="You have run out of drafting credits! Please upgrade your plan."
				triggerButtonText="Upgrade"
				isOpen={isOpenUpgradeSubscriptionDrawer}
				setIsOpen={setIsOpenUpgradeSubscriptionDrawer}
				hideTriggerButton
			/>

			<ViewEditEmailDialog
				email={selectedDraft}
				isOpen={isDraftDialogOpen}
				setIsOpen={setIsDraftDialogOpen}
				isEditable={true}
			/>
		</div>
	);
};
