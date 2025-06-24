import { CLEAN_EMAIL_PROMPT, FONT_OPTIONS } from '@/constants';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useCreateEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useGetSignatures } from '@/hooks/queryHooks/useSignatures';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { useMistral } from '@/hooks/useMistral';
import { DraftEmailResponse, usePerplexityDraftEmail } from '@/hooks/usePerplexity';
import { CampaignWithRelations, Font, TestDraftEmail } from '@/types';
import { convertAiResponseToRichTextEmail } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Contact, DraftingMode, DraftingTone, EmailStatus } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export interface DraftingSectionProps {
	campaign: CampaignWithRelations;
}

type BatchGenerationResult = {
	contactId: number;
	success: boolean;
	error?: string;
	retries: number;
};

type ModeOption = {
	value: DraftingMode;
	label: string;
};

const FONT_VALUES: [Font, ...Font[]] = FONT_OPTIONS as [Font, ...Font[]];

export const draftingFormSchema = z.object({
	mode: z.nativeEnum(DraftingMode).default(DraftingMode.ai),
	isAiSubject: z.boolean().default(true),
	subject: z.string().min(1, { message: 'Subject is required.' }),
	fullAiPrompt: z.string().min(1, { message: 'Message is required.' }),
	promptHybrid: z.string().min(1, { message: 'Message is required.' }),
	promptHandwritten: z.string().min(1, { message: 'Message is required.' }),
	font: z.enum(FONT_VALUES),
	signature: z.number().min(1),
	tone: z.nativeEnum(DraftingTone).default(DraftingTone.normal),
	paragraphs: z.number().min(0).max(5).default(3),
});

