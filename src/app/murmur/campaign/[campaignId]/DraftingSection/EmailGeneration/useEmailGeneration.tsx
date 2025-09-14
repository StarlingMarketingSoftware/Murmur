import { useMe } from '@/hooks/useMe';
import { CampaignWithRelations, EmailWithRelations } from '@/types/campaign';
import { ContactWithName } from '@/types/contact';
import {
	Dispatch,
	SetStateAction,
	useEffect,
	useState,
	useMemo,
	useCallback,
} from 'react';
import { DraftingFormValues } from '../useDraftingSection';
import { toast } from 'sonner';
import { UseFormReturn } from 'react-hook-form';
import { debounce } from 'lodash';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { EmailStatus } from '@prisma/client';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';

export interface EmailGenerationProps {
	campaign: CampaignWithRelations;
	contacts: ContactWithName[];
	isGenerationDisabled: () => boolean;
	isPendingGeneration: boolean;
	isTest: boolean;
	form: UseFormReturn<DraftingFormValues>;
	handleGenerateDrafts: (contactIds?: number[]) => Promise<void>;
	generationProgress: number;
	setGenerationProgress: Dispatch<SetStateAction<number>>;
	cancelGeneration: () => void;
	isFirstLoad: boolean;
	scrollToEmailStructure?: () => void;
}

export const useEmailGeneration = (props: EmailGenerationProps) => {
	const {
		campaign,
		contacts,
		isGenerationDisabled,
		isPendingGeneration,
		isTest,
		form,
		handleGenerateDrafts,
		generationProgress,
		setGenerationProgress,
		cancelGeneration,
		isFirstLoad,
		scrollToEmailStructure,
	} = props;

	/* HOOKS */

	const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
	const [selectedDraft, setSelectedDraft] = useState<EmailWithRelations | null>(null);
	const [isDraftDialogOpen, setIsDraftDialogOpen] = useState(false);
	const [isJustSaved, setIsJustSaved] = useState(false);
	const [autosaveStatus, setAutosaveStatus] = useState<
		'idle' | 'saving' | 'saved' | 'error'
	>('idle');
	const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());
	const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());
	const [sendingProgress, setSendingProgress] = useState(-1);
	const [generationTotal, setGenerationTotal] = useState(0);

	const { user, isFreeTrial } = useMe();
	// User info for send functionality
	const isSendingDisabled = isFreeTrial || user?.sendingCredits === 0;

	/* API */

	const { mutateAsync: saveCampaign } = useEditCampaign({ suppressToasts: true });

	const { data: emails, isPending: isPendingEmails } = useGetEmails({
		filters: {
			campaignId: campaign.id,
		},
	});

	const draftEmails =
		emails?.filter((email: EmailWithRelations) => email.status === EmailStatus.draft) ||
		[];

	/* HANDLERS */

	const executeDraftNow = async () => {
		const ids = Array.from(selectedContactIds);
		setGenerationTotal(ids.length);
		await handleGenerateDrafts(ids);
		setSelectedContactIds(new Set());
	};

	const handleDraftButtonClick = async () => {
		if (selectedContactIds.size === 0) {
			toast.error('Select at least one contact to draft emails.');
			return;
		}
		await executeDraftNow();
	};

	const handleContactSelection = (contactId: number) => {
		setSelectedContactIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(contactId)) {
				newSet.delete(contactId);
			} else {
				newSet.add(contactId);
			}
			return newSet;
		});
	};

	const handleDraftSelection = (draftId: number) => {
		setSelectedDraftIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(draftId)) {
				newSet.delete(draftId);
			} else {
				newSet.add(draftId);
			}
			return newSet;
		});
	};

	const handleAutoSave = useCallback(
		async (values: DraftingFormValues) => {
			try {
				setAutosaveStatus('saving');

				await saveCampaign({
					id: campaign.id,
					data: values,
				});
				setAutosaveStatus('saved');
				setIsJustSaved(true);

				setTimeout(() => {
					setAutosaveStatus('idle');
				}, 2000);
			} catch {
				setAutosaveStatus('error');

				setTimeout(() => {
					setAutosaveStatus('idle');
				}, 3000);
			}
		},
		[campaign.id, saveCampaign]
	);

	const debouncedAutosave = useMemo(
		() =>
			debounce((values: DraftingFormValues) => {
				handleAutoSave(values);
			}, 1500),
		[handleAutoSave]
	);

	/* EFFECTS */

	useEffect(() => {
		if (isFirstLoad) return;

		const subscription = form.watch((value, { name }) => {
			if (name) {
				const formValues = form.getValues();

				setIsJustSaved(false);
				if (Object.keys(form.formState.errors).length === 0) {
					debouncedAutosave(formValues);
				}
			}
		});

		return () => subscription.unsubscribe();
	}, [form, debouncedAutosave, isFirstLoad]);

	useEffect(() => {
		return () => {
			debouncedAutosave.cancel();
		};
	}, [debouncedAutosave]);

	return {
		isConfirmDialogOpen,
		setIsConfirmDialogOpen,
		campaign,
		setSelectedContactIds,
		contacts,
		selectedContactIds,
		handleContactSelection,
		isGenerationDisabled,
		isPendingGeneration,
		isTest,
		selectedDraft,
		setSelectedDraft,
		isDraftDialogOpen,
		setIsDraftDialogOpen,
		sendingProgress,
		setSendingProgress,
		selectedDraftIds,
		setSelectedDraftIds,
		isSendingDisabled,
		isFreeTrial,
		handleDraftSelection,
		handleGenerateDrafts,
		generationProgress,
		setGenerationProgress,
		generationTotal,
		form,
		cancelGeneration,
		autosaveStatus,
		isJustSaved,
		draftEmails,
		isPendingEmails,
		handleDraftButtonClick,
		scrollToEmailStructure,
	};
};
