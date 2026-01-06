import { DEFAULT_FONT, FONT_OPTIONS } from '@/constants';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useCreateEmail } from '@/hooks/queryHooks/useEmails';
import { useGetSignatures } from '@/hooks/queryHooks/useSignatures';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { DraftEmailResponse } from '@/hooks/usePerplexity';
import { useGemini } from '@/hooks/useGemini';
import { useOpenRouter } from '@/hooks/useOpenRouter';
import {
	getRandomDraftingSystemPrompt,
	GEMINI_HYBRID_PROMPT,
	GEMINI_MODEL_OPTIONS,
	OPENROUTER_DRAFTING_MODELS,
	insertWebsiteLinkPhrase,
} from '@/constants/ai';
import {
	CampaignWithRelations,
	Font,
	MistralToneAgentType,
	TestDraftEmail,
} from '@/types';

import {
	convertAiResponseToRichTextEmail,
	generateEmailTemplateFromBlocks,
	generatePromptsFromBlocks,
	stringifyJsonSubset,
	removeEmDashes,
	stripEmailSignatureFromAiMessage,
} from '@/utils';
import { injectMurmurDraftSettingsSnapshot } from '@/utils/draftSettings';
import { zodResolver } from '@hookform/resolvers/zod';
import { Contact, HybridBlock, Identity, Signature } from '@prisma/client';
import { DraftingMode, DraftingTone, EmailStatus } from '@/constants/prismaEnums';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { HANDWRITTEN_PLACEHOLDER_OPTIONS } from '@/components/molecules/HandwrittenPromptInput/HandwrittenPromptInput';
import { ContactWithName } from '@/types/contact';

export type DraftingSectionView =
	| 'search'
	| 'contacts'
	| 'testing'
	| 'drafting'
	| 'sent'
	| 'inbox'
	| 'all';

export interface DraftingSectionProps {
	campaign: CampaignWithRelations;
	view?: DraftingSectionView;
	/**
	 * Called after the DraftingSection's current view has rendered on the client.
	 * Used by the campaign page to time crossfade transitions so heavy views (e.g. Writing)
	 * don't reveal a blank frame at the end of the animation.
	 */
	onViewReady?: (view: DraftingSectionView) => void;
	/**
	 * When true, renders viewport-fixed overlays (like the top drafting progress bar).
	 * This should only be enabled on the "active" DraftingSection instance during tab crossfades.
	 */
	renderGlobalOverlays?: boolean;
	goToDrafting?: () => void;
	goToAll?: () => void;
	/**
	 * Optional callback to switch the campaign page into the Writing tab.
	 */
	goToWriting?: () => void;
	/**
	 * Optional callback to switch the campaign page into the Search tab.
	 */
	onGoToSearch?: () => void;
	/**
	 * Optional callback to switch the campaign page into the Contacts tab.
	 */
	goToContacts?: () => void;
	/**
	 * Optional callback to switch the campaign page into the Inbox tab.
	 */
	goToInbox?: () => void;
	/**
	 * Optional callback to switch the campaign page into the Sent tab.
	 */
	goToSent?: () => void;
	/**
	 * Optional callback to navigate to the previous tab.
	 */
	goToPreviousTab?: () => void;
	/**
	 * Optional callback to navigate to the next tab.
	 */
	goToNextTab?: () => void;
	/**
	 * When true, the internal CampaignHeaderBox is hidden (used when the header is rendered at the page level).
	 */
	hideHeaderBox?: boolean;
	/**
	 * When true, this DraftingSection is fading out as part of a tab transition.
	 * Used to hide elements that should remain stable (like research panel) in the exiting view.
	 */
	isTransitioningOut?: boolean;
	/**
	 * When true, this DraftingSection is fading in as part of a tab transition
	 * where the research panel should appear stable (not fade).
	 */
	isTransitioningIn?: boolean;
}

type GeneratedEmail = {
	subject: string;
	message: string;
	contactId: number;
	status: EmailStatus;
	campaignId: number;
};

type BatchGenerationResult = {
	contactId: number;
	success: boolean;
	error?: string;
	retries: number;
};

const FONT_VALUES: [Font, ...Font[]] = FONT_OPTIONS as [Font, ...Font[]];

export type HybridBlockPrompt = {
	id: string;
	type: HybridBlock;
	value: string;
	isCollapsed?: boolean;
};

type IdentityProfileFields = Identity & {
	genre?: string | null;
	area?: string | null;
	bandName?: string | null;
	bio?: string | null;
};

export type HybridBlockPrompts = {
	availableBlocks: HybridBlock[];
	blocks: HybridBlockPrompt[];
};

const normalizeGeminiResponse = (text: string) =>
	text
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/[‐‑‒–—―]/g, '-');

const decodeGeminiValue = (value: string) =>
	value
		.replace(/\\n/g, '\n')
		.replace(/\\r/g, '')
		.replace(/\\t/g, '\t')
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, '\\')
		.trim();

const extractGeminiField = (
	response: string,
	field: 'subject' | 'message'
): string | null => {
	const normalized = normalizeGeminiResponse(response);
	const flags = field === 'message' ? 'is' : 'i';
	const quotedRegex = new RegExp(
		`${field}["']?\\s*:\\s*(["'])([\\s\\S]*?)\\1`,
		flags
	);
	const quotedMatch = normalized.match(quotedRegex);
	if (quotedMatch?.[2]) {
		return decodeGeminiValue(quotedMatch[2]);
	}

	const unquotedRegex = new RegExp(
		`${field}["']?\\s*:\\s*([^,\\n\\r{}]+)`,
		'i'
	);
	const unquotedMatch = normalized.match(unquotedRegex);
	if (unquotedMatch?.[1]) {
		return decodeGeminiValue(unquotedMatch[1]);
	}

	return null;
};

export const draftingFormSchema = z.object({
	isAiSubject: z.boolean().default(true),
	subject: z.string().default(''),
	fullAiPrompt: z.string().default(''),
	bookingFor: z.string().default('Anytime'),
	hybridPrompt: z.string().default(''),
	hybridAvailableBlocks: z.array(z.nativeEnum(HybridBlock)),
	hybridBlockPrompts: z.array(
		z.object({
			id: z.string(),
			type: z.nativeEnum(HybridBlock),
			value: z.string(),
			isCollapsed: z.boolean().optional(),
		})
	),
	// Preserve user-written content when switching modes
	savedHybridBlocks: z
		.array(
			z.object({
				id: z.string(),
				type: z.nativeEnum(HybridBlock),
				value: z.string(),
			})
		)
		.default([]),
	savedManualBlocks: z
		.array(
			z.object({
				id: z.string(),
				type: z.nativeEnum(HybridBlock),
				value: z.string(),
			})
		)
		.default([]),
	handwrittenPrompt: z.string().default(''),
	font: z.enum(FONT_VALUES),
	fontSize: z.number().optional(),
	signatureId: z.number().optional(),
	signature: z.string().optional(),
	draftingTone: z.nativeEnum(DraftingTone).default(DraftingTone.normal),
	paragraphs: z.number().min(0).max(5).default(3),
	powerMode: z.enum(['normal', 'high']).default('normal'),
});

export type DraftingFormValues = z.infer<typeof draftingFormSchema>;

