import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { CampaignWithRelations } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailStatus } from '@prisma/client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface DraftingSectionProps {
	campaign: CampaignWithRelations;
}

type DraftingMode = 'ai' | 'hybrid' | 'handwritten';
type ModeOption = {
	value: DraftingMode;
	label: string;
};

const getEmailDraftSchema = (isAiSubject: boolean) => {
	return z.object({
		mode: z.enum(['ai', 'hybrid', 'handwritten']).default('ai'),
		subject: isAiSubject
			? z.string().optional()
			: z.string().min(1, { message: 'Subject is required.' }),
		promptFullAi: z.string().min(1, { message: 'Message is required.' }),
		promptHybrid: z.string().min(1, { message: 'Message is required.' }),
		promptHandwritten: z.string().min(1, { message: 'Message is required.' }),
		font: z.string().min(1, { message: 'Font is required.' }),
		signature: z.number().min(1),
		tone: z
			.enum(['normal', 'explanatory', 'formal', 'concise', 'casual'])
			.default('normal'),
		paragraphs: z.number().min(0).max(5).default(3),
	});
};

export const useDraftingSection = (props: DraftingSectionProps) => {
	const { campaign } = props;
	const campaignId = campaign.id;

	const form = useForm<z.infer<ReturnType<typeof getEmailDraftSchema>>>({
		resolver: zodResolver(getEmailDraftSchema(isAiSubject)),
		defaultValues: {
			subject: campaign.subject ?? '',
			message: campaign.message ?? '',
			font: campaign.font,
		},
		mode: 'onChange',
	});

	const {
		trigger,
		getValues,
		formState: { isDirty },
	} = form;

	useEffect(() => {
		if (campaign) {
			form.reset({
				subject: campaign.subject ?? '',
				message: campaign.message ?? '',
				font: campaign.font,
			});
		}
	}, [campaign, form]);

	useEffect(() => {
		if (isFirstLoad) {
			setIsFirstLoad(false);
		} else {
			if (isAiSubject) {
				trigger('subject');
			}
		}
	}, [isAiSubject, trigger, setIsFirstLoad, isFirstLoad]);

	const { data, isPending } = useGetEmails({
		filters: {
			campaignId,
		},
	});

	const draftEmails = data?.filter((email) => email.status === EmailStatus.draft) || [];

	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [draftingMode, setDraftingMode] = useState<DraftingMode>('ai');

	const modeOptions: ModeOption[] = [
		{ value: 'ai', label: 'Full AI' },
		{ value: 'hybrid', label: 'Hybrid' },
		{ value: 'handwritten', label: 'Handwritten' },
	];

	const handleFormAction = async (action: 'test' | 'submit') => {
		const isValid = await trigger();
		if (!isValid) return;

		if (action === 'test') {
			generateTestDraft();
		} else {
			batchGenerateEmails();
		}
	};

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
		draftEmails,
		isPending,
		campaign,
		isAiDraft,
		setIsAiDraft,
		draftingMode,
		setDraftingMode,
		modeOptions,
	};
};
