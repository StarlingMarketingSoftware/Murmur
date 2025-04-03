import { updateCampaignSchema } from '@/app/api/campaigns/[campaignId]/route';
import { CampaignWithRelations, Draft } from '@/constants/types';
import { usePerplexityDraftEmail } from '@/hooks/usePerplexity';
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
	console.log('🚀 ~ useComposeEmailSection ~ campaign:', campaign);

	const [isAiDraft, setIsAiDraft] = useState<boolean>(campaign.subject?.length === 0);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(campaign.subject?.length === 0);
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
		reValidateMode: 'onChange',
	});

	const {
		trigger,
		getValues,
		formState: { errors },
	} = form;

	useEffect(() => {
		trigger();
	}, [isAiDraft, trigger]);

	const queryClient = useQueryClient();

	const { isPending: isPendingSavePrompt, mutate: savePrompt } = useMutation({
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

	const { isPending: isPendingCreateEmail, mutate: createEmail } = useMutation({
		mutationFn: async (emailData: {
			subject: string;
			message: string;
			contactEmail?: string;
			campaignId: number;
			status?: EmailStatus;
			contactId: number;
		}) => {
			// TODO update this function to add contactId
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
			return data;
		},
		onError: (error: Error) => {
			toast.error(`Failed to create email: ${error.message}`);
		},
	});

	const handleFormAction = async (action: 'test' | 'submit') => {
		// Check form validity first
		const isValid = await trigger();
		if (!isValid) return;

		const values = getValues();

		if (action === 'test') {
			setIsTest(true);
			// if error, don't cost the user any tokens
			const res: Draft = await draftEmailAsync({
				generateSubject: isAiSubject,
				model: values.aiModel,
				recipient: campaign.contacts[0],
				prompt: values.message,
			});
			savePrompt({ testMessage: res.message, testSubject: res.subject });
		} else if (isAiDraft) {
			for (const recipient of campaign.contacts) {
				let newDraft: Draft | null;
				try {
					newDraft = await draftEmailAsync({
						generateSubject: isAiSubject,
						model: values.aiModel,
						recipient,
						prompt: values.message,
					});
				} catch {
					continue;
				}
				if (newDraft) {
					if (!isAiSubject) {
						newDraft.subject = values.subject ? values.subject : newDraft.subject;
					}
					// Create email in database
					createEmail({
						subject: newDraft.subject,
						message: newDraft.message,
						campaignId: campaign.id,
						status: 'draft' as EmailStatus,
						contactId: recipient.id,
					});
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
		savePrompt,
		isPendingSavePrompt,
		handleSavePrompt,
		createEmail,
		isPendingCreateEmail,
	};
};

export default useComposeEmailSection;