export const useDraftingSection = (props: DraftingSectionProps) => {
	const { campaign } = props;

	/* HOOKS */

	const { user } = useMe();
	const queryClient = useQueryClient();

	const [isOpenUpgradeSubscriptionDrawer, setIsOpenUpgradeSubscriptionDrawer] =
		useState(false);
	const [generationProgress, setGenerationProgress] = useState(-1);
	const [isTest, setIsTest] = useState<boolean>(false);
	const [isBatchGenerating, setIsBatchGenerating] = useState(false);
	const [promptQualityScore, setPromptQualityScore] = useState<number | null>(null);
	const [promptQualityLabel, setPromptQualityLabel] = useState<string | null>(null);
	const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [activeTab, setActiveTab] = useState<'test' | 'placeholders'>('test');
	const [isUpscalingPrompt, setIsUpscalingPrompt] = useState(false);
	const [previousPromptValue, setPreviousPromptValue] = useState<string | null>(null);

	const draftingRef = useRef<HTMLDivElement>(null);
	const emailStructureRef = useRef<HTMLDivElement>(null);

	const isBatchGeneratingRef = useRef(false);
	const abortControllerRef = useRef<AbortController | null>(null);
	const isGenerationCancelledRef = useRef(false);
	const lastFocusedFieldRef = useRef<{
		name: string;
		element: HTMLTextAreaElement | HTMLInputElement | null;
	}>({ name: '', element: null });

	// Live preview state for visual drafting
	const [isLivePreviewVisible, setIsLivePreviewVisible] = useState(false);
	const [livePreviewContactId, setLivePreviewContactId] = useState<number | null>(null);
	const [livePreviewMessage, setLivePreviewMessage] = useState('');
	const [livePreviewSubject, setLivePreviewSubject] = useState('');
	// Live preview progress (drives the top-of-page progress bar; stays in sync with Draft Preview playback)
	const [livePreviewDraftNumber, setLivePreviewDraftNumber] = useState(0);
	const [livePreviewTotal, setLivePreviewTotal] = useState(0);
	const livePreviewTimerRef = useRef<number | null>(null);
	const livePreviewDelayTimerRef = useRef<number | null>(null);
	// Store full text and an index to preserve original whitespace and paragraph breaks
	const livePreviewFullTextRef = useRef<string>('');
	const livePreviewIndexRef = useRef<number>(0);
	const livePreviewQueueRef = useRef<
		Array<{
			draftIndex: number;
			contactId: number;
			subject: string;
			message: string;
		}>
	>([]);
	const livePreviewIsTypingRef = useRef<boolean>(false);
	const livePreviewAutoHideWhenIdleRef = useRef<boolean>(false);

	// Typing animation tuning: fixed speed (chars/sec) regardless of backend timing.
	const LIVE_PREVIEW_TICK_MS = 20;
	const LIVE_PREVIEW_CHARS_PER_SECOND = 150;
	const LIVE_PREVIEW_STEP_CHARS = Math.max(
		1,
		Math.round((LIVE_PREVIEW_CHARS_PER_SECOND * LIVE_PREVIEW_TICK_MS) / 1000)
	);
	const LIVE_PREVIEW_POST_DRAFT_DELAY_MS = 250;

	const stopLivePreviewTimers = useCallback(() => {
		if (livePreviewTimerRef.current) {
			clearInterval(livePreviewTimerRef.current);
			livePreviewTimerRef.current = null;
		}
		if (livePreviewDelayTimerRef.current) {
			clearTimeout(livePreviewDelayTimerRef.current);
			livePreviewDelayTimerRef.current = null;
		}
		livePreviewIsTypingRef.current = false;
	}, []);

	const hideLivePreview = useCallback(() => {
		stopLivePreviewTimers();
		setIsLivePreviewVisible(false);
		setLivePreviewContactId(null);
		setLivePreviewMessage('');
		setLivePreviewSubject('');
		setLivePreviewDraftNumber(0);
		setLivePreviewTotal(0);
		livePreviewFullTextRef.current = '';
		livePreviewIndexRef.current = 0;
		livePreviewQueueRef.current = [];
		livePreviewAutoHideWhenIdleRef.current = false;
	}, [stopLivePreviewTimers]);

	const startNextQueuedLivePreview = useCallback(() => {
		// Don't interrupt an active typing animation.
		if (livePreviewIsTypingRef.current) return;

		// If a "post-draft" delay timer is running, let it finish before starting the next.
		if (livePreviewDelayTimerRef.current) return;

		if (!livePreviewQueueRef.current.length) {
			// If backend drafting has completed, and there is nothing left to type, hide the panel.
			if (livePreviewAutoHideWhenIdleRef.current) {
				// Give React one paint to show the fully-typed message before swapping panels away.
				livePreviewDelayTimerRef.current = window.setTimeout(() => {
					livePreviewDelayTimerRef.current = null;
					hideLivePreview();
				}, LIVE_PREVIEW_POST_DRAFT_DELAY_MS);
			}
			return;
		}

		// Ensure a stable order when the backend finishes drafts out-of-order.
		livePreviewQueueRef.current.sort((a, b) => a.draftIndex - b.draftIndex);
		const next = livePreviewQueueRef.current.shift();
		if (!next) return;

		// Clear any previous typing interval.
		if (livePreviewTimerRef.current) {
			clearInterval(livePreviewTimerRef.current);
			livePreviewTimerRef.current = null;
		}

		setLivePreviewDraftNumber((prev) => prev + 1);
		setIsLivePreviewVisible(true);
		setLivePreviewContactId(next.contactId);
		setLivePreviewSubject(next.subject);
		setLivePreviewMessage('');
		livePreviewFullTextRef.current = next.message || '';
		livePreviewIndexRef.current = 0;
		livePreviewIsTypingRef.current = true;

		livePreviewTimerRef.current = window.setInterval(() => {
			const full = livePreviewFullTextRef.current;
			const i = livePreviewIndexRef.current;
			if (i >= full.length) {
				// Finished typing this draft.
				stopLivePreviewTimers();
				// Ensure we render the full message before moving on / hiding.
				setLivePreviewMessage(full);
				livePreviewDelayTimerRef.current = window.setTimeout(() => {
					livePreviewDelayTimerRef.current = null;
					startNextQueuedLivePreview();
				}, LIVE_PREVIEW_POST_DRAFT_DELAY_MS);
				return;
			}

			const nextIndex = Math.min(i + LIVE_PREVIEW_STEP_CHARS, full.length);
			livePreviewIndexRef.current = nextIndex;
			setLivePreviewMessage(full.slice(0, nextIndex));
		}, LIVE_PREVIEW_TICK_MS);
	}, [
		LIVE_PREVIEW_POST_DRAFT_DELAY_MS,
		LIVE_PREVIEW_STEP_CHARS,
		LIVE_PREVIEW_TICK_MS,
		hideLivePreview,
		stopLivePreviewTimers,
	]);

	const beginLivePreviewBatch = useCallback((total?: number) => {
		// Reset any previous playback and show the preview surface immediately.
		stopLivePreviewTimers();
		livePreviewQueueRef.current = [];
		livePreviewAutoHideWhenIdleRef.current = false;
		setIsLivePreviewVisible(true);
		setLivePreviewContactId(null);
		setLivePreviewSubject('');
		setLivePreviewMessage('Drafting...');
		setLivePreviewDraftNumber(0);
		setLivePreviewTotal(typeof total === 'number' && total > 0 ? total : 0);
		livePreviewFullTextRef.current = '';
		livePreviewIndexRef.current = 0;
	}, [stopLivePreviewTimers]);

	const enqueueLivePreviewDraft = useCallback(
		(draftIndex: number, contactId: number, message: string, subject: string) => {
			// Keep the backend ahead: enqueue completed drafts and let the UI play them at a fixed speed.
			livePreviewQueueRef.current.push({
				draftIndex,
				contactId,
				subject,
				message,
			});
			// Ensure the panel stays visible even if user navigated across tabs mid-generation.
			setIsLivePreviewVisible(true);
			startNextQueuedLivePreview();
		},
		[startNextQueuedLivePreview]
	);

	const endLivePreviewBatch = useCallback(() => {
		// After backend drafting completes, keep the preview panel visible until all queued
		// drafts finish typing, then hide automatically.
		livePreviewAutoHideWhenIdleRef.current = true;
		startNextQueuedLivePreview();
	}, [startNextQueuedLivePreview]);

	const { data: signatures } = useGetSignatures();

	const form = useForm<DraftingFormValues>({
		resolver: zodResolver(draftingFormSchema),
		defaultValues: {
			isAiSubject: true,
			subject: '',
			fullAiPrompt: '',
			bookingFor: 'Anytime',
			hybridPrompt: 'Generate a professional email based on the template below.',
			hybridAvailableBlocks: [
				HybridBlock.full_automated,
				HybridBlock.introduction,
				HybridBlock.research,
				HybridBlock.action,
				HybridBlock.text,
			],
			hybridBlockPrompts: [
				{ id: 'full_automated', type: HybridBlock.full_automated, value: '' },
			],
			savedHybridBlocks: [],
			savedManualBlocks: [],
			handwrittenPrompt: '',
			font: (campaign.font as Font) ?? DEFAULT_FONT,
			fontSize: 12,
			signatureId: campaign.signatureId ?? signatures?.[0]?.id,
			signature: `Thank you,\n${campaign.identity?.name || ''}`,
			draftingTone: DraftingTone.normal,
			paragraphs: 0,
		},
		mode: 'onChange',
	});

	const isAiSubject = form.watch('isAiSubject');
	const { getValues } = form;

	// API

	const { data: contacts } = useGetContacts({
		filters: {
			contactListIds: campaign.userContactLists.map((list) => list.id),
		},
	});

	const {
		data: dataGemini,
		isPending: isPendingCallGemini,
		mutateAsync: callGemini,
	} = useGemini({
		suppressToasts: true,
	});

	// Separate Gemini mutation for prompt scoring / suggestions so it doesn't disable
	// "Generate Test" while the user is evaluating their prompt.
	const { mutateAsync: callGeminiForScoring } = useGemini({
		suppressToasts: true,
	});

	// OpenRouter for Full AI mode drafting
	const {
		isPending: isPendingCallOpenRouter,
		mutateAsync: callOpenRouter,
	} = useOpenRouter({
		suppressToasts: true,
	});

	const { mutateAsync: editUser } = useEditUser({ suppressToasts: true });

	const { mutateAsync: saveCampaign } = useEditCampaign({ suppressToasts: true });

	const { mutateAsync: saveTestEmail } = useEditCampaign({
		suppressToasts: true,
	});
	const { isPending: isPendingCreateEmail, mutateAsync: createEmail } = useCreateEmail({
		suppressToasts: true,
	});

	// VARIABLES

	const draftCredits = user?.draftCredits;
	const signatureText =
		form.watch('signature') || `Thank you,\n${campaign.identity?.name || ''}`;
	// Full Auto: allow drafts even when user hasn't entered any custom prompt.
	// We still pass a sensible default "User Goal" to the model so it produces useful output.
	const DEFAULT_FULL_AI_PROMPT =
		'Compose a professional booking pitch email to this venue. Introduce me/my band using the provided sender profile, reference the venue naturally, and ask about availability for a show. Keep the tone warm, clear, and brief.';

	const getDraftingModeBasedOnBlocks = useCallback(() => {
		const blocks = form.getValues('hybridBlockPrompts');

		const hasFullAutomatedBlock = blocks?.some(
			(block) => block.type === 'full_automated'
		);

		if (hasFullAutomatedBlock) {
			return DraftingMode.ai;
		}

		const isOnlyTextBlocks = blocks?.every((block) => block.type === 'text');

		if (isOnlyTextBlocks) {
			return DraftingMode.handwritten;
		}

		return DraftingMode.hybrid;
	}, [form]);

	const draftingMode = getDraftingModeBasedOnBlocks();

	const isPendingGeneration =
		isBatchGenerating ||
		generationProgress > -1 ||
		isPendingCallGemini ||
		isPendingCallOpenRouter ||
		isPendingCreateEmail;

	let dataDraftEmail: TestDraftEmail = {
		subject: '',
		message: '',
		contactEmail: contacts ? contacts[0]?.email : '',
	};

	if (!dataGemini && campaign.testMessage && campaign.testMessage.length > 0) {
		dataDraftEmail = {
			subject: campaign.testSubject || '',
			message: campaign.testMessage,
			contactEmail: contacts ? contacts[0]?.email : '',
		};
	} else {
		dataDraftEmail.subject = campaign.testSubject || '';
		dataDraftEmail.message = campaign.testMessage || '';
	}

	const isGenerationDisabled = useCallback(() => {
		const values = form.getValues();
		const hasFullAutomatedBlock = values.hybridBlockPrompts?.some(
			(block) => block.type === 'full_automated'
		);

		const hasNoBlocks =
			!values.hybridBlockPrompts || values.hybridBlockPrompts.length === 0;

		// Check if we're in handwritten mode (only text blocks)
		const isOnlyTextBlocks = values.hybridBlockPrompts?.every(
			(block) => block.type === HybridBlock.text
		);

		// For handwritten mode, check both text content and subject
		if (isOnlyTextBlocks && values.hybridBlockPrompts?.length > 0) {
			const hasTextContent = values.hybridBlockPrompts.some(
				(block) => block.value && block.value.trim() !== ''
			);
			const hasSubject =
				values.isAiSubject || (values.subject && values.subject.trim() !== '');

			// Disable if either text content or subject is missing
			if (!hasTextContent || !hasSubject) {
				return true;
			}
		}

		// Full Auto prompt is optional: a blank prompt should still allow drafting.
		// If the Full Auto block is present, we consider drafting "configured" as long
		// as we're not currently generating and we have contacts.
		if (hasFullAutomatedBlock) {
			return (
				hasNoBlocks ||
				generationProgress > -1 ||
				contacts?.length === 0 ||
				isPendingGeneration
			);
		}

		const hasAIBlocks = values.hybridBlockPrompts?.some((block) => {
			if (block.type !== HybridBlock.text) {
				return true;
			}
			return block.value && block.value.trim() !== '';
		});

		return (
			hasNoBlocks ||
			!hasAIBlocks ||
			generationProgress > -1 ||
			contacts?.length === 0 ||
			isPendingGeneration
		);
	}, [form, generationProgress, contacts?.length, isPendingGeneration]);

	const isDraftingContentReady = useCallback(() => {
		const values = form.getValues();
		const hasFullAutomatedBlock = values.hybridBlockPrompts?.some(
			(block) => block.type === 'full_automated'
		);

		const hasNoBlocks =
			!values.hybridBlockPrompts || values.hybridBlockPrompts.length === 0;

		// Full Auto prompt is optional: presence of the Full Auto block is enough.
		if (hasFullAutomatedBlock) {
			return !hasNoBlocks;
		}

		// Check if we're in handwritten mode (only text blocks)
		const isOnlyTextBlocks = values.hybridBlockPrompts?.every(
			(block) => block.type === HybridBlock.text
		);

		// For handwritten mode, check both text content and subject
		if (isOnlyTextBlocks && values.hybridBlockPrompts?.length > 0) {
			const hasTextContent = values.hybridBlockPrompts.some(
				(block) => block.value && block.value.trim() !== ''
			);
			const hasSubject =
				values.isAiSubject || (values.subject && values.subject.trim() !== '');

			// In handwritten mode, both text content AND subject must be present
			return hasTextContent && hasSubject;
		}

		const hasAIBlocks = values.hybridBlockPrompts?.some((block) => {
			if (block.type !== HybridBlock.text) {
				return true;
			}
			return block.value && block.value.trim() !== '';
		});

		// Content is ready if we have blocks with content
		return !hasNoBlocks && hasAIBlocks;
	}, [form]);

	// FUNCTIONS

	const scrollToDrafting = () => {
		if (draftingRef.current) {
			const yOffset = -20; // Small offset from top
			const element = draftingRef.current;
			const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
			window.scrollTo({ top: y, behavior: 'smooth' });
		}
	};

	const scrollToEmailStructure = () => {
		if (emailStructureRef.current) {
			const yOffset = -20; // Small offset from top
			const element = emailStructureRef.current;
			const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
			window.scrollTo({ top: y, behavior: 'smooth' });
		}
	};

	const batchGenerateHandWrittenDrafts = async (selectedIds?: number[]) => {
		if (isBatchGeneratingRef.current) {
			console.warn('[Batch] Handwritten generation already in progress; ignoring request.');
			return [];
		}

		isBatchGeneratingRef.current = true;
		setIsBatchGenerating(true);

		const generatedEmails: GeneratedEmail[] = [];

		try {
			if (!contacts || contacts.length === 0) {
				toast.error('No contacts available to generate emails.');
				return generatedEmails;
			}

			const targets =
				selectedIds && selectedIds.length > 0
					? contacts.filter((c: ContactWithName) => selectedIds.includes(c.id))
					: contacts;

			targets.forEach((contact: ContactWithName) => {
				generatedEmails.push(generateHandwrittenDraft(contact));
			});

			await createEmail(generatedEmails);

			// Invalidate emails query to refresh the drafts list
			queryClient.invalidateQueries({
				queryKey: ['emails', { campaignId: campaign.id }],
			});

			toast.success('All handwritten drafts generated successfully!');

			return generatedEmails;
		} finally {
			isBatchGeneratingRef.current = false;
			setIsBatchGenerating(false);
		}
	};

	const generateHandwrittenDraft = (contact: ContactWithName): GeneratedEmail => {
		const values = getValues();
		let combinedTextBlocks = values.hybridBlockPrompts
			?.filter((block) => block.type === 'text')
			.map((block) => block.value)
			.join('\n');

		HANDWRITTEN_PLACEHOLDER_OPTIONS.forEach(({ value }) => {
			const placeholder = `{{${value}}}`;
			let contactValue = '';

			if (placeholder === '{{senderName}}') {
				contactValue = campaign.identity?.name || '';
			} else if (placeholder === '{{senderWebsite}}') {
				contactValue = campaign.identity?.website || '';
			} else {
				contactValue = contact[value as keyof Contact]?.toString() || '';
			}

			combinedTextBlocks = combinedTextBlocks.replace(
				new RegExp(placeholder, 'g'),
				contactValue
			);
		});

		const messageHtml = convertAiResponseToRichTextEmail(
			combinedTextBlocks,
			values.font,
			signatureText || null
		);

		const messageWithSettings = injectMurmurDraftSettingsSnapshot(messageHtml, {
			version: 1,
			values: {
				...values,
				// Ensure the stored snapshot always has a concrete signature string.
				signature: signatureText,
			},
		});

		return {
			subject: values.subject || '',
			message: messageWithSettings,
			campaignId: campaign.id,
			status: EmailStatus.draft,
			contactId: contact.id,
		};
	};

	const draftAiEmail = async (
		recipient: Contact,
		prompt: string,
		toneAgentType: MistralToneAgentType,
		paragraphs: number,
		signal?: AbortSignal,
		model?: string,
		draftIndex?: number
	): Promise<DraftEmailResponse> => {
		if (!campaign.identity) {
			toast.error('Campaign identity is required');
			throw new Error('Campaign identity is required');
		}

		// Use provided model or default to first in the rotation
		const selectedModel = model || OPENROUTER_DRAFTING_MODELS[0];

		// Get a random system prompt from the rotation
		const { prompt: selectedSystemPrompt, promptIndex } = getRandomDraftingSystemPrompt();
		const populatedSystemPrompt = selectedSystemPrompt.replace(
			'{recipient_first_name}',
			recipient.firstName || ''
		).replace('{company}', recipient.company || '');

		const identityProfile = campaign.identity as IdentityProfileFields;
		const senderProfile = {
			name: identityProfile.name,
			bandName: identityProfile.bandName ?? undefined,
			genre: identityProfile.genre ?? undefined,
			area: identityProfile.area ?? undefined,
			bio: identityProfile.bio ?? undefined,
			website: identityProfile.website ?? undefined,
		};

		const bookingForNormalized = (form.getValues('bookingFor') ?? '').trim();
		const bookingForContext =
			bookingForNormalized && bookingForNormalized !== 'Anytime'
				? `\n\nBooking For:\n${bookingForNormalized}`
				: '';

		const userPrompt = `Sender information (user profile):\n${stringifyJsonSubset(
			senderProfile,
			['name', 'bandName', 'genre', 'area', 'bio', 'website']
		)}\n\nRecipient information:\n${stringifyJsonSubset<Contact>(recipient, [
			'lastName',
			'firstName',
			'email',
			'company',
			'address',
			'city',
			'state',
			'country',
			'website',
			'phone',
			'metadata',
		])}${bookingForContext}\n\nUser Goal:\n${prompt}`;

		// Debug logging for Full AI path
		console.log(
			`[Full AI] Starting generation${
				typeof draftIndex === 'number' ? ` (draft #${draftIndex})` : ''
			} for contact: ${recipient.id} (${recipient.email}) using model: ${selectedModel} prompt: #${promptIndex}`
		);
		console.log(
			`[Full AI] Prompt sizes: systemChars=${populatedSystemPrompt.length} userChars=${userPrompt.length}`
		);

		let openRouterResponse: string;
		try {
			openRouterResponse = await callOpenRouter({
				model: selectedModel,
				prompt: populatedSystemPrompt,
				content: userPrompt,
				signal,
				debug: {
					draftIndex,
					promptIndex,
					contactId: recipient.id,
					contactEmail: recipient.email,
					contactCompany: recipient.company || undefined,
					campaignId: campaign.id,
					source: 'full-ai',
				},
			});
		} catch (error) {
			console.error(`[Full AI] OpenRouter call failed (model: ${selectedModel}):`, error);
			if (error instanceof Error && error.message.includes('cancelled')) {
				throw error;
			}
			throw new Error(
				`Failed to generate email content: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}

		console.log(`[Full AI] OpenRouter response preview (model: ${selectedModel}, prompt: #${promptIndex}):`, openRouterResponse);

		// Parse OpenRouter response
		let parsedResponse: DraftEmailResponse;
		try {
			// Robust JSON parsing: handle markdown blocks, extra text, etc.
			let cleanedResponse = openRouterResponse;

			// Remove markdown code blocks if present
			cleanedResponse = cleanedResponse
				.replace(/^```(?:json)?\s*/i, '')
				.replace(/\s*```$/i, '');

			// Try to extract JSON object from the response
			const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				cleanedResponse = jsonMatch[0];
			}

			// Remove any trailing commas before closing braces/brackets (common LLM mistake)
			cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');

			console.log(
				'[Full AI] Attempting to parse cleaned JSON:',
				cleanedResponse.substring(0, 200)
			);
			parsedResponse = JSON.parse(cleanedResponse);

			// Validate the parsed object has required fields
			if (!parsedResponse.message || !parsedResponse.subject) {
				throw new Error('Parsed JSON missing required fields (message or subject)');
			}

			console.log(`[Full AI] Successfully parsed response from ${selectedModel} (prompt: #${promptIndex})`);
		} catch (e) {
			console.error('[Full AI] JSON parse failed:', e);
			console.error('[Full AI] Failed response was:', openRouterResponse);

			// Better fallback: try to extract subject and message as plain text
			const fallbackSubject = extractGeminiField(openRouterResponse, 'subject');
			const fallbackMessage = extractGeminiField(openRouterResponse, 'message');

			if (fallbackMessage) {
				parsedResponse = {
					subject: fallbackSubject || `Email regarding ${recipient.company || 'your inquiry'}`,
					message: fallbackMessage,
				};
				console.log('[Full AI] Extracted from relaxed parser fallback');
			} else {
				// Last resort: use the response as message and generate a subject
				parsedResponse = {
					subject: fallbackSubject || `Email regarding ${recipient.company || 'your inquiry'}`,
					message: openRouterResponse,
				};
				console.log('[Full AI] Using raw response as fallback');
			}
		}

		if (!parsedResponse.message || !parsedResponse.subject) {
			throw new Error('No message or subject generated');
		}

		const cleanedSubject = removeEmDashes(parsedResponse.subject);
		const cleanedMessage = stripEmailSignatureFromAiMessage(removeEmDashes(parsedResponse.message), {
			senderName: identityProfile.name,
			senderBandName: identityProfile.bandName ?? null,
		});

		return {
			subject: cleanedSubject,
			message: cleanedMessage,
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
			'metadata',
		]);

		if (!campaign.identity) {
			toast.error('Campaign identity is required');
			throw new Error('Campaign identity is required');
		}
		const identityProfile = campaign.identity as IdentityProfileFields;
		const senderProfile = {
			name: identityProfile.name,
			bandName: identityProfile.bandName ?? undefined,
			genre: identityProfile.genre ?? undefined,
			area: identityProfile.area ?? undefined,
			bio: identityProfile.bio ?? undefined,
			website: identityProfile.website ?? undefined,
		};
		const stringifiedSender = stringifyJsonSubset(senderProfile, [
			'name',
			'bandName',
			'genre',
			'area',
			'bio',
			'website',
		]);
		const stringifiedHybridBlocks = generateEmailTemplateFromBlocks(hybridBlocks);

		const geminiPrompt = `**RECIPIENT**\n${stringifiedRecipient}\n\n**SENDER**\n${stringifiedSender}\n\n**PROMPT**\n${hybridPrompt}\n\n**EMAIL TEMPLATE**\n${stringifiedHybridBlocks}\n\n**PROMPTS**\n${generatePromptsFromBlocks(
			hybridBlocks
		)}`;

		const geminiResponse: string = await callGemini({
			model: 'gemini-3-pro-preview',
			prompt: GEMINI_HYBRID_PROMPT,
			content: geminiPrompt,
			signal,
		});

		console.log('[Hybrid] Gemini raw response:', geminiResponse.substring(0, 500));

		let geminiParsed: DraftEmailResponse;
		try {
			// Apply robust JSON parsing
			let cleanedResponse = geminiResponse;

			// Remove markdown code blocks if present
			cleanedResponse = cleanedResponse
				.replace(/^```(?:json)?\s*/i, '')
				.replace(/\s*```$/i, '');

			// Try to extract JSON object from the response
			const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				cleanedResponse = jsonMatch[0];
			}

			// Remove any trailing commas before closing braces/brackets
			cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');

			geminiParsed = JSON.parse(cleanedResponse);

			if (!geminiParsed.message || !geminiParsed.subject) {
				throw new Error('Parsed JSON missing required fields');
			}
		} catch (e) {
			console.error('[Hybrid] Gemini JSON parse failed:', e);

			// Fallback: try to extract from plain text
			const fallbackSubject = extractGeminiField(geminiResponse, 'subject');
			const fallbackMessage = extractGeminiField(geminiResponse, 'message');

			if (fallbackMessage) {
				geminiParsed = {
					subject: fallbackSubject || 'Email draft',
					message: fallbackMessage,
				};
			} else {
				throw new Error('Gemini response failed to be parsed');
			}
		}

		if (!geminiParsed.message || !geminiParsed.subject) {
			throw new Error('No message or subject generated by Gemini');
		}

		// POST-PROCESS: If CTA block is not present, remove the CTA paragraph from the message.
		// We assume the generated email typically has: [Greeting?], Introduction, Research, CTA.
		// If greeting is present as its own short line (e.g., "Hi John,"), CTA is likely the 4th segment; otherwise 3rd.
		const hasActionBlock = hybridBlocks.some((b) => b.type === HybridBlock.action);
		let cleanedMessage = removeEmDashes(geminiParsed.message);
		if (!hasActionBlock) {
			const paragraphs = cleanedMessage.split(/\n{2,}/);
			if (paragraphs.length >= 3) {
				const firstIsGreetingOnly = /^\s*hi[^\n,]*,?\s*$/i.test(paragraphs[0]);
				const ctaIndex = firstIsGreetingOnly ? 3 : 2; // 0-based
				if (paragraphs.length > ctaIndex) {
					paragraphs.splice(ctaIndex, 1);
					cleanedMessage = paragraphs.join('\n\n');
				}
			}
		}

		const cleanedMessageNoSignature = stripEmailSignatureFromAiMessage(cleanedMessage, {
			senderName: identityProfile.name,
			senderBandName: identityProfile.bandName ?? null,
		});

		return {
			subject: isAiSubject
				? removeEmDashes(geminiParsed.subject)
				: form.getValues('subject'),
			message: cleanedMessageNoSignature,
		};
	};

	const scoreFullAutomatedPrompt = useCallback(
		async (fullAiPrompt: string) => {
			const trimmed = fullAiPrompt.trim();
			if (!trimmed) {
				setPromptQualityScore(null);
				setPromptQualityLabel(null);
				setPromptSuggestions([]);
				return;
			}

			const scoringModel =
				GEMINI_MODEL_OPTIONS.gemini25FlashLite ||
				GEMINI_MODEL_OPTIONS.gemini25Flash ||
				GEMINI_MODEL_OPTIONS.gemini2Flash;

			const scoringPrompt = `You are evaluating the quality of a musician's email-writing PROMPT that will be used to generate outreach emails to venues and promoters.

Return a single integer score between 70 and 98 inclusive. This scale intentionally skews high:
- 70–74 = Keep Going
- 75–82 = Good
- 83–90 = Great
- 91–96 = Excellent
- 97–98 = Exceptional

BIAS / CALIBRATION:
- Start from a default baseline of 88 for a typical usable prompt and adjust up/down.
- This prompt is supplementary “custom instructions” (not the drafting system prompt). Optimize for simple, short add-ons.
- Default to high scores unless the prompt is extremely empty/vague (e.g., literally “hello”).
- Do NOT punish brevity. A single great descriptive sentence can be 97–98.


SCORING PRIORITIES (MOST IMPORTANT FIRST):
1) Descriptive language: reward vivid, specific ADJECTIVES/ADVERBS that shape tone, vibe, and style (e.g., warm, concise, energetic, moody, intimate, high-energy, cinematic).
2) Useful constraints: clear tone, length, structure, and CTA expectations.
3) Context & fit: anything that helps match the venue/promoter and the artist honestly.

IMPORTANT RULES:
- Do NOT reward length. A single concise, highly descriptive sentence can absolutely score 97–98.
- Prefer adjective-rich specificity over noun lists. Proper nouns and generic nouns add little unless paired with strong descriptors.
- Be comfortable giving very high scores when the prompt is brief but vivid and directive.

Return ONLY a valid JSON object with this exact shape and no extra commentary or formatting:
{"score": 88, "label": "Great", "suggestion1": "First one-sentence suggestion to improve the prompt.", "suggestion2": "Second one-sentence suggestion to improve the prompt.", "suggestion3": "Third one-sentence suggestion to improve the prompt."}
DON'T USE THE WORD "AI" IN THE SUGGESTIONS.
SUGGESTION STYLE (VERY IMPORTANT):
- Suggestions are *add-on instructions* the user could paste directly into their custom instructions.
- Keep each suggestion SHORT: one line, no bullets, no paragraphing, ideally 6–14 words.
- Prefer patterns like:
  - Try phrasing: "…"
  - Add detail about X (…)
  - Specify tone/length/structure (…)
- Optimize for wording improvements (“try this phrasing”) or missing specifics (“be more detailed about X”), not rewriting the whole prompt.
Each suggestion MUST be a single sentence (no bullet points), specific, and actionable. Each suggestion should be unique and different from the others.`;

			const scoringContent = `PROMPT:\n${trimmed}`;

			try {
				const raw = await callGeminiForScoring({
					model: scoringModel,
					prompt: scoringPrompt,
					content: scoringContent,
				});

				let cleaned = raw;
				// Strip optional markdown fences
				cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
				// Try to isolate a JSON object if extra text slipped through
				const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					cleaned = jsonMatch[0];
				}

				type PromptScoreResponse = {
					score?: number | string;
					label?: string;
					suggestion1?: string;
					suggestion2?: string;
					suggestion3?: string;
					suggestions?: string[];
				};

				let parsed: PromptScoreResponse = {};
				try {
					parsed = JSON.parse(cleaned) as PromptScoreResponse;
				} catch (parseError) {
					console.warn(
						'[Prompt Score] JSON parse failed, attempting numeric fallback',
						parseError
					);
				}

				let rawScore: number | null = null;
				if (typeof parsed.score === 'number') {
					rawScore = parsed.score;
				} else if (typeof parsed.score === 'string') {
					const numeric = Number(parsed.score.replace(/[^\d.]/g, ''));
					rawScore = Number.isFinite(numeric) ? numeric : null;
				}

				// Fallback: pull first 70–100-ish number out of the text
				if (rawScore === null) {
					const match = cleaned.match(/\b(7[0-9]|8[0-9]|9[0-9]|100)\b/);
					if (match) {
						rawScore = Number(match[0]);
					}
				}

				if (rawScore === null || Number.isNaN(rawScore)) {
					console.warn(
						'[Prompt Score] Unable to extract numeric score from Gemini response:',
						raw
					);
					return;
				}

				const MIN_PROMPT_SCORE = 70;
				const MAX_PROMPT_SCORE = 98;

				let score = Math.round(rawScore);
				score = Math.max(MIN_PROMPT_SCORE, Math.min(MAX_PROMPT_SCORE, score));

				// Skew higher while preserving endpoints (70 stays 70, 98 stays 98).
				const t = (score - MIN_PROMPT_SCORE) / (MAX_PROMPT_SCORE - MIN_PROMPT_SCORE); // 0..1
				const skewed = Math.pow(t, 0.55); // lower exponent skews upward more
				score = Math.round(MIN_PROMPT_SCORE + skewed * (MAX_PROMPT_SCORE - MIN_PROMPT_SCORE));
				score = Math.max(MIN_PROMPT_SCORE, Math.min(MAX_PROMPT_SCORE, score));

				const labelFromModel =
					typeof parsed.label === 'string' && parsed.label.trim().length > 0
						? parsed.label.trim()
						: undefined;

				const fallbackLabel =
					score >= 97
						? 'Exceptional'
						: score >= 91
						? 'Excellent'
						: score >= 83
						? 'Great'
						: score >= 75
						? 'Good'
						: 'Keep Going';

				// Extract up to three suggestions from the model response
				const rawSuggestions: string[] = [];

				if (
					typeof parsed.suggestion1 === 'string' &&
					parsed.suggestion1.trim().length > 0
				) {
					rawSuggestions.push(parsed.suggestion1.trim());
				}
				if (
					typeof parsed.suggestion2 === 'string' &&
					parsed.suggestion2.trim().length > 0
				) {
					rawSuggestions.push(parsed.suggestion2.trim());
				}
				if (
					typeof parsed.suggestion3 === 'string' &&
					parsed.suggestion3.trim().length > 0
				) {
					rawSuggestions.push(parsed.suggestion3.trim());
				}
				if (Array.isArray(parsed.suggestions)) {
					for (const s of parsed.suggestions) {
						if (
							typeof s === 'string' &&
							s.trim().length > 0 &&
							rawSuggestions.length < 3
						) {
							rawSuggestions.push(s.trim());
						}
					}
				}

				const normalizeToSingleSentence = (text: string) => {
					const collapsed = text.replace(/\s+/g, ' ').trim();
					if (!collapsed) return '';
					const sentenceMatch = collapsed.match(/[^.!?]+[.!?]/);
					const sentence = sentenceMatch ? sentenceMatch[0] : collapsed;
					return sentence.trim();
				};

				const normalizedSuggestions = rawSuggestions
					.slice(0, 3)
					.map(normalizeToSingleSentence)
					.filter((s) => s.length > 0);

				setPromptQualityScore(score);
				setPromptQualityLabel(labelFromModel || fallbackLabel);
				setPromptSuggestions(normalizedSuggestions);
			} catch (error) {
				console.error('[Prompt Score] Gemini evaluation failed:', error);
				setPromptSuggestions([]);
			}
		},
		[callGeminiForScoring]
	);

	/**
	 * Critique actual email content written in Manual mode.
	 * Unlike scoreFullAutomatedPrompt which evaluates prompts, this evaluates
	 * the actual email text for quality, tone, professionalism, and effectiveness.
	 */
	const critiqueManualEmailText = useCallback(
		async (emailText: string) => {
			const trimmed = emailText.trim();
			if (!trimmed) {
				setPromptQualityScore(null);
				setPromptQualityLabel(null);
				setPromptSuggestions([]);
				return;
			}

			const scoringModel =
				GEMINI_MODEL_OPTIONS.gemini25FlashLite ||
				GEMINI_MODEL_OPTIONS.gemini25Flash ||
				GEMINI_MODEL_OPTIONS.gemini2Flash;

			const critiquePrompt = `You are an expert email writing coach helping a musician improve their outreach emails to venues and promoters.

Analyze the EMAIL TEXT below and provide constructive feedback. Assign a quality score between 60 and 100 inclusive, where:
- 60–69 = Needs Work
- 70–79 = Good
- 80–89 = Great
- 90–100 = Excellent

Evaluate the email based on:
1. Clarity and readability - Is the message clear and easy to understand?
2. Professionalism - Does it sound professional without being too formal?
3. Personalization - Does it feel personal or generic?
4. Call to action - Is there a clear ask or next step?
5. Length - Is it appropriately concise or too long/short?
6. Tone - Is it friendly, confident, and engaging?
7. Grammar and spelling - Are there any obvious errors?

Return ONLY a valid JSON object with this exact shape and no extra commentary or formatting:
{"score": 75, "label": "Good", "suggestion1": "First one-sentence suggestion to improve the email.", "suggestion2": "Second one-sentence suggestion to improve the email.", "suggestion3": "Third one-sentence suggestion to improve the email."}

Each suggestion MUST be a single, complete sentence (no bullet points) and should be specific, actionable feedback about the email writing itself. Focus on how to make the email more effective at getting a response.`;

			const scoringContent = `EMAIL TEXT:\n${trimmed}`;

			try {
				const raw = await callGeminiForScoring({
					model: scoringModel,
					prompt: critiquePrompt,
					content: scoringContent,
				});

				let cleaned = raw;
				// Strip optional markdown fences
				cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
				// Try to isolate a JSON object if extra text slipped through
				const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
				if (jsonMatch) {
					cleaned = jsonMatch[0];
				}

				type CritiqueResponse = {
					score?: number | string;
					label?: string;
					suggestion1?: string;
					suggestion2?: string;
					suggestion3?: string;
					suggestions?: string[];
				};

				let parsed: CritiqueResponse = {};
				try {
					parsed = JSON.parse(cleaned) as CritiqueResponse;
				} catch (parseError) {
					console.warn(
						'[Email Critique] JSON parse failed, attempting numeric fallback',
						parseError
					);
				}

				let rawScore: number | null = null;
				if (typeof parsed.score === 'number') {
					rawScore = parsed.score;
				} else if (typeof parsed.score === 'string') {
					const numeric = Number(parsed.score.replace(/[^\d.]/g, ''));
					rawScore = Number.isFinite(numeric) ? numeric : null;
				}

				// Fallback: pull first 60–100-ish number out of the text
				if (rawScore === null) {
					const match = cleaned.match(/\b(6[0-9]|7[0-9]|8[0-9]|9[0-9]|100)\b/);
					if (match) {
						rawScore = Number(match[0]);
					}
				}

				if (rawScore === null || Number.isNaN(rawScore)) {
					console.warn(
						'[Email Critique] Unable to extract numeric score from Gemini response:',
						raw
					);
					return;
				}

				let score = Math.round(rawScore);
				score = Math.max(60, Math.min(100, score));

				const labelFromModel =
					typeof parsed.label === 'string' && parsed.label.trim().length > 0
						? parsed.label.trim()
						: undefined;

				const fallbackLabel =
					score >= 90
						? 'Excellent'
						: score >= 80
						? 'Great'
						: score >= 70
						? 'Good'
						: 'Needs Work';

				// Extract up to three suggestions from the model response
				const rawSuggestions: string[] = [];

				if (
					typeof parsed.suggestion1 === 'string' &&
					parsed.suggestion1.trim().length > 0
				) {
					rawSuggestions.push(parsed.suggestion1.trim());
				}
				if (
					typeof parsed.suggestion2 === 'string' &&
					parsed.suggestion2.trim().length > 0
				) {
					rawSuggestions.push(parsed.suggestion2.trim());
				}
				if (
					typeof parsed.suggestion3 === 'string' &&
					parsed.suggestion3.trim().length > 0
				) {
					rawSuggestions.push(parsed.suggestion3.trim());
				}
				if (Array.isArray(parsed.suggestions)) {
					for (const s of parsed.suggestions) {
						if (
							typeof s === 'string' &&
							s.trim().length > 0 &&
							rawSuggestions.length < 3
						) {
							rawSuggestions.push(s.trim());
						}
					}
				}

				const normalizeToSingleSentence = (text: string) => {
					const collapsed = text.replace(/\s+/g, ' ').trim();
					if (!collapsed) return '';
					const sentenceMatch = collapsed.match(/[^.!?]+[.!?]/);
					const sentence = sentenceMatch ? sentenceMatch[0] : collapsed;
					return sentence.trim();
				};

				const normalizedSuggestions = rawSuggestions
					.slice(0, 3)
					.map(normalizeToSingleSentence)
					.filter((s) => s.length > 0);

				setPromptQualityScore(score);
				setPromptQualityLabel(labelFromModel || fallbackLabel);
				setPromptSuggestions(normalizedSuggestions);
			} catch (error) {
				console.error('[Email Critique] Gemini evaluation failed:', error);
				setPromptSuggestions([]);
			}
		},
		[callGeminiForScoring]
	);

	/**
	 * Upscale the current Full Auto prompt using Gemini 2.5 Flash.
	 * Makes the prompt deeper, longer, and more detailed.
	 */
	const upscalePrompt = useCallback(async () => {
		const blocks = form.getValues('hybridBlockPrompts');
		const fullAutomatedBlock = blocks?.find((b) => b.type === 'full_automated');
		const currentPrompt = fullAutomatedBlock?.value?.trim() || '';

		if (!currentPrompt) {
			toast.error('Please enter a prompt first before upscaling.');
			return;
		}

		// Save the current prompt value before upscaling
		setPreviousPromptValue(currentPrompt);
		setIsUpscalingPrompt(true);

		try {
			const upscaleSystemPrompt = `You are an expert at refining custom instructions for an AI email generator.

CONTEXT:
- The user is a musician trying to book shows at venues
- The AI already handles the main email generation (intro, research on venue, call to action)
- These "Custom Instructions" are ADDITIONAL guidance to fine-tune the AI's output
- They are NOT the full email prompt - just small tweaks and preferences

YOUR TASK:
Improve the user's custom instructions by making them clearer, more specific, and more effective.

RULES:
1. Keep it SHORT - these are supplementary instructions, not a full prompt
2. Focus on tone, style preferences, specific things to mention/avoid
3. Do NOT write full email templates or lengthy instructions
4. Output the improved instructions ONLY - no explanations, no JSON, no markdown
5. If the input is already good, make only minor refinements

IT IT'S LIKE ONE SENTENCE, MAYBE MAKE IT TWO. BUT DON'T MAKE IT CRAZY LONG

EXAMPLES OF GOOD CUSTOM INSTRUCTIONS:
- "Keep tone casual but professional. Mention we're touring through their area in March."
- "Emphasize our draw numbers. Don't mention other venues by name."
- "Be direct and concise. We prefer Tuesday-Thursday shows."`;

			const response = await callGeminiForScoring({
				model: GEMINI_MODEL_OPTIONS.gemini25Flash,
				prompt: upscaleSystemPrompt,
				content: `User's custom instructions to improve:\n\n${currentPrompt}`,
			});

			// Clean the response - remove any markdown or extra formatting
			let improvedPrompt = response.trim();

			// Remove markdown code blocks if present
			improvedPrompt = improvedPrompt
				.replace(/^```(?:\w+)?\s*/i, '')
				.replace(/\s*```$/i, '');

			// For custom instructions, just check we got a reasonable response (at least 10 chars)
			// Shorter can be valid since we're refining, not expanding
			if (improvedPrompt && improvedPrompt.length >= 10) {
				// Find the index of the full_automated block and update its value directly
				// Using the specific field path ensures the registered input syncs properly
				const fullAutomatedIndex = blocks.findIndex((b) => b.type === 'full_automated');
				if (fullAutomatedIndex !== -1) {
					form.setValue(
						`hybridBlockPrompts.${fullAutomatedIndex}.value` as const,
						improvedPrompt,
						{
							shouldDirty: true,
							shouldValidate: true,
						}
					);
				}

				toast.success('Instructions refined!');

				// Set score to 95-97 range after upscaling (guaranteed good result)
				const upscaledScore = 95 + Math.floor(Math.random() * 3); // 95, 96, or 97
				setPromptQualityScore(upscaledScore);
				setPromptQualityLabel('Excellent');
			} else {
				toast.error('Failed to refine instructions. Please try again.');
			}
		} catch (error) {
			console.error('[Upscale Prompt] Error:', error);
			toast.error('Failed to upscale prompt. Please try again.');
		} finally {
			setIsUpscalingPrompt(false);
		}
	}, [callGeminiForScoring, form]);

	/**
	 * Undo the upscaled prompt by restoring the previous value.
	 */
	const undoUpscalePrompt = useCallback(() => {
		if (!previousPromptValue) {
			toast.error('No previous prompt to restore.');
			return;
		}

		const blocks = form.getValues('hybridBlockPrompts');
		// Find the index of the full_automated block and update its value directly
		// Using the specific field path ensures the registered input syncs properly
		const fullAutomatedIndex = blocks.findIndex((b) => b.type === 'full_automated');
		if (fullAutomatedIndex !== -1) {
			form.setValue(
				`hybridBlockPrompts.${fullAutomatedIndex}.value` as const,
				previousPromptValue,
				{
					shouldDirty: true,
					shouldValidate: true,
				}
			);
		}

		// Re-score the restored prompt
		scoreFullAutomatedPrompt(previousPromptValue);

		setPreviousPromptValue(null);
		toast.success('Prompt restored to previous version.');
	}, [form, previousPromptValue, scoreFullAutomatedPrompt]);

	const cancelGeneration = () => {
		isGenerationCancelledRef.current = true;
		setGenerationProgress(-1);
		const controller = abortControllerRef.current;
		if (controller) {
			controller.abort();
			abortControllerRef.current = null;
		}
		hideLivePreview();
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
			setIsOpenUpgradeSubscriptionDrawer(true);
			return;
		}

		const values = getValues();
		console.log('[Test Generation] All form values:', values);

		// Score the Full AI prompt (when applicable) so the Suggestion meter reflects
		// the exact prompt used for this test.
		if (draftingMode === DraftingMode.ai) {
			const fullAutomatedBlockForScore = values.hybridBlockPrompts?.find(
				(block) => block.type === HybridBlock.full_automated
			);
			const fullAiPromptForScore = fullAutomatedBlockForScore?.value?.trim() || '';

			if (fullAiPromptForScore) {
				// Don't block test generation on scoring; run in background.
				console.log('[Test Generation] Scoring Full AI prompt in background (Gemini)…');
				scoreFullAutomatedPrompt(fullAiPromptForScore);
			} else {
				setPromptQualityScore(null);
				setPromptQualityLabel(null);
				setPromptSuggestions([]);
			}
		} else {
			setPromptQualityScore(null);
			setPromptQualityLabel(null);
			setPromptSuggestions([]);
		}

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

				const fullAutomatedBlock = values.hybridBlockPrompts?.find(
					(block) => block.type === 'full_automated'
				);

				console.log('[Test Generation] Mode:', draftingMode);

				if (draftingMode === DraftingMode.ai) {
					const fullAiPromptRaw = fullAutomatedBlock?.value || '';
					const fullAiPrompt = fullAiPromptRaw.trim() || DEFAULT_FULL_AI_PROMPT;

					// Pick a random model for test generation to preview variety
					const testModel = OPENROUTER_DRAFTING_MODELS[Math.floor(Math.random() * OPENROUTER_DRAFTING_MODELS.length)];
					console.log(
						'[Test Generation] Using Full AI mode with prompt:',
						fullAiPromptRaw.trim() ? fullAiPromptRaw : '(default prompt)'
					);
					console.log('[Test Generation] Using model:', testModel);

					parsedRes = await draftAiEmail(
						contacts[0],
						fullAiPrompt,
						values.draftingTone,
						values.paragraphs,
						undefined,
						testModel,
						1
					);
				} else if (draftingMode === DraftingMode.hybrid) {
					// For regular hybrid blocks
					if (!values.hybridBlockPrompts || values.hybridBlockPrompts.length === 0) {
						throw new Error('No blocks added. Please add at least one block.');
					}

					// Filter out any full_automated blocks for hybrid processing
					const hybridBlocks = values.hybridBlockPrompts.filter(
						(block) => block.type !== 'full_automated' && !block.isCollapsed
					);

					if (hybridBlocks.length === 0) {
						throw new Error(
							'No hybrid blocks found. Please add Introduction, Research, Action, or Text blocks.'
						);
					}

					console.log('[Test Generation] Using Hybrid mode with blocks:', hybridBlocks);

					parsedRes = await draftHybridEmail(
						contacts[0],
						values.hybridPrompt ||
							'Generate a professional email based on the template below.',
						hybridBlocks,
						undefined
					);
				} else {
					throw new Error('Invalid drafting mode');
				}

				if (parsedRes.message && parsedRes.subject) {
					// Determine final subject: manual when AI subject is disabled
					const finalSubject = values.isAiSubject
						? parsedRes.subject
						: values.subject || parsedRes.subject;
					
					// Insert website link phrase if identity has a website
					let processedMessage = parsedRes.message;
					if (campaign.identity?.website) {
						processedMessage = insertWebsiteLinkPhrase(processedMessage, campaign.identity.website);
					}
					
					// Prepend subject line in Inter bold to the message
					const messageWithSubject = `<span style="font-family: Inter; font-weight: bold;">${finalSubject}</span><br><br>${processedMessage}`;
					await saveTestEmail({
						id: campaign.id,
						data: {
							testSubject: finalSubject,
							testMessage: convertAiResponseToRichTextEmail(
								messageWithSubject,
								values.font,
								signatureText || null
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
					queryClient.invalidateQueries({
						queryKey: ['emails', { campaignId: campaign.id }],
					});
					toast.success('Test email generated successfully!');
					isSuccess = true;
				} else {
					attempts++;
				}
			} catch (e) {
				if (e instanceof Error) {
					console.error('Error generating test email:', e.message);
					console.error('Full error:', e);
					toast.error(`Error: ${e.message}`);
				} else {
					console.error('Unknown error generating test email:', e);
					toast.error('An unknown error occurred');
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
		controller: AbortController,
		startIndex: number = 0
	) => {
		const values = getValues();

		return batchToProcess.map(async (recipient: Contact, batchIndex: number) => {
			// Round-robin model selection based on overall position in generation
			const overallIndex = startIndex + batchIndex;
			const draftIndex = overallIndex + 1;
			const MAX_RETRIES = 5;
			let lastError: Error | null = null;

			for (
				let retryCount = 0;
				retryCount <= MAX_RETRIES && !isGenerationCancelledRef.current;
				retryCount++
			) {
				try {
					// For Full AI mode, rotate models across drafts and (if needed) across retries.
					const attemptModel =
						OPENROUTER_DRAFTING_MODELS[
							(overallIndex + retryCount) % OPENROUTER_DRAFTING_MODELS.length
						];

					// Exponential backoff: 0ms, 1s, 2s, 4s
					if (retryCount > 0) {
						const delay = Math.pow(2, retryCount - 1) * 1000;
						await new Promise((resolve) => setTimeout(resolve, delay));
					}

					let parsedDraft;

					const fullAutomatedBlock = values.hybridBlockPrompts?.find(
						(block) => block.type === 'full_automated'
					);

					if (draftingMode === DraftingMode.ai) {
						const fullAiPromptRaw = fullAutomatedBlock?.value || '';
						const fullAiPrompt = fullAiPromptRaw.trim() || DEFAULT_FULL_AI_PROMPT;

						console.log(
							`[Batch][Full AI] draft#${draftIndex} attempt ${
								retryCount + 1
							}/${MAX_RETRIES + 1} contactId=${recipient.id} email=${
								recipient.email
							} model=${attemptModel}`
						);
						parsedDraft = await draftAiEmail(
							recipient,
							fullAiPrompt,
							values.draftingTone,
							values.paragraphs,
							controller.signal,
							attemptModel,
							draftIndex
						);
					} else if (draftingMode === DraftingMode.hybrid) {
						// Filter out any full_automated blocks for hybrid processing
						const hybridBlocks =
							values.hybridBlockPrompts?.filter(
								(block) => block.type !== 'full_automated' && !block.isCollapsed
							) || [];

						if (hybridBlocks.length === 0) {
							throw new Error('No hybrid blocks found for email generation.');
						}

						parsedDraft = await draftHybridEmail(
							recipient,
							values.hybridPrompt ||
								'Generate a professional email based on the template below.',
							hybridBlocks,
							controller.signal
						);
					}

					if (parsedDraft) {
						// Insert website link phrase if identity has a website
						let processedMessage = parsedDraft.message;
						if (campaign.identity?.website) {
							processedMessage = insertWebsiteLinkPhrase(processedMessage, campaign.identity.website);
						}

						if (!isAiSubject) {
							parsedDraft.subject = values.subject || parsedDraft.subject;
						}

						const draftMessageHtml = convertAiResponseToRichTextEmail(
							processedMessage,
							values.font,
							signatureText || null
						);
						const draftMessageWithSettings = injectMurmurDraftSettingsSnapshot(
							draftMessageHtml,
							{
								version: 1,
								values: {
									...values,
									signature: signatureText,
								},
							}
						);

						await createEmail({
							subject: parsedDraft.subject,
							message: draftMessageWithSettings,
							campaignId: campaign.id,
							status: 'draft' as EmailStatus,
							contactId: recipient.id,
						});
						if (draftingMode === DraftingMode.ai) {
							console.log(
								`[Batch][Full AI] Saved draft#${draftIndex} contactId=${recipient.id} email=${recipient.email} model=${attemptModel}`
							);
						}
						// Queue for the live typing preview (fixed speed, independent of backend timing).
						enqueueLivePreviewDraft(
							draftIndex,
							recipient.id,
							processedMessage,
							parsedDraft.subject
						);
						// Keep live preview visible while batch generation is running so the
						// Campaign page can show the "draft typing" preview across tabs.
						// Immediately reflect in UI
						setGenerationProgress((prev) => prev + 1);
						queryClient.invalidateQueries({
							queryKey: ['emails', { campaignId: campaign.id }],
						});
						// Live preview will be re-enabled for the next recipient when streaming starts

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

	const batchGenerateFullAiDrafts = async (selectedIds?: number[]) => {
		if (isBatchGeneratingRef.current) {
			console.warn('[Batch] Full AI generation already in progress; ignoring request.');
			return;
		}

		isBatchGeneratingRef.current = true;
		setIsBatchGenerating(true);

		let remainingCredits = draftCredits || 0;

		const controller = new AbortController();
		abortControllerRef.current = controller;

		const BATCH_SIZE = 3;
		let successfulEmails = 0;
		let stoppedDueToCredits = false;

		try {
			if (!contacts || contacts.length === 0) {
				toast.error('No contacts available to generate emails.');
				return;
			}

			const paragraphs = form.getValues('paragraphs');
			const creditCost = paragraphs <= 3 ? 1 : 1.5;

			if (!draftCredits || draftCredits < creditCost) {
				setIsOpenUpgradeSubscriptionDrawer(true);
				return;
			}

			isGenerationCancelledRef.current = false;
			setGenerationProgress(0);
			const targets =
				selectedIds && selectedIds.length > 0
					? contacts.filter((c: ContactWithName) => selectedIds.includes(c.id))
					: contacts;

			if (draftingMode === DraftingMode.ai) {
				console.log(
					'[Batch][Full AI] OpenRouter model rotation order:',
					OPENROUTER_DRAFTING_MODELS
				);
			}

			// Show preview surface while generation is running. Drafts will be queued and
			// typed out at a fixed speed independent of backend timing.
			beginLivePreviewBatch(targets.length);
			for (
				let i = 0;
				i < targets.length && !isGenerationCancelledRef.current;
				i += BATCH_SIZE
			) {
				const maxEmails = Math.floor(remainingCredits / creditCost);
				const adjustedBatchSize = Math.min(BATCH_SIZE, maxEmails);

				if (remainingCredits < creditCost) {
					stoppedDueToCredits = true;
					cancelGeneration();
					break;
				}

				const batch: Contact[] = targets.slice(
					i,
					Math.min(i + adjustedBatchSize, targets.length)
				);

				const currentBatchPromises: Promise<BatchGenerationResult>[] =
					generateBatchPromises(batch, controller, i);

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
				if (remainingCredits < creditCost && successfulEmails < targets.length) {
					stoppedDueToCredits = true;
					setIsOpenUpgradeSubscriptionDrawer(true);
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

			// Invalidate emails query to refresh the drafts list
			if (successfulEmails > 0) {
				queryClient.invalidateQueries({
					queryKey: ['emails', { campaignId: campaign.id }],
				});
			}

			if (!isGenerationCancelledRef.current && !stoppedDueToCredits) {
				if (successfulEmails === targets.length) {
					toast.success('All emails generated successfully!');
				} else if (successfulEmails > 0) {
					toast.success(
						`Email generation completed! ${successfulEmails}/${targets.length} emails generated successfully.`
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
			abortControllerRef.current = null;
			setGenerationProgress(-1);
			// Keep the preview visible until queued drafts finish typing, then auto-hide.
			endLivePreviewBatch();
			isBatchGeneratingRef.current = false;
			setIsBatchGenerating(false);
		}
	};

	// HANDLERS

	const handleGenerateTestDrafts = async () => {
		if (draftingMode === DraftingMode.ai || draftingMode === DraftingMode.hybrid) {
			generateAiDraftTest();
		} else if (draftingMode === DraftingMode.handwritten) {
			generateHandWrittenDraftTest();
		}
	};

	const handleGenerateDrafts = async (contactIds?: number[]) => {
		// Check if email template is set up before attempting to draft
		const values = form.getValues();
		const fullAutomatedBlock = values.hybridBlockPrompts?.find(
			(block) => block.type === 'full_automated'
		);
		const hybridBlocks = values.hybridBlockPrompts?.filter(
			(block) => block.type !== 'full_automated' && !block.isCollapsed
		);

		if (draftingMode === DraftingMode.ai) {
			const fullAiPromptRaw = fullAutomatedBlock?.value || '';
			const fullAiPrompt = fullAiPromptRaw.trim();

			// Don't block batch generation on scoring; run in background.
			if (fullAiPrompt) {
				console.log('[Batch][Full AI] Scoring prompt in background (Gemini)…');
				scoreFullAutomatedPrompt(fullAiPrompt);
			} else {
				// If no custom instructions are provided, we still allow drafting using a default prompt.
				setPromptQualityScore(null);
				setPromptQualityLabel(null);
				setPromptSuggestions([]);
			}
		} else if (draftingMode === DraftingMode.hybrid) {
			if (!hybridBlocks || hybridBlocks.length === 0) {
				toast.error('Please set up your email template on the Testing tab first.');
				return;
			}

			setPromptQualityScore(null);
			setPromptQualityLabel(null);
			setPromptSuggestions([]);
		} else {
			setPromptQualityScore(null);
			setPromptQualityLabel(null);
			setPromptSuggestions([]);
		}

		if (draftingMode === DraftingMode.ai || draftingMode === DraftingMode.hybrid) {
			await batchGenerateFullAiDrafts(contactIds);
		} else if (draftingMode === DraftingMode.handwritten) {
			await batchGenerateHandWrittenDrafts(contactIds);
		}
	};

	const insertPlaceholder = useCallback(
		(placeholder: string) => {
			const { name, element } = lastFocusedFieldRef.current;

			if (!element || !name) {
				console.log('[Insert Placeholder] No focused field found');
				return;
			}

			const start = element.selectionStart || 0;
			const end = element.selectionEnd || 0;
			const currentValue = element.value;

			const newValue =
				currentValue.substring(0, start) + placeholder + currentValue.substring(end);
			console.log('[Insert Placeholder] Inserting', placeholder, 'at position', start);

			form.setValue(name as keyof DraftingFormValues, newValue, { shouldDirty: true });

			// Use requestAnimationFrame for better Safari compatibility, needs slight delay for setSelectionRange to work properly
			requestAnimationFrame(() => {
				element.focus();
				const newPosition = start + placeholder.length;
				setTimeout(() => {
					element.setSelectionRange(newPosition, newPosition);
				}, 10);
			});
		},
		[form]
	);

	// EFFECTS

	useEffect(() => {
		if (draftingMode === DraftingMode.handwritten) {
			form.setValue('isAiSubject', false);
		} else {
			form.setValue('isAiSubject', true);
		}
	}, [draftingMode, form]);

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
			// Check if campaign has the old default blocks (introduction, research, action)
			const campaignBlocks = campaign.hybridBlockPrompts as HybridBlockPrompt[];
			const hasOldDefaults =
				campaignBlocks &&
				campaignBlocks.length === 3 &&
				campaignBlocks.some((b) => b.type === 'introduction' && b.value === '') &&
				campaignBlocks.some((b) => b.type === 'research' && b.value === '') &&
				campaignBlocks.some((b) => b.type === 'action' && b.value === '');

			// If it has the old empty defaults, replace with new full_automated default
			const hybridBlockPromptsToUse = hasOldDefaults
				? [{ id: 'full_automated', type: HybridBlock.full_automated, value: '' }]
				: campaignBlocks ?? [
						{ id: 'full_automated', type: HybridBlock.full_automated, value: '' },
				  ];

			const hybridAvailableBlocksToUse = hasOldDefaults
				? [
						HybridBlock.full_automated,
						HybridBlock.introduction,
						HybridBlock.research,
						HybridBlock.action,
						HybridBlock.text,
				  ]
				: campaign.hybridAvailableBlocks ?? [
						HybridBlock.full_automated,
						HybridBlock.introduction,
						HybridBlock.research,
						HybridBlock.action,
						HybridBlock.text,
				  ];

			form.reset({
				isAiSubject: campaign.isAiSubject ?? true,
				subject: campaign.subject ?? '',
				fullAiPrompt: campaign.fullAiPrompt ?? '',
				bookingFor: 'Anytime',
				hybridPrompt:
					campaign.hybridPrompt ??
					'Generate a professional email based on the template below.',
				hybridAvailableBlocks: hybridAvailableBlocksToUse,
				hybridBlockPrompts: hybridBlockPromptsToUse,
				savedHybridBlocks: [],
				savedManualBlocks: [],
				handwrittenPrompt: campaign.handwrittenPrompt ?? '',
				font: (campaign.font as Font) ?? DEFAULT_FONT,
				signatureId: campaign.signatureId ?? signatures?.[0]?.id,
				signature: `Thank you,\n${campaign.identity?.name || ''}`,
				draftingTone: campaign.draftingTone ?? DraftingTone.normal,
				paragraphs: campaign.paragraphs ?? 0,
			});

			// If we migrated from old defaults, save the new blocks to the campaign
			if (hasOldDefaults) {
				saveCampaign({
					id: campaign.id,
					data: {
						hybridBlockPrompts: hybridBlockPromptsToUse,
						hybridAvailableBlocks: hybridAvailableBlocksToUse,
					},
				});
			}

			setIsFirstLoad(false);
		}
	}, [campaign, form, signatures, isFirstLoad, saveCampaign]);

	// Update signature when identity changes
	useEffect(() => {
		const currentSignature = form.getValues('signature');
		// Only update if signature is empty or is the default template
		if (
			!currentSignature ||
			currentSignature === 'Thank you,' ||
			currentSignature.startsWith('Thank you,\n')
		) {
			form.setValue('signature', `Thank you,\n${campaign.identity?.name || ''}`);
		}
	}, [campaign.identity?.name, form]);

	useEffect(() => {
		return () => {
			const controller = abortControllerRef.current;
			if (controller) {
				controller.abort();
			}
			if (livePreviewTimerRef.current) {
				clearInterval(livePreviewTimerRef.current);
				livePreviewTimerRef.current = null;
			}
			if (livePreviewDelayTimerRef.current) {
				clearTimeout(livePreviewDelayTimerRef.current);
				livePreviewDelayTimerRef.current = null;
			}
		};
	}, []);

	const trackFocusedField = useCallback(
		(fieldName: string, element: HTMLTextAreaElement | HTMLInputElement | null) => {
			lastFocusedFieldRef.current = { name: fieldName, element };
		},
		[]
	);

	// Watch for Full Automated block changes
	const watchedHybridBlockPrompts = form.watch('hybridBlockPrompts');
	const hasFullAutomatedBlock = watchedHybridBlockPrompts?.some(
		(block) => block.type === 'full_automated'
	);

	return {
		activeTab,
		campaign,
		cancelGeneration,
		contacts,
		draftingMode,
		form,
		generationProgress,
		promptQualityScore,
		promptQualityLabel,
		promptSuggestions,
		handleGenerateDrafts,
		handleGenerateTestDrafts,
		hasFullAutomatedBlock,
		insertPlaceholder,
		isAiSubject,
		isDraftingContentReady,
		isGenerationDisabled,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
		isUpscalingPrompt,
		upscalePrompt,
		undoUpscalePrompt,
		hasPreviousPrompt: previousPromptValue !== null,
		setActiveTab,
		setGenerationProgress,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
		isFirstLoad,
		scrollToDrafting,
		scrollToEmailStructure,
		draftingRef,
		emailStructureRef,
		isLivePreviewVisible,
		livePreviewContactId,
		livePreviewMessage,
		livePreviewSubject,
		livePreviewDraftNumber,
		livePreviewTotal,
		scoreFullAutomatedPrompt,
		critiqueManualEmailText,
	};
};
