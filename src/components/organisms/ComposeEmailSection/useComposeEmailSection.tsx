import { CampaignWithRelations, Draft } from '@/constants/types';
import { useEditCampaign } from '@/hooks/useCampaigns';
import { useCreateEmail } from '@/hooks/useEmails';
import { useMe } from '@/hooks/useMe';
import { AiResponse, usePerplexityDraftEmail } from '@/hooks/usePerplexity';
import { useEditUser } from '@/hooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { AiModel, EmailStatus } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const getEmailDraftSchema = (isAiSubject: boolean) => {
	return z.object({
		subject: isAiSubject
			? z.string().optional()
			: z.string().min(1, { message: 'Subject is required.' }),
		message: z.string().min(1, { message: 'Message is required.' }),
		aiModel: z.nativeEnum(AiModel, {
			required_error: 'AI model is required.',
		}),
	});
};

export interface ComposeEmailSectionProps {
	campaign: CampaignWithRelations;
}

const useComposeEmailSection = (props: ComposeEmailSectionProps) => {
	// const { campaignId } = useParams() as { campaignId: string };
	// const { data: campaign } = useGetCampaign(parseInt(campaignId));
	const { campaign } = props;
	const { user } = useMe();

	const [generationProgress, setGenerationProgress] = useState(-1);
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isTest, setIsTest] = useState<boolean>(false);
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
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
		draftEmail,
		draftEmailAsync,
	} = usePerplexityDraftEmail();

	let dataDraftEmail: Draft = {
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
		dataDraftEmail.subject = rawDataDraftEmail?.subject || '';
		dataDraftEmail.message = rawDataDraftEmail?.message || '';
	}

	const form = useForm<z.infer<ReturnType<typeof getEmailDraftSchema>>>({
		resolver: zodResolver(getEmailDraftSchema(isAiSubject)),
		defaultValues: {
			subject: campaign.subject ?? '',
			message: campaign.message ?? '',
			aiModel: campaign.aiModel ?? AiModel.sonar,
		},
		mode: 'onChange',
		// reValidateMode: 'onChange',
	});

	useEffect(() => {
		if (campaign) {
			form.reset({
				subject: campaign.subject ?? '',
				message: campaign.message ?? '',
				aiModel: campaign.aiModel ?? AiModel.sonar,
			});
		}
	}, [campaign, form]);

	const {
		trigger,
		getValues,
		formState: { errors, isValid, isDirty },
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

	const { mutate: editUser } = useEditUser({ suppressToasts: true });

	const { isPending: isPendingSavePrompt, mutateAsync: savePrompt } = useEditCampaign({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id.toString()] });
			// form.reset(form.getValues());
		},
	});

	const { mutateAsync: saveTestEmail } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id.toString()] });
		},
	});

	const { isPending: isPendingCreateEmail, mutateAsync: createEmail } = useCreateEmail({
		suppressToasts: true,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['drafts'] });
			if (user && aiDraftCredits) {
				editUser({
					clerkId: user.clerkId,
					data: { aiDraftCredits: aiDraftCredits - 1 },
				});
			}
		},
	});

	const cancelGeneration = () => {
		isGenerationCancelledRef.current = true;
		setGenerationProgress(-1);
		if (abortController) {
			abortController.abort();
			setAbortController(null);
		}
	};
	console.log('🚀 ~ handleFormAction ~ isAiSubject:', isAiSubject);

	const handleFormAction = async (action: 'test' | 'submit') => {
		const isValid = await trigger();
		if (!isValid) return;

		const values = getValues();
		console.log('🚀 ~ handleFormAction ~ values:', values);

		if (action === 'test') {
			setIsTest(true);
			if (aiTestCredits === 0) {
				toast.error('You have run out of AI test credits!');
				return;
			}

			try {
				const res: AiResponse = await draftEmailAsync({
					generateSubject: isAiSubject,
					model: values.aiModel,
					recipient: campaign.contacts[0],
					prompt: values.message,
				});
				console.log('siagnture', campaign.signature);
				await saveTestEmail({
					campaignId: campaign.id,
					data: {
						testMessage: `${res.message}<p></p><div>${campaign.signature?.content}</div>`,
						testSubject: isAiSubject ? res.subject : values.subject,
					},
				});
				queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id.toString()] });
				toast.success('Test email generated successfully!');
				if (user && aiTestCredits) {
					editUser({
						clerkId: user.clerkId,
						data: { aiTestCredits: aiTestCredits - 1 },
					});
				}
			} catch {
				toast.error('Failed to generate test email. Please try again.');
			}
			setIsTest(false);
		} else if (isAiDraft) {
			let remainingCredits = aiDraftCredits || 0;
			setGenerationProgress(0);
			isGenerationCancelledRef.current = false;

			const controller = new AbortController();
			setAbortController(controller);

			let i = 0;
			while (i < campaign.contacts.length && !isGenerationCancelledRef.current) {
				const recipient = campaign.contacts[i];
				if (remainingCredits <= 0) {
					toast.error('You have run out of AI draft credits!');
					break;
				}

				try {
					const newDraft = await draftEmailAsync({
						generateSubject: isAiSubject,
						model: values.aiModel,
						recipient,
						prompt: values.message,
						signal: controller.signal,
					});

					if (newDraft) {
						if (!isAiSubject) {
							newDraft.subject = values.subject ? values.subject : newDraft.subject;
						}
						await createEmail({
							subject: newDraft.subject,
							message: `${newDraft.message}<p></p><div>${campaign.signature?.content}</div>`,
							campaignId: campaign.id,
							status: 'draft' as EmailStatus,
							contactId: recipient.id,
						});
						setGenerationProgress((prev) => prev + 1);
						remainingCredits--;
						i++;
					}
				} catch (error) {
					if (error instanceof Error && error.message === 'Request cancelled.') {
						break;
					}
					continue;
				}
			}

			setAbortController(null);
			if (i === campaign.contacts.length) {
				toast.success('Email generation completed!');
			}
		} else {
			// For non-AI drafts, create the email directly with the form values
			// createEmail({
			// 	subject: values.subject,
			// 	message: values.message,
			// 	campaignId: campaign.id,
			// 	status: 'draft' as EmailStatus,
			// });
		}
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (abortController) {
				abortController.abort();
			}
		};
	}, []);

	const handleSavePrompt = async () => {
		await savePrompt({ data: { ...form.getValues() }, campaignId: campaign.id });
		queryClient.invalidateQueries({ queryKey: ['campaign', campaign.id.toString()] });
	};

	return {
		isAiDraft,
		setIsAiDraft,
		isAiSubject,
		setIsAiSubject,
		isTest,
		handleFormAction,
		form,
		dataDraftEmail,
		isPendingDraftEmail,
		draftEmail,
		draftEmailAsync,
		trigger,
		errors,
		isValid,
		savePrompt,
		isPendingSavePrompt,
		handleSavePrompt,
		createEmail,
		isPendingCreateEmail,
		aiDraftCredits,
		aiTestCredits,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		selectedSignature,
		isDirty,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		...props,
	};
};

export default useComposeEmailSection;
