import { HANDWRITTEN_PLACEHOLDER_OPTIONS } from '@/components/molecules/HandwrittenPromptInput/HandwrittenPromptInput';
import {
	DEFAULT_FONT,
	FONT_OPTIONS,
	getMistralParagraphPrompt,
	getMistralTonePrompt,
} from '@/constants';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useCreateEmail } from '@/hooks/queryHooks/useEmails';
import { useGetSignatures } from '@/hooks/queryHooks/useSignatures';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { useMistral } from '@/hooks/useMistral';
import { DraftEmailResponse, usePerplexity } from '@/hooks/usePerplexity';
import {
	getMistralHybridPrompt,
	PERPLEXITY_FULL_AI_PROMPT,
	PERPLEXITY_HYBRID_PROMPT,
} from '@/constants/ai';
import {
	CampaignWithRelations,
	Font,
	MistralParagraphAgentType,
	MistralToneAgentType,
	TestDraftEmail,
} from '@/types';
import { ContactWithName } from '@/types/contact';
import {
	convertAiResponseToRichTextEmail,
	generateEmailTemplateFromBlocks,
	generatePromptsFromBlocks,
	stringifyJsonSubset,
} from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Contact,
	DraftingMode,
	DraftingTone,
	Email,
	EmailStatus,
	HybridBlock,
	Identity,
	Signature,
} from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export interface DraftingSectionProps {
	campaign: CampaignWithRelations;
}

type GeneratedEmail = Pick<
	Email,
	'subject' | 'message' | 'campaignId' | 'status' | 'contactId'
>;

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

export type HybridBlockPrompt = {
	id: string;
	type: HybridBlock;
	value: string;
};

export type HybridBlockPrompts = {
	availableBlocks: HybridBlock[];
	blocks: HybridBlockPrompt[];
};

export const draftingFormSchema = z.object({
	draftingMode: z.nativeEnum(DraftingMode).default(DraftingMode.hybrid),
	isAiSubject: z.boolean().default(true),
	subject: z.string().default(''),
	fullAiPrompt: z.string().default(''),
	hybridPrompt: z.string().default(''),
	hybridAvailableBlocks: z.array(z.nativeEnum(HybridBlock)),
	hybridBlockPrompts: z.array(
		z.object({
			id: z.string(),
			type: z.nativeEnum(HybridBlock),
			value: z.string(),
		})
	),
	handwrittenPrompt: z.string().default(''),
	font: z.enum(FONT_VALUES),
	signatureId: z.number().optional(),
	draftingTone: z.nativeEnum(DraftingTone).default(DraftingTone.normal),
	paragraphs: z.number().min(0).max(5).default(3),
});

export type DraftingFormValues = z.infer<typeof draftingFormSchema>;

