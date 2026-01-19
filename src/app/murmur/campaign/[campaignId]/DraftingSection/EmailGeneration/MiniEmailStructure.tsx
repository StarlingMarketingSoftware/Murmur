import {
	FC,
	useMemo,
	useState,
	useRef,
	Fragment,
	useEffect,
	useLayoutEffect,
	useCallback,
	ReactNode,
} from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { Button } from '@/components/ui/button';
import { HybridBlock } from '@prisma/client';
import { cn } from '@/utils';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';
import CloseButtonIcon from '@/components/atoms/_svg/CloseButtonIcon';
import { AUTO_SIGNATURE_LIBRARY, isAutoSignatureValue } from '@/constants/autoSignatures';
import {
	FullAutoBodyBlock,
	type FullAutoProfileFields,
} from '@/components/molecules/HybridPromptInput/FullAutoBodyBlock';
import { MiniManualEmailEntry } from './MiniManualEmailEntry';

type MiniIdentityProfile = {
	name: string;
	genre?: string | null;
	area?: string | null;
	bandName?: string | null;
	bio?: string | null;
	website?: string | null;
};

type MiniIdentityUpdate = {
	name?: string;
	genre?: string | null;
	area?: string | null;
	bandName?: string | null;
	bio?: string | null;
	website?: string | null;
};

const PROFILE_PROGRESS_SEQUENCE = [
	{ key: 'name', label: 'Name' },
	{ key: 'genre', label: 'Genre' },
	{ key: 'area', label: 'Area' },
	{ key: 'band', label: 'Band/Artist Name' },
	{ key: 'bio', label: 'Bio' },
	{ key: 'links', label: 'Links' },
] as const;

type ProfileField = (typeof PROFILE_PROGRESS_SEQUENCE)[number]['key'];

interface MiniEmailStructureProps {
	form: UseFormReturn<DraftingFormValues>;
	onDraft: () => void;
	isDraftDisabled: boolean;
	isPendingGeneration: boolean;
	generationProgress?: number;
	generationTotal?: number;
	onCancel?: () => void;
	/** Optional render variant; `settings` is used by Drafts/Sent settings preview panel. */
	variant?: 'default' | 'settings';
	/** Settings variant: top contact/name row (left side). */
	settingsPrimaryLabel?: string;
	/** Settings variant: top contact/company row (right side). */
	settingsSecondaryLabel?: string;
	/** When true, hides the floating top number/label chrome */
	hideTopChrome?: boolean;
	/** When true, hides the footer Draft/progress controls */
	hideFooter?: boolean;
	/** When true, use 100% width so parent can control width on mobile */
	fullWidthMobile?: boolean;
	/** When true, hides the +Text buttons on the left side */
	hideAddTextButtons?: boolean;
	/** When true, visually hides all text inside the panel (used for empty Drafts state) */
	hideAllText?: boolean;
	/** Optional height override for the container */
	height?: number | string;
	/** Optional fill/background color for the panel "pages" (defaults to the legacy green). */
	pageFillColor?: string;
	/**
	 * Optional extra top header spacer (in px). When provided (> 0), renders
	 * a blank white band at the very top with a horizontal divider at the bottom,
	 * pushing the rest of the contents down.
	 */
	topHeaderHeight?: number;
	/** Optional label rendered inside the top header band (when `topHeaderHeight` is provided). */
	topHeaderLabel?: string;
	/** Optional callback to open the Writing tab (shows Open control when provided) */
	onOpenWriting?: () => void;
	/**
	 * When true, renders as a non-editable preview (used on Drafts tab).
	 * Still allows scrolling, but blocks pointer interactions inside the panel.
	 */
	readOnly?: boolean;
	/**
	 * When true, compresses the layout to avoid showing an internal scrollbar.
	 * Used by the Campaign "All" tab where this panel is rendered in a fixed-height tile.
	 */
	fitToHeight?: boolean;
	/**
	 * When `fitToHeight` is enabled, keep the layout scale "sticky" (can shrink but won't grow back).
	 * This prevents the header/mode pills from changing size when switching between Auto/Manual/Hybrid.
	 */
	lockFitToHeightScale?: boolean;
	/** Full Auto: profile chips (matches HybridPromptInput "Body" block) */
	profileFields?: FullAutoProfileFields | null;
	/** Profile Tab: identity baseline (used for save comparisons) */
	identityProfile?: MiniIdentityProfile | null;
	/** Profile Tab: persist identity profile changes (mirrors HybridPromptInput Profile tab) */
	onIdentityUpdate?: (data: MiniIdentityUpdate) => void | Promise<void>;
}

