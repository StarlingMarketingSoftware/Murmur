import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
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
import DraftPreviewBox from './DraftPreviewBox';
import DraggableBox from './DraggableBox';

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
		previewDraft,
		setPreviewDraft,
	} = useEmailGeneration(props);

	// Live preview props passed from parent
	const { isLivePreviewVisible, livePreviewContactId, livePreviewMessage } = props;

	// Sending preview: shows the email currently being sent
	const [sendingPreview, setSendingPreview] = useState<{
		contactId: number;
		message?: string;
		subject?: string;
	} | null>(null);
	const isSendingPreviewVisible = Boolean(sendingPreview);

	// Position the contacts overlay behind the mini email structure when previewing
	const [contactsOverlayPos, setContactsOverlayPos] = useState<{
		left: number;
		top: number;
	}>({ left: 0, top: 0 });

	// Position the sent table behind the sending preview when sending
	const [sentOverlayPos, setSentOverlayPos] = useState<{
		left: number;
		top: number;
	}>({ left: 0, top: 0 });

	useEffect(() => {
		if (!previewDraft && !isLivePreviewVisible) return;
		const compute = () => {
			const container = document.querySelector(
				'[data-drafting-container]'
			) as HTMLElement | null;
			const mini = document.querySelector(
				"[data-draggable-box-id='mini-email-structure']"
			) as HTMLElement | null;
			if (!container || !mini) return;
			const cRect = container.getBoundingClientRect();
			const mRect = mini.getBoundingClientRect();
			// Offset: contacts should sit slightly to the right and higher than mini by ~112px
			const left = mRect.left - cRect.left - 112;
			const top = mRect.top - cRect.top - 112;
			setContactsOverlayPos({ left, top });
		};
		const raf = requestAnimationFrame(compute);
		window.addEventListener('resize', compute);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', compute);
		};
	}, [previewDraft, isLivePreviewVisible]);

	useEffect(() => {
		if (!isSendingPreviewVisible) return;
		const compute = () => {
			const container = document.querySelector(
				'[data-drafting-container]'
			) as HTMLElement | null;
			const sending = document.querySelector(
				"[data-draggable-box-id='sending-preview']"
			) as HTMLElement | null;
			if (!container || !sending) return;
			const cRect = container.getBoundingClientRect();
			const sRect = sending.getBoundingClientRect();
			// Offset: sent should sit 112px higher and 184px to the right of sending-preview
			const left = sRect.left - cRect.left + 184;
			const top = sRect.top - cRect.top - 112;
			setSentOverlayPos({ left, top });
		};
		const raf = requestAnimationFrame(compute);
		window.addEventListener('resize', compute);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', compute);
		};
	}, [isSendingPreviewVisible, sendingPreview]);

	// When generation progresses and live preview is on, the Drafts list will refresh.
	// Keep preview visible only when message is still streaming; otherwise rely on the
	// drafts panel to display the new draft.
	useEffect(() => {
		// no-op hook for now; behavior controlled in useDraftingSection by hideLivePreview()
	}, [generationProgress, isLivePreviewVisible]);

	// Swap-on-drop: maintain the visual order of boxes. Defaults to the current layout order.
	const [boxOrder, setBoxOrder] = useState<string[]>([
		'contacts',
		'mini-email-structure',
		'drafts',
		'sent',
	]);

	const swapBoxes = useCallback((aId: string, bId: string | null) => {
		if (!bId || aId === bId) return;
		setBoxOrder((prev) => {
			const aIndex = prev.indexOf(aId);
			const bIndex = prev.indexOf(bId);
			if (aIndex === -1 || bIndex === -1) return prev;
			const next = prev.slice();
			[next[aIndex], next[bIndex]] = [next[bIndex], next[aIndex]];
			return next;
		});
	}, []);

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
		// Initialize sending preview with first email when loop starts
		setSendingPreview(null);
		let successfulSends = 0;

		for (let i = 0; i < emailsToProcess.length; i++) {
			const email = emailsToProcess[i];
			// Show current email in the sending preview box
			setSendingPreview({
				contactId: email.contactId,
				message: email.message,
				subject: email.subject,
			});
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
			} finally {
				// If this was the last email processed (success or fail), hide the preview immediately
				if (i === emailsToProcess.length - 1) {
					setSendingPreview(null);
				}
			}
		}

		// Safety: ensure cleared (no-op if already cleared in finally)
		setSendingPreview(null);

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
							'relative w-[1700px] h-[620px] rounded-lg p-[17px] overflow-visible'
						)}
					>
						{/* Tables container - positioned at bottom; order-controlled swapping */}
						<div className="absolute left-[19px] right-[19px] flex flex-row justify-center gap-x-10 top-[35px] overflow-visible">
							{(() => {
								const draftedContactIds = new Set(draftEmails.map((d) => d.contactId));
								const availableContacts = contacts.filter(
									(c) => !draftedContactIds.has(c.id)
								);

								const boxContentById = {
									contacts: (
										<DraggableBox
											id="contacts"
											dragHandleSelector="[data-drafting-table-header]"
											onDropOver={(overId) => swapBoxes('contacts', overId)}
										>
											<ContactsSelection
												contacts={availableContacts}
												selectedContactIds={selectedContactIds}
												setSelectedContactIds={setSelectedContactIds}
												handleContactSelection={handleContactSelection}
												generationProgress={generationProgress}
												generationTotal={generationTotal}
												cancelGeneration={cancelGeneration}
											/>
										</DraggableBox>
									),
									'mini-email-structure': (
										<DraggableBox
											id="mini-email-structure"
											onDropOver={(overId) => swapBoxes('mini-email-structure', overId)}
											className={
												previewDraft || isLivePreviewVisible ? 'z-10' : undefined
											}
										>
											<MiniEmailStructure
												form={form}
												onDraft={handleDraftButtonClick}
												isDraftDisabled={
													isGenerationDisabled() || selectedContactIds.size === 0
												}
												isPendingGeneration={isPendingGeneration}
												generationProgress={generationProgress}
												generationTotal={generationTotal}
												onCancel={cancelGeneration}
											/>
										</DraggableBox>
									),
									'draft-preview': (
										<DraggableBox
											id="draft-preview"
											enabled={false}
											resetToken={
												previewDraft
													? `preview-${previewDraft.id}`
													: isLivePreviewVisible
													? 'live'
													: 'hidden'
											}
										>
											{previewDraft ? (
												<DraftPreviewBox
													contacts={contacts}
													draft={previewDraft}
													onClose={() => setPreviewDraft(null)}
												/>
											) : isLivePreviewVisible ? (
												<DraftPreviewBox
													contacts={contacts}
													draft={{ contactId: livePreviewContactId || 0 }}
													onClose={() => setPreviewDraft(null)}
													overridePlainMessage={livePreviewMessage || 'Drafting...'}
													overrideContactId={livePreviewContactId || undefined}
												/>
											) : null}
										</DraggableBox>
									),
									'sending-preview': (
										<DraggableBox
											id="sending-preview"
											enabled={false}
											className="z-10"
											resetToken={
												sendingPreview ? `sending-${sendingPreview.contactId}` : 'hidden'
											}
										>
											{sendingPreview ? (
												<DraftPreviewBox
													contacts={contacts}
													draft={sendingPreview}
													onClose={() => setSendingPreview(null)}
												/>
											) : null}
										</DraggableBox>
									),
									drafts: (
										<DraggableBox
											id="drafts"
											dragHandleSelector="[data-drafting-table-header]"
											onDropOver={(overId) => swapBoxes('drafts', overId)}
										>
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
										</DraggableBox>
									),
									sent: (
										<DraggableBox
											id="sent"
											dragHandleSelector="[data-drafting-table-header]"
											onDropOver={(overId) => swapBoxes('sent', overId)}
										>
											<SentEmails emails={sentEmails} isPendingEmails={isPendingEmails} />
										</DraggableBox>
									),
								} as const;

								const order =
									previewDraft || isLivePreviewVisible
										? ([
												'mini-email-structure',
												'draft-preview',
												'drafts',
												'sent',
										  ] as const)
										: isSendingPreviewVisible
										? ([
												'contacts',
												'mini-email-structure',
												'drafts',
												'sending-preview',
										  ] as const)
										: (boxOrder as readonly string[]);

								const boxes = order.map((boxId) => (
									<div key={boxId}>
										{boxContentById[boxId as keyof typeof boxContentById]}
									</div>
								));

								// When previewing (static or live), render the contacts box as an overlay tucked behind the mini structure.
								if (previewDraft || isLivePreviewVisible) {
									boxes.push(
										<div
											key="contacts-overlay"
											className="absolute z-0 pointer-events-none"
											style={{
												left: `${contactsOverlayPos.left}px`,
												top: `${contactsOverlayPos.top}px`,
												opacity: 0.7,
											}}
										>
											<DraggableBox id="contacts-overlay" enabled={false}>
												<ContactsSelection
													contacts={availableContacts}
													selectedContactIds={selectedContactIds}
													setSelectedContactIds={setSelectedContactIds}
													handleContactSelection={handleContactSelection}
													generationProgress={generationProgress}
													generationTotal={generationTotal}
													cancelGeneration={cancelGeneration}
												/>
											</DraggableBox>
										</div>
									);
								}

								// When sending, render the Sent table as an overlay behind the Sending Preview
								if (isSendingPreviewVisible) {
									boxes.push(
										<div
											key="sent-overlay"
											className="absolute z-0 pointer-events-none"
											style={{
												left: `${sentOverlayPos.left}px`,
												top: `${sentOverlayPos.top}px`,
												opacity: 0.7,
											}}
										>
											<DraggableBox id="sent-overlay" enabled={false}>
												<SentEmails
													emails={sentEmails}
													isPendingEmails={isPendingEmails}
												/>
											</DraggableBox>
										</div>
									);
								}

								return boxes;
							})()}
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
