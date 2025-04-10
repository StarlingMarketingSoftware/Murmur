import { updateCampaignSchema } from '@/app/api/campaigns/[campaignId]/route';
import { CampaignWithRelations, Draft } from '@/constants/types';
import { useMe } from '@/hooks/useMe';
import { usePerplexityDraftEmail } from '@/hooks/usePerplexity';
import { useEditUser } from '@/hooks/useUsers';
import { zodResolver } from '@hookform/resolvers/zod';
import { AiModel, EmailStatus } from '@prisma/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
	const { campaign } = props;
	const { user } = useMe();
	const aiDraftCredits = user?.aiDraftCredits;
	const aiTestCredits = user?.aiTestCredits;
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(
		!campaign.subject || campaign.subject?.length === 0
	);
	const [isTest, setIsTest] = useState<boolean>(false);

	const {
		dataDraftEmail: rawDataDraftEmail,
		isPendingDraftEmail,
		draftEmail,
		draftEmailAsync,
	} = usePerplexityDraftEmail();

	let dataDraftEmail: Draft | undefined;

	if (!rawDataDraftEmail && campaign.testMessage && campaign.testMessage.length > 0) {
		dataDraftEmail = {
			subject: campaign.testSubject || '',
			message: campaign.testMessage,
			contactEmail: campaign.contacts[0].email,
		};
	} else {
		dataDraftEmail = rawDataDraftEmail;
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

	const {
		trigger,
		getValues,
		formState: { errors, isValid },
	} = form;

	// useEffect(() => {
	// 	if (isFirstLoad) {
	// 		setIsFirstLoad(false);
	// 	} else {
	// 		trigger('subject');
	// 	}
	// }, [isAiSubject, trigger, setIsFirstLoad, isFirstLoad]);

	const queryClient = useQueryClient();

	const { mutate: editUser } = useEditUser({ suppressToasts: true });

	const { isPending: isPendingSavePrompt, mutateAsync: savePrompt } = useMutation({
		mutationFn: async (updateData: z.infer<typeof updateCampaignSchema>) => {
			const response = await fetch(`/api/campaigns/${campaign.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success(
				isAiDraft
					? 'Prompt section saved successfully!'
					: 'Message section saved successfully!'
			);
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
		},
		onError: () => {
			toast.error('Failed to save prompt. Please try again.');
		},
	});

	const { isPending: isPendingCreateEmail, mutateAsync: createEmail } = useMutation({
		mutationFn: async (emailData: {
			subject: string;
			message: string;
			contactEmail?: string;
			campaignId: number;
			status?: EmailStatus;
			contactId: number;
		}) => {
			const response = await fetch('/api/emails', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(emailData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create email');
			}

			queryClient.invalidateQueries({ queryKey: ['drafts'] });

			return response.json();
		},
		onSuccess: (data) => {
			toast.success('Email created successfully!');
			queryClient.invalidateQueries({ queryKey: ['campaign'] });
			if (user && aiDraftCredits) {
				editUser({
					clerkId: user?.clerkId,
					data: { aiDraftCredits: aiDraftCredits - 1 },
				}); // update the aiDraftCredits
			}
			// update the aiDraftCredits
			return data;
		},
		onError: (error: Error) => {
			toast.error(`Failed to create email: ${error.message}`);
		},
	});

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

			try {
				const res: Draft = await draftEmailAsync({
					generateSubject: isAiSubject,
					model: values.aiModel,
					recipient: campaign.contacts[0],
					prompt: values.message,
				});
				await savePrompt({
					testMessage: res.message,
					testSubject: isAiSubject ? res.subject : values.subject,
				});
				toast.success('Test email generated successfully!');
				if (user && aiTestCredits) {
					editUser({
						clerkId: user?.clerkId,
						data: { aiTestCredits: aiTestCredits - 1 },
					});
				}
			} catch {
				toast.error('Failed to generate test email. Please try again.');
			}
		} else if (isAiDraft) {
			let remainingCredits = aiDraftCredits || 0;

			for (const recipient of campaign.contacts) {
				if (remainingCredits <= 0) {
					toast.error('You have run out of AI draft credits!');
					break;
				}

				let newDraft: Draft | null;
				try {
					newDraft = await draftEmailAsync({
						generateSubject: isAiSubject,
						model: values.aiModel,
						recipient,
						prompt: values.message,
					});

					if (newDraft) {
						if (!isAiSubject) {
							newDraft.subject = values.subject ? values.subject : newDraft.subject;
						}
						await createEmail({
							subject: newDraft.subject,
							message: newDraft.message,
							campaignId: campaign.id,
							status: 'draft' as EmailStatus,
							contactId: recipient.id,
						});

						remainingCredits--;
					}
				} catch {
					continue;
				}
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

	const handleSavePrompt = () => {
		savePrompt(form.getValues());
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
		campaign,
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
	};
};

export default useComposeEmailSection;
