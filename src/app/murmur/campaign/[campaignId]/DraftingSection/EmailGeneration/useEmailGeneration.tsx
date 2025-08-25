import { useDeleteEmail, useGetEmails } from '@/hooks/queryHooks/useEmails';
import { useMe } from '@/hooks/useMe';
import { CampaignWithRelations, EmailWithRelations } from '@/types/campaign';
import { ContactWithName } from '@/types/contact';
import { EmailStatus } from '@prisma/client';
import {
	Dispatch,
	SetStateAction,
	useRef,
	useEffect,
	useState,
	useMemo,
	useCallback,
} from 'react';
import { DraftingFormValues } from '../useDraftingSection';
import { UseFormReturn } from 'react-hook-form';
import { debounce } from 'lodash';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';

export interface ScrollableTextProps {
	text: string;
	className?: string;
	style?: React.CSSProperties;
}

export const useScrollableText = (props: ScrollableTextProps) => {
	const { text, className, style } = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const checkOverflow = () => {
			if (containerRef.current && textRef.current) {
				// Check if the text width exceeds the container width
				const containerWidth = containerRef.current.offsetWidth;
				const textWidth = textRef.current.scrollWidth;
				setIsOverflowing(textWidth > containerWidth);
			}
		};

		checkOverflow();
		// Recheck on window resize
		window.addEventListener('resize', checkOverflow);

		// Also check when text changes
		const observer = new ResizeObserver(checkOverflow);
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => {
			window.removeEventListener('resize', checkOverflow);
			observer.disconnect();
		};
	}, [text]);

	return {
		containerRef,
		textRef,
		isOverflowing,
		style,
		className,
		text,
	};
};

export interface EmailGenerationProps {
	campaign: CampaignWithRelations;
	contacts: ContactWithName[];
	isGenerationDisabled: () => boolean;
	isPendingGeneration: boolean;
	isTest: boolean;
	form: UseFormReturn<DraftingFormValues>;
	handleGenerateDrafts: () => Promise<void>;
	generationProgress: number;
	setGenerationProgress: Dispatch<SetStateAction<number>>;
	cancelGeneration: () => void;
	isFirstLoad: boolean;
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

	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	/* HANDLERS */

	const handleDraftClick = (draft: EmailWithRelations) => {
		setSelectedDraft(draft);
		setIsDraftDialogOpen(true);
	};

	const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
		e.stopPropagation();
		e.preventDefault();
		await deleteEmail(draftId);
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
		if (sendingProgress === selectedDraftIds.size && selectedDraftIds.size > 0) {
			setSelectedDraftIds(new Set());
		}
	}, [sendingProgress, selectedDraftIds.size]);

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
		emails,
		isPendingEmails,
		draftEmails,
		isSendingDisabled,
		isPendingDeleteEmail,
		handleDraftClick,
		handleDeleteDraft,
		isFreeTrial,
		handleDraftSelection,
		handleGenerateDrafts,
		generationProgress,
		setGenerationProgress,
		form,
		cancelGeneration,
		autosaveStatus,
		isJustSaved,
	};
};
