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
	GEMINI_FULL_AI_PROMPT,
	GEMINI_HYBRID_PROMPT,
	GEMINI_MODEL_OPTIONS,
	OPENROUTER_DRAFTING_MODELS,
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
} from '@/utils';
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

export interface DraftingSectionProps {
	campaign: CampaignWithRelations;
	view?: 'search' | 'contacts' | 'testing' | 'drafting' | 'sent' | 'inbox' | 'all';
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
	const [promptQualityScore, setPromptQualityScore] = useState<number | null>(null);
	const [promptQualityLabel, setPromptQualityLabel] = useState<string | null>(null);
	const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
	const [abortController, setAbortController] = useState<AbortController | null>(null);
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [activeTab, setActiveTab] = useState<'test' | 'placeholders'>('test');
	const [isUpscalingPrompt, setIsUpscalingPrompt] = useState(false);
	const [previousPromptValue, setPreviousPromptValue] = useState<string | null>(null);

	const draftingRef = useRef<HTMLDivElement>(null);
	const emailStructureRef = useRef<HTMLDivElement>(null);

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
	const livePreviewTimerRef = useRef<number | null>(null);
	// Store full text and an index to preserve original whitespace and paragraph breaks
	const livePreviewFullTextRef = useRef<string>('');
	const livePreviewIndexRef = useRef<number>(0);

	const hideLivePreview = useCallback(() => {
		if (livePreviewTimerRef.current) {
			clearInterval(livePreviewTimerRef.current);
			livePreviewTimerRef.current = null;
		}
		setIsLivePreviewVisible(false);
		setLivePreviewContactId(null);
		setLivePreviewMessage('');
		setLivePreviewSubject('');
		livePreviewFullTextRef.current = '';
		livePreviewIndexRef.current = 0;
	}, []);

	const startLivePreviewStreaming = useCallback(
		(contactId: number, fullMessage: string, subject?: string) => {
			if (livePreviewTimerRef.current) {
				clearInterval(livePreviewTimerRef.current);
				livePreviewTimerRef.current = null;
			}
			setIsLivePreviewVisible(true);
			setLivePreviewContactId(contactId);
			setLivePreviewMessage('');
			if (typeof subject === 'string') {
				setLivePreviewSubject(subject);
			}
			const text = fullMessage || '';
			livePreviewFullTextRef.current = text;
			livePreviewIndexRef.current = 0;
			// Target ~3s reveal regardless of message length; preserve newlines
			const length = Math.max(text.length, 1);
			const stepChars = Math.max(1, Math.floor(length / 150));
			const stepMs = 20; // smooth updates, lightweight
			livePreviewTimerRef.current = window.setInterval(() => {
				const i = livePreviewIndexRef.current;
				if (i >= livePreviewFullTextRef.current.length) {
					if (livePreviewTimerRef.current) {
						clearInterval(livePreviewTimerRef.current);
						livePreviewTimerRef.current = null;
					}
					return;
				}
				const nextIndex = Math.min(i + stepChars, livePreviewFullTextRef.current.length);
				livePreviewIndexRef.current = nextIndex;
				setLivePreviewMessage(livePreviewFullTextRef.current.slice(0, nextIndex));
			}, stepMs);
		},
		[]
	);

	const { data: signatures } = useGetSignatures();

