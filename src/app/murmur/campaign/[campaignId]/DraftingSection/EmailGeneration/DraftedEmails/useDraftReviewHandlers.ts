import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Contact, Identity } from '@prisma/client';
import {
	stringifyJsonSubset,
	generateEmailTemplateFromBlocks,
	generatePromptsFromBlocks,
	removeEmDashes,
	stripEmailSignatureFromAiMessage,
	convertAiResponseToRichTextEmail,
	convertHtmlToPlainText,
} from '@/utils';
import {
	injectMurmurDraftSettingsSnapshot,
	type DraftProfileFields,
} from '@/utils/draftSettings';
import { EmailStatus, DraftingMode, ReviewStatus } from '@/constants/prismaEnums';
import { resolveAutoSignatureText } from '@/constants/autoSignatures';
import {
	FULL_AI_DRAFTING_SYSTEM_PROMPT,
	GEMINI_HYBRID_PROMPT,
	OPENROUTER_DRAFTING_MODELS,
	insertWebsiteLinkPhrase,
} from '@/constants/ai';
import {
	CampaignWithRelations,
	EmailWithRelations,
	StripeSubscriptionStatus,
} from '@/types';
import { ContactWithName } from '@/types/contact';
import { useEditEmail } from '@/hooks/queryHooks/useEmails';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useDivertEmailToMessage } from '@/hooks/queryHooks/useConversations';
import { useGemini } from '@/hooks/useGemini';
import { useOpenRouter } from '@/hooks/useOpenRouter';
import { useMe } from '@/hooks/useMe';
import { HybridBlockPrompt, type DraftingFormValues } from '../../useDraftingSection';

type IdentityProfileFields = Identity & {
	genre?: string | null;
	area?: string | null;
	bandName?: string | null;
	bio?: string | null;
};

export interface UseDraftReviewHandlersArgs {
	campaign: CampaignWithRelations;
	form: UseFormReturn<DraftingFormValues>;
	contacts: ContactWithName[];
	/** The draft list this consumer renders/owns — `handleSendDrafts` filters against it. */
	draftEmails: EmailWithRelations[];
	/** Selection used by `handleSendDrafts` when no explicit ids are passed. */
	selectedSendIds: Set<number>;
	/** Clears the consumer's send selection after a send completes. */
	clearSelectedSendIds: () => void;
}

/**
 * Shared draft-review action handlers (reject / approve / regenerate / send) used by both the
 * campaign DraftingSection and the dashboard search-overlay review. Extracted verbatim from
 * DraftingSection so the two consumers share one copy — notably keeping the venue/credits send
 * split (which must stay in sync with `useConfirmSendDialog.handleSend`) in a single place.
 */
