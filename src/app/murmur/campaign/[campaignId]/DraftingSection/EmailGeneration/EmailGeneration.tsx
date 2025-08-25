import { FC, ReactNode } from 'react';
import {
	EmailGenerationProps,
	ScrollableTextProps,
	useEmailGeneration,
	useScrollableText,
} from './useEmailGeneration';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/organisms/_dialogs/ConfirmDialog/ConfirmDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import { Typography } from '@/components/ui/typography';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { cn, getStateAbbreviation } from '@/utils';
import { ChevronRight, X } from 'lucide-react';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { ConfirmSendDialog } from '@/components/organisms/_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import ViewEditEmailDialog from '@/components/organisms/_dialogs/ViewEditEmailDialog/ViewEditEmailDialog';
import { Badge } from '@/components/ui/badge';

const ScrollableText: FC<ScrollableTextProps> = (props) => {
	const { containerRef, textRef, isOverflowing, style, className, text } =
		useScrollableText(props);

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

export const EmailGeneration: FC<EmailGenerationProps> = (props) => {
	const {
		campaign,
		setSelectedContactIds,
		contacts,
		selectedContactIds,
		handleContactSelection,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		isPendingGeneration,
		isTest,
		isGenerationDisabled,
		isPendingEmails,
		draftEmails,
		setSelectedDraftIds,
		selectedDraftIds,
		handleDraftClick,
		handleDeleteDraft,
		isSendingDisabled,
		isFreeTrial,
		setSendingProgress,
		handleGenerateDrafts,
		generationProgress,
		setGenerationProgress,
		handleDraftSelection,
		isPendingDeleteEmail,
		selectedDraft,
		isDraftDialogOpen,
		setIsDraftDialogOpen,
		cancelGeneration,
		sendingProgress,
		form,
		autosaveStatus,
		isJustSaved,
	} = useEmailGeneration(props);

	const {
		formState: { isDirty },
	} = form;

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
		<>
			<div className="mb-3 mt-6">
				<FormLabel className="font-inter font-normal">Drafting</FormLabel>
			</div>
			<div className="flex gap-[47px] items-start">
				<div className="flex-shrink-0">
					{/* Empty content area - to be filled later */}
					<div className="bg-white relative w-[892px] h-[530px] border-[3px] border-black rounded-lg overflow-x-hidden">
						{/* Left table label */}
						<div className="absolute left-[22px] top-4 text-sm font-inter font-medium text-black">
							Contacts
						</div>

						{/* Select All button */}
						<Button
							type="button"
							variant="ghost"
							className="absolute left-[280px] top-[35px] text-sm font-inter font-medium text-black bg-none border-none cursor-pointer p-0 hover:underline transition-colors"
							onClick={() => {
								if (
									selectedContactIds.size === contacts?.length &&
									contacts?.length > 0
								) {
									// Deselect all if all are selected
									setSelectedContactIds(new Set());
								} else {
									// Select all
									setSelectedContactIds(new Set(contacts?.map((c) => c.id) || []));
								}
							}}
						>
							{selectedContactIds.size === contacts?.length && contacts?.length > 0
								? 'Deselect All'
								: 'Select All'}
						</Button>

						{/* Left table - Contacts list */}
						<div className="absolute bg-white border border-gray-300 overflow-auto custom-scroll w-[336px] h-[441px] left-[22px] bottom-4 overflow-x-hidden overflow-y-auto pr-[10px]">
							{contacts && contacts.length > 0 ? (
								<div className="overflow-visible w-[316px]">
									{contacts.map((contact) => (
										<div
											key={contact.id}
											className={cn(
												'border-b border-gray-200 cursor-pointer transition-colors grid grid-cols-[158px_158px] grid-rows-[24.5px_24.5px] w-[316px] h-[49px] overflow-visible',
												selectedContactIds.has(contact.id)
													? 'bg-[#D6E8D9] border-2 border-[#5DAB68]'
													: ''
											)}
											onClick={() => handleContactSelection(contact.id)}
										>
											{(() => {
												const fullName =
													contact.name ||
													`${contact.firstName || ''} ${contact.lastName || ''}`.trim();

												// Left column - Name and Company
												if (fullName) {
													// Has name - show name in top, company in bottom
													return (
														<>
															{/* Top Left - Name */}
															<div className="p-1 pl-3 flex items-center">
																<ScrollableText
																	text={fullName}
																	className="font-bold text-xs w-full"
																/>
															</div>

															{/* Top Right - Title */}
															<div className="p-1 flex items-center overflow-visible">
																{contact.headline ? (
																	<div className="h-[20.54px] rounded-[6.64px] px-2 flex items-center w-fit max-w-[calc(100%-8px)] bg-[#E8EFFF] border-[0.83px] border-black">
																		<ScrollableText
																			text={contact.headline}
																			className="text-xs text-black"
																		/>
																	</div>
																) : (
																	<div className="w-full"></div>
																)}
															</div>

															{/* Bottom Left - Company */}
															<div className="p-1 pl-3 flex items-center">
																<ScrollableText
																	text={contact.company || ''}
																	className="text-xs text-black w-full"
																/>
															</div>

															{/* Bottom Right - Location */}
															<div className="p-1 flex items-center">
																{contact.city || contact.state ? (
																	<ScrollableText
																		text={[
																			contact.city,
																			getStateAbbreviation(contact.state),
																		]
																			.filter(Boolean)
																			.join(', ')}
																		className="text-xs text-black w-full"
																	/>
																) : (
																	<div className="w-full"></div>
																)}
															</div>
														</>
													);
												} else {
													// No name - vertically center company on left side
													return (
														<>
															{/* Left column - Company vertically centered */}
															<div className="row-span-2 p-1 pl-3 flex items-center">
																<ScrollableText
																	text={contact.company || 'Contact'}
																	className="font-bold text-xs text-black w-full"
																/>
															</div>

															{/* Right column - Title or Location */}
															{contact.headline ? (
																<>
																	{/* Top Right - Title */}
																	<div className="bg-red-500 p-1 flex items-center overflow-visible">
																		<div className="h-[20.54px] rounded-[6.64px] px-2 flex items-center w-fit max-w-full bg-[#E8EFFF] border-[0.83px] border-black">
																			<ScrollableText
																				text={contact.headline}
																				className="text-xs text-black"
																			/>
																		</div>
																	</div>

																	{/* Bottom Right - Location */}
																	<div className="p-1 flex items-center">
																		{contact.city || contact.state ? (
																			<ScrollableText
																				text={[
																					contact.city,
																					getStateAbbreviation(contact.state),
																				]
																					.filter(Boolean)
																					.join(', ')}
																				className="text-xs text-black w-full"
																			/>
																		) : (
																			<div className="w-full"></div>
																		)}
																	</div>
																</>
															) : (
																// No title - vertically center location
																<div className="row-span-2 p-1 flex items-center">
																	{contact.city || contact.state ? (
																		<ScrollableText
																			text={[
																				contact.city,
																				getStateAbbreviation(contact.state),
																			]
																				.filter(Boolean)
																				.join(', ')}
																			className="text-xs text-black w-full"
																		/>
																	) : (
																		<div className="w-full"></div>
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
								<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
									<div className="text-sm font-semibold mb-2">No contacts selected</div>
									<div className="text-xs text-center">
										Select contacts to generate personalized emails
									</div>
								</div>
							)}
						</div>

						{/* Generate Drafts Button - Center between tables */}
						<div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
							<Button
								type="button"
								onClick={() => setIsConfirmDialogOpen(true)}
								disabled={isGenerationDisabled() || selectedContactIds.size === 0}
								className={cn(
									'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black font-inter font-medium rounded-[6px] cursor-pointer transition-all duration-200 hover:bg-[rgba(93,171,104,0.6)] hover:border-[#4a8d56] active:bg-[rgba(93,171,104,0.7)] active:border-[#3d7346] h-[52px] w-[95px] flex items-center justify-center appearance-none text-sm font-inter p-0 m-0 leading-normal box-border text-center',
									isGenerationDisabled() || selectedContactIds.size === 0
										? 'opacity-50 cursor-not-allowed hover:bg-[rgba(93,171,104,0.47)] hover:border-[#5DAB68]'
										: ''
								)}
								noPadding
							>
								{isPendingGeneration && !isTest ? (
									<Spinner size="small" />
								) : (
									<span className="flex items-center gap-1">
										Draft
										<ChevronRight size={16} />
									</span>
								)}
							</Button>
						</div>

						{/* Right table label */}
						<div className="absolute left-[534px] top-4 text-sm font-inter font-medium text-black">
							Drafts
						</div>

						{/* Select All button for drafts */}
						<button
							type="button"
							className="absolute left-[790px] top-[35px] text-sm font-inter font-medium text-black bg-none border-none cursor-pointer p-0 hover:underline transition-colors"
							onClick={() => {
								if (
									selectedDraftIds.size === draftEmails?.length &&
									draftEmails?.length > 0
								) {
									// Deselect all if all are selected
									setSelectedDraftIds(new Set());
								} else {
									// Select all
									setSelectedDraftIds(new Set(draftEmails?.map((d) => d.id) || []));
								}
							}}
						>
							{selectedDraftIds.size === draftEmails?.length && draftEmails?.length > 0
								? 'Deselect All'
								: 'Select All'}
						</button>

						{/* Right table - Generated Drafts */}
						<div className="absolute bg-white border border-gray-300 overflow-auto custom-scroll w-[336px] h-[441px] right-[22px] bottom-4 overflow-x-hidden overflow-y-auto pr-[10px]">
							{isPendingEmails ? (
								<div className="flex items-center justify-center h-full">
									<Spinner size="small" />
								</div>
							) : draftEmails.length > 0 ? (
								<div className="overflow-visible w-[316px]">
									{draftEmails.map((draft) => {
										const contact = contacts?.find((c) => c.id === draft.contactId);
										const contactName = contact
											? contact.name ||
											  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
											  contact.company ||
											  'Contact'
											: 'Unknown Contact';

										return (
											<div
												key={draft.id}
												className={cn(
													'border-b border-gray-200 cursor-pointer transition-colors p-3 relative',
													selectedDraftIds.has(draft.id)
														? 'bg-[#D6E8D9] border-2 border-[#5DAB68]'
														: ''
												)}
												onClick={(e) => {
													// Only handle selection if not clicking on delete button
													if (!(e.target as HTMLElement).closest('button')) {
														handleDraftSelection(draft.id);
													}
												}}
												onDoubleClick={() => handleDraftClick(draft)}
											>
												{/* Delete button */}
												<Button
													type="button"
													variant="icon"
													onClick={(e) => handleDeleteDraft(e, draft.id)}
													className="absolute top-2 right-2 p-1 transition-colors z-10 group"
												>
													<X
														size={16}
														className="text-gray-500 group-hover:text-red-500"
													/>
												</Button>

												{/* Contact name */}
												<div className="font-bold text-xs mb-1 pr-8">{contactName}</div>

												{/* Email subject */}
												<div className="text-xs text-gray-600 mb-1 pr-8">
													<span className="font-semibold">Subject:</span>{' '}
													{draft.subject || 'No subject'}
												</div>

												{/* Preview of message */}
												<div className="text-xs text-gray-500 pr-8">
													{draft.message
														? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) +
														  '...'
														: 'No content'}
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
									<div className="text-sm font-semibold mb-2">No drafts generated</div>
									<div className="text-xs text-center">
										Click &quot;Generate Drafts&quot; to create emails for the selected
										contacts
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
					{draftEmails.length > 0 && (
						<div className="flex justify-end">
							{isSendingDisabled ? (
								<UpgradeSubscriptionDrawer
									triggerButtonText="Send"
									className={`!w-[891px] !h-[39px] !bg-[rgba(93,171,104,0.47)] !border-2 !border-[#5DAB68] !text-black !font-bold !flex !items-center !justify-center ${
										selectedDraftIds.size === 0
											? '!opacity-50 !cursor-not-allowed hover:!bg-[rgba(93,171,104,0.47)] hover:!border-[#5DAB68]'
											: 'hover:!bg-[rgba(93,171,104,0.6)] hover:!border-[#5DAB68] active:!bg-[rgba(93,171,104,0.7)]'
									}`}
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
									draftEmails={draftEmails.filter((d) => selectedDraftIds.has(d.id))}
									disabled={selectedDraftIds.size === 0}
								/>
							)}
						</div>
					)}
				</div>
				<ConfirmDialog
					title="Confirm Batch Generation of Emails"
					confirmAction={async () => {
						// Note: handleGenerateDrafts should be modified to use selectedContactIds
						// For now, it will use all contacts as before
						await handleGenerateDrafts();
						setSelectedContactIds(new Set());
					}}
					open={isConfirmDialogOpen}
					onOpenChange={setIsConfirmDialogOpen}
				>
					<Typography>
						Are you sure you want to generate emails for {selectedContactIds.size}{' '}
						selected recipient{selectedContactIds.size !== 1 ? 's' : ''}?
						<br /> <br />
						This action will automatically create a custom email for each recipient based
						on the prompt you provided and will count towards your monthly usage limits.
					</Typography>
				</ConfirmDialog>
				<ProgressIndicator
					progress={generationProgress}
					setProgress={setGenerationProgress}
					total={selectedContactIds.size}
					pendingMessage="Generating {{progress}} emails..."
					completeMessage="Finished generating {{progress}} emails."
					cancelAction={cancelGeneration}
				/>
				<ProgressIndicator
					progress={sendingProgress}
					setProgress={setSendingProgress}
					total={selectedDraftIds.size}
					pendingMessage="Sending {{progress}} emails..."
					completeMessage="Finished sending {{progress}} emails."
				/>
			</div>
			<ViewEditEmailDialog
				email={selectedDraft}
				isOpen={isDraftDialogOpen}
				setIsOpen={setIsDraftDialogOpen}
				isEditable={true}
			/>
		</>
	);
};