export const useDraftingSection = (props: DraftingSectionProps) => {
	const { campaign } = props;
	const [isFirstLoad, setIsFirstLoad] = useState(true);

	// HOOKS

	const { user } = useMe();
	const queryClient = useQueryClient();

	const [isOpenSignaturesDialog, setIsOpenSignaturesDialog] = useState(false);
	const [generationProgress, setGenerationProgress] = useState(-1);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isTest, setIsTest] = useState<boolean>(false);
	const [abortController, setAbortController] = useState<AbortController | null>(null);

	const isGenerationCancelledRef = useRef(false);

	const { data: signatures, isPending: isPendingSignatures } = useGetSignatures();

	const form = useForm<DraftingFormValues>({
		resolver: zodResolver(draftingFormSchema),
		defaultValues: {
			draftingMode: DraftingMode.hybrid,
			isAiSubject: true,
			subject: '',
			fullAiPrompt: '',
			hybridPrompt: '',
			hybridAvailableBlocks: [
				HybridBlock.introduction,
				HybridBlock.research,
				HybridBlock.action,
				HybridBlock.text,
			],
			hybridBlockPrompts: [],
			handwrittenPrompt: '',
			font: (campaign.font as Font) ?? DEFAULT_FONT,
			signatureId: campaign.signatureId ?? signatures?.[0]?.id,
			draftingTone: DraftingTone.normal,
			paragraphs: 0,
		},
		mode: 'onChange',
	});
	const {
		fields: hybridFields,
		append: hybridAppend,
		remove: hybridRemove,
		move: hybridMove,
	} = useFieldArray({
		control: form.control,
		name: 'hybridBlockPrompts',
	});

	const isAiSubject = form.watch('isAiSubject');
	const draftingMode = form.watch('draftingMode');
	const { getValues, formState } = form;

	// API

	const { data: contacts } = useGetContacts({
		filters: {
			contactListIds: campaign.userContactLists.map((list) => list.id),
		},
	});

	const {
		data: dataPerplexity,
		isPending: isPendingCallPerplexity,
		mutateAsync: callPerplexity,
	} = usePerplexity();

	const { mutateAsync: callMistralAgent, isPending: isPendingCallMistralAgent } =
		useMistral({
			suppressToasts: true,
		});

	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });

	const { isPending: isPendingSaveCampaign, mutateAsync: saveCampaign } =
		useEditCampaign();

	const { mutateAsync: saveTestEmail } = useEditCampaign({
		suppressToasts: true,
	});
	const { isPending: isPendingCreateEmail, mutateAsync: createEmail } = useCreateEmail({
		suppressToasts: true,
	});

	// VARIABLES

	const modeOptions: ModeOption[] = [
		{ value: 'hybrid', label: 'Hybrid' },
		{ value: 'ai', label: 'Full AI' },
		{ value: 'handwritten', label: 'Handwritten' },
	];

	const draftCredits = user?.draftCredits;
	const selectedSignature: Signature = signatures?.find(
		(sig: Signature) => sig.id === form.watch('signatureId')
	);

	const isPendingGeneration =
		isPendingCallPerplexity || isPendingCallMistralAgent || isPendingCreateEmail;

	let dataDraftEmail: TestDraftEmail = {
		subject: '',
		message: '',
		contactEmail: contacts ? contacts[0]?.email : '',
	};

	if (!dataPerplexity && campaign.testMessage && campaign.testMessage.length > 0) {
		dataDraftEmail = {
			subject: campaign.testSubject || '',
			message: campaign.testMessage,
			contactEmail: contacts ? contacts[0]?.email : '',
		};
	} else {
		dataDraftEmail.subject = campaign.testSubject || '';
		dataDraftEmail.message = campaign.testMessage || '';
	}

	// FUNCTIONS
	const batchGenerateHandWrittenDrafts = () => {
		const generatedEmails: GeneratedEmail[] = [];

		if (!contacts || contacts.length === 0) {
			toast.error('No contacts available to generate emails.');
			return generatedEmails;
		}

		contacts.forEach((contact: ContactWithName) => {
			generatedEmails.push(generateHandwrittenDraft(contact));
		});

		createEmail(generatedEmails);
	};

	const generateHandwrittenDraft = (contact: ContactWithName): GeneratedEmail => {
		const values = getValues();
		let processedMessage = values.handwrittenPrompt || '';

		HANDWRITTEN_PLACEHOLDER_OPTIONS.forEach(({ value }) => {
			const placeholder = `{{${value}}}`;
			let contactValue = '';
			contactValue = contact[value as keyof Contact]?.toString() || '';

			processedMessage = processedMessage.replace(
				new RegExp(placeholder, 'g'),
				contactValue
			);
		});

		if (selectedSignature?.content) {
			processedMessage += `<p></p>${selectedSignature.content}`;
		}

		return {
			subject: values.subject || '',
			message: processedMessage,
			campaignId: campaign.id,
			status: 'draft' as EmailStatus,
			contactId: contact.id,
		};
	};

	const draftFullAiEmail = async (
		recipient: Contact,
		prompt: string,
		toneAgentType: MistralToneAgentType,
		paragraphs: number,
		signal?: AbortSignal
	): Promise<DraftEmailResponse> => {
		if (!campaign.identity) {
			toast.error('Campaign identity is required');
			throw new Error('Campaign identity is required');
		}

		const perplexityResponse: string = await callPerplexity({
			model: 'sonar',
			rolePrompt: PERPLEXITY_FULL_AI_PROMPT,
			userPrompt: `Recipient: ${stringifyJsonSubset<Contact>(recipient, [
				'firstName',
				'lastName',
				'company',
				'address',
				'city',
				'state',
				'country',
				'website',
				'phone',
			])}\n\n Sender: ${stringifyJsonSubset<Identity>(campaign.identity, [
				'name',
				'website',
			])}\n\n Prompt: ${prompt}`,
			signal: signal,
		});

		const mistralResponse1 = await callMistralAgent({
			prompt: getMistralTonePrompt(toneAgentType),
			content: perplexityResponse,
			agentType: toneAgentType,
			signal: signal,
		});
		const mistralResponse1Parsed: DraftEmailResponse = JSON.parse(mistralResponse1);

		if (!mistralResponse1Parsed.message || !mistralResponse1Parsed.subject) {
			throw new Error('No message or subject generated by Mistral Agent');
		}

		let mistralResponse2 = mistralResponse1;

		if (paragraphs > 0) {
			mistralResponse2 = await callMistralAgent({
				prompt: getMistralParagraphPrompt(paragraphs),
				content: mistralResponse1Parsed.message,
				agentType: `paragraph${paragraphs}` as MistralParagraphAgentType,
				signal: signal,
			});
		} else {
			return mistralResponse1Parsed;
		}

		return {
			subject: mistralResponse1Parsed.subject,
			message: mistralResponse2,
		};
	};

	const draftHybridEmail = async (
		recipient: Contact,
		hybridPrompt: string,
		hybridBlocks: HybridBlockPrompt[],
		signal?: AbortSignal
	): Promise<DraftEmailResponse> => {
		const stringifiedRecipient = stringifyJsonSubset<Contact>(recipient, [
			'firstName',
			'lastName',
			'company',
			'address',
			'city',
			'state',
			'country',
			'website',
			'phone',
		]);

		if (!campaign.identity) {
			toast.error('Campaign identity is required');
			throw new Error('Campaign identity is required');
		}
		const stringifiedSender = stringifyJsonSubset<Identity>(campaign.identity, [
			'name',
			'website',
		]);
		const stringifiedHybridBlocks = generateEmailTemplateFromBlocks(hybridBlocks);

		const perplexityPrompt = `**RECIPIENT**\n${stringifiedRecipient}\n\n**SENDER**\n${stringifiedSender}\n\n**PROMPT**\n${hybridPrompt}\n\n**EMAIL TEMPLATE**\n${stringifiedHybridBlocks}\n\n**PROMPTS**\n${generatePromptsFromBlocks(
			hybridBlocks
		)}`;

		const perplexityResponse: string = await callPerplexity({
			model: 'sonar',
			rolePrompt: PERPLEXITY_HYBRID_PROMPT,
			userPrompt: perplexityPrompt,
			signal: signal,
		});

		const mistralResponse = await callMistralAgent({
			prompt: getMistralHybridPrompt(
				stringifiedHybridBlocks,
				generatePromptsFromBlocks(hybridBlocks)
			),
			content: perplexityResponse,
			agentType: 'hybrid',
			signal: signal,
		});

		const mistralResponseParsed: DraftEmailResponse = JSON.parse(mistralResponse);

		if (!mistralResponseParsed.message || !mistralResponseParsed.subject) {
			throw new Error('No message or subject generated by Mistral Agent');
		}

		return {
			subject: mistralResponseParsed.subject,
			message: mistralResponseParsed.message,
		};
	};

	const cancelGeneration = () => {
		isGenerationCancelledRef.current = true;
		setGenerationProgress(-1);
		if (abortController) {
			abortController.abort();
			setAbortController(null);
		}
	};

	const generateHandWrittenDraftTest = async () => {
		setIsTest(true);
		if (!contacts || contacts.length === 0) {
			toast.error('No contacts available to send test email.');
			return;
		}
		const draft = generateHandwrittenDraft(contacts[0]);
		await saveTestEmail({
			id: campaign.id,
			data: {
				...form.getValues(),
				testSubject: draft.subject,
				testMessage: draft.message,
			},
		});
		setIsTest(false);
	};

	const generateAiDraftTest = async () => {
		const draftCredits = user?.draftCredits;
		const paragraphs = form.getValues('paragraphs');
		const creditCost = paragraphs <= 3 ? 1 : 1.5;

		if (!draftCredits || draftCredits < creditCost) {
			toast.error('You have run out of drafting credits! Please upgrade your plan.');
			return;
		}

		const values = getValues();

		setIsTest(true);

		let isSuccess = false;
		let attempts = 0;

		while (!isSuccess) {
			try {
				if (attempts > 1) {
					toast.error('Failed to generate test email.');
					break;
				}

				if (!contacts || contacts.length === 0) {
					toast.error('No contacts available to send test email.');
					break;
				}

				let parsedRes: DraftEmailResponse;

				if (values.draftingMode === DraftingMode.ai) {
					parsedRes = await draftFullAiEmail(
						contacts[0],
						values.fullAiPrompt,
						values.draftingTone,
						values.paragraphs
					);
				} else if (values.draftingMode === DraftingMode.hybrid) {
					parsedRes = await draftHybridEmail(
						contacts[0],
						values.hybridPrompt,
						values.hybridBlockPrompts
					);
				} else {
					throw new Error('Invalid drafting mode');
				}

				if (parsedRes.message && parsedRes.subject) {
					await saveTestEmail({
						id: campaign.id,
						data: {
							...form.getValues(),
							testSubject: parsedRes.subject,
							testMessage: convertAiResponseToRichTextEmail(
								parsedRes.message,
								values.font,
								signatures?.find((sig: Signature) => sig.id === values.signatureId)
							),
						},
					});
					await editUser({
						clerkId: user.clerkId,
						data: {
							draftCredits: draftCredits - creditCost,
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
			} catch (e) {
				if (e instanceof Error) {
					console.error('Error generating test email:', e.message);
				}

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

					let parsedDraft;

					if (values.draftingMode === DraftingMode.ai) {
						parsedDraft = await draftFullAiEmail(
							recipient,
							values.fullAiPrompt,
							values.draftingTone,
							values.paragraphs,
							controller.signal
						);
					} else if (values.draftingMode === DraftingMode.hybrid) {
						parsedDraft = await draftHybridEmail(
							recipient,
							values.hybridPrompt,
							values.hybridBlockPrompts
						);
					}

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

	const batchGenerateFullAiDrafts = async () => {
		let remainingCredits = draftCredits || 0;
		setGenerationProgress(0);
		isGenerationCancelledRef.current = false;

		const controller = new AbortController();
		setAbortController(controller);

		const BATCH_SIZE = 5;
		let successfulEmails = 0;
		let stoppedDueToCredits = false;

		if (!contacts || contacts.length === 0) {
			toast.error('No contacts available to generate emails.');
			return;
		}

		const paragraphs = form.getValues('paragraphs');
		const creditCost = paragraphs <= 3 ? 1 : 1.5;

		try {
			for (
				let i = 0;
				i < contacts.length && !isGenerationCancelledRef.current;
				i += BATCH_SIZE
			) {
				const maxEmails = Math.floor(remainingCredits / creditCost);
				const adjustedBatchSize = Math.min(BATCH_SIZE, maxEmails);

				if (remainingCredits < creditCost) {
					stoppedDueToCredits = true;
					cancelGeneration();
					break;
				}

				const batch: Contact[] = contacts.slice(
					i,
					Math.min(i + adjustedBatchSize, contacts.length)
				);

				const currentBatchPromises: Promise<BatchGenerationResult>[] =
					generateBatchPromises(batch, controller);

				const batchResults = await Promise.allSettled(currentBatchPromises);

				for (const result of batchResults) {
					if (result.status === 'fulfilled' && result.value.success) {
						remainingCredits -= creditCost;
						successfulEmails++;
					} else if (result.status === 'rejected') {
						if (result.reason?.message === 'Request cancelled.') {
							throw result.reason;
						}
					}
				}

				// Check if we've run out of credits after processing this batch
				if (remainingCredits < creditCost && successfulEmails < contacts.length) {
					stoppedDueToCredits = true;
					toast.error('You have run out of drafting credits! Please upgrade your plan.');
					cancelGeneration();
					break;
				}
			}

			if (user && draftCredits && successfulEmails > 0) {
				const newCreditBalance = Math.max(
					0,
					draftCredits - creditCost * successfulEmails
				);
				editUser({
					clerkId: user.clerkId,
					data: { draftCredits: newCreditBalance },
				});
			}

			if (!isGenerationCancelledRef.current && !stoppedDueToCredits) {
				if (successfulEmails === contacts.length) {
					toast.success('All emails generated successfully!');
				} else if (successfulEmails > 0) {
					toast.success(
						`Email generation completed! ${successfulEmails}/${contacts.length} emails generated successfully.`
					);
				} else {
					toast.error('Email generation failed. Please try again.');
				}
			} else if (stoppedDueToCredits && successfulEmails > 0) {
				// Show partial success message when stopped due to credits
				toast.warning(
					`Generated ${successfulEmails} emails before running out of credits. Please upgrade your plan to continue.`
				);
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

	// HANDLERS

	const handleSavePrompt = () => {
		if (Object.keys(formState.errors).length > 0) {
			return;
		}

		saveCampaign({
			id: campaign.id,
			data: form.getValues(),
		});
	};

	const handleGenerateTestDrafts = async () => {
		if (draftingMode === DraftingMode.ai || draftingMode === DraftingMode.hybrid) {
			generateAiDraftTest();
		} else if (draftingMode === DraftingMode.handwritten) {
			generateHandWrittenDraftTest();
		}
	};

	const handleGenerateDrafts = async () => {
		if (draftingMode === DraftingMode.ai || draftingMode === DraftingMode.hybrid) {
			batchGenerateFullAiDrafts();
		} else if (draftingMode === DraftingMode.handwritten) {
			batchGenerateHandWrittenDrafts();
		}
	};

	// EFFECTS

	useEffect(() => {
		const currentSignature = signatures?.find(
			(signature: Signature) => signature.id === form.getValues('signatureId')
		);
		if (!currentSignature && signatures?.length === 0) {
			form.setValue('signatureId', undefined);
		} else if (!currentSignature && signatures?.length > 0) {
			form.setValue('signatureId', signatures[0].id);
		}
	}, [signatures, form]);

	useEffect(() => {
		if (campaign && form && signatures?.length > 0 && isFirstLoad) {
			form.reset({
				draftingMode: campaign.draftingMode ?? DraftingMode.ai,
				isAiSubject: campaign.isAiSubject ?? true,
				subject: campaign.subject ?? '',
				fullAiPrompt: campaign.fullAiPrompt ?? '',
				hybridPrompt: campaign.hybridPrompt ?? '',
				hybridAvailableBlocks: campaign.hybridAvailableBlocks ?? [
					HybridBlock.introduction,
					HybridBlock.research,
					HybridBlock.action,
					HybridBlock.text,
				],
				hybridBlockPrompts: (campaign.hybridBlockPrompts as HybridBlockPrompt[]) ?? [],
				handwrittenPrompt: campaign.handwrittenPrompt ?? '',
				font: (campaign.font as Font) ?? DEFAULT_FONT,
				signatureId: campaign.signatureId ?? signatures?.[0]?.id,
				draftingTone: campaign.draftingTone ?? DraftingTone.normal,
				paragraphs: campaign.paragraphs ?? 0,
			});
			setIsFirstLoad(false);
		}
	}, [campaign, form, signatures, isFirstLoad, saveCampaign]);

	useEffect(() => {
		return () => {
			if (abortController) {
				abortController.abort();
			}
		};
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
	}, []);

	useEffect(() => {
		if (draftingMode === DraftingMode.handwritten) {
			form.setValue('isAiSubject', false);
		} else {
			form.setValue('isAiSubject', true);
		}
	}, [draftingMode, form]);

	return {
		campaign,
		modeOptions,
		form,
		setIsConfirmDialogOpen,
		cancelGeneration,
		generationProgress,
		setGenerationProgress,
		contacts,
		isConfirmDialogOpen,
		isPendingGeneration,
		isAiSubject,
		isPendingSaveCampaign,
		handleSavePrompt,
		isTest,
		signatures,
		isPendingSignatures,
		isOpenSignaturesDialog,
		setIsOpenSignaturesDialog,
		selectedSignature,
		draftingMode,
		handleGenerateTestDrafts,
		handleGenerateDrafts,
		hybridFields,
		hybridAppend,
		hybridRemove,
		hybridMove,
	};
};
