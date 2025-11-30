import { DEFAULT_FONT, FONT_OPTIONS } from '@/constants';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useGetContacts } from '@/hooks/queryHooks/useContacts';
import { useCreateEmail } from '@/hooks/queryHooks/useEmails';
import { useGetSignatures } from '@/hooks/queryHooks/useSignatures';
import { useEditUser } from '@/hooks/queryHooks/useUsers';
import { useMe } from '@/hooks/useMe';
import { DraftEmailResponse } from '@/hooks/usePerplexity';
import { useGemini } from '@/hooks/useGemini';
import { GEMINI_FULL_AI_PROMPT, GEMINI_HYBRID_PROMPT } from '@/constants/ai';
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
	/**
	 * Optional callback to switch the campaign page into the Search tab.
	 */
	onGoToSearch?: () => void;
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
	const [abortController, setAbortController] = useState<AbortController | null>(null);
	const [isFirstLoad, setIsFirstLoad] = useState(true);
	const [activeTab, setActiveTab] = useState<'test' | 'placeholders'>('test');

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

	const isPendingGeneration = isPendingCallGemini || isPendingCreateEmail;

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
		signal?: AbortSignal
	): Promise<DraftEmailResponse> => {
		if (!campaign.identity) {
			toast.error('Campaign identity is required');
			throw new Error('Campaign identity is required');
		}

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
			`[Full AI] Starting generation for contact: ${recipient.id} (${recipient.email})`
		);
		console.log('[Full AI] Populated System Prompt:', populatedSystemPrompt);
		console.log('[Full AI] User Prompt:', userPrompt);

		let geminiResponse: string;
		try {
			geminiResponse = await callGemini({
				model: 'gemini-3-pro-preview',
				prompt: populatedSystemPrompt, // Use the new, populated prompt
				content: userPrompt,
				signal,
			});
		} catch (error) {
			console.error('[Full AI] Gemini call failed:', error);
			if (error instanceof Error && error.message.includes('cancelled')) {
				throw error;
			}
			throw new Error(
				`Failed to generate email content: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}

		console.log('[Full AI] Gemini response preview:', geminiResponse);

		// Parse Gemini response directly (no Mistral processing)
		let geminiParsed: DraftEmailResponse;
		try {
			// Robust JSON parsing: handle markdown blocks, extra text, etc.
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

			// Remove any trailing commas before closing braces/brackets (common LLM mistake)
			cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');

			console.log(
				'[Full AI] Attempting to parse cleaned JSON:',
				cleanedResponse.substring(0, 200)
			);
			geminiParsed = JSON.parse(cleanedResponse);

			// Validate the parsed object has required fields
			if (!geminiParsed.message || !geminiParsed.subject) {
				throw new Error('Parsed JSON missing required fields (message or subject)');
			}

			console.log('[Full AI] Successfully parsed Gemini response');
		} catch (e) {
			console.error('[Full AI] Gemini JSON parse failed:', e);
			console.error('[Full AI] Failed response was:', geminiResponse);

			// Better fallback: try to extract subject and message as plain text
			const subjectMatch = geminiResponse.match(/subject[:\s]+["']?([^"'\n]+)["']?/i);
			const messageMatch = geminiResponse.match(
				/message[:\s]+["']?([\s\S]+?)["']?(?:\}|$)/i
			);

			if (subjectMatch && messageMatch) {
				geminiParsed = {
					subject: subjectMatch[1].trim(),
					message: messageMatch[1].trim(),
				};
				console.log('[Full AI] Extracted from plain text fallback');
			} else {
				// Last resort: use the Gemini response as message and generate a subject
				geminiParsed = {
					subject: `Email regarding ${recipient.company || 'your inquiry'}`,
					message: geminiResponse,
				};
				console.log('[Full AI] Using Gemini response as fallback');
			}
		}

		if (!geminiParsed.message || !geminiParsed.subject) {
			throw new Error('No message or subject generated by Gemini');
		}

		return {
			subject: removeEmDashes(geminiParsed.subject),
			message: removeEmDashes(geminiParsed.message),
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
			const subjectMatch = geminiResponse.match(/subject[:\s]+["']?([^"'\n]+)["']?/i);
			const messageMatch = geminiResponse.match(
				/message[:\s]+["']?([\s\S]+?)["']?(?:\}|$)/i
			);

			if (subjectMatch && messageMatch) {
				geminiParsed = {
					subject: subjectMatch[1].trim(),
					message: messageMatch[1].trim(),
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

					console.log('[Test Generation] Using Full AI mode with prompt:', fullAiPrompt);

					if (!fullAiPrompt || fullAiPrompt.trim() === '') {
						throw new Error('Automated prompt cannot be empty');
					}

					parsedRes = await draftAiEmail(
						contacts[0],
						fullAiPrompt,
						values.draftingTone,
						values.paragraphs
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
		controller: AbortController
	) => {
		const values = getValues();

		return batchToProcess.map(async (recipient: Contact) => {
			const MAX_RETRIES = 5;
			let lastError: Error | null = null;

			for (
				let retryCount = 0;
				retryCount <= MAX_RETRIES && !isGenerationCancelledRef.current;
				retryCount++
			) {
				try {
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

						parsedDraft = await draftAiEmail(
							recipient,
							fullAiPrompt,
							values.draftingTone,
							values.paragraphs,
							controller.signal
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

		const BATCH_SIZE = 10;
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
					generateBatchPromises(batch, controller);

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
			const fullAiPrompt = fullAutomatedBlock?.value || '';
			if (!fullAiPrompt || fullAiPrompt.trim() === '') {
				toast.error('Please set up your email template on the Testing tab first.');
				return;
			}
		} else if (draftingMode === DraftingMode.hybrid) {
			if (!hybridBlocks || hybridBlocks.length === 0) {
				toast.error('Please set up your email template on the Testing tab first.');
				return;
			}
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
	};
};
