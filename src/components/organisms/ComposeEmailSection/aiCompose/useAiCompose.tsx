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
import { useForm, useFormContext, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { CLEAN_EMAIL_PROMPT } from '@/constants/ai';
import { useMistral } from '@/hooks/useMistral';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { draftingFormSchema } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';

type BatchGenerationResult = {
	contactId: number;
	success: boolean;
	error?: string;
	retries: number;
};

export interface AiComposeProps {
	campaign: CampaignWithRelations;
}

const useAiCompose = (props: AiComposeProps) => {
	const { campaign } = props;
	const form = useFormContext();

	const { data: contacts } = useGetContacts({
		filters: {
			contactListIds: campaign.contactLists.map((list) => list.id),
		},
	});
	const { user } = useMe();
	const [generationProgress, setGenerationProgress] = useState(-1);
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [isTest, setIsTest] = useState<boolean>(false);
	const [isAiSubject, setIsAiSubject] = useState<boolean>(
		!campaign.subject || campaign.subject.length === 0
	);
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
		handleSavePrompt,
		isPendingSavePrompt,
		aiDraftCredits,
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		selectedSignature,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		campaign,
		contacts,
	};
};

export default useAiCompose;