export const useDraftingSection = (props: DraftingSectionProps) => {
	const { campaign } = props;
	const campaignId = campaign.id;

	const [isOpenSignaturesDialog, setIsOpenSignaturesDialog] = useState(false);

	const form = useForm<z.infer<typeof draftingFormSchema>>({
		resolver: zodResolver(draftingFormSchema),
		defaultValues: {
			mode: DraftingMode.ai,
			isAiSubject: true,
			subject: '',
			fullAiPrompt: '',
			promptHybrid: '',
			promptHandwritten: '',
			font: 'Arial',
			signature: 0,
			tone: DraftingTone.normal,
			paragraphs: 3,
		},
		mode: 'onChange',
	});

	const isAiSubject = form.watch('isAiSubject');

	const {
		trigger,
		getValues,
		formState: { isDirty },
	} = form;

	useEffect(() => {
		if (campaign) {
			form.reset({
				mode: campaign.draftingMode ?? DraftingMode.ai,
				subject: campaign.subject ?? '',
				fullAiPrompt: campaign.fullAiPrompt ?? '',
				promptHybrid: campaign.hybridPrompt ?? '',
				promptHandwritten: campaign.handwrittenPrompt ?? '',
				font: (campaign.font as Font) ?? 'Arial',
				signature: campaign.signatureId ?? 1,
				tone: campaign.draftingTone ?? DraftingTone.normal,
				paragraphs: campaign.paragraphs ?? 3,
			});
		}
	}, [campaign, form]);

	const { data, isPending } = useGetEmails({
		filters: {
			campaignId,
		},
	});

	const draftEmails = data?.filter((email) => email.status === EmailStatus.draft) || [];

	const [draftingMode, setDraftingMode] = useState<DraftingMode>('ai');

	const modeOptions: ModeOption[] = [
		{ value: 'ai', label: 'Full AI' },
		{ value: 'hybrid', label: 'Hybrid' },
		{ value: 'handwritten', label: 'Handwritten' },
	];

	const { data: signatures, isPending: isPendingSignatures } = useGetSignatures();

	const { data: contacts } = useGetContacts({
		filters: {
			contactListIds: campaign.contactLists.map((list) => list.id),
		},
	});
	const { user } = useMe();
	const [generationProgress, setGenerationProgress] = useState(-1);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isTest, setIsTest] = useState<boolean>(false);
	const [abortController, setAbortController] = useState<AbortController | null>(null);
	const isGenerationCancelledRef = useRef(false);

	const aiDraftCredits = user?.aiDraftCredits;
	const selectedSignature = campaign.signature;

	const {
		dataDraftEmail: rawDataDraftEmail,
		isPendingDraftEmail,
		draftEmailAsync,
	} = usePerplexityDraftEmail();
	const { mutateAsync: cleanDraftEmail, isPending: isPendingCleanDraftEmail } =
		useMistral({
			suppressToasts: true,
		});
	const { mutate: editUser } = useEditUser({ suppressToasts: true });
	const { isPending: isPendingSavePrompt, mutateAsync: savePrompt } = useEditCampaign();
	const { mutateAsync: saveCampaignNoToast } = useEditCampaign({
		suppressToasts: true,
	});
	const { mutateAsync: saveTestEmail } = useEditCampaign({
		suppressToasts: true,
	});
	const { isPending: isPendingCreateEmail, mutateAsync: createEmail } = useCreateEmail({
		suppressToasts: true,
	});

	const isPendingGeneration =
		isPendingDraftEmail || isPendingCleanDraftEmail || isPendingCreateEmail;

	let dataDraftEmail: TestDraftEmail = {
		subject: '',
		message: '',
		contactEmail: contacts ? contacts[0].email : '',
	};

	if (!rawDataDraftEmail && campaign.testMessage && campaign.testMessage.length > 0) {
		dataDraftEmail = {
			subject: campaign.testSubject || '',
			message: campaign.testMessage,
			contactEmail: contacts ? contacts[0].email : '',
		};
	} else {
		dataDraftEmail.subject = campaign.testSubject || '';
		dataDraftEmail.message = campaign.testMessage || '';
	}

	useEffect(() => {
		return () => {
			if (abortController) {
				abortController.abort();
			}
		};
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, []);

	const queryClient = useQueryClient();

	const draftEmailChain = async (
		recipient: Contact,
		message: string,
		signal?: AbortSignal
	) => {
		const newDraft = await draftEmailAsync({
			generateSubject: isAiSubject,
			recipient,
			prompt: message,
			signal: signal,
		});

		const cleanedDraftEmail = await cleanDraftEmail({
			prompt: CLEAN_EMAIL_PROMPT,
			content: newDraft,
			signal: signal,
		});

		const parsedDraft = JSON.parse(cleanedDraftEmail);
		if (parsedDraft.message.length < 50) {
			throw new Error('Generated email was too short. Please try again.');
		}
		return parsedDraft;
	};

	const cancelGeneration = () => {
		isGenerationCancelledRef.current = true;
		setGenerationProgress(-1);
		if (abortController) {
			abortController.abort();
			setAbortController(null);
		}
	};

	const generateTestDraft = async () => {
		const values = getValues();

		setIsTest(true);
		// if you run out of credits, stop here

		let isSuccess = false;
		let attempts = 0;

		while (!isSuccess) {
			try {
				if (attempts > 5) {
					toast.error('Failed to generate test email.');
					break;
				}

				if (!contacts || contacts.length === 0) {
					toast.error('No contacts available to send test email.');
					break;
				}

				const parsedRes: DraftEmailResponse = await draftEmailChain(
					contacts[0],
					values.fullAiPrompt
				);

				if (parsedRes.message && parsedRes.subject) {
					await saveTestEmail({
						id: campaign.id,
						data: {
							subject: values.subject,
							message: values.fullAiPrompt,
							testMessage: convertAiResponseToRichTextEmail(
								parsedRes.message,
								values.font,
								campaign.signature
							),
							testSubject: isAiSubject ? parsedRes.subject : values.subject,
							font: values.font,
						},
					});
					queryClient.invalidateQueries({
						queryKey: ['campaign', campaign.id as number],
					});
					queryClient.invalidateQueries({
						queryKey: ['user'],
					});
					toast.success('Test email generated successfully!');
					isSuccess = true;
				} else {
					attempts++;
				}
			} catch {
				attempts++;
				continue;
			}
		}

		if (user) {
			// reduce credits here
			// editUser({
			// 	clerkId: user.clerkId,
			// 	data: { aiTestCredits: aiTestCredits - 1 },
			// });
		}
		setIsTest(false);
	};

	const generateBatchPromises = (
		batchToProcess: Contact[],
		controller: AbortController
	) => {
		const values = getValues();

		return batchToProcess.map(async (recipient: Contact) => {
			const MAX_RETRIES = 5;
			let lastError: Error | null = null;

			for (
				let retryCount = 0;
				retryCount <= MAX_RETRIES && !isGenerationCancelledRef.current;
				retryCount++
			) {
				try {
					// Exponential backoff: 0ms, 1s, 2s, 4s
					if (retryCount > 0) {
						const delay = Math.pow(2, retryCount - 1) * 1000;
						await new Promise((resolve) => setTimeout(resolve, delay));
					}

					const parsedDraft = await draftEmailChain(
						recipient,
						values.fullAiPrompt,
						controller.signal
					);

					if (parsedDraft) {
						if (!isAiSubject) {
							parsedDraft.subject = values.subject || parsedDraft.subject;
						}

						await createEmail({
							subject: parsedDraft.subject,
							message: convertAiResponseToRichTextEmail(
								parsedDraft.message,
								values.font,
								campaign.signature
							),
							campaignId: campaign.id,
							status: 'draft' as EmailStatus,
							contactId: recipient.id,
						});
						setGenerationProgress((prev) => prev + 1);

						return {
							success: true,
							contactId: recipient.id,
							retries: retryCount,
						};
					} else {
						throw new Error('No draft generated - empty response');
					}
				} catch (error) {
					if (error instanceof Error && error.message === 'Request cancelled.') {
						throw error; // Re-throw cancellation errors immediately
					}

					lastError = error instanceof Error ? error : new Error('Unknown error');

					if (retryCount === MAX_RETRIES) {
						break;
					}
					if (!isGenerationCancelledRef.current) {
						if (
							lastError.message.includes('JSON') ||
							lastError.message.includes('parse') ||
							lastError.message.includes('too short')
						) {
							console.warn(
								`Retry ${retryCount + 1}/${MAX_RETRIES} for contact ${recipient.id} - ${
									lastError.message
								}`
							);
						} else {
							console.error(
								`Error for contact ${recipient.id} (attempt ${retryCount + 1}):`,
								lastError.message
							);
						}
					}
				}
			} // All retries exhausted (skip if cancelled)
			if (!isGenerationCancelledRef.current) {
				console.error(
					`Contact ${recipient.id} failed after ${MAX_RETRIES} retries. Final error:`,
					lastError?.message
				);
			}
			return {
				success: false,
				contactId: recipient.id,
				error: lastError?.message || 'Unknown error',
				retries: MAX_RETRIES,
			};
		});
	};

	const batchGenerateEmails = async () => {
		let remainingCredits = aiDraftCredits || 0;
		setGenerationProgress(0);
		isGenerationCancelledRef.current = false;

		const controller = new AbortController();
		setAbortController(controller);

		// you only need all the contacts when you batch generate emails...
		// so can you fetch them here?
		// or completely backend? But then it's an endpoint that runs too long

		const BATCH_SIZE = 5;
		const BATCH_DELAY = 1000;
		let successfulEmails = 0;

		if (!contacts || contacts.length === 0) {
			toast.error('No contacts available to generate emails.');
			return;
		}
		try {
			for (
				let i = 0;
				i < contacts.length && !isGenerationCancelledRef.current;
				i += BATCH_SIZE
			) {
				if (remainingCredits <= 0) {
					toast.error('You have run out of AI draft credits!');
					cancelGeneration();
					break;
				}

				const batch: Contact[] = contacts.slice(
					i,
					Math.min(i + BATCH_SIZE, contacts.length)
				);
				const availableCreditsForBatch = Math.min(batch.length, remainingCredits);
				const batchToProcess: Contact[] = batch.slice(0, availableCreditsForBatch);

				const currentBatchPromises: Promise<BatchGenerationResult>[] =
					generateBatchPromises(batchToProcess, controller);

				const batchResults = await Promise.allSettled(currentBatchPromises);
				for (const result of batchResults) {
					if (result.status === 'fulfilled' && result.value.success) {
						remainingCredits--;
						successfulEmails++;
					} else if (result.status === 'rejected') {
						if (result.reason?.message === 'Request cancelled.') {
							throw result.reason;
						}
					}
				}

				if (i + BATCH_SIZE < contacts.length && !isGenerationCancelledRef.current) {
					await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
				}
			}

			if (user && aiDraftCredits && successfulEmails > 0) {
				const newCreditBalance = Math.max(0, aiDraftCredits - successfulEmails);
				editUser({
					clerkId: user.clerkId,
					data: { aiDraftCredits: newCreditBalance },
				});
			}

			if (!isGenerationCancelledRef.current) {
				if (successfulEmails === contacts.length) {
					toast.success('All emails generated successfully!');
				} else if (successfulEmails > 0) {
					toast.success(
						`Email generation completed! ${successfulEmails}/${contacts.length} emails generated successfully.`
					);
				} else {
					toast.error('Email generation failed. Please try again.');
				}
			}
		} catch (error) {
			if (error instanceof Error && error.message === 'Request cancelled.') {
				console.log('Email generation was cancelled by user');
			} else {
				console.error('Unexpected error during batch processing:', error);
				toast.error('An error occurred during email generation.');
			}
		} finally {
			setAbortController(null);
		}
	};

	const handleFormAction = async (action: 'test' | 'submit') => {
		const isValid = await trigger();
		if (!isValid) return;

		if (action === 'test') {
			generateTestDraft();
		} else {
			batchGenerateEmails();
		}
	};

	const handleSavePrompt = async () => {
		savePrompt({
			id: campaign.id,
			data: {
				mode: getValues('mode'),
				subject: getValues('subject'),
				fullAiPrompt: getValues('fullAiPrompt'),
				hybridPrompt: getValues('promptHybrid'),
				handwrittenPrompt: getValues('promptHandwritten'),
				font: getValues('font'),
				signatureId: getValues('signature'),
				draftingTone: getValues('tone'),
				paragraphs: getValues('paragraphs'),
			},
		});
	};

	return {
		draftEmails,
		isPending,
		campaign,
		draftingMode,
		setDraftingMode,
		modeOptions,
		handleFormAction,
		form,
		setIsConfirmDialogOpen,
		cancelGeneration,
		generationProgress,
		setGenerationProgress,
		contacts,
		isConfirmDialogOpen,
		isPendingGeneration,
		isPendingSavePrompt,
		isAiSubject,
		handleSavePrompt,
		aiDraftCredits,
		isTest,
		signatures,
		isPendingSignatures,
		isOpenSignaturesDialog,
		setIsOpenSignaturesDialog,
	};
};