	const form = useForm<DraftingFormValues>({
		resolver: zodResolver(draftingFormSchema),
		defaultValues: {
			isAiSubject: true,
			subject: '',
			fullAiPrompt: '',
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

	const isPendingGeneration = isPendingCallGemini || isPendingCallOpenRouter || isPendingCreateEmail;

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
		const fullAutomatedBlock = values.hybridBlockPrompts?.find(
			(block) => block.type === 'full_automated'
		);

		const isFullAutomatedEmpty =
			hasFullAutomatedBlock &&
			(!fullAutomatedBlock?.value || fullAutomatedBlock.value === '');

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

		const hasAIBlocks = values.hybridBlockPrompts?.some((block) => {
			if (block.type === 'full_automated') {
				return block.value && block.value.trim() !== '';
			}
			if (block.type !== HybridBlock.text) {
				return true;
			}
			return block.value && block.value.trim() !== '';
		});

		return (
			isFullAutomatedEmpty ||
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
		const fullAutomatedBlock = values.hybridBlockPrompts?.find(
			(block) => block.type === 'full_automated'
		);

		const isFullAutomatedEmpty =
			hasFullAutomatedBlock &&
			(!fullAutomatedBlock?.value || fullAutomatedBlock.value === '');

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

			// In handwritten mode, both text content AND subject must be present
			return hasTextContent && hasSubject;
		}

		const hasAIBlocks = values.hybridBlockPrompts?.some((block) => {
			if (block.type === 'full_automated') {
				return block.value && block.value.trim() !== '';
			}
			if (block.type !== HybridBlock.text) {
				return true;
			}
			return block.value && block.value.trim() !== '';
		});

		// Content is ready if we have blocks with content
		return !isFullAutomatedEmpty && !hasNoBlocks && hasAIBlocks;
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
		const generatedEmails: GeneratedEmail[] = [];

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

		return {
			subject: values.subject || '',
			message: convertAiResponseToRichTextEmail(
				combinedTextBlocks,
				values.font,
				signatureText || null
			),
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

		const populatedSystemPrompt = GEMINI_FULL_AI_PROMPT.replace(
			'{recipient_first_name}',
			recipient.firstName || ''
		).replace('{company}', recipient.company || '');

		const userPrompt = `Sender information\n: ${stringifyJsonSubset<Identity>(
			campaign.identity,
			['name', 'website']
		)}\n\nRecipient information: ${stringifyJsonSubset<Contact>(recipient, [
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
		])}\n\nUser Goal: ${prompt}`;

		// Debug logging for Full AI path
		console.log(
			`[Full AI] Starting generation${
				typeof draftIndex === 'number' ? ` (draft #${draftIndex})` : ''
			} for contact: ${recipient.id} (${recipient.email}) using model: ${selectedModel}`
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
					contactId: recipient.id,
					contactEmail: recipient.email,
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

		console.log(`[Full AI] OpenRouter response preview (model: ${selectedModel}):`, openRouterResponse);

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

			console.log(`[Full AI] Successfully parsed response from ${selectedModel}`);
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

		return {
			subject: removeEmDashes(parsedResponse.subject),
			message: removeEmDashes(parsedResponse.message),
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
		const stringifiedSender = stringifyJsonSubset<Identity>(campaign.identity, [
			'name',
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

		return {
			subject: isAiSubject
				? removeEmDashes(geminiParsed.subject)
				: form.getValues('subject'),
			message: cleanedMessage,
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

			const scoringPrompt = `You are evaluating the quality of a musician's email-writing prompt that will be used to generate outreach emails to venues and promoters.

Analyze the PROMPT text below and assign a single numeric quality score between 60 and 100 inclusive, where:
- 60–69 = Keep Going
- 70–79 = Good
- 80–89 = Great
- 90–100 = Excellent

			Look for specific details like, do they have specifics about themselves? Did the artist add an EPK?
			Judge by how many details they have about themselves. 

			Return ONLY a valid JSON object with this exact shape and no extra commentary or formatting:
			{"score": 75, "label": "Good", "suggestion1": "First one-sentence suggestion to improve the prompt.", "suggestion2": "Second one-sentence suggestion to improve the prompt.", "suggestion3": "Third one-sentence suggestion to improve the prompt."}
			DON'T USE THE WORD "AI" IN THE SUGGESTIONS.
			Each suggestion MUST be a single, complete sentence (no bullet points) and should be as specific and actionable as possible. Each suggestion should be unique and different from the others.`;

			const scoringContent = `PROMPT:\n${trimmed}`;

			try {
				const raw = await callGemini({
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

				// Fallback: pull first 60–100-ish number out of the text
				if (rawScore === null) {
					const match = cleaned.match(/\b(6[0-9]|7[0-9]|8[0-9]|9[0-9]|100)\b/);
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
						: 'Fair';

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
		[callGemini]
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
				const raw = await callGemini({
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
		[callGemini]
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
			const upscaleSystemPrompt = `You are an expert at improving email prompts. Your task is to take a user's prompt for generating outreach emails and make it significantly better.

INSTRUCTIONS:
1. You're a musicians trying to get yourself booked for a show by writing an email.
2. The output should be the improved prompt ONLY - no explanations, no JSON, no markdown

The improved prompt should result in more personalized, engaging, and effective emails.`;

			const response = await callGemini({
				model: GEMINI_MODEL_OPTIONS.gemini25Flash,
				prompt: upscaleSystemPrompt,
				content: `Current prompt to improve:\n\n${currentPrompt}`,
			});

			// Clean the response - remove any markdown or extra formatting
			let improvedPrompt = response.trim();

			// Remove markdown code blocks if present
			improvedPrompt = improvedPrompt
				.replace(/^```(?:\w+)?\s*/i, '')
				.replace(/\s*```$/i, '');

			if (improvedPrompt && improvedPrompt.length > currentPrompt.length * 0.5) {
				// Update the full_automated block with the improved prompt
				const updatedBlocks = blocks.map((block) => {
					if (block.type === 'full_automated') {
						return { ...block, value: improvedPrompt };
					}
					return block;
				});

				form.setValue('hybridBlockPrompts', updatedBlocks, {
					shouldDirty: true,
					shouldValidate: true,
				});

				toast.success('Prompt upscaled successfully!');

				// Re-score the new prompt
				await scoreFullAutomatedPrompt(improvedPrompt);
			} else {
				toast.error('Failed to generate an improved prompt. Please try again.');
			}
		} catch (error) {
			console.error('[Upscale Prompt] Error:', error);
			toast.error('Failed to upscale prompt. Please try again.');
		} finally {
			setIsUpscalingPrompt(false);
		}
	}, [callGemini, form, scoreFullAutomatedPrompt]);

	/**
	 * Undo the upscaled prompt by restoring the previous value.
	 */
	const undoUpscalePrompt = useCallback(() => {
		if (!previousPromptValue) {
			toast.error('No previous prompt to restore.');
			return;
		}

		const blocks = form.getValues('hybridBlockPrompts');
		const updatedBlocks = blocks.map((block) => {
			if (block.type === 'full_automated') {
				return { ...block, value: previousPromptValue };
			}
			return block;
		});

		form.setValue('hybridBlockPrompts', updatedBlocks, {
			shouldDirty: true,
			shouldValidate: true,
		});

		// Re-score the restored prompt
		scoreFullAutomatedPrompt(previousPromptValue);

		setPreviousPromptValue(null);
		toast.success('Prompt restored to previous version.');
	}, [form, previousPromptValue, scoreFullAutomatedPrompt]);

	const cancelGeneration = () => {
		isGenerationCancelledRef.current = true;
		setGenerationProgress(-1);
		if (abortController) {
			abortController.abort();
			setAbortController(null);
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
					const fullAiPrompt = fullAutomatedBlock?.value || '';

					// Pick a random model for test generation to preview variety
					const testModel = OPENROUTER_DRAFTING_MODELS[Math.floor(Math.random() * OPENROUTER_DRAFTING_MODELS.length)];
					console.log('[Test Generation] Using Full AI mode with prompt:', fullAiPrompt);
					console.log('[Test Generation] Using model:', testModel);

					if (!fullAiPrompt || fullAiPrompt.trim() === '') {
						throw new Error('Automated prompt cannot be empty');
					}

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
					// Prepend subject line in Inter bold to the message
					const messageWithSubject = `<span style="font-family: Inter; font-weight: bold;">${finalSubject}</span><br><br>${parsedRes.message}`;
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
						const fullAiPrompt = fullAutomatedBlock?.value || '';

						if (!fullAiPrompt || fullAiPrompt.trim() === '') {
							throw new Error('Automated prompt cannot be empty');
						}

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
						// Start live preview streaming for this recipient
						startLivePreviewStreaming(
							recipient.id,
							parsedDraft.message,
							parsedDraft.subject
						);
						if (!isAiSubject) {
							parsedDraft.subject = values.subject || parsedDraft.subject;
						}

						await createEmail({
							subject: parsedDraft.subject,
							message: convertAiResponseToRichTextEmail(
								parsedDraft.message,
								values.font,
								signatureText || null
							),
							campaignId: campaign.id,
							status: 'draft' as EmailStatus,
							contactId: recipient.id,
						});
						if (draftingMode === DraftingMode.ai) {
							console.log(
								`[Batch][Full AI] Saved draft#${draftIndex} contactId=${recipient.id} email=${recipient.email} model=${attemptModel}`
							);
						}
						// Hide live preview as soon as this draft is written
						hideLivePreview();
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
		let remainingCredits = draftCredits || 0;

		const controller = new AbortController();
		setAbortController(controller);

		const BATCH_SIZE = 3;
		let successfulEmails = 0;
		let stoppedDueToCredits = false;

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

		try {
			// show preview surface while generation is running
			setIsLivePreviewVisible(true);
			setLivePreviewMessage('Drafting...');
			setLivePreviewContactId(null);
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
				if (remainingCredits < creditCost && successfulEmails < contacts.length) {
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
			setAbortController(null);
			setGenerationProgress(-1);
			// Hide live preview after completion so the DraftPreviewBox disappears promptly
			hideLivePreview();
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
			if (!fullAiPrompt) {
				toast.error('Please set up your email template on the Testing tab first.');
				return;
			}

			// Don't block batch generation on scoring; run in background.
			console.log('[Batch][Full AI] Scoring prompt in background (Gemini)…');
			scoreFullAutomatedPrompt(fullAiPrompt);
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
			if (abortController) {
				abortController.abort();
			}
			if (livePreviewTimerRef.current) {
				clearInterval(livePreviewTimerRef.current);
				livePreviewTimerRef.current = null;
			}
		};
		/* eslint-disable-next-line react-hooks/exhaustive-deps */
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
		scoreFullAutomatedPrompt,
		critiqueManualEmailText,
	};
};
