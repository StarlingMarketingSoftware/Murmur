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
	useRef,
} from 'react';
import { DraftingFormValues } from '../useDraftingSection';
import { UseFormReturn } from 'react-hook-form';
import { debounce } from 'lodash';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { EmailStatus } from '@prisma/client';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { gsap } from 'gsap';

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
	const [isWaitingForConfirm, setIsWaitingForConfirm] = useState(false);
	const [countdown, setCountdown] = useState<number>(5);
	const confirmationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const gradientAnimationRef = useRef<gsap.core.Tween | null>(null);
	const isAnimatingRef = useRef(false);
	const hasConfirmedRef = useRef(false);
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

	const stopAnimation = useCallback(() => {
		if (gradientAnimationRef.current) {
			gradientAnimationRef.current.kill();
			gradientAnimationRef.current = null;
		}
		const containerElement = document.querySelector('[data-drafting-container]');
		if (containerElement) {
			const containerEl = containerElement as HTMLElement;
			containerEl.style.removeProperty('background-image');
			containerEl.style.removeProperty('background-size');
			containerEl.style.removeProperty('background-position');
			containerEl.style.removeProperty('border-color');
			containerEl.style.removeProperty('will-change');

			const allElements = containerElement.querySelectorAll('*');
			allElements.forEach((element) => {
				const el = element as HTMLElement;
				if (el.style.backgroundColor === 'white') {
					el.style.removeProperty('background-color');
				}
			});
		}
		isAnimatingRef.current = false;
	}, []);

	const startAnimation = useCallback(() => {
		if (isAnimatingRef.current) return;

		const containerElement = document.querySelector('[data-drafting-container]');
		if (!containerElement) return;

		const containerEl = containerElement as HTMLElement;
		// Setup ocean wave-like gradient - multiple soft waves
		containerEl.style.setProperty(
			'background-image',
			`linear-gradient(90deg, 
				rgba(93, 171, 104, 0) 0%, 
				rgba(93, 171, 104, 0.08) 10%, 
				rgba(93, 171, 104, 0.15) 20%, 
				rgba(93, 171, 104, 0.08) 30%, 
				rgba(93, 171, 104, 0.12) 40%, 
				rgba(93, 171, 104, 0.20) 50%, 
				rgba(93, 171, 104, 0.12) 60%, 
				rgba(93, 171, 104, 0.08) 70%, 
				rgba(93, 171, 104, 0.15) 80%, 
				rgba(93, 171, 104, 0.08) 90%, 
				rgba(93, 171, 104, 0) 100%)`
		);
		containerEl.style.setProperty('background-size', '300% 100%');
		containerEl.style.setProperty('background-position', '-50% 0%');
		containerEl.style.setProperty('border-color', '#5DAB68');
		containerEl.style.setProperty('will-change', 'background-position');

		// Protect tables
		const draftingTables = containerElement.querySelectorAll('[data-drafting-table]');
		draftingTables.forEach((element) => {
			const el = element as HTMLElement;
			el.style.setProperty('background-color', 'white', 'important');
			const headers = el.querySelectorAll('[data-drafting-table-header]');
			headers.forEach((header) => {
				(header as HTMLElement).style.setProperty(
					'background-color',
					'white',
					'important'
				);
			});
		});

		// Create smooth ocean wave animation
		gradientAnimationRef.current = gsap.to(containerEl, {
			backgroundPosition: '350% 0%',
			duration: 12,
			ease: 'sine.inOut',
			repeat: -1,
		});
		isAnimatingRef.current = true;
	}, []);

	const executeDraftNow = async () => {
		if (hasConfirmedRef.current) return;
		hasConfirmedRef.current = true;
		if (confirmationTimeoutRef.current) {
			clearTimeout(confirmationTimeoutRef.current);
			confirmationTimeoutRef.current = null;
		}
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}
		setIsWaitingForConfirm(false);
		stopAnimation();
		const ids = Array.from(selectedContactIds);
		setGenerationTotal(ids.length);
		await handleGenerateDrafts(ids);
		setSelectedContactIds(new Set());
		hasConfirmedRef.current = false;
	};

	const handleDraftButtonClick = async () => {
		if (!isWaitingForConfirm) {
			// First click - show confirm state and require explicit confirmation
			setIsWaitingForConfirm(true);
			setCountdown(5);
			startAnimation();

			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
			}

			countdownIntervalRef.current = setInterval(() => {
				setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
			}, 1000);

			confirmationTimeoutRef.current = setTimeout(() => {
				setIsWaitingForConfirm(false);
				stopAnimation();
			}, 5000);
		} else {
			// Second click - execute immediately
			await executeDraftNow();
		}
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
		return () => {
			if (confirmationTimeoutRef.current) {
				clearTimeout(confirmationTimeoutRef.current);
			}
			if (countdownIntervalRef.current) {
				clearInterval(countdownIntervalRef.current);
			}
			stopAnimation();
		};
	}, [stopAnimation]);

	useEffect(() => {
		if (!isWaitingForConfirm && isAnimatingRef.current) {
			stopAnimation();
		}
	}, [isWaitingForConfirm, stopAnimation]);

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
		isWaitingForConfirm,
		handleDraftButtonClick,
		scrollToEmailStructure,
		countdown,
	};
};
