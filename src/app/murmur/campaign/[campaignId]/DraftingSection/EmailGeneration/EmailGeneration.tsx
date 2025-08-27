import { FC, ReactNode, useState } from 'react';
import { EmailGenerationProps, useEmailGeneration } from './useEmailGeneration';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';

import { Typography } from '@/components/ui/typography';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { cn } from '@/utils';
import { ChevronRight, ChevronUp } from 'lucide-react';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { EmailStatus } from '@prisma/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { StripeSubscriptionStatus } from '@/types';
import ViewEditEmailDialog from '@/components/organisms/_dialogs/ViewEditEmailDialog/ViewEditEmailDialog';
import { Badge } from '@/components/ui/badge';
import { ContactsSelection } from './ContactsSelection/ContactsSelection';
import { DraftedEmails } from './DraftedEmails/DraftedEmails';

export const EmailGeneration: FC<EmailGenerationProps> = (props) => {
	const {
		campaign,
		setSelectedContactIds,
		contacts,
		selectedContactIds,
		handleContactSelection,
		isPendingGeneration,
		isTest,
		isGenerationDisabled,
		setSelectedDraftIds,
		setSelectedDraft,
		handleDraftSelection,
		selectedDraftIds,
		isSendingDisabled,
		isFreeTrial,
		setSendingProgress,
		generationProgress,
		generationTotal,
		selectedDraft,
		isDraftDialogOpen,
		setIsDraftDialogOpen,
		cancelGeneration,
		form,
		autosaveStatus,
		isJustSaved,
		draftEmails,
		isPendingEmails,
		isWaitingForConfirm,
		handleDraftButtonClick,
		scrollToEmailStructure,
	} = useEmailGeneration(props);

	// Inline send confirmation state
	const [isWaitingToSend, setIsWaitingToSend] = useState(false);

	// Send email hooks
	const { user, subscriptionTier } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});
	const { mutateAsync: updateEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });

	// Custom send handler without dialog dependencies
	const handleSend = async () => {
		const selectedDrafts =
			selectedDraftIds.size > 0
				? draftEmails.filter((d) => selectedDraftIds.has(d.id))
				: draftEmails;

		if (!campaign?.identity?.email || !campaign?.identity?.name) {
			toast.error('Please create an Identity before sending emails.');
			return;
		}

		if (
			!subscriptionTier &&
			user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
		) {
			toast.error('Please upgrade to a paid plan to send emails.');
			return;
		}

		const sendingCredits = user?.sendingCredits || 0;
		const emailsToSend = selectedDrafts.length;

		if (sendingCredits === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return;
		}

		const emailsWeCanSend = Math.min(emailsToSend, sendingCredits);
		const emailsToProcess = selectedDrafts.slice(0, emailsWeCanSend);

		setSendingProgress(0);
		let successfulSends = 0;

		for (const email of emailsToProcess) {
			try {
				const res = await sendMailgunMessage({
					subject: email.subject,
					message: email.message,
					recipientEmail: email.contact.email,
					senderEmail: campaign?.identity?.email,
					senderName: campaign?.identity?.name,
					originEmail:
						user?.customDomain && user?.customDomain !== ''
							? user?.customDomain
							: user?.murmurEmail,
				});

				if (res.success) {
					await updateEmail({
						id: email.id.toString(),
						data: {
							status: EmailStatus.sent,
							sentAt: new Date(),
						},
					});
					successfulSends++;
					setSendingProgress((prev) => prev + 1);
					queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
				}
			} catch (error) {
				console.error('Failed to send email:', error);
			}
		}

		// Update user credits
		if (user && successfulSends > 0) {
			const newCreditBalance = Math.max(0, sendingCredits - successfulSends);
			await editUser({
				clerkId: user.clerkId,
				data: { sendingCredits: newCreditBalance },
			});
		}

		// Reset sending progress and selection
		setSendingProgress(-1);
		setSelectedDraftIds(new Set());

		// Show status message
		if (successfulSends === emailsToSend) {
			toast.success(`All ${successfulSends} emails sent successfully!`);
		} else if (successfulSends > 0) {
			if (emailsWeCanSend < emailsToSend) {
				toast.warning(`Sent ${successfulSends} emails before running out of credits.`);
			} else {
				toast.warning(`${successfulSends} of ${emailsToSend} emails sent successfully.`);
			}
		} else {
			toast.error('Failed to send emails. Please try again.');
		}
	};

	const {
		formState: { isDirty },
	} = form;

	const subjectValue = form.watch('subject');

	const isDraftDisabled = () => {
		const genDisabled = isGenerationDisabled();
		const noSelection = selectedContactIds.size === 0;
		return genDisabled || noSelection;
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
		<>
			<div className="mb-3 mt-3 flex justify-between items-center">
				<FormLabel className="font-inter font-normal">Drafting</FormLabel>
				{scrollToEmailStructure && (
					<button
						type="button"
						onClick={scrollToEmailStructure}
						className="flex items-center gap-1 text-[#AFAFAF] font-inter font-medium text-[14px] hover:text-[#8F8F8F] transition-colors"
					>
						to Email Structure
						<ChevronUp size={16} />
					</button>
				)}
			</div>
			<div className="flex gap-[47px] items-start">
				<div className="flex-shrink-0">
					<div className="relative flex flex-row w-[892px] h-[560px] border-[3px] border-black rounded-lg overflow-x-hidden p-[17px]">
						{/* Left table container */}
						<ContactsSelection
							contacts={contacts}
							selectedContactIds={selectedContactIds}
							setSelectedContactIds={setSelectedContactIds}
							handleContactSelection={handleContactSelection}
							generationProgress={generationProgress}
							generationTotal={generationTotal}
							cancelGeneration={cancelGeneration}
						/>

						{/* Generate Drafts Button */}
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
							<Button
								type="button"
								onClick={handleDraftButtonClick}
								disabled={isDraftDisabled()}
								className={cn(
									'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black font-inter font-medium rounded-[6px] cursor-pointer transition-all duration-200 hover:bg-[rgba(93,171,104,0.6)] hover:border-[#4a8d56] active:bg-[rgba(93,171,104,0.7)] active:border-[#3d7346] h-[52px] w-[95px] flex items-center justify-center appearance-none text-sm font-inter p-0 m-0 leading-normal box-border text-center',
									isDraftDisabled()
										? 'opacity-50 cursor-not-allowed hover:bg-[rgba(93,171,104,0.47)] hover:border-[#5DAB68]'
										: ''
								)}
								noPadding
							>
								{isPendingGeneration && !isTest ? (
									<Spinner size="small" />
								) : isWaitingForConfirm ? (
									<span className="flex flex-col items-center leading-tight">
										<span className="text-xs">Click to</span>
										<span className="text-sm font-semibold">Confirm</span>
									</span>
								) : (
									<span className="flex items-center gap-1">
										Draft
										<ChevronRight size={16} />
									</span>
								)}
							</Button>
						</div>

						{/* Right table */}
						<div className="ml-auto">
							<DraftedEmails
								draftEmails={draftEmails}
								isPendingEmails={isPendingEmails}
								contacts={contacts}
								selectedDraftIds={selectedDraftIds}
								setSelectedDraft={setSelectedDraft}
								setIsDraftDialogOpen={setIsDraftDialogOpen}
								handleDraftSelection={handleDraftSelection}
								setSelectedDraftIds={setSelectedDraftIds}
								selectedDraft={selectedDraft}
							/>
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
								<div className="flex flex-col items-end w-full">
									<UpgradeSubscriptionDrawer
										triggerButtonText="Send"
										buttonVariant="primary"
										className={`!w-[891px] !h-[39px] !border-2 !border-[#5DAB68] !text-black !font-bold !flex !items-center !justify-center ${
											selectedDraftIds.size !== 0
												? '!opacity-50 !cursor-not-allowed hover:!bg-[rgba(93,171,104,0.47)] hover:!border-[#5DAB68]'
												: 'hover:bg-[rgba(93,171,104,0.6)] hover:border-[#5DAB68] active:bg-[rgba(93,171,104,0.7)]'
										}`}
										message={
											isFreeTrial
												? `Your free trial subscription does not include the ability to send emails. To send the emails you've drafted, please upgrade your subscription to the paid version.`
												: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
										}
									/>
								</div>
							) : (
								<div className="flex flex-col items-end w-full">
									<div className={cn('w-[891px] mb-6', !isWaitingToSend && 'hidden')}>
										<div className="grid grid-cols-3 items-start w-full">
											<div className="flex flex-col items-start">
												<Typography
													variant="h3"
													className="!text-[14px] font-semibold text-[#000000] font-secondary"
												>
													To:
												</Typography>
												<Typography className="mt-0.5 !text-[14px] text-[#000000] font-secondary">{`${
													selectedDraftIds.size > 0
														? selectedDraftIds.size
														: draftEmails.length
												} emails selected`}</Typography>
												<Typography className="hidden">{draftEmails.length}</Typography>
											</div>
											<div className="flex justify-center">
												<div className="flex flex-col items-start">
													<Typography
														variant="h3"
														className="!text-[14px] font-semibold text-[#000000] font-secondary"
													>
														From:
													</Typography>
													<Typography className="mt-0.5 !text-[14px] text-[#000000] font-secondary">
														{campaign?.identity?.name || ''}
													</Typography>
												</div>
											</div>
											<div className="flex justify-end">
												<div className="flex flex-col items-start">
													<Typography
														variant="h3"
														className="!text-[14px] font-semibold text-[#000000] font-secondary"
													>
														Return Address:
													</Typography>
													<Typography className="mt-0.5 !text-[14px] text-[#000000] font-secondary">
														{campaign?.identity?.email || ''}
													</Typography>
												</div>
											</div>
										</div>
										{subjectValue && (
											<div className="flex flex-col items-start mt-2">
												<Typography className="mt-0.5 !text-[14px] text-[#000000] font-secondary">
													{subjectValue}
												</Typography>
											</div>
										)}
									</div>
									<Button
										type="button"
										className={cn(
											'w-[891px] !h-[39px] font-bold flex items-center justify-center transition-colors',
											draftEmails.length === 0 && 'opacity-50 cursor-not-allowed',
											isWaitingToSend
												? 'bg-[#5DAB68] border-0 text-white'
												: 'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black hover:bg-[rgba(93,171,104,0.6)] hover:border-[#5DAB68] active:bg-[rgba(93,171,104,0.7)]'
										)}
										disabled={draftEmails.length === 0}
										onClick={async () => {
											if (!isWaitingToSend) {
												setIsWaitingToSend(true);
												setTimeout(() => setIsWaitingToSend(false), 3000);
												return;
											}
											setIsWaitingToSend(false);
											await handleSend();
										}}
									>
										{isWaitingToSend ? 'Click to Confirm and Send' : 'Send'}
									</Button>
								</div>
							)}
						</div>
					)}
				</div>
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
