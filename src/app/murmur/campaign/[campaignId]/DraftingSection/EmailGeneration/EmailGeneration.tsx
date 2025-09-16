import { FC, ReactNode } from 'react';
import { EmailGenerationProps, useEmailGeneration } from './useEmailGeneration';
import { cn } from '@/utils';
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
import { MiniEmailStructure } from './MiniEmailStructure';
import { SentEmails } from './SentEmails/SentEmails';

export const EmailGeneration: FC<EmailGenerationProps> = (props) => {
	const {
		campaign,
		setSelectedContactIds,
		contacts,
		selectedContactIds,
		handleContactSelection,
		isPendingGeneration,
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
		handleDraftButtonClick,
		sentEmails,
	} = useEmailGeneration(props);

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

	// removed isDraftDisabled here; using isGenerationDisabled() and selection checks inline where needed

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
			<div className="flex gap-[47px] items-start justify-center">
				<div className="flex-shrink-0">
					<div
						data-drafting-container
						className={cn(
							'relative w-[1700px] h-[620px] rounded-lg overflow-x-hidden p-[17px]'
						)}
					>
						{/* Tables container - positioned at bottom */}
						<div className="absolute left-[19px] right-[19px] flex flex-row justify-center gap-x-10 top-[35px]">
							{/* Left table container */}
							{(() => {
								const draftedContactIds = new Set(draftEmails.map((d) => d.contactId));
								const availableContacts = contacts.filter(
									(c) => !draftedContactIds.has(c.id)
								);
								return (
									<ContactsSelection
										contacts={availableContacts}
										selectedContactIds={selectedContactIds}
										setSelectedContactIds={setSelectedContactIds}
										handleContactSelection={handleContactSelection}
										generationProgress={generationProgress}
										generationTotal={generationTotal}
										cancelGeneration={cancelGeneration}
									/>
								);
							})()}

							{/* Middle Email Structure (mini) */}
							<MiniEmailStructure
								form={form}
								onDraft={handleDraftButtonClick}
								isDraftDisabled={isGenerationDisabled() || selectedContactIds.size === 0}
								isPendingGeneration={isPendingGeneration}
								generationProgress={generationProgress}
								generationTotal={generationTotal}
								onCancel={cancelGeneration}
							/>

							{/* Right table */}
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
								onSend={handleSend}
								isSendingDisabled={isSendingDisabled}
								isFreeTrial={isFreeTrial}
								fromName={campaign?.identity?.name}
								fromEmail={campaign?.identity?.email}
								subject={form.watch('subject')}
							/>

							{/* Sent emails */}
							<SentEmails emails={sentEmails} isPendingEmails={isPendingEmails} />
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