export const MiniEmailStructure: FC<MiniEmailStructureProps> = ({
	form,
	onDraft,
	isDraftDisabled,
	isPendingGeneration,
	generationProgress,
	generationTotal,
	onCancel,
	variant = 'default',
	settingsPrimaryLabel,
	settingsSecondaryLabel,
	hideTopChrome,
	hideFooter,
	fullWidthMobile,
	hideAddTextButtons,
	hideAllText,
	height,
	pageFillColor,
	topHeaderHeight,
	topHeaderLabel,
	// onOpenWriting is accepted but currently not rendered (reserved for future use)
	readOnly,
	fitToHeight,
	lockFitToHeightScale,
	profileFields,
	identityProfile,
	onIdentityUpdate,
}) => {
	const watchedHybridBlocks = form.watch('hybridBlockPrompts');
	const hybridBlocks = useMemo(() => watchedHybridBlocks || [], [watchedHybridBlocks]);
	const isAiSubject = form.watch('isAiSubject');
	const manualSubjectValue = (form.watch('subject') || '').trim();
	const signature = form.watch('signature') || '';
	const isSettingsPanel = variant === 'settings';
	const isAutoSignatureResolved = useMemo(() => {
		const normalized = (signature || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
		if (!normalized) return true;
		// Legacy heuristic ("Thank you,\n...") still counts as Auto.
		if (isAutoSignatureValue(normalized)) return true;

		// Draft snapshots store the *resolved* auto signature (random per draft), so treat any
		// signature whose first line matches the auto library phrases as "Auto Signature".
		const firstLine = normalized.split('\n')[0]?.trim() || '';
		if (!firstLine) return false;
		return AUTO_SIGNATURE_LIBRARY.some((tpl) => {
			const tplFirstLine = String(tpl).split('\n')[0]?.trim() || '';
			return tplFirstLine !== '' && tplFirstLine === firstLine;
		});
	}, [signature]);

	// Track which tab is active: 'main' (normal email structure) or 'profile'
	const [activeTab, setActiveTab] = useState<'main' | 'profile'>('main');
	// Track if user has ever left the profile tab (to show red for incomplete fields after returning)
	const [hasLeftProfileTab, setHasLeftProfileTab] = useState(false);
	// Track which profile box is expanded (null = none expanded)
	const [expandedProfileBox, setExpandedProfileBox] = useState<ProfileField | null>(null);
	const expandedProfileBoxRef = useRef<HTMLDivElement>(null);

	const initialProfileTabFields = useMemo<FullAutoProfileFields>(
		() => ({
			name: profileFields?.name ?? identityProfile?.name ?? '',
			genre: profileFields?.genre ?? (identityProfile?.genre ?? ''),
			area: profileFields?.area ?? (identityProfile?.area ?? ''),
			band: profileFields?.band ?? (identityProfile?.bandName ?? ''),
			bio: profileFields?.bio ?? (identityProfile?.bio ?? ''),
			links: profileFields?.links ?? (identityProfile?.website ?? ''),
		}),
		[identityProfile, profileFields]
	);
	// Profile field values - initialized from identity/profileFields, kept local so UI updates immediately.
	const [profileTabFields, setProfileTabFields] =
		useState<FullAutoProfileFields>(initialProfileTabFields);

	// Sync profileTabFields when identity/profileFields change
	useEffect(() => {
		setProfileTabFields(initialProfileTabFields);
	}, [initialProfileTabFields]);

	// Signature: Auto/Manual toggle (mirrors HybridPromptInput "Auto" tab behavior)
	// Auto ON: compact pill by default, expands on hover.
	// Auto OFF: expanded box with textarea.
	const [isAutoSignature, setIsAutoSignature] = useState(true);
	const [manualSignatureValue, setManualSignatureValue] = useState('');
	const autoSignatureValueRef = useRef<string>(signature);

	useEffect(() => {
		// Keep a fresh baseline "auto" signature while Auto is enabled (e.g., identity name updates).
		if (isAutoSignature) autoSignatureValueRef.current = signature;
	}, [isAutoSignature, signature]);

	// Profile score bar (weighted by UI order; mirrors HybridPromptInput rules)
	// Bio completion rule:
	// - Until 7 words: always prompt for a fuller bio
	// - At 7+ words: require a complete sentence (has sentence punctuation)
	const bioWordCount = useMemo(() => {
		const trimmed = profileTabFields.bio.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter(Boolean).length;
	}, [profileTabFields.bio]);
	const bioHasSentencePunctuation = useMemo(() => {
		const trimmed = profileTabFields.bio.trim();
		if (!trimmed) return false;
		// Accept punctuation anywhere so users don't need to end with a period.
		// Also accept the unicode ellipsis character.
		return /[.!?…]/.test(trimmed);
	}, [profileTabFields.bio]);
	const isBioIncomplete = useMemo(() => {
		if (bioWordCount === 0) return true;
		if (bioWordCount < 7) return true;
		return !bioHasSentencePunctuation;
	}, [bioHasSentencePunctuation, bioWordCount]);

	const filledProfileFieldCount = useMemo(() => {
		const values = [
			profileTabFields.name,
			profileTabFields.genre,
			profileTabFields.area,
			profileTabFields.band,
			profileTabFields.bio,
			profileTabFields.links,
		];
		return values.reduce((count, v) => count + (v.trim() ? 1 : 0), 0);
	}, [
		profileTabFields.area,
		profileTabFields.band,
		profileTabFields.bio,
		profileTabFields.genre,
		profileTabFields.links,
		profileTabFields.name,
	]);

	const sequentialFilledProfileFieldCount = useMemo(() => {
		const isComplete = (key: (typeof PROFILE_PROGRESS_SEQUENCE)[number]['key']) => {
			const trimmed = profileTabFields[key].trim();
			if (!trimmed) return false;
			if (key === 'bio') return !isBioIncomplete;
			return true;
		};

		let count = 0;
		for (const step of PROFILE_PROGRESS_SEQUENCE) {
			if (isComplete(step.key)) count += 1;
			else break;
		}
		return count;
	}, [
		isBioIncomplete,
		profileTabFields.area,
		profileTabFields.band,
		profileTabFields.bio,
		profileTabFields.genre,
		profileTabFields.links,
		profileTabFields.name,
	]);

	const nextProfileFieldToFill = useMemo(() => {
		const isComplete = (key: (typeof PROFILE_PROGRESS_SEQUENCE)[number]['key']) => {
			const trimmed = profileTabFields[key].trim();
			if (!trimmed) return false;
			if (key === 'bio') return !isBioIncomplete;
			return true;
		};

		return PROFILE_PROGRESS_SEQUENCE.find((step) => !isComplete(step.key)) ?? null;
	}, [
		isBioIncomplete,
		profileTabFields.area,
		profileTabFields.band,
		profileTabFields.bio,
		profileTabFields.genre,
		profileTabFields.links,
		profileTabFields.name,
	]);

	const profileSuggestionScore = useMemo(() => {
		// Completion mapping (weighted by order / consecutive fill):
		// 0 -> 0
		// 1 -> 50
		// 2 -> 60
		// 3 -> 70
		// 4 -> 80
		// 5 -> 90
		// 6 -> 100
		if (sequentialFilledProfileFieldCount <= 0) return 0;
		if (sequentialFilledProfileFieldCount === 1) return 50;
		if (sequentialFilledProfileFieldCount === 2) return 60;
		if (sequentialFilledProfileFieldCount === 3) return 70;
		if (sequentialFilledProfileFieldCount === 4) return 80;
		if (sequentialFilledProfileFieldCount === 5) return 90;
		return 100;
	}, [sequentialFilledProfileFieldCount]);

	const profileSuggestionLabel = useMemo(() => {
		// If the user hasn't started anything, keep the friendly default.
		if (filledProfileFieldCount === 0) return 'Get Started';

		// Weighting is ordered: always prompt for the first missing field in UI order.
		if (nextProfileFieldToFill) {
			// Custom copy for the Area step once Name + Genre are complete.
			if (nextProfileFieldToFill.key === 'area' && sequentialFilledProfileFieldCount >= 2) {
				return 'Where are you Based?';
			}
			// Bio guidance: keep prompting until it's 7+ words AND a full sentence.
			if (nextProfileFieldToFill.key === 'bio') {
				return 'Write a Full Bio';
			}
			return `Add your ${nextProfileFieldToFill.label}`;
		}

		// All fields filled.
		return 'Excellent';
	}, [filledProfileFieldCount, nextProfileFieldToFill, sequentialFilledProfileFieldCount]);

	const profileSuggestionDisplayLabel =
		profileSuggestionScore === 0
			? profileSuggestionLabel
			: `${profileSuggestionScore} - ${profileSuggestionLabel}`;
	const profileSuggestionFillPercent = Math.max(
		0,
		Math.min(100, Math.round(profileSuggestionScore))
	);

	const isKeyProfileIncomplete = useMemo(() => {
		return (
			!profileTabFields.name.trim() ||
			!profileTabFields.genre.trim() ||
			!profileTabFields.area.trim() ||
			!profileTabFields.bio.trim()
		);
	}, [profileTabFields.name, profileTabFields.genre, profileTabFields.area, profileTabFields.bio]);

	const normalizeNullable = (value: string | null | undefined) => {
		const trimmed = (value ?? '').trim();
		return trimmed === '' ? null : trimmed;
	};

	const lastProfileSaveRef = useRef<{ key: string; at: number } | null>(null);
	const shouldSkipDuplicateProfileSave = (key: string) => {
		const now = Date.now();
		const last = lastProfileSaveRef.current;
		// Prevent double-save when an input unmounts (blur + explicit save)
		if (last?.key === key && now - last.at < 800) return true;
		lastProfileSaveRef.current = { key, at: now };
		return false;
	};

	// Handle saving a profile field
	const saveProfileField = useCallback(
		(field: ProfileField) => {
			if (!onIdentityUpdate || !identityProfile) return;

			// Name is required on Identity. If empty, skip saving.
			if (field === 'name') {
				const next = profileTabFields.name.trim();
				const prev = identityProfile.name.trim();
				if (!next || next === prev) return;
				if (shouldSkipDuplicateProfileSave(`name:${next}`)) return;
				void onIdentityUpdate({ name: next });
				return;
			}

			const next = normalizeNullable(profileTabFields[field]);
			const prev = (() => {
				switch (field) {
					case 'genre':
						return normalizeNullable(identityProfile.genre);
					case 'area':
						return normalizeNullable(identityProfile.area);
					case 'band':
						return normalizeNullable(identityProfile.bandName);
					case 'bio':
						return normalizeNullable(identityProfile.bio);
					case 'links':
						return normalizeNullable(identityProfile.website);
				}
			})();

			if (next === prev) return;
			if (shouldSkipDuplicateProfileSave(`${field}:${next ?? ''}`)) return;

			switch (field) {
				case 'genre':
					void onIdentityUpdate({ genre: next });
					return;
				case 'area':
					void onIdentityUpdate({ area: next });
					return;
				case 'band':
					void onIdentityUpdate({ bandName: next });
					return;
				case 'bio':
					void onIdentityUpdate({ bio: next });
					return;
				case 'links':
					void onIdentityUpdate({ website: next });
					return;
			}
		},
		[identityProfile, onIdentityUpdate, profileTabFields]
	);

	// Close the expanded profile field when clicking away
	const saveProfileFieldRef = useRef(saveProfileField);
	saveProfileFieldRef.current = saveProfileField;
	useEffect(() => {
		if (activeTab !== 'profile' || !expandedProfileBox) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			const container = expandedProfileBoxRef.current;
			if (!target || !container) return;
			if (container.contains(target)) return;

			saveProfileFieldRef.current(expandedProfileBox as ProfileField);
			setExpandedProfileBox(null);
		};

		document.addEventListener('pointerdown', handlePointerDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [activeTab, expandedProfileBox]);

	const PROFILE_FIELD_ORDER: ProfileField[] = ['name', 'genre', 'area', 'band', 'bio', 'links'];

	const handleProfileFieldEnter = (field: ProfileField) => {
		// Don't allow Enter to advance if Name is empty (Identity.name is required)
		if (field === 'name' && profileTabFields.name.trim() === '') return;

		saveProfileField(field);

		const idx = PROFILE_FIELD_ORDER.indexOf(field);
		const nextField = idx >= 0 ? PROFILE_FIELD_ORDER[idx + 1] : null;
		setExpandedProfileBox(nextField ?? null);
	};

	const getProfileHeaderBg = (field: ProfileField) => {
		if (expandedProfileBox === field) return '#E0E0E0';
		if (profileTabFields[field].trim()) return '#94DB96';
		// Show red only if user has left the profile tab before
		return hasLeftProfileTab ? '#E47979' : '#E0E0E0';
	};

	const getProfileHeaderText = (
		field: ProfileField,
		labelWhenEmpty: string,
		labelWhenExpanded: string
	) => {
		if (expandedProfileBox === field) return labelWhenExpanded;
		return profileTabFields[field].trim() || labelWhenEmpty;
	};

	// Handle saving a profile field on blur
	const handleProfileFieldBlur = (field: ProfileField) => {
		saveProfileField(field);
	};

	// Handle toggling a profile box - saves the current field if collapsing
	const handleProfileBoxToggle = (box: ProfileField) => {
		// If we're collapsing the currently expanded box, save its value first
		if (expandedProfileBox === box) {
			saveProfileField(box);
			setExpandedProfileBox(null);
		} else {
			// If we're switching to a new box and there's a previously expanded one, save it first
			if (expandedProfileBox) {
				saveProfileField(expandedProfileBox as ProfileField);
			}
			setExpandedProfileBox(box);
		}
	};

	// Save any expanded profile field when switching away from profile tab
	useEffect(() => {
		if (activeTab !== 'profile' && expandedProfileBox) {
			saveProfileField(expandedProfileBox as ProfileField);
			setExpandedProfileBox(null);
		}
	}, [activeTab, expandedProfileBox, saveProfileField]);

	// Track which blocks are expanded
	const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

	const buttonContainerRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

	const draftingMode = useMemo(() => {
		const hasFullAutomatedBlock = hybridBlocks?.some(
			(block) => block.type === 'full_automated'
		);
		if (hasFullAutomatedBlock) return 'ai';
		const isOnlyTextBlocks = hybridBlocks?.every((block) => block.type === 'text');
		if (isOnlyTextBlocks) return 'handwritten';
		return 'hybrid';
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hybridBlocks?.length, hybridBlocks?.map((b) => b.type).join(',')]);

	// On mobile portrait in hybrid mode, add extra gap before the inline signature
	// only when the last rendered block is a core (not a trailing text block).
	const shouldUseLargeHybridSigGap = useMemo(() => {
		if (draftingMode !== 'hybrid') return false;
		const blocks = hybridBlocks || [];
		if (blocks.length === 0) return false;
		const last = blocks[blocks.length - 1];
		return last?.type !== 'text';
	}, [draftingMode, hybridBlocks]);

	// Simple breakpoint check for render-time style tweaks (mobile portrait)
	const isMobilePortrait =
		typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;

	// Treat short-height devices as mobile landscape for spacing tweaks
	const isMobileLandscape =
		typeof window !== 'undefined' && window.matchMedia('(max-height: 480px)').matches;

	const [addTextButtons, setAddTextButtons] = useState<
		Array<{ blockId: string; top: number; show: boolean }>
	>([]);
	const blockIds = useMemo(() => hybridBlocks.map((b) => b.id).join(','), [hybridBlocks]);

	// --- All tab: fit-to-height compression (avoid inner scrollbar) ---
	const fitContentRef = useRef<HTMLDivElement>(null);
	const [fitScale, setFitScale] = useState(1);
	const isFitToHeightEnabled = Boolean(fitToHeight) && !isMobilePortrait && !isMobileLandscape;

	useLayoutEffect(() => {
		if (!isFitToHeightEnabled) {
			setFitScale(1);
			return;
		}
		if (typeof window === 'undefined') return;

		const container = buttonContainerRef.current;
		const content = fitContentRef.current;
		if (!container || !content) return;

		let raf = 0 as number | 0;
		const compute = () => {
			if (!container || !content) return;
			const available = container.clientHeight;
			const needed = content.scrollHeight;
			if (!available || !needed) return;

			const rawNext =
				// If the content already fits, don't scale. This avoids "always slightly smaller"
				// when the content container has a min-height equal to the available height (e.g. Manual mode).
				needed <= available + 1
					? 1
					: // Slight pad to avoid 1px overflow from rounding.
					  Math.min(1, Math.max(0.6, (available - 2) / needed));

			setFitScale((prev) => {
				const next = lockFitToHeightScale ? Math.min(prev, rawNext) : rawNext;
				return Math.abs(prev - next) < 0.004 ? prev : next;
			});
		};

		const schedule = () => {
			if (raf) return;
			raf = requestAnimationFrame(() => {
				raf = 0;
				compute();
			});
		};

		// Initial pass after layout settles.
		schedule();

		const ro = new ResizeObserver(() => schedule());
		ro.observe(container);
		ro.observe(content);
		window.addEventListener('resize', schedule);

		return () => {
			if (raf) cancelAnimationFrame(raf);
			ro.disconnect();
			window.removeEventListener('resize', schedule);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFitToHeightEnabled,
		activeTab,
		draftingMode,
		expandedBlocks,
		// Profile tab content changes can affect height
		profileTabFields.name,
		profileTabFields.genre,
		profileTabFields.area,
		profileTabFields.band,
		profileTabFields.bio,
		profileTabFields.links,
	]);

	// Calculate absolute Y positions for the +Text buttons relative to root and whether each should be shown
	const recomputeAddButtonPositions = useCallback(() => {
		const nextButtons: Array<{ blockId: string; top: number; show: boolean }> = [];
		if (draftingMode === 'hybrid' && rootRef.current) {
			const rootRect = rootRef.current.getBoundingClientRect();
			const hybridCoreBlocks = hybridBlocks.filter(
				(b) => b.type === 'introduction' || b.type === 'research' || b.type === 'action'
			);

			// Fixed offset for buttons below their blocks
			// Add a tiny bit more space on small screens to avoid visual crowding
			const isMobilePortrait =
				typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;
			const buttonOffset = isMobilePortrait ? 4 : 2;

			const container = buttonContainerRef.current;
			const containerRect = container?.getBoundingClientRect();

			for (const block of hybridCoreBlocks) {
				const blockEl = blockRefs.current[block.id];
				if (!blockEl || !containerRect || !container) continue;

				// Compute Y relative to the scroll container to avoid drift
				// yWithinContainer: block's bottom inside the scroll area, plus fixed offset
				const yWithinContainer =
					blockEl.offsetTop + blockEl.offsetHeight + buttonOffset - container.scrollTop;
				// Convert container-relative Y to root-relative Y for absolute positioning
				const buttonTop = containerRect.top - rootRect.top + yWithinContainer;
				const indexInAll = hybridBlocks.findIndex((b) => b.id === block.id);
				const hasImmediateTextBlock = hybridBlocks[indexInAll + 1]?.type === 'text';
				nextButtons.push({
					blockId: block.id,
					top: buttonTop,
					show: !hasImmediateTextBlock,
				});
			}
		}
		setAddTextButtons(nextButtons);
	}, [draftingMode, hybridBlocks]);

	// Recompute when blocks change/expand/collapse
	useLayoutEffect(() => {
		recomputeAddButtonPositions();
	}, [recomputeAddButtonPositions]);

	// Keep positions in sync on scroll and resize to avoid drift/overlap
	useEffect(() => {
		const container = buttonContainerRef.current;
		if (!container) return;
		let rafId = 0 as number | 0;
		const schedule = () => {
			if (rafId) return;
			rafId = requestAnimationFrame(() => {
				rafId = 0;
				recomputeAddButtonPositions();
			});
		};

		container.addEventListener('scroll', schedule, {
			passive: true,
		} as AddEventListenerOptions);
		window.addEventListener('resize', schedule);

		// Observe size changes of container and blocks
		const ro = new ResizeObserver(() => schedule());
		ro.observe(container);
		Object.values(blockRefs.current).forEach((el) => {
			if (el) ro.observe(el);
		});

		// Initial run after listeners attach
		schedule();

		return () => {
			container.removeEventListener('scroll', schedule as EventListener);
			window.removeEventListener('resize', schedule);
			ro.disconnect();
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [recomputeAddButtonPositions, blockIds, draftingMode]);

	// Ensure the mini structure never appears empty by keeping at least one block present
	useEffect(() => {
		const currentBlocks = form.getValues('hybridBlockPrompts') || [];
		if (!currentBlocks || currentBlocks.length === 0) {
			form.setValue(
				'hybridBlockPrompts',
				[
					{
						id: 'introduction',
						type: 'introduction' as HybridBlock,
						value: '',
					},
					{
						id: 'research',
						type: 'research' as HybridBlock,
						value: '',
					},
					{ id: 'action', type: 'action' as HybridBlock, value: '' },
				],
				{ shouldDirty: true }
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const blockLabel = (type: HybridBlock) => {
		switch (type) {
			case 'introduction':
				return 'Intro';
			case 'research':
				return 'Research';
			case 'action':
				return 'CTA';
			case 'text':
				return 'Text';
			case 'full_automated':
				return 'Full Auto';
			default:
				return 'Block';
		}
	};

	// Subtitle hint shown next to hybrid block labels (hidden in hybrid mode)
	const blockHint = (type: HybridBlock) => {
		if (draftingMode === 'hybrid') return null;
		if (type === 'introduction') return 'Automated Intro';
		if (type === 'research') return 'Automated';
		if (type === 'action') return 'Automated Call to Action';
		return null;
	};

	const setMode = (mode: 'ai' | 'hybrid' | 'handwritten') => {
		const current = form.getValues('hybridBlockPrompts') || [];
		const byType = new Map<HybridBlock, string>();
		current.forEach((b) => byType.set(b.type as HybridBlock, b.value || ''));

		if (mode === 'ai') {
			// Save current blocks for return later
			if (current.length > 0 && current.every((b) => b.type === 'text')) {
				form.setValue('savedManualBlocks', current);
			} else if (
				current.length > 0 &&
				!current.some((b) => b.type === 'full_automated')
			) {
				form.setValue('savedHybridBlocks', current);
			}

			// Switch to Full Auto using stored fullAiPrompt if available
			const fullAiPrompt = (form.getValues('fullAiPrompt') as string) || '';
			form.setValue(
				'hybridBlockPrompts',
				[
					{
						id: 'full_automated',
						type: 'full_automated' as HybridBlock,
						value: fullAiPrompt,
					},
				],
				{ shouldDirty: true }
			);
			form.setValue('isAiSubject', true, { shouldDirty: true });
			return;
		}

		if (mode === 'handwritten') {
			// Save current content for return later
			if (current.some((b) => b.type === 'full_automated')) {
				form.setValue(
					'fullAiPrompt',
					(byType.get('full_automated' as HybridBlock) as string) || ''
				);
			} else if (current.length > 0 && !current.every((b) => b.type === 'text')) {
				form.setValue('savedHybridBlocks', current);
			}

			// Switch to Manual (text-only) using saved manual blocks if any
			const savedManual =
				(form.getValues('savedManualBlocks') as Array<{
					id: string;
					type: HybridBlock;
					value: string;
				}>) || [];
			form.setValue(
				'hybridBlockPrompts',
				savedManual.length > 0
					? savedManual
					: [{ id: `text_${Date.now()}`, type: 'text' as HybridBlock, value: '' }],
				{ shouldDirty: true }
			);
			form.setValue('isAiSubject', false, { shouldDirty: true });
			return;
		}

		// mode === 'hybrid'
		if (current.some((b) => b.type === 'full_automated')) {
			form.setValue(
				'fullAiPrompt',
				(byType.get('full_automated' as HybridBlock) as string) || ''
			);
		} else if (current.length > 0 && current.every((b) => b.type === 'text')) {
			form.setValue('savedManualBlocks', current);
		} else if (current.length > 0) {
			form.setValue('savedHybridBlocks', current);
		}

		const savedHybrid =
			(form.getValues('savedHybridBlocks') as Array<{
				id: string;
				type: HybridBlock;
				value: string;
			}>) || [];
		const blocks =
			savedHybrid.length > 0
				? savedHybrid
				: [
						{
							id: 'introduction',
							type: 'introduction' as HybridBlock,
							value: '',
						},
						{
							id: 'research',
							type: 'research' as HybridBlock,
							value: '',
						},
						{ id: 'action', type: 'action' as HybridBlock, value: '' },
				  ];
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
		form.setValue('isAiSubject', true, { shouldDirty: true });
	};

	// Selected mode highlight (mirror main selector)
	const MODE_HIGHLIGHT_WIDTH = 80.38;
	const modeContainerRef = useRef<HTMLDivElement>(null);
	const aiButtonRef = useRef<HTMLButtonElement>(null);
	const hybridButtonRef = useRef<HTMLButtonElement>(null);
	const handwrittenButtonRef = useRef<HTMLButtonElement>(null);
	const [highlightStyle, setHighlightStyle] = useState<{ left: number; opacity: number }>(
		// Start hidden so it never flashes in the wrong spot during view transitions.
		{ left: 0, opacity: 0 }
	);
	const [isInitialRender, setIsInitialRender] = useState(true);

	// Use useLayoutEffect to calculate position BEFORE browser paints, preventing any visual jump
	useLayoutEffect(() => {
		let target: HTMLButtonElement | null = null;
		if (draftingMode === 'ai') target = aiButtonRef.current;
		else if (draftingMode === 'hybrid') target = hybridButtonRef.current;
		else target = handwrittenButtonRef.current;
		if (target) {
			const newLeft =
				target.offsetLeft + target.offsetWidth / 2 - MODE_HIGHLIGHT_WIDTH / 2;
			setHighlightStyle({ left: newLeft, opacity: 1 });
		} else {
			setHighlightStyle({ left: 0, opacity: 0 });
		}
		// When fit-to-height is enabled, the content can rescale which changes layout widths.
		// Recompute on fitScale so the highlight stays aligned with the selected mode button.
	}, [MODE_HIGHLIGHT_WIDTH, draftingMode, fitScale]);

	// Delay enabling transitions until after the first paint
	useEffect(() => {
		if (isInitialRender) {
			requestAnimationFrame(() => {
				setIsInitialRender(false);
			});
		}
	}, [isInitialRender]);

	const getModeBackgroundColor = () => {
		if (draftingMode === 'hybrid') return 'rgba(74, 74, 217, 0.31)';
		if (draftingMode === 'handwritten') return 'rgba(109, 171, 104, 0.47)';
		return '#DAE6FE';
	};

	const toggleSubject = () => {
		const next = !form.getValues('isAiSubject');
		form.setValue('isAiSubject', next, { shouldDirty: true });
		// When turning Auto back on, clear the manual subject (matches HybridPromptInput Auto tab behavior)
		if (next) form.setValue('subject', '', { shouldDirty: true });
	};

	const updateBlockValue = (id: string, value: string) => {
		const blocks = (form.getValues('hybridBlockPrompts') || []).map((b) =>
			b.id === id ? { ...b, value } : b
		);
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	// Normalize blocks into proper slot order: intro -> text -> research -> text -> action -> text
	// Only allows ONE text block per slot (no consecutive text blocks)
	const normalizeBlockOrder = (
		blocks: Array<{ id: string; type: HybridBlock; value: string }>
	) => {
		const slots: Array<'introduction' | 'research' | 'action'> = [
			'introduction',
			'research',
			'action',
		];
		const slotCore: Record<
			'introduction' | 'research' | 'action',
			{ id: string; type: HybridBlock; value: string } | null
		> = { introduction: null, research: null, action: null };
		const slotText: Record<
			'introduction' | 'research' | 'action',
			{ id: string; type: HybridBlock; value: string } | null
		> = { introduction: null, research: null, action: null };

		let currentSlot: 'introduction' | 'research' | 'action' = 'introduction';
		for (const b of blocks) {
			if (b.type === 'introduction' || b.type === 'research' || b.type === 'action') {
				slotCore[b.type] = b;
				currentSlot = b.type;
			} else if (b.type === 'text') {
				// Only keep the first text block per slot (prevents consecutive text blocks)
				if (!slotText[currentSlot]) {
					slotText[currentSlot] = b;
				}
			}
		}

		// Rebuild in proper order: core -> text (max 1) for each slot
		const normalized: Array<{ id: string; type: HybridBlock; value: string }> = [];
		for (const slot of slots) {
			if (slotCore[slot]) {
				normalized.push(slotCore[slot]!);
			}
			if (slotText[slot]) {
				normalized.push(slotText[slot]!);
			}
		}
		return normalized;
	};

	const addTextBlockAt = (index: number) => {
		const newText = {
			id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			type: 'text' as HybridBlock,
			value: '',
		};
		const blocks = [...(form.getValues('hybridBlockPrompts') || [])];
		blocks.splice(index + 1, 0, newText);
		const normalized = normalizeBlockOrder(blocks);
		form.setValue('hybridBlockPrompts', normalized, { shouldDirty: true });
	};

	// Add one text block at the first available slot position (after each core block in order)
	const addTextBlocksBetweenAll = () => {
		const currentBlocks = form.getValues('hybridBlockPrompts') || [];
		if (currentBlocks.length === 0) return;

		// Parse into slot structure
		const slots: Array<'introduction' | 'research' | 'action'> = [
			'introduction',
			'research',
			'action',
		];
		const slotCore: Record<string, boolean> = {};
		const slotHasText: Record<string, boolean> = {
			introduction: false,
			research: false,
			action: false,
		};

		let currentSlot = 'introduction';
		for (const b of currentBlocks) {
			if (b.type === 'introduction' || b.type === 'research' || b.type === 'action') {
				slotCore[b.type] = true;
				currentSlot = b.type;
			} else if (b.type === 'text') {
				slotHasText[currentSlot] = true;
			}
		}

		// Find the first slot that has a core block but no text block after it
		for (const slot of slots) {
			if (slotCore[slot] && !slotHasText[slot]) {
				// Find the index of this core block and add text after it
				const coreIndex = currentBlocks.findIndex((b) => b.type === slot);
				if (coreIndex !== -1) {
					addTextBlockAt(coreIndex);
					return;
				}
			}
		}

		// If all slots with core blocks already have text, do nothing (max 1 text per slot)
	};

	const addHybridBlock = (type: HybridBlock) => {
		const blocks = [...(form.getValues('hybridBlockPrompts') || [])];
		// Avoid duplicates
		if (blocks.some((b) => b.type === type)) return;

		const orderedCore: HybridBlock[] = [
			'introduction' as HybridBlock,
			'research' as HybridBlock,
			'action' as HybridBlock,
		];
		const newCoreIndex = orderedCore.findIndex((t) => t === type);

		let insertIndex = -1;
		for (let i = 0; i < blocks.length; i++) {
			const existingType = blocks[i].type as HybridBlock;
			const existingCoreIdx = orderedCore.findIndex((t) => t === existingType);
			if (existingCoreIdx !== -1 && existingCoreIdx > newCoreIndex) {
				insertIndex = i;
				break;
			}
		}

		if (insertIndex === -1) {
			let lastCoreIndex = -1;
			for (let i = blocks.length - 1; i >= 0; i--) {
				const existingType = blocks[i].type as HybridBlock;
				const existingCoreIdx = orderedCore.findIndex((t) => t === existingType);
				if (existingCoreIdx !== -1) {
					lastCoreIndex = i;
					break;
				}
			}
			insertIndex = lastCoreIndex === -1 ? 0 : lastCoreIndex + 1;
		}

		const newBlock = { id: String(type), type, value: '' } as {
			id: string;
			type: HybridBlock;
			value: string;
		};
		blocks.splice(insertIndex, 0, newBlock);
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	// Only allow removing Intro if both Research and CTA are already removed
	const canRemoveHybridCore = (id: string): boolean => {
		const blocks = form.getValues('hybridBlockPrompts') || [];
		const target = blocks.find((b) => b.id === id);
		if (!target) return false;
		if (draftingMode !== 'hybrid') return true;
		if (target.type !== 'introduction') return true;
		const hasResearch = blocks.some((b) => b.type === 'research');
		const hasAction = blocks.some((b) => b.type === 'action');
		return !hasResearch && !hasAction;
	};

	const removeBlock = (id: string) => {
		const currentBlocks = form.getValues('hybridBlockPrompts') || [];
		const target = currentBlocks.find((b) => b.id === id);
		if (!target) return;
		if (draftingMode === 'hybrid' && target.type === 'introduction') {
			const allowed = canRemoveHybridCore(id);
			if (!allowed) return; // keep Intro until other cores are removed
		}
		const blocks = currentBlocks.filter((b) => b.id !== id);
		const normalized = normalizeBlockOrder(blocks);
		form.setValue('hybridBlockPrompts', normalized, { shouldDirty: true });
	};

	const updateSignature = (value: string) => {
		form.setValue('signature', value, { shouldDirty: true });
	};

	// Compact signature layout is used for the pinned mini version on the
	// left side of the campaign page (where footer + chrome are hidden).
	// There we want normal-sized controls, but a thinner, tighter signature.
	const isCompactSignature = hideFooter && hideTopChrome;
	const resolvedTopHeaderHeight = topHeaderHeight ?? 0;
	const hasTopHeaderSpacer = resolvedTopHeaderHeight > 0;
	const resolvedPageFillColor = pageFillColor ?? '#A6E2A8';

	const SettingsPanelContent = () => {
		const primary = (settingsPrimaryLabel ?? '').trim();
		const secondary = (settingsSecondaryLabel ?? '').trim();
		const left = primary || secondary;
		const right = primary && secondary ? secondary : '';
		const modeLabel =
			draftingMode === 'ai' ? 'Auto' : draftingMode === 'handwritten' ? 'Manual' : 'Hybrid';
		const subjectLabel = isAiSubject ? 'Auto Subject' : manualSubjectValue || 'Manual Subject';
		const signatureLabel = isAutoSignatureResolved
			? 'Auto Signature'
			: signature.trim() || 'Manual Signature';

		const subjectTextClass = cn(
			'font-inter font-medium text-[12px] leading-none truncate',
			isAiSubject ? 'text-black' : manualSubjectValue ? 'text-black' : 'text-black/40 italic'
		);
		const signatureTextClass = cn(
			'font-inter font-medium text-[12px] leading-none truncate',
			isAutoSignatureResolved
				? 'text-black'
				: signature.trim()
					? 'text-black'
					: 'text-black/40 italic'
		);

		const renderBody = () => {
			if (draftingMode === 'ai') {
				const idx = Math.max(0, hybridBlocks.findIndex((b) => b.type === 'full_automated'));
				return (
					<FullAutoBodyBlock
						form={form}
						fieldIndex={idx}
						profileFields={profileTabFields}
						constrainHeight
						className="!h-[209px] !rounded-none !border-0"
					/>
				);
			}

			if (draftingMode === 'handwritten') {
				const html = (form.getValues('hybridBlockPrompts.0.value') as string) || '';
				return (
					<div className="w-full h-full bg-white">
						<style>{`
							[data-mini-settings-manual-body] ul {
								list-style: disc;
								padding-left: 1.25rem;
								margin: 0.5rem 0;
							}
							[data-mini-settings-manual-body] ol {
								list-style: decimal;
								padding-left: 1.25rem;
								margin: 0.5rem 0;
							}
							[data-mini-settings-manual-body] li {
								margin: 0.125rem 0;
							}
							[data-mini-settings-manual-body] a {
								color: #0066cc;
								text-decoration: underline;
							}
						`}</style>
						<div
							data-mini-settings-manual-body
							className="h-full w-full px-[10px] py-[8px] font-inter text-[12px] leading-[16px] text-black overflow-y-auto"
							data-mini-email-scroll="true"
							dangerouslySetInnerHTML={{
								__html: html?.trim()
									? html
									: '<span style="opacity:0.4;font-style:italic;">No body</span>',
							}}
						/>
					</div>
				);
			}

			// Hybrid mode: render collapsed-looking hybrid blocks (like the real UI) instead of "open" cards
			const borderFor = (t: HybridBlock) => {
				if (t === 'introduction') return '#6673FF';
				if (t === 'research') return '#1010E7';
				if (t === 'action') return '#0E0E7F';
				return '#000000';
			};
			const fillFor = (t: HybridBlock) => {
				if (t === 'text') return '#A2E2AF';
				return '#DADAFC';
			};

			return (
				<div className="w-full py-2 flex flex-col gap-[7px]">
					{hybridBlocks.map((b) => {
						const type = b.type as HybridBlock;
						return (
							<div
								key={b.id}
								className="rounded-[8px] border-2 overflow-hidden relative w-[93%] ml-[2.5%] h-[26px]"
								style={{
									borderColor: borderFor(type),
									backgroundColor: fillFor(type),
								}}
							>
								<div className="w-full h-full flex items-center justify-between">
									<div className="flex-1 flex h-full px-3 items-center min-w-0">
										<span className="font-inter text-[12px] leading-none font-semibold text-black truncate">
											{blockLabel(type)}
										</span>
									</div>
									<div
										className="w-[26px] h-full flex items-center justify-center"
										aria-hidden="true"
									>
										<svg
											width="7"
											height="5"
											viewBox="0 0 7 5"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M0.796875 0.796875L3.12021 3.34412L5.44355 0.796875"
												stroke="black"
												strokeWidth="1.59374"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			);
		};

		return (
			<>
				{/* Settings header (23px) */}
				<div
					className="w-full bg-white rounded-t-[5px] relative overflow-hidden flex items-center px-[9px]"
					style={{ height: 23 }}
				>
					<span className="font-inter font-semibold text-[12px] leading-none text-black truncate">
						Settings
					</span>
				</div>
				<div className="h-[2px] bg-[#000000] w-full" />

				{/* Name / Company (28px) */}
				<div
					className="w-full flex items-center px-[9px]"
					style={{ height: 28, backgroundColor: '#C1D6FF' }}
				>
					<div className="w-full flex items-center justify-between gap-2 min-w-0">
						<span className="font-inter font-medium text-[12px] leading-none text-black truncate min-w-0">
							{left || ' '}
						</span>
						{right && (
							<span className="font-inter font-medium text-[12px] leading-none text-black/80 truncate min-w-0">
								{right}
							</span>
						)}
					</div>
				</div>
				<div className="h-[2px] bg-[#000000] w-full" />

				{/* Mode used (27px) */}
				<div
					className="w-full flex items-center px-[9px]"
					style={{ height: 27, backgroundColor: '#DAE6FE' }}
				>
					<span className="font-inter font-semibold text-[12px] leading-none text-black truncate">
						{modeLabel}
					</span>
				</div>
				<div className="h-[2px] bg-[#000000] w-full" />

				{/* Subject (27px) */}
				<div
					className="w-full flex items-center px-[9px]"
					style={{
						height: 27,
						backgroundColor: isAiSubject ? '#E0E0E0' : '#FFFFFF',
					}}
				>
					<span className={subjectTextClass}>{subjectLabel}</span>
				</div>
				<div className="h-[2px] bg-[#000000] w-full" />

				{/* Body area (209px) */}
				<div
					className="w-full overflow-hidden"
					style={{ height: 209, backgroundColor: resolvedPageFillColor }}
				>
					<div className="w-full h-full overflow-y-auto" data-mini-email-scroll="true">
						{renderBody()}
					</div>
				</div>
				<div className="h-[2px] bg-[#000000] w-full" />

				{/* Signature (29px) - not shown for Manual mode */}
				{draftingMode !== 'handwritten' && (
					<>
						<div
							className="w-full flex items-center px-[9px]"
							style={{
								height: 29,
								backgroundColor: isAutoSignatureResolved ? '#E0E0E0' : '#FFFFFF',
							}}
						>
							<span className={signatureTextClass}>{signatureLabel}</span>
						</div>

						{/* Divider under the last row */}
						<div className="h-[2px] bg-[#000000] w-full" />
					</>
				)}

				{/* Remaining fill */}
				<div className="flex-1" style={{ backgroundColor: '#95CFFF' }} />
			</>
		);
	};

	return (
		<div
			ref={rootRef}
			data-mini-email-hide-text={hideAllText ? 'true' : 'false'}
			data-mini-email-readonly={readOnly ? 'true' : 'false'}
			style={{
				cursor: hideAllText || readOnly ? 'default' : 'auto',
				width: fullWidthMobile ? '100%' : '376px',
				height: height
					? height
					: isMobilePortrait || isMobileLandscape
					? 'auto'
					: isCompactSignature
					? '373px'
					: '474px',
				position: 'relative',
				overflow: 'visible',
			}}
		>
			{hideAllText && (
				<style jsx global>{`
					[data-mini-email-hide-text='true'],
					[data-mini-email-hide-text='true'] * {
						color: transparent !important;
					}
					[data-mini-email-hide-text='true'] input::placeholder,
					[data-mini-email-hide-text='true'] textarea::placeholder {
						color: transparent !important;
					}
				`}</style>
			)}
			{readOnly && (
				<style jsx global>{`
					/* Block pointer interactions for preview mode, but keep scrolling enabled. */
					[data-mini-email-readonly='true'] * {
						pointer-events: none !important;
					}
					[data-mini-email-readonly='true'] [data-mini-email-scroll='true'] {
						pointer-events: auto !important;
					}
				`}</style>
			)}
			{hideAllText && (
				<div
					aria-hidden="true"
					style={{
						position: 'absolute',
						inset: 0,
						pointerEvents: 'auto',
						cursor: 'default',
						background: 'transparent',
						zIndex: 2,
					}}
				/>
			)}
			{/* Centered number above block (hidden in mobile landscape) */}
			{!hideTopChrome && !isMobileLandscape && (
				<div
					data-drafting-top-number
					style={{
						position: 'absolute',
						top: '-26px',
						left: '50%',
						transform: 'translateX(-50%)',
						pointerEvents: 'none',
					}}
					className="text-[12px] font-inter font-medium text-black"
				>
					2
				</div>
			)}
			{/* Top-left text label */}
			{!hideTopChrome && !isMobileLandscape && (
				<div
					data-drafting-top-label
					style={{
						position: 'absolute',
						top: '-20px',
						left: '2px',
						pointerEvents: 'none',
					}}
					className="text-[12px] font-inter font-medium text-black"
				>
					Email Structure
				</div>
			)}
			{/* Container with header to match table sizing */}
			<div
				style={{
					width: '100%',
					height: isMobilePortrait || isMobileLandscape ? 'auto' : '100%',
					border: '3px solid #000000',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					background: resolvedPageFillColor,
					overflow: 'visible',
					zIndex: 1,
				}}
			>
				{/* Content area - miniature, but interactive */}
				<div
					ref={buttonContainerRef}
					data-mini-email-scroll="true"
					className={cn(
						isMobilePortrait || isMobileLandscape
							? 'overflow-visible'
							: isFitToHeightEnabled
								? 'flex-1 min-h-0 overflow-hidden'
								: 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden'
					)}
				>
					<div
						ref={fitContentRef}
						className={cn(
							'px-0 pb-3 max-[480px]:pb-2',
							isSettingsPanel && 'min-h-full flex flex-col pb-0 max-[480px]:pb-0',
							activeTab === 'profile' && 'min-h-full flex flex-col pb-0 max-[480px]:pb-0',
							activeTab !== 'profile' &&
								draftingMode === 'handwritten' &&
								'min-h-full flex flex-col pb-0 max-[480px]:pb-0'
						)}
						style={
							isFitToHeightEnabled
								? {
										transform: `scale(${fitScale})`,
										transformOrigin: 'top left',
										// Keep visual width at 100% even when scaling down.
										width: fitScale > 0 ? `${100 / fitScale}%` : '100%',
								  }
								: undefined
						}
					>
						{isSettingsPanel ? (
							<SettingsPanelContent />
						) : (
							<>
								{/* Mode */}
								{hasTopHeaderSpacer && (
							<>
								<div
									className="w-full bg-white rounded-t-[5px] relative overflow-hidden flex items-center px-[9px]"
									style={{ height: resolvedTopHeaderHeight }}
								>
									{topHeaderLabel && (
										<span className="font-inter font-semibold text-[12px] leading-none text-black truncate">
											{topHeaderLabel}
										</span>
									)}
								</div>
								<div className="h-[2px] bg-[#000000] w-full" />
							</>
								)}
						<div
							className={cn(
								'w-full bg-white relative overflow-hidden h-[31px]',
								!hasTopHeaderSpacer && 'rounded-t-[5px]'
							)}
						>
							{/* Inline step indicator for mobile landscape */}
							{isMobileLandscape && (
								<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[12px] leading-none font-inter font-medium text-black">
									<span>2</span>
									<svg
										width="7"
										height="12"
										viewBox="0 0 7 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M6.53033 6.53033C6.82322 6.23744 6.82322 5.76256 6.53033 5.46967L1.75736 0.696699C1.46447 0.403806 0.989593 0.403806 0.696699 0.696699C0.403806 0.989593 0.403806 1.46447 0.696699 1.75736L4.93934 6L0.696699 10.2426C0.403806 10.5355 0.403806 11.0104 0.696699 11.3033C0.989593 11.5962 1.46447 11.5962 1.75736 11.3033L6.53033 6.53033ZM5 6V6.75H6V6V5.25H5V6Z"
											fill="#636363"
											fillOpacity="0.46"
										/>
									</svg>
								</div>
							)}
							<div className="flex items-center w-full h-full">
								{(() => {
									const showRedWarning = hasLeftProfileTab && isKeyProfileIncomplete;
									return (
										<button
											type="button"
											onClick={() => setActiveTab('profile')}
											style={
												activeTab === 'profile'
													? { backgroundColor: resolvedPageFillColor }
													: undefined
											}
											className={cn(
												'w-[84px] h-full flex items-center justify-center border-r-2 border-black font-inter font-semibold text-[11px] leading-none transition-colors',
												activeTab === 'profile'
													? 'text-black'
													: showRedWarning
														? 'text-black bg-[#E47979] hover:bg-[#E47979]'
														: 'text-black bg-transparent hover:bg-[#eeeeee]'
											)}
										>
											Profile
										</button>
									);
								})()}
								<div
									ref={modeContainerRef}
									className="relative grid flex-1 grid-cols-3 items-center px-4"
								>
									<div
										className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
										style={{
											left: highlightStyle.left,
											transition: isInitialRender || readOnly ? 'none' : 'left 0.25s ease-in-out',
											opacity: highlightStyle.opacity,
										}}
									>
										<div
											style={{
												width: `${MODE_HIGHLIGHT_WIDTH}px`,
												height: '17px',
												backgroundColor: getModeBackgroundColor(),
												border: '1.3px solid #000000',
												borderRadius: '8px',
											}}
										/>
									</div>
									<button
										ref={aiButtonRef}
										type="button"
										className={cn(
											'text-[11px] font-inter font-semibold px-3 py-0.5 rounded-md cursor-pointer text-center relative z-20 justify-self-center',
											draftingMode === 'ai'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => {
											if (activeTab !== 'main') {
												setActiveTab('main');
												setHasLeftProfileTab(true);
											}
											setMode('ai');
										}}
									>
										Auto
									</button>
									<button
										ref={handwrittenButtonRef}
										type="button"
										className={cn(
											'text-[11px] font-inter font-semibold px-3 py-0.5 rounded-md cursor-pointer text-center relative z-20 justify-self-center',
											draftingMode === 'handwritten'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => {
											if (activeTab !== 'main') {
												setActiveTab('main');
												setHasLeftProfileTab(true);
											}
											setMode('handwritten');
										}}
									>
										Manual
									</button>
									<button
										ref={hybridButtonRef}
										type="button"
										className={cn(
											'text-[11px] font-inter font-semibold px-3 py-0.5 rounded-md cursor-pointer text-center relative z-20 justify-self-center',
											draftingMode === 'hybrid'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => {
											if (activeTab !== 'main') {
												setActiveTab('main');
												setHasLeftProfileTab(true);
											}
											setMode('hybrid');
										}}
									>
										Hybrid
									</button>
								</div>
							</div>
						</div>
						<div className="h-[2px] bg-[#000000] w-full" />

						{/* Profile Tab (mirrors HybridPromptInput) */}
						{activeTab === 'profile' ? (
							<div className="w-full flex flex-col flex-1 min-h-0">
								{/* Progress header row */}
								<div className="w-full h-[26px] bg-[#E7F3E8] border-b-2 border-black shrink-0 flex items-center justify-center">
									<div className="w-[95%] flex items-center gap-3">
										<div className="relative w-[150px] h-[10px] bg-white border-2 border-black rounded-[8px] overflow-hidden">
											<div
												className="absolute left-0 top-0 bottom-0 bg-[#36B24A] rounded-full transition-[width] duration-200"
												style={{ width: `${profileSuggestionFillPercent}%` }}
											/>
										</div>
										<span className="font-inter font-medium text-[11px] leading-none text-black whitespace-nowrap">
											{profileSuggestionDisplayLabel}
										</span>
									</div>
								</div>
								{/* Blue fill */}
								<div
									className="relative flex flex-col flex-1 min-h-0 py-6"
									style={{ backgroundColor: resolvedPageFillColor }}
								>
									{/* Top-right indicator line */}
									<button
										type="button"
										aria-label="Back to writing"
										onClick={() => {
											setActiveTab('main');
											setHasLeftProfileTab(true);
										}}
										className="absolute top-[10px] right-[10px] w-[15px] h-[2px] bg-black cursor-pointer p-0 border-0 focus:outline-none"
									/>
									<div className="px-3 flex flex-col gap-3 items-center">
										{/* Name */}
										<div
											ref={expandedProfileBox === 'name' ? expandedProfileBoxRef : undefined}
											className={cn(
												'w-[95%] flex flex-col rounded-[8px] border-[2px] border-black cursor-pointer overflow-hidden',
												expandedProfileBox === 'name' ? 'h-[52px]' : 'h-[26px]'
											)}
											onClick={() => handleProfileBoxToggle('name')}
										>
											<div
												className="h-[26px] flex items-center px-3 font-inter text-[12px] font-semibold truncate"
												style={{ backgroundColor: getProfileHeaderBg('name') }}
											>
												{getProfileHeaderText('name', 'Name', 'Enter your Name')}
											</div>
											{expandedProfileBox === 'name' && (
												<input
													type="text"
													className="h-[26px] bg-white px-3 font-inter text-[12px] outline-none border-0"
													value={profileTabFields.name}
													onChange={(e) =>
														setProfileTabFields({
															...profileTabFields,
															name: e.target.value,
														})
													}
													onBlur={() => handleProfileFieldBlur('name')}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleProfileFieldEnter('name');
														}
													}}
													onClick={(e) => e.stopPropagation()}
													autoFocus
												/>
											)}
										</div>
										{/* Genre */}
										<div
											ref={expandedProfileBox === 'genre' ? expandedProfileBoxRef : undefined}
											className={cn(
												'w-[95%] flex flex-col rounded-[8px] border-[2px] border-black cursor-pointer overflow-hidden',
												expandedProfileBox === 'genre' ? 'h-[52px]' : 'h-[26px]'
											)}
											onClick={() => handleProfileBoxToggle('genre')}
										>
											<div
												className="h-[26px] flex items-center px-3 font-inter text-[12px] font-semibold truncate"
												style={{ backgroundColor: getProfileHeaderBg('genre') }}
											>
												{getProfileHeaderText('genre', 'Genre', 'Enter your Genre')}
											</div>
											{expandedProfileBox === 'genre' && (
												<input
													type="text"
													className="h-[26px] bg-white px-3 font-inter text-[12px] outline-none border-0"
													value={profileTabFields.genre}
													onChange={(e) =>
														setProfileTabFields({
															...profileTabFields,
															genre: e.target.value,
														})
													}
													onBlur={() => handleProfileFieldBlur('genre')}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleProfileFieldEnter('genre');
														}
													}}
													onClick={(e) => e.stopPropagation()}
													autoFocus
												/>
											)}
										</div>
										{/* Area */}
										<div
											ref={expandedProfileBox === 'area' ? expandedProfileBoxRef : undefined}
											className={cn(
												'w-[95%] flex flex-col rounded-[8px] border-[2px] border-black cursor-pointer overflow-hidden',
												expandedProfileBox === 'area' ? 'h-[52px]' : 'h-[26px]'
											)}
											onClick={() => handleProfileBoxToggle('area')}
										>
											<div
												className="h-[26px] flex items-center px-3 font-inter text-[12px] font-semibold truncate"
												style={{ backgroundColor: getProfileHeaderBg('area') }}
											>
												{getProfileHeaderText('area', 'Area', 'Enter your Area')}
											</div>
											{expandedProfileBox === 'area' && (
												<input
													type="text"
													className="h-[26px] bg-white px-3 font-inter text-[12px] outline-none border-0"
													value={profileTabFields.area}
													onChange={(e) =>
														setProfileTabFields({
															...profileTabFields,
															area: e.target.value,
														})
													}
													onBlur={() => handleProfileFieldBlur('area')}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleProfileFieldEnter('area');
														}
													}}
													onClick={(e) => e.stopPropagation()}
													autoFocus
												/>
											)}
										</div>
										{/* Band */}
										<div
											ref={expandedProfileBox === 'band' ? expandedProfileBoxRef : undefined}
											className={cn(
												'w-[95%] flex flex-col rounded-[8px] border-[2px] border-black cursor-pointer overflow-hidden',
												expandedProfileBox === 'band' ? 'h-[52px]' : 'h-[26px]'
											)}
											onClick={() => handleProfileBoxToggle('band')}
										>
											<div
												className="h-[26px] flex items-center px-3 font-inter text-[12px] font-semibold truncate"
												style={{ backgroundColor: getProfileHeaderBg('band') }}
											>
												{getProfileHeaderText(
													'band',
													'Band/Artist Name',
													'Enter your Band/Artist Name'
												)}
											</div>
											{expandedProfileBox === 'band' && (
												<input
													type="text"
													className="h-[26px] bg-white px-3 font-inter text-[12px] outline-none border-0"
													value={profileTabFields.band}
													onChange={(e) =>
														setProfileTabFields({
															...profileTabFields,
															band: e.target.value,
														})
													}
													onBlur={() => handleProfileFieldBlur('band')}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleProfileFieldEnter('band');
														}
													}}
													onClick={(e) => e.stopPropagation()}
													autoFocus
												/>
											)}
										</div>
										{/* Bio */}
										<div
											ref={expandedProfileBox === 'bio' ? expandedProfileBoxRef : undefined}
											className={cn(
												'w-[95%] flex flex-col rounded-[8px] border-[2px] border-black cursor-pointer overflow-hidden',
												expandedProfileBox === 'bio' ? 'h-[52px]' : 'h-[26px]'
											)}
											onClick={() => handleProfileBoxToggle('bio')}
										>
											<div
												className="h-[26px] flex items-center px-3 font-inter text-[12px] font-semibold truncate"
												style={{ backgroundColor: getProfileHeaderBg('bio') }}
											>
												{getProfileHeaderText('bio', 'Bio', 'Enter your Bio')}
											</div>
											{expandedProfileBox === 'bio' && (
												<input
													type="text"
													className="h-[26px] bg-white px-3 font-inter text-[12px] outline-none border-0"
													value={profileTabFields.bio}
													onChange={(e) =>
														setProfileTabFields({
															...profileTabFields,
															bio: e.target.value,
														})
													}
													onBlur={() => handleProfileFieldBlur('bio')}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleProfileFieldEnter('bio');
														}
													}}
													onClick={(e) => e.stopPropagation()}
													autoFocus
												/>
											)}
										</div>
										{/* Links */}
										<div
											ref={expandedProfileBox === 'links' ? expandedProfileBoxRef : undefined}
											className={cn(
												'w-[95%] flex flex-col rounded-[8px] border-[2px] border-black cursor-pointer overflow-hidden',
												expandedProfileBox === 'links' ? 'h-[52px]' : 'h-[26px]'
											)}
											onClick={() => handleProfileBoxToggle('links')}
										>
											<div
												className="h-[26px] flex items-center px-3 font-inter text-[12px] font-semibold truncate"
												style={{ backgroundColor: getProfileHeaderBg('links') }}
											>
												{getProfileHeaderText('links', 'Links', 'Enter your Links')}
											</div>
											{expandedProfileBox === 'links' && (
												<input
													type="text"
													className="h-[26px] bg-white px-3 font-inter text-[12px] outline-none border-0"
													value={profileTabFields.links}
													onChange={(e) =>
														setProfileTabFields({
															...profileTabFields,
															links: e.target.value,
														})
													}
													onBlur={() => handleProfileFieldBlur('links')}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															handleProfileFieldEnter('links');
														}
													}}
													onClick={(e) => e.stopPropagation()}
													autoFocus
												/>
											)}
										</div>
									</div>
									<div className="mt-5 flex justify-center">
										<button
											type="button"
											onClick={() => {
												setActiveTab('main');
												setHasLeftProfileTab(true);
											}}
											className="w-[136px] h-[26px] rounded-[6px] bg-[#C8C8C8] text-white font-inter font-medium text-[12px] leading-none flex items-center justify-center cursor-pointer"
										>
											back to writing
										</button>
									</div>
								</div>
							</div>
						) : (
							<>
								{draftingMode === 'handwritten' ? (
									<MiniManualEmailEntry form={form} />
								) : (
									<>
										{/* Auto Subject */}
										<div
											className={cn(
												'w-[95%] max-[480px]:w-[89.33vw] mx-auto',
												// Auto tab spacing (matches design spec):
												// - Subject bar 33px below header divider
												// - Body 8px below Subject
												draftingMode === 'ai'
													? isFitToHeightEnabled
														? 'mt-[12px] mb-[6px]'
														: 'mt-[33px] mb-[8px]'
													: isFitToHeightEnabled
														? 'mt-[6px] mb-2'
														: 'mt-[9px] mb-3'
											)}
										>
											{isAiSubject ? (
												// Compact bar (default) that expands to full width on hover when Auto Subject is on
												<div className="group/subject relative">
													{/* Collapsed state - shown by default, hidden on hover */}
													<div className="flex items-center gap-2 group-hover/subject:hidden">
														<div
															className={cn(
																'flex items-center justify-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden subject-bar w-[94px]'
															)}
															style={{ backgroundColor: '#E0E0E0' }}
														>
															<span className="font-inter font-medium text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black subject-label">
																Subject
															</span>
														</div>
														<span className="font-inter font-normal text-[10px] text-[#000000]">
															Auto
														</span>
													</div>

													{/* Expanded state - hidden by default, shown on hover */}
													<div
														className={cn(
															'hidden group-hover/subject:flex items-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden subject-bar bg-white w-full'
														)}
													>
														<div
															className={cn(
																'pl-2 flex items-center h-full shrink-0 w-[110px] bg-[#E0E0E0]'
															)}
														>
															<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black subject-label">
																Auto Subject
															</span>
														</div>

														<button
															type="button"
															aria-pressed={isAiSubject}
															onClick={toggleSubject}
															className={cn(
																'relative h-full flex items-center text-[10px] font-inter font-normal transition-colors shrink-0 subject-toggle',
																'w-[47px] px-2 justify-center text-black bg-[#4ADE80] hover:bg-[#3ECC72] active:bg-[#32BA64]'
															)}
														>
															<span className="absolute left-0 h-full border-l border-black"></span>
															<span>on</span>
															<span className="absolute right-0 h-full border-r border-black"></span>
														</button>

														<div className={cn('flex-grow h-full', 'bg-white')}>
															<input
																type="text"
																className={cn(
																	'w-full h-full !bg-transparent pl-3 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
																	// Match Subject label size
																	'text-[13px] leading-none max-[480px]:text-[11px] placeholder:text-[13px] placeholder:leading-none max-[480px]:placeholder:text-[11px]',
																	'!text-[#6B6B6B] italic cursor-not-allowed'
																)}
																placeholder="Write manual subject here"
																disabled={true}
																value={form.watch('subject') || ''}
																onChange={(e) =>
																	form.setValue('subject', e.target.value, {
																		shouldDirty: true,
																	})
																}
															/>
														</div>
													</div>
												</div>
											) : (
												// Full bar when Auto Subject is off
												<div
													className={cn(
														'flex items-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden subject-bar bg-white'
													)}
												>
													<div
														className={cn(
															'pl-2 flex items-center h-full shrink-0 w-[96px] bg-white'
														)}
													>
														<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black subject-label">
															Subject
														</span>
													</div>

													<button
														type="button"
														aria-pressed={isAiSubject}
														onClick={toggleSubject}
														className={cn(
															'relative h-full flex items-center text-[10px] font-inter font-normal transition-colors shrink-0 subject-toggle',
															'w-[80px] px-2 justify-center text-black bg-[#DADAFC] hover:bg-[#C4C4F5] active:bg-[#B0B0E8]'
														)}
													>
														<span className="absolute left-0 h-full border-l border-black"></span>
														<span>Auto off</span>
														<span className="absolute right-0 h-full border-r border-black"></span>
													</button>

													<div className={cn('flex-grow h-full', 'bg-white')}>
														<input
															type="text"
															className={cn(
																'w-full h-full !bg-transparent pl-2 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
																// Match Subject label size
																'text-[13px] leading-none max-[480px]:text-[11px] placeholder:text-[13px] placeholder:leading-none max-[480px]:placeholder:text-[11px]',
																'!text-black placeholder:!text-black'
															)}
															placeholder="Type subject..."
															disabled={false}
															value={form.watch('subject') || ''}
															onChange={(e) =>
																form.setValue('subject', e.target.value, {
																	shouldDirty: true,
																})
															}
														/>
													</div>
												</div>
											)}
										</div>

										{/* Blocks list - overflow visible to show buttons outside */}
										<div
											className={cn(
												'flex flex-col overflow-visible',
												draftingMode === 'hybrid'
													? 'gap-[7px]'
													: isFitToHeightEnabled
														? 'gap-[12px] max-[480px]:gap-[18px]'
														: 'gap-[25px] max-[480px]:gap-[40px]'
											)}
										>
											{(() => {
								// Renderers reused below
								const renderHybridCore = (b: {
									id: string;
									type: HybridBlock;
									value: string | null;
								}) => {
									const isExpanded = expandedBlocks.has(b.id);
									const strokeColor =
										b.type === 'introduction'
											? '#6673FF'
											: b.type === 'research'
											? '#1010E7'
											: '#0E0E7F';
									return (
										<Fragment key={b.id}>
											<div
												ref={(el) => {
													blockRefs.current[b.id] = el;
												}}
											className={cn(
												'rounded-[8px] border-2 bg-[#DADAFC] overflow-hidden relative',
												draftingMode === 'hybrid'
													? 'w-[93%] ml-[2.5%]'
													: 'w-[95%] max-[480px]:w-[89.33vw] mx-auto',
													isExpanded
														? 'h-[78px]'
														: draftingMode === 'hybrid'
														? 'h-[26px]'
														: 'h-[31px] max-[480px]:h-[24px]',
													!isExpanded && isMobileLandscape && 'h-[24px]'
												)}
												style={{ borderColor: strokeColor }}
											>
												<div className="w-full h-full flex flex-col">
													<div
														className={cn(
															'flex flex-row items-center flex-shrink-0',
															isExpanded
																? 'h-[21px]'
																: draftingMode === 'hybrid'
																? 'h-[26px]'
																: 'h-[31px] max-[480px]:h-[24px]',
															!isExpanded && isMobileLandscape && 'h-[24px]'
														)}
													>
														<div
															className={cn(
																'flex-1 flex h-full px-3',
																isMobileLandscape ? 'items-center' : 'items-center'
															)}
														>
															<span className="font-inter text-[12px] leading-none font-semibold text-black">
																{blockLabel(b.type as HybridBlock)}
															</span>
															{blockHint(b.type as HybridBlock) && (
																<span className="text-[10px] leading-none italic text-[#5d5d5d] ml-2">
																	{blockHint(b.type as HybridBlock)}
																</span>
															)}
														</div>
														<div
															className={cn(
																'flex flex-row h-full',
																isMobileLandscape ? 'items-center' : 'items-stretch'
															)}
														>
															{draftingMode !== 'hybrid' && (
																<div
																	className={cn(
																		'border-l border-black',
																		isExpanded
																			? 'h-[21px]'
																			: 'h-[27px] max-[480px]:h-[20px]',
																		!isExpanded && isMobileLandscape && 'h-[20px]'
																	)}
																/>
															)}
															<button
																type="button"
																onClick={() => {
																	setExpandedBlocks((prev) => {
																		// Only allow one expanded at a time
																		if (prev.has(b.id)) {
																			return new Set();
																		}
																		return new Set([b.id]);
																	});
																}}
																className={cn(
																	'h-full flex items-center justify-center cursor-pointer appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none',
																	draftingMode === 'hybrid'
																		? 'w-[26px]'
																		: 'w-[75px] text-[11px] leading-none',
																	draftingMode === 'hybrid'
																		? ''
																		: isExpanded
																		? 'text-white bg-[#5353AF] hover:bg-[#4a4a9d]'
																		: 'text-black/80 hover:bg-black/5'
																)}
															>
																{draftingMode === 'hybrid' ? (
																	<svg
																		width="7"
																		height="5"
																		viewBox="0 0 7 5"
																		fill="none"
																		xmlns="http://www.w3.org/2000/svg"
																	>
																		<path
																			d="M0.796875 0.796875L3.12021 3.34412L5.44355 0.796875"
																			stroke="black"
																			strokeWidth="1.59374"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		/>
																	</svg>
																) : (
																	'Advanced'
																)}
															</button>
															{draftingMode !== 'hybrid' && (
																<>
																	<div
																		className={cn(
																			'border-l border-black',
																			isExpanded
																				? 'h-[21px]'
																				: 'h-[27px] max-[480px]:h-[20px]',
																			!isExpanded && isMobileLandscape && 'h-[20px]'
																		)}
																	/>
																	<button
																		type="button"
																		onClick={() => removeBlock(b.id)}
																		className={cn(
																			'w-[30px] h-full flex items-center justify-center leading-none font-bold text-red-600 hover:bg-black/10 appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none',
																			isMobileLandscape ? 'text-[16px]' : 'text-[18px]'
																		)}
																		aria-label="Remove block"
																	>
																		×
																	</button>
																</>
															)}
														</div>
													</div>
													{isExpanded && (
														<div className="flex-1 flex flex-col min-h-0 relative">
															<div
																className="h-[2px] w-full"
																style={{ backgroundColor: strokeColor }}
															/>
															{draftingMode === 'hybrid' && (
																<button
																	type="button"
																	onClick={() => removeBlock(b.id)}
																	className="absolute top-[10px] right-[9px] cursor-pointer z-10"
																	aria-label="Remove block"
																>
																	<CloseButtonIcon width={7} height={7} />
																</button>
															)}
															<div className="flex-1 px-3 py-1 flex items-center bg-white">
																<textarea
																	className="w-full bg-white text-[11px] outline-none focus:outline-none placeholder:italic placeholder:text-[#5d5d5d] resize-none leading-tight"
																	placeholder={
																		draftingMode === 'hybrid'
																			? ''
																			: "Type here to specify further, i.e 'I am ... and I lead ...'"
																	}
																	value={b.value || ''}
																	onChange={(e) => updateBlockValue(b.id, e.target.value)}
																	tabIndex={isExpanded ? 0 : -1}
																	rows={2}
																/>
															</div>
														</div>
													)}
												</div>
											</div>
										</Fragment>
									);
								};

								const renderGeneric = (b: {
									id: string;
									type: HybridBlock;
									value: string | null;
								}) => {
									// For text blocks in hybrid mode, render like hybrid core blocks
									if (draftingMode === 'hybrid' && b.type === 'text') {
										const isTextExpanded = expandedBlocks.has(b.id);
										return (
											<Fragment key={b.id}>
												<div
													className={cn(
														'rounded-[8px] border-2 border-black overflow-hidden relative w-[93%] ml-[2.5%]',
														isTextExpanded ? 'h-[78px]' : 'h-[26px]'
													)}
													style={{ backgroundColor: '#A2E2AF' }}
												>
													<div className="w-full h-full flex flex-col">
														<div
															className={cn(
																'flex flex-row items-center flex-shrink-0',
																isTextExpanded ? 'h-[21px]' : 'h-[26px]'
															)}
														>
															<div className="flex-1 flex h-full px-3 items-center">
																<span className="font-inter text-[12px] leading-none font-semibold text-black">
																	{blockLabel(b.type as HybridBlock)}
																</span>
															</div>
															<div className="flex flex-row h-full items-center">
																<button
																	type="button"
																	onClick={() => {
																		setExpandedBlocks((prev) => {
																			// Only allow one expanded at a time
																			if (prev.has(b.id)) {
																				return new Set();
																			}
																			return new Set([b.id]);
																		});
																	}}
																	className="w-[26px] h-full flex items-center justify-center cursor-pointer appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none"
																>
																	<svg
																		width="7"
																		height="5"
																		viewBox="0 0 7 5"
																		fill="none"
																		xmlns="http://www.w3.org/2000/svg"
																	>
																		<path
																			d="M0.796875 0.796875L3.12021 3.34412L5.44355 0.796875"
																			stroke="black"
																			strokeWidth="1.59374"
																			strokeLinecap="round"
																			strokeLinejoin="round"
																		/>
																	</svg>
																</button>
															</div>
														</div>
														{isTextExpanded && (
															<div className="flex-1 flex flex-col min-h-0 relative">
																<div className="h-[2px] w-full bg-black" />
																<button
																	type="button"
																	onClick={() => removeBlock(b.id)}
																	className="absolute top-[10px] right-[9px] cursor-pointer z-10"
																	aria-label="Remove block"
																>
																	<CloseButtonIcon width={7} height={7} />
																</button>
																<div className="flex-1 px-3 py-1 flex items-center bg-white">
																	<textarea
																		className="w-full bg-white text-[11px] outline-none focus:outline-none resize-none leading-tight"
																		placeholder=""
																		value={b.value || ''}
																		onChange={(e) =>
																			updateBlockValue(b.id, e.target.value)
																		}
																		tabIndex={isTextExpanded ? 0 : -1}
																		rows={2}
																	/>
																</div>
															</div>
														)}
													</div>
												</div>
											</Fragment>
										);
									}

									// Full Auto (Auto mode): reuse the exact "Body" block UI from HybridPromptInput
									if (b.type === 'full_automated') {
										return (
											<Fragment key={b.id}>
												<FullAutoBodyBlock
													form={form}
													fieldIndex={Math.max(
														0,
														hybridBlocks.findIndex((blk) => blk.id === b.id)
													)}
													profileFields={profileTabFields}
													constrainHeight={isFitToHeightEnabled}
													onGoToProfileTab={() => setActiveTab('profile')}
													className={cn(
														draftingMode === 'hybrid'
															? 'w-[93%] ml-[2.5%]'
															: 'w-[95%] max-[480px]:w-[89.33vw] mx-auto'
													)}
												/>
											</Fragment>
										);
									}

									// Default rendering for non-hybrid or non-text blocks
									return (
										<Fragment key={b.id}>
											<div
												className={cn(
													'rounded-[8px] border-2 bg-white relative overflow-hidden',
													draftingMode === 'hybrid'
														? 'w-[93%] ml-[2.5%]'
														: 'w-[95%] max-[480px]:w-[89.33vw] mx-auto',
													'px-2 py-1'
												)}
												style={{
													borderColor:
														draftingMode === 'hybrid' && b.type === 'text'
															? '#53A25D'
															: '#000000',
												}}
											>
												<>
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2">
															<span className="font-inter text-[12px] font-semibold text-black">
																{blockLabel(b.type as HybridBlock)}
															</span>
														</div>
														<div className="flex items-center gap-2">
															{blockHint(b.type as HybridBlock) && (
																<span className="text-[10px] italic text-[#5d5d5d]">
																	{blockHint(b.type as HybridBlock)}
																</span>
															)}
															{draftingMode !== 'hybrid' && (
																	<button
																		type="button"
																		className="text-[12px] text-[#b30000] hover:text-red-600"
																		onClick={() => removeBlock(b.id)}
																		aria-label="Remove block"
																	>
																		×
																	</button>
																)}
														</div>
													</div>
													<textarea
														className="w-full mt-1 text-[11px] leading-[14px] rounded-[6px] p-1 resize-none h-[52px] outline-none focus:outline-none max-[480px]:placeholder:text-[8px]"
														placeholder={
															b.type === 'text'
																? 'Write the exact text you want in your email here. *required'
																: 'Type here to specify further, e.g., "I am ... and I lead ..."'
														}
														value={b.value || ''}
														onChange={(e) => updateBlockValue(b.id, e.target.value)}
													/>
												</>
											</div>
										</Fragment>
									);
								};

								if (draftingMode !== 'hybrid') {
									return hybridBlocks.map((b) =>
										b.type === 'introduction' ||
										b.type === 'research' ||
										b.type === 'action'
											? renderHybridCore(
													b as { id: string; type: HybridBlock; value: string | null }
											  )
											: renderGeneric(
													b as { id: string; type: HybridBlock; value: string | null }
											  )
									);
								}

								// Hybrid mode: keep three fixed core slots; render placeholder if missing.
								const slots: Array<'introduction' | 'research' | 'action'> = [
									'introduction',
									'research',
									'action',
								];
								type Block = { id: string; type: HybridBlock; value: string | null };
								const slotCore: Record<
									'introduction' | 'research' | 'action',
									Block | null
								> = { introduction: null, research: null, action: null };
								const slotExtras: Record<
									'introduction' | 'research' | 'action',
									Block[]
								> = { introduction: [], research: [], action: [] };

								let current: 'introduction' | 'research' | 'action' = 'introduction';
								for (const b of hybridBlocks) {
									if (
										b.type === 'introduction' ||
										b.type === 'research' ||
										b.type === 'action'
									) {
										slotCore[b.type] = b as Block;
										// Keep extras under the most recently seen core block
										current = b.type;
										continue;
									}
									// Treat everything else as extra content tied to the current slot (mostly text)
									slotExtras[current].push(b as Block);
								}

								const labelFor = (t: HybridBlock) =>
									t === 'introduction' ? 'Intro' : t === 'research' ? 'Research' : 'CTA';
								const colorFor = (t: HybridBlock) =>
									t === 'introduction'
										? '#6673FF'
										: t === 'research'
										? '#1010E7'
										: '#0E0E7F';

								const out: ReactNode[] = [];
								for (const slot of slots) {
									const core = slotCore[slot];
									if (core) out.push(renderHybridCore(core));
									else {
										out.push(
											<div
												key={`mini-ph-${slot}`}
												className={cn(
													'w-[93%] ml-[2.5%] h-[26px] flex items-center justify-end',
													isMobileLandscape && 'h-[24px]'
												)}
											>
												<Button
													type="button"
													onClick={() => addHybridBlock(slot)}
													className="w-[76px] h-[22px] bg-white hover:bg-stone-100 active:bg-stone-200 border-2 rounded-[6px] !font-normal text-[10px] text-black inline-flex items-center justify-start gap-[4px] pl-[4px]"
													style={{ borderColor: colorFor(slot) }}
													title={`Add ${labelFor(slot)}`}
												>
													<TinyPlusIcon
														width="8px"
														height="8px"
														className="!w-[8px] !h-[8px]"
													/>
													<span className="font-inter font-medium text-[10px] text-[#0A0A0A]">
														{labelFor(slot)}
													</span>
												</Button>
											</div>
										);
									}
									for (const extra of slotExtras[slot]) out.push(renderGeneric(extra));
								}

								return out;
							})()}
										</div>
								{/* Signature inline spacing (mobile portrait/landscape, and Auto mode per design spec) */}
								{(
									<div
										className={cn(
											// Auto + Hybrid: render inline so Signature sits right below the last block (CTA)
											'block',
											// Auto tab spacing: Signature 12px below Body
											draftingMode === 'ai'
												? isFitToHeightEnabled
													? 'mt-2'
													: 'mt-3'
												: isMobilePortrait && shouldUseLargeHybridSigGap
													? 'mt-8'
													: 'mt-2'
										)}
										style={{ display: isMobileLandscape ? 'block' : undefined }}
									>
										{draftingMode === 'hybrid' ? (
											<div className="w-[95%] max-[480px]:w-[89.33vw] mx-auto flex items-start justify-between">
												<div className="flex-1 mr-2">
													{isAutoSignature ? (
														<div className="group/signature relative w-full">
															{/* Collapsed state - shown by default, hidden on hover */}
															<div className="flex items-center gap-2 group-hover/signature:hidden">
																<div
																	className={cn(
																		'flex items-center justify-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden w-[105px]'
																	)}
																	style={{ backgroundColor: '#E0E0E0' }}
																>
																	<span className="font-inter font-medium text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
																		Signature
																	</span>
																</div>
																<span className="font-inter font-normal text-[10px] text-[#000000]">
																	Auto
																</span>
															</div>

															{/* Expanded state - hidden by default, shown on hover */}
															<div
																className={cn(
																	'hidden group-hover/signature:flex items-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden bg-white w-full'
																)}
															>
																<div className="pl-2 flex items-center h-full shrink-0 w-[118px] bg-[#E0E0E0]">
																	<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
																		Auto Signature
																	</span>
																</div>
																<button
																	type="button"
																	onClick={() => {
																		setIsAutoSignature(false);
																		// Start manual editing from the current signature value.
																		setManualSignatureValue(signature);
																		updateSignature(signature);
																	}}
																	className={cn(
																		'relative h-full flex items-center text-[10px] font-inter font-normal transition-colors shrink-0',
																		'w-[47px] px-2 justify-center text-black bg-[#4ADE80] hover:bg-[#3ECC72] active:bg-[#32BA64]'
																	)}
																	aria-label="Auto Signature on"
																>
																	<span className="absolute left-0 h-full border-l border-black"></span>
																	<span>on</span>
																	<span className="absolute right-0 h-full border-r border-black"></span>
																</button>
																<div className={cn('flex-grow h-full', 'bg-white')}>
																	<input
																		type="text"
																		className={cn(
																			'w-full h-full !bg-transparent pl-3 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
																			// Match Signature label size
																			'text-[13px] leading-none max-[480px]:text-[11px] placeholder:text-[13px] placeholder:leading-none max-[480px]:placeholder:text-[11px]',
																			'!text-black placeholder:!text-[#9E9E9E]',
																			'cursor-not-allowed'
																		)}
																		placeholder="Write manual Signature here"
																		value={signature}
																		disabled
																		readOnly
																	/>
																</div>
															</div>
														</div>
													) : (
														/* Manual signature mode: expanded downward with textarea */
														<div className="w-full rounded-[8px] border-2 border-black overflow-hidden flex flex-col bg-white">
															{/* Header row */}
															<div className="flex items-center h-[29px] shrink-0 bg-[#E0E0E0]">
																<div className="pl-2 flex items-center h-full shrink-0 w-[105px] bg-[#E0E0E0]">
																	<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
																		Signature
																	</span>
																</div>
																<button
																	type="button"
																	onClick={() => {
																		setIsAutoSignature(true);
																		setManualSignatureValue('');
																		updateSignature(autoSignatureValueRef.current);
																	}}
																	className={cn(
																		'relative h-full flex items-center text-[10px] font-inter font-normal transition-colors shrink-0',
																		'w-[80px] px-2 justify-center text-black bg-[#C3BCBC] hover:bg-[#B5AEAE] active:bg-[#A7A0A0]'
																	)}
																	aria-label="Auto Signature off"
																>
																	<span className="absolute left-0 h-full border-l border-black"></span>
																	<span>Auto off</span>
																	<span className="absolute right-0 h-full border-r border-black"></span>
																</button>
																<div className="flex-grow h-full bg-[#E0E0E0]" />
															</div>
															{/* Divider line */}
															<div className="w-full h-[1px] bg-black shrink-0" />
															{/* Text entry area */}
															<div className="bg-white">
																<textarea
																	value={manualSignatureValue}
																	onChange={(e) => {
																		setManualSignatureValue(e.target.value);
																		updateSignature(e.target.value);
																	}}
																	className={cn(
																		'w-full !bg-transparent px-3 py-2 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none outline-none',
																		'signature-textarea',
																		// Match Signature label size
																		'!text-black placeholder:!text-[#9E9E9E] font-inter text-[13px] max-[480px]:text-[11px] placeholder:text-[13px] max-[480px]:placeholder:text-[11px]'
																	)}
																	style={{ height: 66 }}
																	placeholder="Enter your signature..."
																/>
															</div>
														</div>
													)}
												</div>
												<button
													type="button"
													onClick={addTextBlocksBetweenAll}
													className="w-[30px] h-[30px] shrink-0 rounded-[8px] border-2 border-black hidden max-[480px]:flex items-center justify-center cursor-pointer"
													style={{
														backgroundColor: '#A6E2AB',
														display: isMobileLandscape ? 'flex' : undefined,
													}}
												>
													<svg
														width="15"
														height="15"
														viewBox="0 0 15 15"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M7.5 0.5V14.5M0.5 7.5H14.5"
															stroke="#000000"
															strokeWidth="1"
														/>
													</svg>
												</button>
											</div>
										) : (
											<div className="w-[95%] max-[480px]:w-[89.33vw] mx-auto">
												{isAutoSignature ? (
													<div className="group/signature relative w-full">
														{/* Collapsed state - shown by default, hidden on hover */}
														<div className="flex items-center gap-2 group-hover/signature:hidden">
															<div
																className={cn(
																	'flex items-center justify-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden w-[105px]'
																)}
																style={{ backgroundColor: '#E0E0E0' }}
															>
																<span className="font-inter font-medium text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
																	Signature
																</span>
															</div>
															<span className="font-inter font-normal text-[10px] text-[#000000]">
																Auto
															</span>
														</div>

														{/* Expanded state - hidden by default, shown on hover */}
														<div
															className={cn(
																'hidden group-hover/signature:flex items-center h-[29px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden bg-white w-full'
															)}
														>
															<div className="pl-2 flex items-center h-full shrink-0 w-[118px] bg-[#E0E0E0]">
																<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
																	Auto Signature
																</span>
															</div>
															<button
																type="button"
																onClick={() => {
																	setIsAutoSignature(false);
																	// Start manual editing from the current signature value.
																	setManualSignatureValue(signature);
																	updateSignature(signature);
																}}
																className={cn(
																	'relative h-full flex items-center text-[10px] font-inter font-normal transition-colors shrink-0',
																	'w-[47px] px-2 justify-center text-black bg-[#4ADE80] hover:bg-[#3ECC72] active:bg-[#32BA64]'
																)}
																aria-label="Auto Signature on"
															>
																<span className="absolute left-0 h-full border-l border-black"></span>
																<span>on</span>
																<span className="absolute right-0 h-full border-r border-black"></span>
															</button>
															<div className={cn('flex-grow h-full', 'bg-white')}>
																<input
																	type="text"
																	className={cn(
																		'w-full h-full !bg-transparent pl-3 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
																		// Match Signature label size
																		'text-[13px] leading-none max-[480px]:text-[11px] placeholder:text-[13px] placeholder:leading-none max-[480px]:placeholder:text-[11px]',
																		'!text-black placeholder:!text-[#9E9E9E]',
																		'cursor-not-allowed'
																	)}
																	placeholder="Write manual Signature here"
																	value={signature}
																	disabled
																	readOnly
																/>
															</div>
														</div>
													</div>
												) : (
													/* Manual signature mode: expanded downward with textarea */
													<div className="w-full rounded-[8px] border-2 border-black overflow-hidden flex flex-col bg-white">
														{/* Header row */}
														<div className="flex items-center h-[29px] shrink-0 bg-[#E0E0E0]">
															<div className="pl-2 flex items-center h-full shrink-0 w-[105px] bg-[#E0E0E0]">
																<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
																	Signature
																</span>
															</div>
															<button
																type="button"
																onClick={() => {
																	setIsAutoSignature(true);
																	setManualSignatureValue('');
																	updateSignature(autoSignatureValueRef.current);
																}}
																className={cn(
																	'relative h-full flex items-center text-[10px] font-inter font-normal transition-colors shrink-0',
																	'w-[80px] px-2 justify-center text-black bg-[#C3BCBC] hover:bg-[#B5AEAE] active:bg-[#A7A0A0]'
																)}
																aria-label="Auto Signature off"
															>
																<span className="absolute left-0 h-full border-l border-black"></span>
																<span>Auto off</span>
																<span className="absolute right-0 h-full border-r border-black"></span>
															</button>
															<div className="flex-grow h-full bg-[#E0E0E0]" />
														</div>
														{/* Divider line */}
														<div className="w-full h-[1px] bg-black shrink-0" />
														{/* Text entry area */}
														<div className="bg-white">
															<textarea
																value={manualSignatureValue}
																onChange={(e) => {
																	setManualSignatureValue(e.target.value);
																	updateSignature(e.target.value);
																}}
																className={cn(
																	'w-full !bg-transparent px-3 py-2 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none outline-none',
																	'signature-textarea',
																	// Match Signature label size
																	'!text-black placeholder:!text-[#9E9E9E] font-inter text-[13px] max-[480px]:text-[11px] placeholder:text-[13px] max-[480px]:placeholder:text-[11px]'
																)}
																style={{ height: 66 }}
																placeholder="Enter your signature..."
															/>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								)}
									</>
								)}
							</>
						)}
							</>
						)}
					</div>
				</div>

				{/* Hybrid mode: keep the + button pinned in the bottom-right corner (desktop) */}
				{!isSettingsPanel && activeTab !== 'profile' && draftingMode === 'hybrid' && (
					<div
						className={cn(
							'px-0 pb-2 max-[480px]:hidden',
							isCompactSignature ? 'mt-1' : 'mt-3'
						)}
						style={{ display: isMobileLandscape ? 'none' : undefined }}
					>
						<div className="w-[95%] mx-auto flex justify-end">
							<button
								type="button"
								onClick={addTextBlocksBetweenAll}
								className="w-[30px] h-[30px] rounded-[8px] border-2 border-black flex items-center justify-center cursor-pointer"
								style={{ backgroundColor: '#A6E2AB' }}
								aria-label="Add text block"
							>
								<svg
									width="15"
									height="15"
									viewBox="0 0 15 15"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M7.5 0.5V14.5M0.5 7.5H14.5"
										stroke="#000000"
										strokeWidth="1"
									/>
								</svg>
							</button>
						</div>
					</div>
				)}

				{/* Footer with Draft button */}
				{!isSettingsPanel && !hideFooter && activeTab !== 'profile' && (
					<div className="px-0 pb-3">
						<Button
							type="button"
							onClick={onDraft}
							disabled={isDraftDisabled}
							className={cn(
								'w-[95%] !h-[28px] mx-auto !rounded-[4px] border border-black bg-[#68C575] text-black font-inter font-medium text-[14px] flex items-center justify-center'
							)}
						>
							{isPendingGeneration ? 'Drafting...' : 'Draft'}
						</Button>
						{typeof generationProgress === 'number' &&
							generationProgress >= 0 &&
							(generationTotal || 0) > 0 && (
								<div className="mt-2">
									<div className="flex items-center gap-3">
										<div className="text-xs font-inter text-gray-600 flex-none">
											{generationProgress >= (generationTotal || 0)
												? `Drafted ${Math.min(
														generationProgress,
														generationTotal || 0
												  )}/${generationTotal}`
												: `Drafting ${generationProgress}/${generationTotal}`}
										</div>
										<div className="flex-1 h-[7px] bg-[rgba(93,171,104,0.49)] border-0 relative">
											<div
												className="h-full bg-[#5DAB68] transition-all duration-300 ease-out absolute top-0 left-0"
												style={{
													width: `${Math.min(
														generationTotal && generationTotal > 0
															? (generationProgress / generationTotal) * 100
															: 0,
														100
													)}%`,
												}}
											/>
										</div>
										{onCancel && (
											<button
												type="button"
												onClick={onCancel}
												className="ml-2 p-0 h-auto w-auto bg-transparent border-0 text-black hover:text-red-600 transition-colors cursor-pointer"
												aria-label="Cancel drafting"
											>
												×
											</button>
										)}
									</div>
								</div>
							)}
					</div>
				)}
			</div>
			{!isSettingsPanel && activeTab !== 'profile' && !hideAddTextButtons && !isFitToHeightEnabled && (
				<div
					className="absolute top-0 left-[-18px] max-[480px]:-left-[10px] flex flex-col"
					style={{ pointerEvents: 'none', zIndex: 100 }}
				>
					{addTextButtons.map((btn, index) => {
						if (!btn.show) return null;
						const blockIndex = hybridBlocks.findIndex((b) => b.id === btn.blockId);
						if (blockIndex === -1) return null;
						return (
							<div
								key={`add-btn-${btn.blockId}-${index}`}
								style={{
									position: 'absolute',
									top: `${btn.top}px`,
									left: 0,
									pointerEvents: 'all',
								}}
							>
								<Button
									type="button"
									onClick={() => addTextBlockAt(blockIndex)}
									className={cn(
										'w-[52px] h-[20px] bg-white hover:bg-stone-100 active:bg-stone-200 border border-[#5DAB68] rounded-[4px] !font-normal text-[10px] text-black flex items-center justify-center gap-1'
									)}
									title="Text block"
								>
									<TinyPlusIcon width="5px" height="5px" className="!w-[8px] !h-[8px]" />
									<span className="font-secondary">Text</span>
								</Button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