export const useDraftReviewHandlers = ({
	campaign,
	form,
	contacts,
	draftEmails,
	selectedSendIds,
	clearSelectedSendIds,
}: UseDraftReviewHandlersArgs) => {
	const { user, subscriptionTier } = useMe();
	const queryClient = useQueryClient();
	const { mutateAsync: updateEmail } = useEditEmail({ suppressToasts: true });
	const { mutateAsync: sendMailgunMessage } = useSendMailgunMessage({
		suppressToasts: true,
	});
	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });
	const { mutateAsync: divertEmailToMessage } = useDivertEmailToMessage({
		suppressToasts: true,
	});
	// Gemini hook for regenerating drafts (used for Hybrid mode)
	const { mutateAsync: callGemini } = useGemini({ suppressToasts: true });
	// OpenRouter hook for regenerating drafts (used for Full AI mode)
	const { mutateAsync: callOpenRouter } = useOpenRouter({ suppressToasts: true });

	const handleRejectDraft = useCallback(
		async (draftId: number, currentlyRejected?: boolean) => {
			try {
				await updateEmail({
					id: draftId,
					data: { reviewStatus: currentlyRejected ? null : ReviewStatus.rejected },
				});
			} catch (error) {
				console.error('Failed to update draft review status:', error);
				toast.error('Failed to reject draft');
			}
		},
		[updateEmail]
	);

	const handleApproveDraft = useCallback(
		async (draftId: number, currentlyApproved?: boolean) => {
			try {
				await updateEmail({
					id: draftId,
					data: { reviewStatus: currentlyApproved ? null : ReviewStatus.approved },
				});
			} catch (error) {
				console.error('Failed to update draft review status:', error);
				toast.error('Failed to approve draft');
			}
		},
		[updateEmail]
	);

	// Helper to determine drafting mode from form blocks
	const getDraftingModeFromBlocks = useCallback(() => {
		const blocks = form.getValues('hybridBlockPrompts');
		const hasFullAutomatedBlock = blocks?.some(
			(block: HybridBlockPrompt) => block.type === 'full_automated'
		);
		if (hasFullAutomatedBlock) return DraftingMode.ai;
		const isOnlyTextBlocks = blocks?.every(
			(block: HybridBlockPrompt) => block.type === 'text'
		);
		if (isOnlyTextBlocks) return DraftingMode.handwritten;
		return DraftingMode.hybrid;
	}, [form]);

	// Handle regenerating a draft using the current prompt
	const handleRegenerateDraft = useCallback(
		async (
			draft: EmailWithRelations
		): Promise<{ subject: string; message: string } | null> => {
			const contact = contacts?.find((c) => c.id === draft.contactId);
			if (!contact) {
				toast.error('Contact not found for this draft');
				return null;
			}

			if (!campaign.identity) {
				toast.error('Campaign identity is required');
				return null;
			}

			const draftingMode = getDraftingModeFromBlocks();
			const values = form.getValues();

			try {
				let aiResponse: string;

				if (draftingMode === DraftingMode.ai) {
					// Full AI mode - use OpenRouter with a random model from the pool
					const fullAutomatedBlock = values.hybridBlockPrompts?.find(
						(block: HybridBlockPrompt) => block.type === 'full_automated'
					);
					const fullAiPrompt =
						(fullAutomatedBlock?.value?.trim() ??
							values.fullAiPrompt?.trim() ??
							campaign.fullAiPrompt?.trim() ??
							'') ||
						'Generate an outreach email.';

					const populatedSystemPrompt = FULL_AI_DRAFTING_SYSTEM_PROMPT.replace(
						'{recipient_first_name}',
						contact.firstName || ''
					).replace('{company}', contact.company || '');

					const identityProfile = campaign.identity as IdentityProfileFields;
					const senderProfile = {
						name: identityProfile.name,
						bandName: identityProfile.bandName ?? undefined,
						genre: identityProfile.genre ?? undefined,
						area: identityProfile.area ?? undefined,
						bio: identityProfile.bio ?? undefined,
						website: identityProfile.website ?? undefined,
					};

					const userPrompt = `Sender information (user profile):\n${stringifyJsonSubset(
						senderProfile,
						['name', 'bandName', 'genre', 'area', 'bio', 'website']
					)}\n\nRecipient information:\n${stringifyJsonSubset<Contact>(
						contact as Contact,
						[
							'lastName',
							'firstName',
							'email',
							'company',
							'address',
							'city',
							'state',
							'country',
							'website',
							'phone',
							'metadata',
						]
					)}\n\nUser Goal:\n${fullAiPrompt}`;

					// Pick a random model for regeneration
					const selectedModel =
						OPENROUTER_DRAFTING_MODELS[
							Math.floor(Math.random() * OPENROUTER_DRAFTING_MODELS.length)
						];
					console.log('[Regenerate] Using OpenRouter model:', selectedModel);

					aiResponse = await callOpenRouter({
						model: selectedModel,
						prompt: populatedSystemPrompt,
						content: userPrompt,
						debug: {
							contactId: contact.id,
							contactEmail: contact.email,
							campaignId: campaign.id,
							source: 'regenerate',
						},
					});
				} else if (draftingMode === DraftingMode.hybrid) {
					const hybridBlocks =
						values.hybridBlockPrompts?.filter(
							(block: HybridBlockPrompt) => block.type !== 'full_automated'
						) || [];

					if (hybridBlocks.length === 0) {
						toast.error('Please set up your email template first');
						return null;
					}

					const stringifiedRecipient = stringifyJsonSubset<Contact>(contact as Contact, [
						'firstName',
						'lastName',
						'company',
						'address',
						'city',
						'state',
						'country',
						'website',
						'phone',
						'metadata',
					]);

					const identityProfile = campaign.identity as IdentityProfileFields;
					const senderProfile = {
						name: identityProfile.name,
						bandName: identityProfile.bandName ?? undefined,
						genre: identityProfile.genre ?? undefined,
						area: identityProfile.area ?? undefined,
						bio: identityProfile.bio ?? undefined,
						website: identityProfile.website ?? undefined,
					};

					const stringifiedSender = stringifyJsonSubset(senderProfile, [
						'name',
						'bandName',
						'genre',
						'area',
						'bio',
						'website',
					]);

					const stringifiedHybridBlocks = generateEmailTemplateFromBlocks(hybridBlocks);
					const hybridPrompt =
						(values.hybridPrompt?.trim() ?? campaign.hybridPrompt?.trim() ?? '') ||
						'Generate a professional email based on the template below.';
					const geminiPrompt = `**RECIPIENT**\n${stringifiedRecipient}\n\n**SENDER**\n${stringifiedSender}\n\n**PROMPT**\n${hybridPrompt}\n\n**EMAIL TEMPLATE**\n${stringifiedHybridBlocks}\n\n**PROMPTS**\n${generatePromptsFromBlocks(
						hybridBlocks
					)}`;

					aiResponse = await callGemini({
						model: 'gemini-3-pro-preview',
						prompt: GEMINI_HYBRID_PROMPT,
						content: geminiPrompt,
					});
				} else {
					// Handwritten mode - no AI regeneration
					toast.error('Regeneration is not available in handwritten mode');
					return null;
				}

				// Parse the AI response
				let parsed: { subject: string; message: string };
				try {
					let cleanedResponse = aiResponse;
					cleanedResponse = cleanedResponse
						.replace(/^```(?:json)?\s*/i, '')
						.replace(/\s*```$/i, '');

					const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
					if (jsonMatch) {
						cleanedResponse = jsonMatch[0];
					}

					cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');
					parsed = JSON.parse(cleanedResponse);

					if (!parsed.message || !parsed.subject) {
						throw new Error('Missing required fields');
					}
				} catch {
					const subjectMatch = aiResponse.match(/subject["']?\s*:\s*["']([^"']+)["']/i);
					const messageMatch = aiResponse.match(
						/message["']?\s*:\s*["']([\s\S]*?)["']\s*[,}]/i
					);

					parsed = {
						subject: subjectMatch?.[1] || draft.subject || 'Re: Your inquiry',
						message: messageMatch?.[1] || aiResponse,
					};
				}

				const cleanedSubject = removeEmDashes(parsed.subject);
				const cleanedMessageText = removeEmDashes(parsed.message);
				const cleanedMessageNoSignature = stripEmailSignatureFromAiMessage(
					cleanedMessageText,
					{
						senderName: campaign.identity?.name ?? null,
						senderBandName: campaign.identity?.bandName ?? null,
					}
				);

				const signatureText = resolveAutoSignatureText({
					currentSignature: values.signature ?? null,
					fallbackSignature: `Thank you,\n${campaign.identity?.name || ''}`,
					context: {
						name: campaign.identity?.name ?? null,
						bandName: campaign.identity?.bandName ?? null,
						website: campaign.identity?.website ?? null,
						email: campaign.identity?.email ?? null,
					},
				});
				const font = values.font || 'Arial';

				let processedMessageText = cleanedMessageNoSignature;
				if (campaign.identity?.website) {
					processedMessageText = insertWebsiteLinkPhrase(
						processedMessageText,
						campaign.identity.website
					);
				}

				const richTextMessage = convertAiResponseToRichTextEmail(
					processedMessageText,
					font,
					signatureText
				);
				// Build profile fields from the current identity to store with the draft
				const profileFieldsSnapshot: DraftProfileFields = {
					name: campaign.identity?.name ?? '',
					genre: campaign.identity?.genre ?? '',
					area: campaign.identity?.area ?? '',
					band: campaign.identity?.bandName ?? '',
					bio: campaign.identity?.bio ?? '',
					links: campaign.identity?.website ?? '',
				};
				const richTextMessageWithSettings = injectMurmurDraftSettingsSnapshot(
					richTextMessage,
					{
						version: 1,
						values: {
							...values,
							signature: signatureText,
						},
						profileFields: profileFieldsSnapshot,
					}
				);

				await updateEmail({
					id: draft.id.toString(),
					data: {
						subject: cleanedSubject,
						message: richTextMessageWithSettings,
					},
				});

				queryClient.invalidateQueries({ queryKey: ['emails'] });

				toast.success('Draft regenerated successfully');
				const messageForUi = convertHtmlToPlainText(richTextMessageWithSettings);
				return { subject: cleanedSubject, message: messageForUi };
			} catch (error) {
				console.error('[Regenerate] Error:', error);
				toast.error('Failed to regenerate draft');
				return null;
			}
		},
		[
			contacts,
			campaign.identity,
			campaign.fullAiPrompt,
			campaign.hybridPrompt,
			getDraftingModeFromBlocks,
			form,
			callGemini,
			updateEmail,
			queryClient,
		]
	);

	// Returns the number of drafts actually processed (emailed + messaged); 0 when a
	// guard blocked the send (the guard already toasted).
	const handleSendDrafts = async (draftIds?: Iterable<number>): Promise<number> => {
		// If draftIds is provided, ONLY send those drafts (used by draft-review "Send" button).
		// Otherwise, send the current selection (and never default to "all drafts" when selection is empty).
		const explicitIds = draftIds ? new Set(Array.from(draftIds)) : null;

		const selectedDrafts = explicitIds
			? draftEmails.filter((d) => explicitIds.has(d.id))
			: selectedSendIds.size > 0
				? draftEmails.filter((d) => selectedSendIds.has(d.id))
				: [];

		if (selectedDrafts.length === 0) {
			toast.error('Select emails to send.');
			return 0;
		}

		if (!campaign) {
			return 0;
		}

		// Venue recipients (contact.venueId set) become internal messages — never
		// emailed, and they cost no sending credits. Everyone else goes through
		// Mailgun. NOTE: this venue split must stay in sync with
		// useConfirmSendDialog.handleSend (the other campaign send path).
		const venueDrafts = selectedDrafts.filter((d) => d.contact.venueId != null);
		const emailDrafts = selectedDrafts.filter((d) => d.contact.venueId == null);

		// Identity + plan are required only to send EMAILS, not internal messages.
		if (emailDrafts.length > 0) {
			if (!campaign?.identity?.email || !campaign?.identity?.name) {
				toast.error('Please create an Identity before sending emails.');
				return 0;
			}

			if (
				!subscriptionTier &&
				user?.stripeSubscriptionStatus !== StripeSubscriptionStatus.TRIALING
			) {
				toast.error('Please upgrade to a paid plan to send emails.');
				return 0;
			}
		}

		const sendingCredits = user?.sendingCredits || 0;
		// Credits gate ONLY the email recipients; DMs are always allowed.
		const emailsWeCanSend = Math.min(emailDrafts.length, sendingCredits);
		const emailsToProcess = emailDrafts.slice(0, emailsWeCanSend);

		if (emailDrafts.length > 0 && sendingCredits === 0 && venueDrafts.length === 0) {
			toast.error(
				'You have run out of sending credits. Please upgrade your subscription.'
			);
			return 0;
		}

		let emailedCount = 0;
		let messagedCount = 0;

		// 1) Internal messages to venue users (no email, no credit cost).
		for (const email of venueDrafts) {
			try {
				await divertEmailToMessage(email.id);
				messagedCount++;
				queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
			} catch (error) {
				console.error('Failed to deliver internal message:', error);
			}
		}

		// 2) Regular emails via Mailgun.
		for (const email of emailsToProcess) {
			try {
				const res = await sendMailgunMessage({
					subject: email.subject,
					message: email.message,
					recipientEmail: email.contact.email,
					// Guaranteed non-null by the identity guard above when emailDrafts.length > 0
					// (this loop only runs for email recipients).
					senderEmail: campaign.identity!.email,
					senderName: campaign.identity!.name,
					originEmail:
						user?.customDomain && user?.customDomain !== ''
							? user?.customDomain
							: user?.murmurEmail,
					replyToEmail: user?.replyToEmail ?? user?.murmurEmail ?? undefined,
					template: 'newMessage',
					campaignId: campaign.id,
				});

				if (res.success) {
					await updateEmail({
						id: email.id.toString(),
						data: {
							status: EmailStatus.sent,
							sentAt: new Date(),
						},
					});
					emailedCount++;
					queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id] });
				}
			} catch (error) {
				console.error('Failed to send email:', error);
			}
		}

		// Only emails consume sending credits; internal messages are free.
		if (user && emailedCount > 0) {
			const newCreditBalance = Math.max(0, sendingCredits - emailedCount);
			await editUser({
				clerkId: user.clerkId,
				data: { sendingCredits: newCreditBalance },
			});
		}

		clearSelectedSendIds();

		const totalProcessed = emailedCount + messagedCount;
		const emailsToSend = selectedDrafts.length;

		if (totalProcessed === emailsToSend && totalProcessed > 0) {
			toast.success(
				`All ${totalProcessed} message${totalProcessed === 1 ? '' : 's'} sent successfully!`
			);
		} else if (totalProcessed > 0) {
			if (emailsWeCanSend < emailDrafts.length) {
				toast.warning(`Sent ${totalProcessed} before running out of credits.`);
			} else {
				toast.warning(`${totalProcessed} of ${emailsToSend} sent successfully.`);
			}
		} else {
			toast.error('Failed to send emails. Please try again.');
		}

		return totalProcessed;
	};

	return {
		handleRejectDraft,
		handleApproveDraft,
		getDraftingModeFromBlocks,
		handleRegenerateDraft,
		handleSendDrafts,
	};
};
