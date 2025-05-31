import { convertAiResponseToRichTextEmail } from '@/utils';
import { CampaignWithRelations, TestDraftEmail } from '@/types';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useCreateEmail } from '@/hooks/queryHooks/useEmails';
import { useMe } from '@/hooks/useMe';
import { DraftEmailResponse, usePerplexityDraftEmail } from '@/hooks/usePerplexity';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { AiModel, Contact, EmailStatus } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useOpenAi } from '@/hooks/useOpenAi';
import { OPEN_AI_MODEL_OPTIONS } from '@/constants';
import { CLEAN_EMAIL_PROMPT } from '@/constants/ai';

const getEmailDraftSchema = (isAiSubject: boolean) => {
	return z.object({
		subject: isAiSubject
			? z.string().optional()
			: z.string().min(1, { message: 'Subject is required.' }),
		message: z.string().min(1, { message: 'Message is required.' }),
		aiModel: z.nativeEnum(AiModel, {
			required_error: 'AI model is required.',
		}),
		font: z.string().min(1, { message: 'Font is required.' }),
	});
};

export interface AiComposeProps {
	campaign: CampaignWithRelations;
}

const useAiCompose = (props: AiComposeProps) => {
	const { campaign } = props;

	const { user } = useMe();
	const [generationProgress, setGenerationProgress] = useState(-1);
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isTest, setIsTest] = useState<boolean>(false);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(
		!campaign.subject || campaign.subject.length === 0
	);

	const isGenerationCancelledRef = useRef(false);

	const [abortController, setAbortController] = useState<AbortController | null>(null);

	const aiDraftCredits = user?.aiDraftCredits;
	const aiTestCredits = user?.aiTestCredits;
	const selectedSignature = campaign.signature;

	const {
		dataDraftEmail: rawDataDraftEmail,
		isPendingDraftEmail,
		draftEmailAsync,
	} = usePerplexityDraftEmail();
	const { mutateAsync: cleanDraftEmail, isPending: isPendingCleanDraftEmail } = useOpenAi(
		{
			suppressToasts: true,
		}
	);
	const { mutate: editUser } = useEditUser({ suppressToasts: true });
	const { isPending: isPendingSavePrompt, mutateAsync: savePrompt } = useEditCampaign({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id as number] });
		},
	});
	const { mutateAsync: saveCampaignNoToast } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id as number] });
		},
	});
	const { mutateAsync: saveTestEmail } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id as number] });
		},
	});
	const { isPending: isPendingCreateEmail, mutateAsync: createEmail } = useCreateEmail({
		suppressToasts: true,
	});

	const isPendingGeneration =
		isPendingDraftEmail || isPendingCleanDraftEmail || isPendingCreateEmail;

	let dataDraftEmail: TestDraftEmail = {
		subject: '',
		message: '',
		contactEmail: campaign.contacts[0]?.email || '',
	};

	if (!rawDataDraftEmail && campaign.testMessage && campaign.testMessage.length > 0) {
		dataDraftEmail = {
			subject: campaign.testSubject || '',
			message: campaign.testMessage,
			contactEmail: campaign.contacts[0].email,
		};
	} else {
		dataDraftEmail.subject = campaign.testSubject || '';
		dataDraftEmail.message = campaign.testMessage || '';
	}

	const form = useForm<z.infer<ReturnType<typeof getEmailDraftSchema>>>({
		resolver: zodResolver(getEmailDraftSchema(isAiSubject)),
		defaultValues: {
			subject: campaign.subject ?? '',
			message: campaign.message ?? '',
			aiModel: campaign.aiModel ?? AiModel.sonar,
			font: campaign.font,
		},
		mode: 'onChange',
	});

	const draftEmailChain = async (
		aiModel: AiModel,
		recipient: Contact,
		message: string,
		signal?: AbortSignal
	) => {
		const newDraft = await draftEmailAsync({
			generateSubject: isAiSubject,
			model: aiModel,
			recipient,
			prompt: message,
			signal: signal,
		});

		const cleanedDraftEmail = await cleanDraftEmail({
			model: OPEN_AI_MODEL_OPTIONS.o4mini,
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

	useEffect(() => {
		if (campaign) {
			form.reset({
				subject: campaign.subject ?? '',
				message: campaign.message ?? '',
				aiModel: campaign.aiModel ?? AiModel.sonar,
				font: campaign.font,
			});
		}
	}, [campaign, form]);

	const {
		trigger,
		getValues,
		formState: { isDirty },
	} = form;

	useEffect(() => {
		if (isFirstLoad) {
			setIsFirstLoad(false);
		} else {
			if (isAiSubject) {
				trigger('subject');
			}
		}
	}, [isAiSubject, trigger, setIsFirstLoad, isFirstLoad]);

	const queryClient = useQueryClient();

	const cancelGeneration = () => {
		isGenerationCancelledRef.current = true;
		setGenerationProgress(-1);
		if (abortController) {
			abortController.abort();
			setAbortController(null);
		}
	};

	const handleFormAction = async (action: 'test' | 'submit') => {
		const isValid = await trigger();
		if (!isValid) return;
		const values = getValues();

		if (action === 'test') {
			setIsTest(true);
			if (aiTestCredits === 0) {
				toast.error('You have run out of AI test credits!');
				return;
			}

			let isSuccess = false;
			let attempts = 0;

			while (!isSuccess) {
				try {
					if (attempts > 5) {
						toast.error('Failed to generate test email.');
						break;
					}
					const parsedRes: DraftEmailResponse = await draftEmailChain(
						values.aiModel,
						campaign.contacts[0],
						values.message
					);

					if (parsedRes.message && parsedRes.subject) {
						await saveTestEmail({
							id: campaign.id,
							data: {
								subject: values.subject,
								message: values.message,
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

			if (user && aiTestCredits) {
				editUser({
					clerkId: user.clerkId,
					data: { aiTestCredits: aiTestCredits - 1 },
				});
			}
			setIsTest(false);
		} else {
			let remainingCredits = aiDraftCredits || 0;
			setGenerationProgress(0);
			isGenerationCancelledRef.current = false;

			const controller = new AbortController();
			setAbortController(controller);

			const BATCH_SIZE = 5;
			const BATCH_DELAY = 1000;
			const contacts = campaign.contacts;
			let successfulEmails = 0;

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

					const batch = contacts.slice(i, Math.min(i + BATCH_SIZE, contacts.length));
					const availableCreditsForBatch = Math.min(batch.length, remainingCredits);
					const batchToProcess = batch.slice(0, availableCreditsForBatch);
					const batchPromises = batchToProcess.map(async (recipient) => {
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
									values.aiModel,
									recipient,
									values.message,
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
									return { success: true, contactId: recipient.id, retries: retryCount };
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
								} // Log retry attempts for specific error types (skip if cancelled)
								if (!isGenerationCancelledRef.current) {
									if (
										lastError.message.includes('JSON') ||
										lastError.message.includes('parse') ||
										lastError.message.includes('too short')
									) {
										console.warn(
											`Retry ${retryCount + 1}/${MAX_RETRIES} for contact ${
												recipient.id
											} - ${lastError.message}`
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
								`❌ Contact ${recipient.id} failed after ${MAX_RETRIES} retries. Final error:`,
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

					// Wait for current batch to complete
					const batchResults = await Promise.allSettled(batchPromises);
					for (const result of batchResults) {
						if (result.status === 'fulfilled' && result.value.success) {
							successfulEmails++;
						} else if (result.status === 'rejected') {
							if (result.reason?.message === 'Request cancelled.') {
								throw result.reason;
							}
						}
					}
					remainingCredits -= batchToProcess.length;

					// Small delay between batches to prevent API rate limiting
					if (i + BATCH_SIZE < contacts.length && !isGenerationCancelledRef.current) {
						await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
					}
				} // Final success message

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
		}
	};

	useEffect(() => {
		return () => {
			if (abortController) {
				abortController.abort();
			}
		};
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, []);

	const handleSavePrompt = async (suppressToasts: boolean) => {
		if (suppressToasts) {
			await saveCampaignNoToast({
				data: { ...form.getValues() },
				id: campaign.id,
			});
		} else {
			await savePrompt({ data: { ...form.getValues() }, id: campaign.id });
		}
		queryClient.invalidateQueries({
			queryKey: ['campaign', campaign.id as number],
		});
	};

	return {
		form,
		isAiSubject,
		setIsAiSubject,
		handleFormAction,
		isTest,
		isPendingGeneration,
		dataDraftEmail,
		trigger,
		handleSavePrompt,
		isPendingSavePrompt,
		aiDraftCredits,
		aiTestCredits,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		selectedSignature,
		isDirty,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		campaign,
	};
};

export default useAiCompose;
