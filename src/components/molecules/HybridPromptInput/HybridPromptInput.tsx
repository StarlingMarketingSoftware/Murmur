import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Droppable } from '../DragAndDrop/Droppable';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { HybridBlock, Identity } from '@prisma/client';
import { HybridPromptInputProps, useHybridPromptInput } from './useHybridPromptInput';
import { cn } from '@/utils';
import React, {
	useState,
	FC,
	Fragment,
	useRef,
	useEffect,
	useMemo,
	useCallback,
	useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { TestPreviewPanel } from '../TestPreviewPanel/TestPreviewPanel';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import UndoIcon from '@/components/atoms/_svg/UndoIcon';
import UpscaleIcon from '@/components/atoms/_svg/UpscaleIcon';
import { DraggableHighlight } from '../DragAndDrop/DraggableHighlight';
import DraggableBox from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraggableBox';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
interface SortableAIBlockProps {
	block: {
		value: HybridBlock;
		label: string;
		placeholder?: string;
		isCollapsed?: boolean;
	};
	id: string;
	fieldIndex: number;
	onRemove: (id: string) => void;
	onCollapse?: (id: string) => void;
	isCollapsed?: boolean;
	onExpand?: (id: string) => void;
	trackFocusedField?: (
		fieldName: string,
		element: HTMLTextAreaElement | HTMLInputElement | null
	) => void;
	showTestPreview?: boolean;
	testMessage?: string | null;
	onGetSuggestions?: (prompt: string) => Promise<void>;
	/**
	 * Full Auto: prompt score meter (display only).
	 */
	promptQualityScore?: number | null;
	promptQualityLabel?: string | null;
	/**
	 * Full Auto: prompt upscaling controls.
	 */
	onUpscalePrompt?: () => Promise<void>;
	isUpscalingPrompt?: boolean;
	hasPreviousPrompt?: boolean;
	onUndoUpscalePrompt?: () => void;
	profileFields?: {
		name: string;
		genre: string;
		area: string;
		band: string;
		bio: string;
		links: string;
	} | null;
	onGoToProfileTab?: () => void;
	isDragDisabled?: boolean;
}

const SortableAIBlock = ({
	block,
	id,
	fieldIndex,
	onRemove,
	isCollapsed = false,
	onExpand,
	trackFocusedField,
	showTestPreview,
	onGetSuggestions,
	promptQualityScore,
	promptQualityLabel,
	onUpscalePrompt,
	isUpscalingPrompt,
	hasPreviousPrompt,
	onUndoUpscalePrompt,
	profileFields,
	onGoToProfileTab,
	isDragDisabled = false,
}: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id, disabled: isDragDisabled });
	const form = useFormContext<DraftingFormValues>();
	// Track if the text field has been touched (user has interacted with it)
	const [hasBeenTouched, setHasBeenTouched] = useState(false);
	// Track if advanced mode is enabled for hybrid blocks
	const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
	// Full Auto: custom instructions expander (stored in hybridBlockPrompts[fieldIndex].value)
	const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] = useState(false);
	const customInstructionsRef = useRef<HTMLTextAreaElement | null>(null);
	const customInstructionsContainerRef = useRef<HTMLDivElement | null>(null);
	// Full Auto: Booking For dropdown
	type BookingForTab = 'Anytime' | 'Season' | 'Calendar';
	type BookingForSeason = 'Spring' | 'Summer' | 'Fall' | 'Winter';
	const [isBookingForOpen, setIsBookingForOpen] = useState(false);
	const bookingForValue = form.watch('bookingFor') || 'Anytime';
	const setBookingForValue = useCallback(
		(value: string) => {
			form.setValue('bookingFor', value);
		},
		[form]
	);
	const [bookingForTab, setBookingForTab] = useState<BookingForTab>('Anytime');
	const [bookingForSeason, setBookingForSeason] = useState<BookingForSeason>('Spring');
	const [bookingForCalendarBaseMonth, setBookingForCalendarBaseMonth] = useState<Date>(() => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	});
	const [bookingForCalendarStartDate, setBookingForCalendarStartDate] = useState<Date | null>(null);
	const [bookingForCalendarEndDate, setBookingForCalendarEndDate] = useState<Date | null>(null);
	const bookingForContainerRef = useRef<HTMLDivElement | null>(null);
	const bookingForButtonRef = useRef<HTMLButtonElement | null>(null);
	const bookingForDropdownRef = useRef<HTMLDivElement | null>(null);
	const bookingForCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [bookingForDropdownPosition, setBookingForDropdownPosition] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const clearBookingForCloseTimeout = useCallback(() => {
		if (bookingForCloseTimeoutRef.current == null) return;
		clearTimeout(bookingForCloseTimeoutRef.current);
		bookingForCloseTimeoutRef.current = null;
	}, []);
	const scheduleBookingForCloseTimeout = useCallback(() => {
		clearBookingForCloseTimeout();
		bookingForCloseTimeoutRef.current = setTimeout(() => {
			setIsBookingForOpen(false);
		}, 1000);
	}, [clearBookingForCloseTimeout]);
	// Used to nudge the internal 3-way tab strip inside the Calendar dropdown so it aligns
	// with where the strip sits in the narrower Anytime/Season dropdown.
	const [bookingForTabStripLeft, setBookingForTabStripLeft] = useState<number | null>(null);
	const bookingForDropdownSize = useMemo(() => {
		if (bookingForTab === 'Calendar') return { width: 829, height: 468 };
		if (bookingForTab === 'Season') return { width: 317, height: 151 };
		return { width: 317, height: 46 };
	}, [bookingForTab]);
	const updateBookingForDropdownPosition = useCallback(() => {
		if (typeof window === 'undefined') return;
		const anchor = bookingForButtonRef.current;
		if (!anchor) return;

		const rect = anchor.getBoundingClientRect();
		const margin = 6;
		const viewportPadding = 8;
		const offsetX = 85;
		const offsetY = 45;
		const calendarNudgeX = 100;

		let left =
			bookingForTab === 'Calendar'
				? (window.innerWidth - bookingForDropdownSize.width) / 2 + calendarNudgeX
				: rect.left + offsetX;
		let top = rect.bottom + margin + offsetY;

		const maxLeft = Math.max(viewportPadding, window.innerWidth - bookingForDropdownSize.width - viewportPadding);
		left = Math.min(Math.max(left, viewportPadding), maxLeft);

		// In Calendar mode, the dropdown is much wider and centered, which makes the internal
		// tab strip appear to "jump" horizontally vs. Anytime/Season. Compute a Calendar-only
		// left padding so the strip sits in the same global X position as the narrow dropdown.
		if (bookingForTab === 'Calendar') {
			const tabStripWidth = 284;
			const narrowDropdownWidth = 317;
			const tabStripLeftInNarrowDropdown = (narrowDropdownWidth - tabStripWidth) / 2; // 16.5
			const desiredTabStripLeftGlobal = rect.left + offsetX + tabStripLeftInNarrowDropdown;
			let tabStripLeftInDropdown = desiredTabStripLeftGlobal - left;

			// Keep it within the Calendar dropdown bounds.
			const tabStripPadding = 8;
			const minTabStripLeft = tabStripPadding;
			const maxTabStripLeft = Math.max(
				minTabStripLeft,
				bookingForDropdownSize.width - tabStripWidth - tabStripPadding
			);
			tabStripLeftInDropdown = Math.min(Math.max(tabStripLeftInDropdown, minTabStripLeft), maxTabStripLeft);

			setBookingForTabStripLeft(Math.round(tabStripLeftInDropdown));
		} else {
			setBookingForTabStripLeft(null);
		}

		const wouldOverflowBottom = top + bookingForDropdownSize.height > window.innerHeight - viewportPadding;
		const canOpenAbove = rect.top - margin - bookingForDropdownSize.height >= viewportPadding;
		if (wouldOverflowBottom && canOpenAbove) {
			top = rect.top - margin - bookingForDropdownSize.height - offsetY;
		}

		setBookingForDropdownPosition({
			top: Math.round(top),
			left: Math.round(left),
		});
	}, [bookingForDropdownSize.height, bookingForDropdownSize.width, bookingForTab]);
	// Power mode from form (shared with MiniEmailStructure)
	const selectedPowerMode = form.watch('powerMode') || 'normal';
	const setSelectedPowerMode = (mode: 'normal' | 'high') => {
		form.setValue('powerMode', mode, { shouldDirty: true });
	};
	// When a block is opened (advanced), focus its input once
	const advancedInputRef = useRef<HTMLInputElement | null>(null);
	useEffect(() => {
		if (isAdvancedEnabled) {
			advancedInputRef.current?.focus();
		}
	}, [isAdvancedEnabled]);

	// Focus textarea when Custom Instructions opens
	useEffect(() => {
		if (!isCustomInstructionsOpen) return;
		requestAnimationFrame(() => customInstructionsRef.current?.focus());
	}, [isCustomInstructionsOpen]);

	// Close Custom Instructions when clicking away
	useEffect(() => {
		if (!isCustomInstructionsOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			const container = customInstructionsContainerRef.current;
			if (!target || !container) return;
			if (container.contains(target)) return;
			setIsCustomInstructionsOpen(false);
		};

		document.addEventListener('pointerdown', handlePointerDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [isCustomInstructionsOpen]);

	// Close Booking For dropdown when clicking away
	useEffect(() => {
		if (!isBookingForOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;

			const container = bookingForContainerRef.current;
			const dropdown = bookingForDropdownRef.current;

			if (container?.contains(target)) return;
			if (dropdown?.contains(target)) return;
			clearBookingForCloseTimeout();
			setIsBookingForOpen(false);
		};

		document.addEventListener('pointerdown', handlePointerDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
		};
	}, [clearBookingForCloseTimeout, isBookingForOpen]);

	useEffect(() => {
		if (!isBookingForOpen) {
			clearBookingForCloseTimeout();
			setBookingForDropdownPosition(null);
			setBookingForTabStripLeft(null);
		}
	}, [clearBookingForCloseTimeout, isBookingForOpen]);

	useEffect(() => {
		return () => clearBookingForCloseTimeout();
	}, [clearBookingForCloseTimeout]);

	// Prevent navigating the calendar into months that are entirely in the past.
	useEffect(() => {
		if (!isBookingForOpen) return;
		if (bookingForTab !== 'Calendar') return;

		const now = new Date();
		const minBaseMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		setBookingForCalendarBaseMonth((prev) => (prev.getTime() < minBaseMonth.getTime() ? minBaseMonth : prev));
	}, [isBookingForOpen, bookingForTab]);

	useLayoutEffect(() => {
		if (!isBookingForOpen) return;
		updateBookingForDropdownPosition();
	}, [isBookingForOpen, bookingForTab, updateBookingForDropdownPosition]);

	useEffect(() => {
		if (!isBookingForOpen) return;
		if (typeof window === 'undefined') return;

		const handle = () => updateBookingForDropdownPosition();
		window.addEventListener('resize', handle);
		// capture=true so we also reposition when any scrollable ancestor scrolls
		window.addEventListener('scroll', handle, true);
		return () => {
			window.removeEventListener('resize', handle);
			window.removeEventListener('scroll', handle, true);
		};
	}, [isBookingForOpen, updateBookingForDropdownPosition]);

	const style = {
		transform: CSS.Transform.toString(transform),
		WebkitTransform: CSS.Transform.toString(transform),
		transition,
		WebkitTransition: transition,
	};

	const isTextBlock = block.value === HybridBlock.text;
	const isFullAutomatedBlock = block.value === HybridBlock.full_automated;
	const isIntroductionBlock = block.value === HybridBlock.introduction;
	const isResearchBlock = block.value === HybridBlock.research;
	const isActionBlock = block.value === HybridBlock.action;
	const isHybridBlock = isIntroductionBlock || isResearchBlock || isActionBlock;
	const isCompactBlock =
		block.value === HybridBlock.introduction ||
		block.value === HybridBlock.research ||
		block.value === HybridBlock.action ||
		block.value === HybridBlock.text;
 
	// Detect if the Manual tab is selected (all blocks are Text)
	const isManualModeSelected =
		(form.getValues('hybridBlockPrompts')?.length || 0) > 0 &&
		form
			.getValues('hybridBlockPrompts')
			.every((b: { type: HybridBlock }) => b.type === HybridBlock.text);

	// Watch the field value to determine if text block is empty
	const fieldValue = form.watch(`hybridBlockPrompts.${fieldIndex}.value`);
	const isTextBlockEmpty = isTextBlock && !fieldValue;
	// Only show red styling if the field has been touched and is empty
	const shouldShowRedStyling = isTextBlockEmpty && hasBeenTouched;

	// Mobile detection for conditional placeholder shortening
	const isMobile = useIsMobile();

	type ProfileFields = {
		name: string;
		genre: string;
		area: string;
		band: string;
		bio: string;
		links: string;
	};

	type ProfileChipItem = {
		key: string;
		text: string;
		bgClass: string;
		isEmpty: boolean;
	};

	const profileChipItems = useMemo<ProfileChipItem[]>(() => {
		if (!isFullAutomatedBlock) return [];
		const pf: ProfileFields = {
			name: profileFields?.name ?? '',
			genre: profileFields?.genre ?? '',
			area: profileFields?.area ?? '',
			band: profileFields?.band ?? '',
			bio: profileFields?.bio ?? '',
			links: profileFields?.links ?? '',
		};

		const truncate = (value: string, max: number) => {
			const v = value.trim();
			if (v.length <= max) return v;
			return v.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
		};

		const chips: ProfileChipItem[] = [];

		const name = pf.name.trim();
		const genre = pf.genre.trim();
		const area = pf.area.trim();
		const band = pf.band.trim();
		const bio = pf.bio.trim();
		const linksRaw = pf.links.trim();

		chips.push({
			key: 'profile-name',
			text: name ? `Nme. ${truncate(name, 28)}` : 'Nme.',
			bgClass: 'bg-[#DADAFC]',
			isEmpty: !name,
		});
		chips.push({
			key: 'profile-genre',
			text: genre ? `Gnre. ${truncate(genre, 22)}` : 'Gnre.',
			bgClass: 'bg-[#DADAFC]',
			isEmpty: !genre,
		});
		chips.push({
			key: 'profile-area',
			text: area ? `Area. ${truncate(area, 30)}` : 'Area.',
			bgClass: 'bg-[#DADAFC]',
			isEmpty: !area,
		});
		chips.push({
			key: 'profile-band',
			text: band ? `Artst Nme. ${truncate(band, 30)}` : 'Artst Nme.',
			bgClass: 'bg-[#CFF5F5]',
			isEmpty: !band,
		});
		chips.push({
			key: 'profile-bio',
			text: bio ? `Bio. “${truncate(bio, 48)}”` : 'Bio.',
			bgClass: 'bg-[#CFF5F5]',
			isEmpty: !bio,
		});

		const links = linksRaw
			.split(/\r?\n|,/g)
			.map((s) => s.trim())
			.filter(Boolean);

		if (links.length === 0) {
			chips.push({
				key: 'profile-link-0',
				text: 'Link.',
				bgClass: 'bg-[#C7F2C9]',
				isEmpty: true,
			});
		} else {
			for (let i = 0; i < links.length; i++) {
				const link = links[i];
				chips.push({
					key: `profile-link-${i}`,
					text: `Link. ${truncate(link, 42)}`,
					bgClass: 'bg-[#C7F2C9]',
					isEmpty: false,
				});
			}
		}

		return chips;
	}, [isFullAutomatedBlock, profileFields]);

	// Full Auto: prompt score meter helpers (display only)
	const clampedPromptScore = useMemo(() => {
		if (typeof promptQualityScore !== 'number') return null;
		return Math.max(70, Math.min(98, Math.round(promptQualityScore)));
	}, [promptQualityScore]);

	const promptScoreLabel = useMemo(() => {
		if (clampedPromptScore == null) return null;
		const label = (promptQualityLabel ?? '').trim();
		if (label) return label;
		if (clampedPromptScore >= 97) return 'Exceptional';
		if (clampedPromptScore >= 91) return 'Excellent';
		if (clampedPromptScore >= 83) return 'Great';
		if (clampedPromptScore >= 75) return 'Good';
		return 'Keep Going';
	}, [clampedPromptScore, promptQualityLabel]);

	const promptScoreFillPercent = clampedPromptScore == null ? 0 : clampedPromptScore;

	// Get the border color for the block
	const getBorderColor = () => {
		if (isIntroductionBlock) return '#6673FF';
		if (isResearchBlock) return '#1010E7';
		if (isActionBlock) return '#0E0E7F';
		return 'gray-300';
	};

	// If this is a collapsed hybrid block, show a collapsed button
	if (isCollapsed && isHybridBlock) {
		return (
			<div
				className={cn(
					'flex justify-end',
					showTestPreview
						? 'w-[426px] max-[480px]:w-[89.8vw]'
						: 'w-[93.7vw] max-w-[475px]'
				)}
			>
				<Button
					type="button"
					onClick={() => onExpand?.(id)}
					className="w-[76px] h-[30px] bg-background hover:bg-primary/20 active:bg-primary/20 border-2 rounded-[8px] !font-normal text-[10px] text-gray-600"
					style={{ borderColor: getBorderColor() }}
				>
					<span className="font-secondary">
						{isIntroductionBlock ? 'Intro' : isResearchBlock ? 'Research' : 'CTA'}
					</span>
				</Button>
			</div>
		);
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-block-type={
				isFullAutomatedBlock
					? 'full'
					: isIntroductionBlock
					? 'introduction'
					: isResearchBlock
					? 'research'
					: isActionBlock
					? 'action'
					: isTextBlock
					? 'text'
					: 'other'
			}
			className={cn(
				'relative rounded-md',
				isFullAutomatedBlock ? 'overflow-visible' : 'overflow-hidden',
				isIntroductionBlock && 'border-2 border-[#6673FF] bg-background',
				isResearchBlock && 'border-2 border-[#1010E7] bg-background',
				isActionBlock && 'border-2 border-[#0E0E7F] bg-background',
				isTextBlock && 'border-[3px] border-[#187124] bg-background',
			!isIntroductionBlock &&
				!isResearchBlock &&
				!isActionBlock &&
				!isTextBlock &&
				!isFullAutomatedBlock &&
				'border-2 border-gray-300 bg-background',
			isFullAutomatedBlock && 'border border-gray-300 bg-[#51A2E4]',
			isTextBlock
				? showTestPreview
					? 'w-[426px] max-[480px]:w-[89.33vw] min-h-[44px]'
					: isManualModeSelected
					? 'w-[89.33vw] max-w-[475px] min-h-[188px]'
					: 'w-[89.33vw] max-w-[475px] min-h-[80px]'
					: isCompactBlock
					? showTestPreview
						? `w-[426px] max-[480px]:w-[89.33vw] ${
								isAdvancedEnabled ? 'h-[78px]' : 'h-[31px] max-[480px]:h-[24px]'
						  }`
						: `w-[89.33vw] max-w-[475px] ${
								isAdvancedEnabled ? 'h-[78px]' : 'h-[31px] max-[480px]:h-[24px]'
						  }`
					: isFullAutomatedBlock
					? showTestPreview
						? `w-[426px] max-[480px]:w-[89.33vw] ${
								isCustomInstructionsOpen ? 'h-auto min-h-[233px]' : 'h-[233px]'
						  }`
						: `w-[468px] max-[480px]:w-[89.33vw] ${
								isCustomInstructionsOpen ? 'h-auto min-h-[233px]' : 'h-[233px]'
						  }`
					: showTestPreview
					? 'w-[426px] max-[480px]:w-[89.33vw]'
					: 'w-[89.33vw] max-w-[475px]',
				!isIntroductionBlock &&
					!isResearchBlock &&
					!isActionBlock &&
					!isTextBlock &&
					(shouldShowRedStyling
						? 'border-[#A20000]'
						: 'border-secondary'),
				isDragging ? 'opacity-50 z-50 transform-gpu' : ''
			)}
		>
			{/* Inner content wrapper */}
			<div
				className={cn(
					(isIntroductionBlock || isResearchBlock || isActionBlock) &&
						!isAdvancedEnabled &&
						'bg-[#DADAFC] h-full',
					'relative'
				)}
			>
				{/* Drag handle */}
				<div
					{...(!isFullAutomatedBlock && !isDragDisabled ? attributes : {})}
					{...(!isFullAutomatedBlock && !isDragDisabled ? listeners : {})}
					data-drag-handle
					className={cn(
						'absolute top-0 left-0 z-[1]',
						isFullAutomatedBlock || isDragDisabled ? 'cursor-default' : 'cursor-move',
						isTextBlock
							? showTestPreview
								? 'h-[44px] w-[80px]'
								: 'h-[80px] w-[90px]'
							: isCompactBlock
							? showTestPreview
								? `${
										isAdvancedEnabled ? 'h-[78px]' : 'h-[31px] max-[480px]:h-[24px]'
								  } w-[80px]`
								: `${
										isAdvancedEnabled ? 'h-[78px]' : 'h-[31px] max-[480px]:h-[24px]'
								  } w-[90px]`
							: 'h-12',
						isFullAutomatedBlock
							? 'w-[172px]'
							: !isCompactBlock && !isFullAutomatedBlock
							? 'w-full'
							: ''
					)}
				/>
				{/* Block content container */}
				<div
					className={cn(
						'flex items-center w-full',
						isCompactBlock
							? isAdvancedEnabled
								? 'p-0 h-full'
								: isTextBlock && isManualModeSelected
								? 'p-0 h-full'
								: 'p-2 h-full max-[480px]:py-[2px]'
							: isFullAutomatedBlock
							? 'p-0'
							: isTextBlock
							? 'px-4 pt-2 pb-4'
							: 'p-4'
					)}
				>
					<div className={cn('flex-grow min-w-0', isCompactBlock && 'flex items-center')}>
						{isDragging && (
							<div className="absolute inset-0 rounded-md bg-background z-10 pointer-events-none" />
						)}
						<div
							className={cn(
								'absolute z-30',
								isCompactBlock
									? isTextBlock
										? 'right-1 top-0'
										: isAdvancedEnabled
										? 'right-1 top-[12.5px] -translate-y-1/2'
										: 'right-1 top-1/2 -translate-y-1/2'
									: isFullAutomatedBlock
									? 'right-1 top-0'
									: isTextBlock
									? 'right-3 top-2'
									: 'right-3 top-3'
							)}
						>
							{!isTextBlock && !isFullAutomatedBlock && !isCompactBlock && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setIsAdvancedEnabled(true);
									}}
									className="absolute top-0 bottom-0 right-14 w-[75px] flex items-center justify-center text-[12px] font-inter font-normal text-[#000000] cursor-pointer hover:bg-[#C4C4F5] active:bg-[#B0B0E8] transition-colors"
								>
									<span className="absolute left-0 h-full border-l border-[#000000]"></span>
									<span>Advanced</span>
									<span className="absolute right-0 h-full border-r border-[#000000]"></span>
								</button>
							)}
							{!isFullAutomatedBlock && (!isTextBlock || !isManualModeSelected) && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn(isCompactBlock && 'h-8 w-8')}
									onClick={(e) => {
										e.stopPropagation();
										onRemove(id);
									}}
								>
									<X className="h-[13px] w-[13px] text-destructive-dark" />
								</Button>
							)}
						</div>
						{isCompactBlock ? (
							// Compact blocks
							<div
								className={cn(
									'w-full h-full',
									isAdvancedEnabled
										? 'flex flex-col'
										: isTextBlock
										? isManualModeSelected
											? 'flex flex-col'
											: 'flex items-start'
										: 'flex items-center'
								)}
							>
								{isTextBlock ? (
									<>
										{/* Top section with Text label */}
										<div className={cn(
											'flex items-center',
											isManualModeSelected ? 'h-[29px] pl-2 w-full bg-[#A6E0B4]' : 'w-[90px]'
										)}>
											<span
												className={cn(
													'font-inter font-medium text-[17px] leading-[14px]',
													shouldShowRedStyling && 'text-[#A20000]'
												)}
											>
												Text
											</span>
										</div>
										{/* Horizontal divider for Manual mode text blocks */}
										{isManualModeSelected && (
											<div className="w-full border-b-2 border-black" />
										)}
										{/* Textarea - below divider in Manual mode, inline otherwise */}
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											return (
												<Textarea
													placeholder={
														isIntroductionBlock ? 'Automated Intro' : block.placeholder
													}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'flex-1 outline-none focus:outline-none text-sm border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none overflow-hidden bg-transparent min-h-0 appearance-none rounded-none',
														(isIntroductionBlock || isResearchBlock || isActionBlock) &&
															'font-inter placeholder:italic placeholder:text-[#5d5d5d]',
														isManualModeSelected ? 'pl-2 pt-2 pr-4 pb-[35px]' : 'pl-0 pr-12',
														// Make placeholder text much smaller on mobile portrait when in Manual mode
														isManualModeSelected && 'max-[480px]:placeholder:text-[10px]'
													)}
													rows={isMobile ? 2 : 1}
													{...fieldProps}
													onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
														const target = e.currentTarget;
														target.style.height = 'auto';
														target.style.height = target.scrollHeight + 'px';
													}}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLTextAreaElement
														);
													}}
													onBlur={(e) => {
														if (isTextBlock) {
															setHasBeenTouched(true);
														}
														fieldProps.onBlur(e);
													}}
													onChange={(e) => {
														if (isTextBlock && e.target.value) {
															setHasBeenTouched(true);
														}
														fieldProps.onChange(e);
													}}
												/>
											);
										})()}
									</>
								) : (
									// Compact blocks with "Hybrid"
									<>
										{isAdvancedEnabled &&
										(isIntroductionBlock || isResearchBlock || isActionBlock) ? (
											// Expanded layout with top section and input below
											<div className="w-full h-full flex flex-col bg-[#DADAFC]">
												{/* Top section - maintains original compact layout */}
												<div className="relative flex items-center h-[25px] px-2 bg-[#DADAFC]">
													<div className="flex flex-col justify-center w-[90px]">
														<span
															className={cn(
																'font-inter font-medium text-[17px] leading-[17px] text-[#000000]',
																isIntroductionBlock && '',
																isResearchBlock && '',
																isActionBlock && ''
															)}
														>
															{isIntroductionBlock
																? 'Intro'
																: isResearchBlock
																? 'Resarch'
																: isActionBlock
																? 'CTA'
																: (block as { label: string }).label}
														</span>
													</div>
													<div className="flex-1 min-w-0 flex items-center pl-0 pr-12 overflow-hidden">
														<span className="text-sm max-[480px]:text-[10px] font-inter italic text-[#5d5d5d] truncate">
															{isResearchBlock
																? isMobile
																	? 'Automatic Research'
																	: showTestPreview
																	? 'Automated Research'
																	: block.placeholder
																: block.placeholder}
														</span>
													</div>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setIsAdvancedEnabled(false);
														}}
														className="absolute right-10 top-0 bottom-0 w-[75px] flex items-center justify-center text-[12px] font-inter font-normal text-white bg-[#5353AF] cursor-pointer hover:bg-[#4a4a9d] active:bg-[#42428c] transition-colors"
													>
														<span className="absolute left-0 h-full border-l border-black"></span>
														<span>Advanced</span>
														<span className="absolute right-0 h-full border-r border-black"></span>
													</button>
												</div>
												{/* Horizontal divider */}
												<div
													className="w-full border-b-2"
													style={{
														borderColor: isIntroductionBlock
															? '#6673FF'
															: isResearchBlock
															? '#1010E7'
															: isActionBlock
															? '#0E0E7F'
															: '#000000',
													}}
												/>
												{/* Input section below */}
												<div className="flex-1 flex items-end pb-2 pt-1 px-2 bg-white">
													<div className="w-[90px] flex-shrink-0" />
													<div className="flex-1 flex items-center pl-0 pr-12">
														{(() => {
															const fieldProps = form.register(
																`hybridBlockPrompts.${fieldIndex}.value`
															);
															return (
																<input
																	type="text"
																	placeholder=""
																	onClick={(e) => e.stopPropagation()}
																	className={cn(
																		'w-full outline-none text-sm',
																		'!bg-white',
																		'font-inter'
																	)}
																	style={{ backgroundColor: '#FFFFFF' }}
																	{...fieldProps}
																	ref={(el) => {
																		advancedInputRef.current = el;
																		fieldProps.ref(el);
																	}}
																	onFocus={(e) => {
																		trackFocusedField?.(
																			`hybridBlockPrompts.${fieldIndex}.value`,
																			e.target as HTMLInputElement
																		);
																		e.target.style.cursor = 'text';
																	}}
																	onBlur={(e) => {
																		fieldProps.onBlur(e);
																		e.target.style.cursor = '';
																	}}
																/>
															);
														})()}
													</div>
												</div>
											</div>
										) : (
											// Non-expanded compact layout
											<>
												<div className="flex flex-col justify-center w-[90px]">
													<span
														className={cn(
															'font-inter font-medium text-[17px] leading-[17px] text-[#000000]',
															isIntroductionBlock && '',
															isResearchBlock && '',
															isActionBlock && ''
														)}
													>
														{isIntroductionBlock
															? 'Intro'
															: isResearchBlock
															? 'Resarch'
															: isActionBlock
															? 'CTA'
															: (block as { label: string }).label}
													</span>
												</div>
												{(() => {
													const fieldProps = form.register(
														`hybridBlockPrompts.${fieldIndex}.value`
													);

													return (
														<>
															<input
																type="text"
																placeholder={
																	isResearchBlock
																		? isMobile
																			? 'Automatic Research'
																			: showTestPreview
																			? 'Automated Research'
																			: block.placeholder
																		: block.placeholder
																}
																onClick={(e) => e.stopPropagation()}
																disabled={
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																	!isAdvancedEnabled
																}
																className={cn(
																	'flex-1 outline-none text-sm max-[480px]:text-[10px] truncate min-w-0',
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? '!bg-[#DADAFC]'
																		: 'bg-white placeholder:text-gray-400',
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																		'font-inter placeholder:italic placeholder:text-[#5d5d5d] max-[480px]:placeholder:text-[10px]',
																	'pl-0',
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? 'pr-24'
																		: 'pr-12',
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																		!isAdvancedEnabled &&
																		'cursor-default'
																)}
																style={
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? { backgroundColor: '#DADAFC' }
																		: undefined
																}
																{...fieldProps}
																ref={(el) => {
																	// Combine react-hook-form ref with our custom ref
																	fieldProps.ref(el);
																}}
																onFocus={(e) => {
																	trackFocusedField?.(
																		`hybridBlockPrompts.${fieldIndex}.value`,
																		e.target as HTMLInputElement
																	);
																	// Hide cursor when focused
																	if (
																		isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock
																	) {
																		e.target.style.cursor = 'text';
																	}
																}}
																onBlur={(e) => {
																	fieldProps.onBlur(e);
																	// Restore cursor when unfocused
																	if (
																		isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock
																	) {
																		e.target.style.cursor = '';
																	}
																}}
															/>
															{(isIntroductionBlock ||
																isResearchBlock ||
																isActionBlock) &&
																!isAdvancedEnabled && (
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			setIsAdvancedEnabled(true);
																		}}
																		className="absolute right-10 top-0 bottom-0 w-[75px] flex items-center justify-center text-[12px] font-inter font-normal text-[#000000] cursor-pointer hover:bg-[#C4C4F5] active:bg-[#B0B0E8] transition-colors"
																	>
																		<span className="absolute left-0 h-full border-l border-[#000000]"></span>
																		<span>Advanced</span>
																		<span className="absolute right-0 h-full border-r border-[#000000]"></span>
																	</button>
																)}
														</>
													);
												})()}
											</>
										)}
									</>
								)}
							</div>
						) : (
							// Non-compact blocks
							<>
								{!isTextBlock && !isFullAutomatedBlock && <></>}
								{/* Header background fill for Full Auto box */}
								{isFullAutomatedBlock && (
									<div className="w-full px-1 pt-1 pb-1">
										<div className="rounded-t-[6px] overflow-hidden">
											<div className="h-[27px] bg-[#B9DAF5] flex items-stretch">
												{/* Full Auto label section */}
												<div className="flex-1 flex items-center pl-[16px]">
													<Typography
														variant="h4"
														className="font-inter font-semibold text-[17px] text-[#000000]"
													>
														Body
													</Typography>
												</div>
												{/* Divider - black when Normal Power selected */}
												<div
													className={cn(
														'w-[1px] flex-shrink-0 transition-colors',
														selectedPowerMode === 'normal'
															? 'bg-[#000000]'
															: 'bg-[#51A2E4]'
													)}
												/>
												{/* Normal Power section */}
												<button
													type="button"
													onClick={() => setSelectedPowerMode('normal')}
													className={cn(
														'w-[101px] flex items-center justify-center cursor-pointer border-0 p-0 m-0 transition-colors flex-shrink-0 outline-none focus:outline-none',
														selectedPowerMode === 'normal'
															? 'bg-[#8DBFE8]'
															: 'bg-transparent'
													)}
												>
													<span
														className={cn(
															'font-inter font-normal italic text-[14px] transition-colors',
															selectedPowerMode === 'normal'
																? 'text-[#000000]'
																: 'text-[#9E9E9E]'
														)}
													>
														Normal Power
													</span>
												</button>
												{/* Divider - black when either Normal Power or High selected */}
												<div
													className={cn(
														'w-[1px] flex-shrink-0 transition-colors',
														selectedPowerMode === 'normal' ||
															selectedPowerMode === 'high'
															? 'bg-[#000000]'
															: 'bg-[#51A2E4]'
													)}
												/>
												{/* High section */}
												<button
													type="button"
													onClick={() => setSelectedPowerMode('high')}
													className={cn(
														'w-[46px] flex items-center justify-center cursor-pointer border-0 p-0 m-0 transition-colors flex-shrink-0 outline-none focus:outline-none',
														selectedPowerMode === 'high'
															? 'bg-[#8DBFE8]'
															: 'bg-transparent'
													)}
												>
													<span
														className={cn(
															'font-inter font-normal italic text-[14px] transition-colors',
															selectedPowerMode === 'high'
																? 'text-[#000000]'
																: 'text-[#9E9E9E]'
														)}
													>
														High
													</span>
												</button>
												{/* Divider - black when High selected */}
												<div
													className={cn(
														'w-[1px] flex-shrink-0 transition-colors',
														selectedPowerMode === 'high'
															? 'bg-[#000000]'
															: 'bg-[#51A2E4]'
													)}
												/>
												{/* Right empty section */}
												<div className="w-[31px] flex-shrink-0" />
											</div>
										</div>
									</div>
								)}
								{!isFullAutomatedBlock && (
									<div
										className={cn(
											'flex gap-2 items-center relative z-20',
											isTextBlock ? 'min-h-7 mb-1' : 'min-h-7 mb-2',
											'max-[480px]:flex-wrap max-[480px]:gap-y-1'
										)}
									>
										{!isTextBlock ? (
											<>
												<Typography
													variant="h4"
													className={cn(
														'font-inter',
														isIntroductionBlock && 'text-[#9D9DFF]',
														isResearchBlock && 'text-[#4A4AD9]',
														isActionBlock && 'text-[#040488]'
													)}
												>
													{(block as { label: string }).label}
												</Typography>
											</>
										) : (
											<Typography
												variant="h4"
												className={cn(
													'font-inter',
													shouldShowRedStyling && 'text-[#A20000]'
												)}
											>
												Text
											</Typography>
										)}
									</div>
								)}
								{isFullAutomatedBlock ? (
									<div className="min-h-[60px] w-full px-1 pb-1">
										<div className="w-full bg-[#58A6E5] rounded-b-[6px] p-2 flex justify-center">
											<div className="w-[448px] max-w-full flex flex-col items-start">
												<div
													className="w-full h-[104px] bg-white rounded-[8px] border border-black px-2 pt-1 pb-2 overflow-y-auto overflow-x-hidden hide-native-scrollbar cursor-pointer"
													role="button"
													tabIndex={0}
													aria-label="Open Profile"
													onClick={(e) => {
														e.stopPropagation();
														onGoToProfileTab?.();
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault();
															e.stopPropagation();
															onGoToProfileTab?.();
														}
													}}
												>
													<div className="font-inter font-normal text-[13px] leading-[16px] text-black mb-[7px]">
														Profile
													</div>
													<div className="flex flex-wrap gap-x-[6px] gap-y-[10px] content-start">
														{profileChipItems.map((chip) => (
															<span
																key={chip.key}
																className={cn(
																	'inline-flex items-center rounded-[5px] px-[5px] py-[0.5px] font-inter font-normal text-[10px] leading-[12px] max-[480px]:text-[8px] max-[480px]:leading-[10px] text-black max-w-full whitespace-nowrap',
																	chip.bgClass,
																	chip.isEmpty && 'opacity-50'
																)}
															>
																{chip.text}
															</span>
														))}
													</div>
												</div>

												{/* Booking For box (203 x 28px) + dropdown */}
												<div ref={bookingForContainerRef} className="relative mt-[10px]">
													<button
														ref={bookingForButtonRef}
														type="button"
														onClick={() => {
															clearBookingForCloseTimeout();
															if (isBookingForOpen) {
																setIsBookingForOpen(false);
																return;
															}

															const isSeasonSelection =
																bookingForValue === 'Spring' ||
																bookingForValue === 'Summer' ||
																bookingForValue === 'Fall' ||
																bookingForValue === 'Winter';

															// Prefer the last selected tab when reopening the dropdown.
															// This lets Calendar keep the previous "Booking For" label until a date is selected.
															if (bookingForTab === 'Calendar') {
																setBookingForTab('Calendar');
															} else if (bookingForTab === 'Season') {
																if (isSeasonSelection) {
																	setBookingForSeason(bookingForValue as BookingForSeason);
																}
																setBookingForTab('Season');
															} else if (bookingForCalendarStartDate != null) {
																setBookingForTab('Calendar');
															} else if (isSeasonSelection) {
																setBookingForSeason(bookingForValue as BookingForSeason);
																setBookingForTab('Season');
															} else {
																setBookingForTab('Anytime');
															}

															setIsBookingForOpen(true);
														}}
														className="min-w-[203px] h-[28px] bg-white rounded-[8px] border-2 border-black inline-flex items-center justify-between gap-2 px-4 whitespace-nowrap"
														aria-haspopup="dialog"
														aria-expanded={isBookingForOpen}
													>
														<span className="font-inter font-normal text-[14px] leading-[14px] text-black whitespace-nowrap">
															Booking For
														</span>
														<span className="font-inter font-bold text-[14px] leading-[14px] text-black mr-1 whitespace-nowrap">
															{bookingForValue}
														</span>
													</button>

													{isBookingForOpen &&
														bookingForDropdownPosition &&
														typeof document !== 'undefined' &&
														createPortal(
															<div
																ref={bookingForDropdownRef}
																style={{
																	position: 'fixed',
																	top: bookingForDropdownPosition.top,
																	left: bookingForDropdownPosition.left,
																	width: bookingForDropdownSize.width,
																	height: bookingForDropdownSize.height,
																}}
																className={cn(
																	'z-[9999] rounded-[6px]',
																	bookingForTab === 'Season'
																		? bookingForSeason === 'Spring'
																			? 'bg-[#9BD2FF]'
																			: bookingForSeason === 'Summer'
																				? 'bg-[#7ADF85]'
																				: bookingForSeason === 'Fall'
																					? 'bg-[#D77C2C]'
																					: 'bg-[#1960AC]'
																		: 'bg-[#F5F5F5]',
																	'border-2 border-black',
																	'flex flex-col overflow-hidden'
																)}
																onMouseEnter={clearBookingForCloseTimeout}
																onMouseLeave={scheduleBookingForCloseTimeout}
																role="dialog"
																aria-label="Booking For"
															>
																<div className="relative h-[46px]">
																	{bookingForTab === 'Season' && (
																		<div
																			aria-hidden="true"
																			className="pointer-events-none absolute inset-0 flex items-center justify-center"
																		>
																			<div className="w-[284px] h-[32px] bg-[#E2E2E2] opacity-30 rounded-[6px]" />
																		</div>
																	)}

																	<div
																		className={cn(
																			'relative z-[1] h-full flex items-center',
																			bookingForTab === 'Calendar' && bookingForTabStripLeft != null
																				? 'justify-start'
																				: 'justify-center'
																		)}
																		style={
																			bookingForTab === 'Calendar' && bookingForTabStripLeft != null
																				? { paddingLeft: bookingForTabStripLeft }
																				: undefined
																		}
																	>
																		<div className="w-[284px] grid grid-cols-3 items-center gap-[8px]">
																			{(['Anytime', 'Season', 'Calendar'] as const).map(
																				(opt) => {
																					const isSelected = bookingForTab === opt;
																					return (
																						<button
																							key={opt}
																							type="button"
																							onClick={() => {
																								if (opt === 'Season') {
																									setBookingForTab('Season');
																									return;
																								}

																								if (opt === 'Anytime') {
																									setBookingForValue('Anytime');
																									setBookingForCalendarStartDate(null);
																									setBookingForCalendarEndDate(null);
																									setBookingForTab('Anytime');
																									return;
																								}

																								// Calendar
																								setBookingForTab('Calendar');
																							}}
																							className={cn(
																								'h-[28px] w-[81px] rounded-[6px] font-inter text-[14px] leading-[14px] text-black',
																								'flex items-center justify-center text-center justify-self-center',
																								isSelected
																									? opt === 'Season'
																										? 'bg-[#F5F5F5] font-semibold'
																										: 'bg-[#C2C2C2] font-semibold'
																									: 'bg-transparent font-normal hover:bg-black/5'
																							)}
																							role="button"
																							aria-pressed={isSelected}
																						>
																							{opt}
																						</button>
																					);
																				}
																			)}
																		</div>
																	</div>
																</div>

																{bookingForTab === 'Season' && (
																	<div className="flex-1 flex flex-col items-center justify-center gap-[10px] pb-[10px]">
																		{(['Spring', 'Summer', 'Fall', 'Winter'] as const).map(
																			(season) => {
																				const isSelectedSeason = bookingForSeason === season;
																				return (
																					<button
																						key={season}
																						type="button"
																						onClick={() => {
																							setBookingForSeason(season);
																							setBookingForValue(season);
																							setBookingForCalendarStartDate(null);
																							setBookingForCalendarEndDate(null);
																						}}
																						className={cn(
																							'font-inter text-[14px] leading-[16px]',
																							isSelectedSeason
																								? 'font-semibold text-white'
																								: 'font-normal text-black opacity-90 hover:opacity-100'
																						)}
																					>
																						{season}
																					</button>
																				);
																			}
																		)}
																	</div>
																)}

																{bookingForTab === 'Calendar' && (
																	<div className="flex-1 w-full p-[14px]">
																		<div className="w-full h-full flex flex-col gap-[16px]">
																			{/* Top row */}
																			<div className="w-full flex items-center justify-center gap-[24px]">
																				{(() => {
																					const now = new Date();
																					const minBaseMonth = new Date(now.getFullYear(), now.getMonth(), 1);
																					const isPrevDisabled =
																						bookingForCalendarBaseMonth.getTime() <= minBaseMonth.getTime();

																					const currentMonth = new Intl.DateTimeFormat(undefined, {
																						month: 'long',
																					}).format(bookingForCalendarBaseMonth);
																					const nextMonthDate = new Date(
																						bookingForCalendarBaseMonth.getFullYear(),
																						bookingForCalendarBaseMonth.getMonth() + 1,
																						1
																					);
																					const nextMonth = new Intl.DateTimeFormat(undefined, {
																						month: 'long',
																					}).format(nextMonthDate);

																					return (
																						<div className="w-full flex items-center justify-center gap-[12px]">
																							<button
																								type="button"
																								disabled={isPrevDisabled}
																								onClick={() => {
																									setBookingForCalendarBaseMonth((prev) => {
																										const next = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
																										return next.getTime() < minBaseMonth.getTime() ? prev : next;
																									});
																								}}
																								className="shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:hover:opacity-100"
																								aria-label="Previous month"
																							>
																								<LeftArrow
																									width={8}
																									height={16}
																									color={isPrevDisabled ? '#A0A0A0' : '#000000'}
																									opacity={isPrevDisabled ? 0.6 : 1}
																								/>
																							</button>

																							<div className="flex items-center justify-center gap-[24px]">
																								<div className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]">
																									<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																										{currentMonth}
																									</span>
																								</div>
																								<div className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]">
																									<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																										{nextMonth}
																									</span>
																								</div>
																							</div>

																							<button
																								type="button"
																								onClick={() => {
																									setBookingForCalendarBaseMonth((prev) => {
																										return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
																									});
																								}}
																								className="shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
																								aria-label="Next month"
																							>
																								<RightArrow width={8} height={16} color="#000000" opacity={1} />
																							</button>
																						</div>
																					);
																				})()}
																			</div>

																			{/* Bottom row */}
																			<div className="w-full flex items-center justify-center gap-[24px]">
																				{(() => {
																					const now = new Date();
																					const today = new Date(
																						now.getFullYear(),
																						now.getMonth(),
																						now.getDate()
																					);

																					const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

																					const formatMonthDay = (date: Date) => {
																						return new Intl.DateTimeFormat('en-US', {
																							month: 'short',
																							day: 'numeric',
																						}).format(date);
																					};

																					const handleSelectCalendarDate = (date: Date) => {
																						// Prevent selecting past dates
																						if (date.getTime() < today.getTime()) return;

																						// First click (or restarting selection)
																						if (
																							bookingForCalendarStartDate == null ||
																							bookingForCalendarEndDate != null
																						) {
																							setBookingForCalendarStartDate(date);
																							setBookingForCalendarEndDate(null);
																							setBookingForValue(formatMonthDay(date));
																							return;
																						}

																						// Second click completes the range
																						const start = bookingForCalendarStartDate;
																						if (date.getTime() < start.getTime()) {
																							setBookingForCalendarStartDate(date);
																							setBookingForCalendarEndDate(start);
																							setBookingForValue(`${formatMonthDay(date)} - ${formatMonthDay(start)}`);
																							return;
																						}

																						setBookingForCalendarEndDate(date);
																						if (date.getTime() === start.getTime()) {
																							setBookingForValue(formatMonthDay(start));
																						} else {
																							setBookingForValue(`${formatMonthDay(start)} - ${formatMonthDay(date)}`);
																						}
																					};

																					const renderMonthGrid = (monthDate: Date) => {
																						const year = monthDate.getFullYear();
																						const month = monthDate.getMonth();
																						const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
																						const daysInMonth = new Date(year, month + 1, 0).getDate();

																						const cells = Array.from({ length: 42 }, (_, idx) => {
																							const dayNumber = idx - firstDayOfWeek + 1;
																							if (dayNumber < 1 || dayNumber > daysInMonth) return null;
																							return new Date(year, month, dayNumber);
																						});

																						return (
																							<div className="w-[364px] h-[312px] rounded-[8px] bg-[#E2E2E2] p-[18px] flex flex-col">
																								<div className="grid grid-cols-7 text-center">
																									{weekDays.map((d) => (
																										<div
																											key={d}
																											className="font-inter font-medium text-[12px] leading-[12px] text-black/35"
																										>
																											{d}
																										</div>
																									))}
																								</div>

																								<div className="mt-[18px] grid grid-cols-7 grid-rows-6 flex-1">
																									{cells.map((cellDate, idx) => {
																										if (!cellDate) {
																											return <div key={idx} aria-hidden="true" />;
																										}

																										const cellDayStart = new Date(
																											cellDate.getFullYear(),
																											cellDate.getMonth(),
																											cellDate.getDate()
																										);
																										const isPast = cellDayStart.getTime() < today.getTime();

																										const hasRange =
																											bookingForCalendarStartDate != null &&
																											bookingForCalendarEndDate != null &&
																											bookingForCalendarStartDate.getTime() !==
																												bookingForCalendarEndDate.getTime();
																										const rangeStart = bookingForCalendarStartDate;
																										const rangeEnd = bookingForCalendarEndDate;

																										const isStartSelected =
																											rangeStart != null &&
																											cellDayStart.getTime() === rangeStart.getTime();
																										const isEndSelected =
																											rangeEnd != null &&
																											cellDayStart.getTime() === rangeEnd.getTime();

																										const isInRange =
																											hasRange &&
																											rangeStart != null &&
																											rangeEnd != null &&
																											cellDayStart.getTime() > rangeStart.getTime() &&
																											cellDayStart.getTime() < rangeEnd.getTime();

																										const isInRangeInclusive =
																											hasRange &&
																											rangeStart != null &&
																											rangeEnd != null &&
																											cellDayStart.getTime() >= rangeStart.getTime() &&
																											cellDayStart.getTime() <= rangeEnd.getTime();

																										const prevDay = new Date(
																											cellDayStart.getFullYear(),
																											cellDayStart.getMonth(),
																											cellDayStart.getDate() - 1
																										);
																										const nextDay = new Date(
																											cellDayStart.getFullYear(),
																											cellDayStart.getMonth(),
																											cellDayStart.getDate() + 1
																										);
																										const prevInRange =
																											isInRangeInclusive &&
																											rangeStart != null &&
																											rangeEnd != null &&
																											prevDay.getTime() >= rangeStart.getTime() &&
																											prevDay.getTime() <= rangeEnd.getTime();
																										const nextInRange =
																											isInRangeInclusive &&
																											rangeStart != null &&
																											rangeEnd != null &&
																											nextDay.getTime() >= rangeStart.getTime() &&
																											nextDay.getTime() <= rangeEnd.getTime();

																										const isRowStart = idx % 7 === 0;
																										const isRowEnd = idx % 7 === 6;
																										const isRangeLeftCap =
																											isInRangeInclusive && (isRowStart || !prevInRange);
																										const isRangeRightCap =
																											isInRangeInclusive && (isRowEnd || !nextInRange);

																										return (
																											<button
																												key={idx}
																												className={cn(
																													'relative w-full h-full flex items-center justify-center group',
																													'bg-transparent border-0 p-0',
																													isPast ? 'cursor-not-allowed' : 'cursor-pointer'
																												)}
																												type="button"
																												disabled={isPast}
																												onClick={() => handleSelectCalendarDate(cellDayStart)}
																												aria-label={new Intl.DateTimeFormat('en-US', {
																													month: 'long',
																													day: 'numeric',
																													year: 'numeric',
																												}).format(cellDayStart)}
																											>
																												{/* Range pill background */}
																												{isInRangeInclusive && (
																													<div
																														aria-hidden="true"
																														className={cn(
																															'absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[34px] bg-white/55',
																															isRangeLeftCap && 'rounded-l-full',
																															isRangeRightCap && 'rounded-r-full'
																														)}
																													/>
																												)}

																												{/* Day circle / number */}
																												<div
																													className={cn(
																														'relative z-[1] w-[34px] h-[34px] rounded-full flex items-center justify-center',
																														'border border-transparent transition-colors',
																														'font-inter text-[16px] leading-[16px]',
																														!isPast &&
																															!isStartSelected &&
																															!isEndSelected &&
																															'group-hover:border-black',
																														(isStartSelected || isEndSelected) &&
																															'bg-black text-white',
																														isEndSelected &&
																															hasRange &&
																															'ring-2 ring-white ring-offset-2 ring-offset-black',
																														!isStartSelected &&
																															!isEndSelected &&
																															(isInRange ? 'text-black' : isPast ? 'text-black/25' : 'text-black')
																													)}
																												>
																													{cellDate.getDate()}
																												</div>
																											</button>
																										);
																									})}
																								</div>
																							</div>
																						);
																					};

																					const nextMonthBase = new Date(
																						bookingForCalendarBaseMonth.getFullYear(),
																						bookingForCalendarBaseMonth.getMonth() + 1,
																						1
																					);

																					return (
																						<>
																							{renderMonthGrid(bookingForCalendarBaseMonth)}
																							{renderMonthGrid(nextMonthBase)}
																						</>
																					);
																				})()}
																			</div>
																		</div>
																	</div>
																)}
															</div>,
															document.body
														)}
												</div>

												{/* Custom Instructions (expands in-place to match Profile width) */}
												<div
													ref={customInstructionsContainerRef}
													className="mt-[14px] w-full"
												>
													{(() => {
														const fieldProps = form.register(
															`hybridBlockPrompts.${fieldIndex}.value`
														);

														if (!isCustomInstructionsOpen) {
															return (
																<button
																	type="button"
																	onClick={() => setIsCustomInstructionsOpen(true)}
																	className={cn(
																		'w-[157px] h-[22px] bg-[#95CFFF] rounded-[8px] border-2 border-black',
																		'flex items-center justify-center gap-1 px-2',
																		'font-inter font-semibold text-[11px] leading-none text-black',
																		'hover:brightness-[0.98] active:brightness-[0.95]'
																	)}
																	aria-label="Custom Instructions"
																	aria-expanded={false}
																>
																	<span aria-hidden="true">+</span>
																	<span>Custom Instructions</span>
																</button>
															);
														}

														return (
															<div
																className={cn(
																	'w-full rounded-[8px] border-2 border-black overflow-hidden',
																	'flex flex-col bg-[#95CFFF]'
																)}
																aria-label="Custom Instructions"
															>
																<div className="h-[22px] flex items-center justify-between px-2">
																	<span className="font-inter font-semibold text-[11px] leading-none text-black">
																		Custom Instructions
																	</span>
																	<button
																		type="button"
																		onClick={() => setIsCustomInstructionsOpen(false)}
																		className={cn(
																			'h-[18px] w-[22px] rounded-[4px]',
																			'flex items-center justify-center bg-transparent',
																			'hover:bg-black/10 active:bg-black/15'
																		)}
																		aria-label="Collapse Custom Instructions"
																	>
																		<span className="text-[14px] leading-none">−</span>
																	</button>
																</div>
																<div className="h-[72px] border-t-2 border-black bg-white">
																	<Textarea
																		placeholder="Type anything you want to include"
																		className={cn(
																			'h-full w-full border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
																			'bg-white',
																			'px-3 py-2 resize-none overflow-y-auto',
																			'font-inter text-[12px] leading-[14px] text-black',
																			'max-[480px]:text-[10px]'
																		)}
																		{...fieldProps}
																		onClick={(e) => e.stopPropagation()}
																		onKeyDown={async (e) => {
																			// Enter should score the prompt, Shift+Enter should insert a newline.
																			if (e.key !== 'Enter') return;
																			if (e.shiftKey) return;
																			// Avoid interfering with IME composition confirmation.
																			// (Some browsers also expose this as `e.nativeEvent.isComposing`.)
																			// @ts-expect-error - React KeyboardEvent doesn't always expose isComposing in types
																			if (e.isComposing || (e.nativeEvent as any)?.isComposing) return;

																			e.preventDefault();
																			e.stopPropagation();

																			const currentValue =
																				form.getValues(`hybridBlockPrompts.${fieldIndex}.value`) || '';
																			await onGetSuggestions?.(currentValue);
																		}}
																		onFocus={(e) => {
																			trackFocusedField?.(
																				`hybridBlockPrompts.${fieldIndex}.value`,
																				e.target as HTMLTextAreaElement
																			);
																		}}
																		ref={(el) => {
																			fieldProps.ref(el);
																			customInstructionsRef.current = el;
																		}}
																	/>
																</div>
																{/* Prompt rating + Upscale controls (same wiring as Writing tab) */}
																<div className="h-[23px] bg-white px-3 flex items-start gap-[6px]">
																	{/* Score (159 x 20) */}
																	<div className="w-[159px] h-[20px] box-border bg-[#D7F0FF] border-2 border-black rounded-[8px] flex items-center gap-[6px] px-[6px]">
																		<div className="w-[92px] h-[12px] box-border bg-white border-2 border-black rounded-[8px] overflow-hidden shrink-0">
																			<div
																				className="h-full bg-[#36B24A] rounded-full transition-[width] duration-200"
																				style={{ width: `${promptScoreFillPercent}%` }}
																			/>
																		</div>
																		<span className="font-inter font-semibold text-[12px] leading-none text-black flex-1 text-center tabular-nums truncate">
																			{clampedPromptScore ?? ''}
																		</span>
																	</div>

																	{/* Undo (20 x 20) */}
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			if (!hasPreviousPrompt) return;
																			onUndoUpscalePrompt?.();
																		}}
																		disabled={!hasPreviousPrompt}
																		className={cn(
																			'w-[20px] h-[20px] box-border rounded-[6px] border-2 border-black bg-[#D7F0FF] flex items-center justify-center p-0',
																			hasPreviousPrompt
																				? 'cursor-pointer hover:brightness-[0.98] active:brightness-[0.95]'
																				: 'cursor-not-allowed'
																		)}
																		aria-label="Undo Upscale"
																	>
																		<UndoIcon width="14" height="14" />
																	</button>

																	{/* Upscale (73 x 20) */}
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			if (!onUpscalePrompt) return;
																			if (isUpscalingPrompt) return;
																			void onUpscalePrompt();
																		}}
																		disabled={!onUpscalePrompt || Boolean(isUpscalingPrompt)}
																		className={cn(
																			'w-[73px] h-[20px] box-border rounded-[8px] border-2 border-black bg-[#D7F0FF] flex items-center justify-between gap-[4px] px-[4px] py-0',
																			isUpscalingPrompt
																				? 'cursor-wait opacity-80'
																				: 'cursor-pointer hover:brightness-[0.98] active:brightness-[0.95]'
																		)}
																		aria-label="Upscale Prompt"
																	>
																		<span className="font-inter font-semibold text-[11px] leading-none text-black whitespace-nowrap">
																			{isUpscalingPrompt ? '...' : 'Upscale'}
																		</span>
																		<UpscaleIcon width="14" height="14" />
																	</button>
																</div>
															</div>
														);
													})()}
												</div>
											</div>
										</div>
									</div>
								) : (
									// For other blocks, show input always but disabled until Advanced is clicked
									<>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											const isHybridBlock =
												isIntroductionBlock || isResearchBlock || isActionBlock;
											if (!isHybridBlock) return null;

											return (
												<Input
													placeholder={
														'placeholder' in block
															? isIntroductionBlock
																? 'Automated Intro'
																: (block as { placeholder?: string }).placeholder || ''
															: ''
													}
													onClick={(e) => e.stopPropagation()}
													disabled={!isAdvancedEnabled}
													className={cn(
														'border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
														'!bg-[#DADAFC] [&]:!bg-[#DADAFC]',
														'font-inter placeholder:italic placeholder:text-[#5d5d5d]',
														!isAdvancedEnabled && 'cursor-default'
													)}
													style={{ backgroundColor: '#DADAFC' }}
													{...fieldProps}
													ref={(el) => {
														// Combine react-hook-form ref with our custom ref
														fieldProps.ref(el);
													}}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLInputElement
														);
														// Set text cursor when focused
														e.target.style.cursor = 'text';
													}}
													onBlur={(e) => {
														fieldProps.onBlur(e);
														// Restore cursor when unfocused
														e.target.style.cursor = '';
													}}
												/>
											);
										})()}
									</>
								)}
							</>
						)}
					</div>
				</div>
				{/* End of Block content container */}
			</div>
			{/* Bottom section - 31px with gray background, only for text blocks */}
			{isTextBlock && (
				<div
					className="absolute bottom-0 left-0 right-0 h-[31px] flex items-center"
					style={{ backgroundColor: '#F5F5F5' }}
				>
					<button
						type="button"
						onClick={() => {
							const currentValue = form.getValues(`hybridBlockPrompts.${fieldIndex}.value`) || '';
							onGetSuggestions?.(currentValue);
						}}
						className="w-[115px] h-[20px] ml-[15px] bg-[#D7F0FF] border-2 border-black rounded-[5px] text-[11px] font-inter font-semibold cursor-pointer"
					>
						Get Suggestions
					</button>
				</div>
			)}
		</div>
	);
};

export const HybridPromptInput: FC<HybridPromptInputProps> = (props) => {
	const {
		form,
		fields,
		handleDragEnd,
		handleRemoveBlock,
		getBlock,
		handleAddBlock,
		handleAddTextBlockAt,
		handleToggleCollapse,
		showTestPreview,
		setShowTestPreview,
		trackFocusedField,
		testMessage,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isPendingGeneration,
		isTest,
		contact,
		onGoToDrafting,
		onGetSuggestions,
		onUpscalePrompt,
		isUpscalingPrompt,
		promptQualityScore,
		promptQualityLabel,
		hasPreviousPrompt,
		onUndoUpscalePrompt,
		onFocusChange,
		identity,
		onIdentityUpdate,
	} = useHybridPromptInput(props);

	const {
		compactLeftOnly,
		onTestPreviewToggle,
		draftCount = 0,
		onDraftClick,
		isDraftDisabled,
		onSelectAllContacts,
		isNarrowDesktop,
		isNarrowestDesktop,
		hideDraftButton,
	} = props;

	// Track if the user has attempted to Test to control error styling
	const [hasAttemptedTest, setHasAttemptedTest] = useState(false);

	// Subject field red styling (manual mode): mirror text block behavior
	const subjectValue = form.watch('subject');
	const isManualSubject = !form.watch('isAiSubject');
	const [hasSubjectBeenTouched, setHasSubjectBeenTouched] = useState(false);
	const shouldShowSubjectRedStyling =
		isManualSubject &&
		hasSubjectBeenTouched &&
		(!subjectValue || subjectValue.trim() === '');

	const isHandwrittenMode =
		(form.getValues('hybridBlockPrompts')?.length || 0) > 0 &&
		form.getValues('hybridBlockPrompts').every((b) => b.type === HybridBlock.text);

	// Check for empty text blocks
	const hasEmptyTextBlocks = form
		.getValues('hybridBlockPrompts')
		?.some(
			(block) =>
				block.type === HybridBlock.text && (!block.value || block.value.trim() === '')
		);

	// Determine if any empty text block has been touched (blurred) to align with per-block red logic
	// Access touchedFields to subscribe to touch updates
	const touchedFields = form.formState.touchedFields as unknown as {
		hybridBlockPrompts?: Array<{ value?: boolean }>;
	};
	const hasTouchedEmptyTextBlocks = form
		.getValues('hybridBlockPrompts')
		?.some((block: { type: HybridBlock; value: string }, index: number) => {
			if (block.type !== HybridBlock.text) return false;
			const isTouched = Boolean(touchedFields?.hybridBlockPrompts?.[index]?.value);
			const isEmpty = !block.value || block.value.trim() === '';
			return isTouched && isEmpty;
		});

	// Derive selected mode key for stable overlay updates
	const isFullSelected = form
		.getValues('hybridBlockPrompts')
		?.some((b) => b.type === HybridBlock.full_automated);
	const isManualSelected =
		(form.getValues('hybridBlockPrompts')?.length || 0) > 0 &&
		form.getValues('hybridBlockPrompts').every((b) => b.type === HybridBlock.text);
	const lastModeRef = useRef<'full' | 'hybrid' | 'manual' | null>(null);
	const [modeOverride, setModeOverride] = useState<'none' | null>(null);
	useEffect(() => {
		const blocks = form.getValues('hybridBlockPrompts') || [];
		if (isFullSelected) {
			lastModeRef.current = 'full';
			setModeOverride(null);
			return;
		}
		if (
			blocks.length === 0 &&
			(lastModeRef.current === 'full' ||
				lastModeRef.current === 'manual' ||
				lastModeRef.current === 'hybrid')
		) {
			setModeOverride('none');
		} else {
			setModeOverride(null);
			if (isManualSelected) lastModeRef.current = 'manual';
			else if (blocks.length > 0) lastModeRef.current = 'hybrid';
			else lastModeRef.current = null;
		}
	}, [isFullSelected, isManualSelected, fields, form]); // depends on fields length now
	const selectedModeKey = useMemo(
		() =>
			modeOverride === 'none'
				? 'none'
				: isFullSelected
				? 'full'
				: isManualSelected
				? 'manual'
				: 'hybrid',
		[modeOverride, isFullSelected, isManualSelected]
	);
	const isHybridModeSelected = selectedModeKey === 'hybrid';

	const switchToFull = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.length > 0 && current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedManualBlocks', current);
		} else if (
			current.length > 0 &&
			!current.some((b) => b.type === HybridBlock.full_automated)
		) {
			form.setValue('savedHybridBlocks', current);
		}
		form.setValue('hybridBlockPrompts', [
			{
				id: 'full_automated',
				type: HybridBlock.full_automated,
				value: form.getValues('fullAiPrompt') || '',
			},
		]);
		form.setValue('isAiSubject', true);
	};
	const switchToHybrid = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.some((b) => b.type === HybridBlock.full_automated)) {
			form.setValue(
				'fullAiPrompt',
				(current.find((b) => b.type === HybridBlock.full_automated)?.value as string) ||
					''
			);
		} else if (current.length > 0 && current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedManualBlocks', current);
		} else if (current.length > 0) {
			form.setValue('savedHybridBlocks', current);
		}
		const savedHybrid: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('savedHybridBlocks') || [];
		form.setValue(
			'hybridBlockPrompts',
			savedHybrid.length > 0
				? savedHybrid
				: [
						{
							id: 'introduction',
							type: HybridBlock.introduction,
							value: '',
						},
						{
							id: 'research',
							type: HybridBlock.research,
							value: '',
						},
						{ id: 'action', type: HybridBlock.action, value: '' },
				  ]
		);
		form.setValue('isAiSubject', true);
	};

	const switchToManual = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.some((b) => b.type === HybridBlock.full_automated)) {
			form.setValue(
				'fullAiPrompt',
				(current.find((b) => b.type === HybridBlock.full_automated)?.value as string) ||
					''
			);
		} else if (current.length > 0 && !current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedHybridBlocks', current);
		}
		const savedManual: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('savedManualBlocks') || [];
		form.setValue(
			'hybridBlockPrompts',
			savedManual.length > 0
				? savedManual
				: [{ id: 'text-0', type: HybridBlock.text, value: '' }]
		);
		form.setValue('isAiSubject', false);
	};

	const modeContainerRef = useRef<HTMLDivElement>(null);
	const fullModeButtonRef = useRef<HTMLButtonElement>(null);
	const hybridModeButtonRef = useRef<HTMLButtonElement>(null);
	const manualModeButtonRef = useRef<HTMLButtonElement>(null);
	const mainContainerRef = useRef<HTMLDivElement>(null);
	const headerSectionRef = useRef<HTMLDivElement>(null);
	const modeDividerRef = useRef<HTMLDivElement>(null);
	const [overlayTopPx, setOverlayTopPx] = useState<number | null>(null);

	// Track which tab is active: 'main' (the normal Writing view) or 'profile'
	const [activeTab, setActiveTab] = useState<'main' | 'profile'>(() => {
		if (!props.autoOpenProfileTabWhenIncomplete) return 'main';
		const id = identity as {
			name?: string | null;
			genre?: string | null;
			area?: string | null;
			bio?: string | null;
		} | null | undefined;
		const isIncomplete =
			!(id?.name ?? '').trim() ||
			!(id?.genre ?? '').trim() ||
			!(id?.area ?? '').trim() ||
			!(id?.bio ?? '').trim();
		return isIncomplete ? 'profile' : 'main';
	});

	// Track if user has ever left the profile tab (to show red for incomplete fields after returning)
	const [hasLeftProfileTab, setHasLeftProfileTab] = useState(false);

	// Track which profile box is expanded (null = none expanded)
	const [expandedProfileBox, setExpandedProfileBox] = useState<string | null>(null);
	const expandedProfileBoxRef = useRef<HTMLDivElement>(null);

	type IdentityProfileFields = Identity & {
		genre?: string | null;
		area?: string | null;
		bandName?: string | null;
		bio?: string | null;
	};
	const identityProfile = identity as IdentityProfileFields | null | undefined;

	// Profile field values - initialized from identity
	const [profileFields, setProfileFields] = useState({
		name: identityProfile?.name || '',
		genre: identityProfile?.genre || '',
		area: identityProfile?.area || '',
		band: identityProfile?.bandName || '',
		bio: identityProfile?.bio || '',
		links: identityProfile?.website || '',
	});

	// Sync profileFields when identity changes
	useEffect(() => {
		if (identityProfile) {
			setProfileFields({
				name: identityProfile.name || '',
				genre: identityProfile.genre || '',
				area: identityProfile.area || '',
				band: identityProfile.bandName || '',
				bio: identityProfile.bio || '',
				links: identityProfile.website || '',
			});
		}
	}, [identityProfile]);

	// Profile score bar (weighted by UI order; more rules will follow)
	const PROFILE_PROGRESS_SEQUENCE = [
		{ key: 'name', label: 'Name' },
		{ key: 'genre', label: 'Genre' },
		{ key: 'area', label: 'Area' },
		{ key: 'band', label: 'Band/Artist Name' },
		{ key: 'bio', label: 'Bio' },
		{ key: 'links', label: 'Links' },
	] as const;

	// Bio completion rule:
	// - Until 7 words: always prompt for a fuller bio
	// - At 7+ words: require a complete sentence (has sentence punctuation)
	const bioWordCount = useMemo(() => {
		const trimmed = profileFields.bio.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter(Boolean).length;
	}, [profileFields.bio]);
	const bioHasSentencePunctuation = useMemo(() => {
		const trimmed = profileFields.bio.trim();
		if (!trimmed) return false;
		// Accept punctuation anywhere so users don't need to end with a period.
		// Also accept the unicode ellipsis character.
		return /[.!?…]/.test(trimmed);
	}, [profileFields.bio]);
	const isBioIncomplete = useMemo(() => {
		if (bioWordCount === 0) return true;
		if (bioWordCount < 7) return true;
		return !bioHasSentencePunctuation;
	}, [bioHasSentencePunctuation, bioWordCount]);

	const filledProfileFieldCount = useMemo(() => {
		const values = [
			profileFields.name,
			profileFields.genre,
			profileFields.area,
			profileFields.band,
			profileFields.bio,
			profileFields.links,
		];
		return values.reduce((count, v) => count + (v.trim() ? 1 : 0), 0);
	}, [
		profileFields.name,
		profileFields.genre,
		profileFields.area,
		profileFields.band,
		profileFields.bio,
		profileFields.links,
	]);

	const sequentialFilledProfileFieldCount = useMemo(() => {
		const isComplete = (key: (typeof PROFILE_PROGRESS_SEQUENCE)[number]['key']) => {
			const trimmed = profileFields[key].trim();
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
		profileFields.name,
		profileFields.genre,
		profileFields.area,
		profileFields.band,
		profileFields.bio,
		profileFields.links,
		isBioIncomplete,
	]);

	const nextProfileFieldToFill = useMemo(() => {
		const isComplete = (key: (typeof PROFILE_PROGRESS_SEQUENCE)[number]['key']) => {
			const trimmed = profileFields[key].trim();
			if (!trimmed) return false;
			if (key === 'bio') return !isBioIncomplete;
			return true;
		};

		return PROFILE_PROGRESS_SEQUENCE.find((step) => !isComplete(step.key)) ?? null;
	}, [
		profileFields.name,
		profileFields.genre,
		profileFields.area,
		profileFields.band,
		profileFields.bio,
		profileFields.links,
		isBioIncomplete,
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

	const didAutoOpenProfileTabRef = useRef(false);
	const isKeyProfileIncomplete = useMemo(() => {
		return (
			!profileFields.name.trim() ||
			!profileFields.genre.trim() ||
			!profileFields.area.trim() ||
			!profileFields.bio.trim()
		);
	}, [profileFields.name, profileFields.genre, profileFields.area, profileFields.bio]);

	// If requested by the parent, automatically route the user into the Profile tab
	// when key profile fields are still missing.
	useEffect(() => {
		if (!props.autoOpenProfileTabWhenIncomplete) return;
		if (!isKeyProfileIncomplete) return;
		if (didAutoOpenProfileTabRef.current) return;
		setActiveTab('profile');
		didAutoOpenProfileTabRef.current = true;
	}, [props.autoOpenProfileTabWhenIncomplete, isKeyProfileIncomplete]);

	type ProfileField = 'name' | 'genre' | 'area' | 'band' | 'bio' | 'links';

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
	const saveProfileField = (field: ProfileField) => {
		if (!onIdentityUpdate || !identityProfile) return;

		// Name is required on Identity. If empty, skip saving.
		if (field === 'name') {
			const next = profileFields.name.trim();
			const prev = identityProfile.name.trim();
			if (!next || next === prev) return;
			if (shouldSkipDuplicateProfileSave(`name:${next}`)) return;
			onIdentityUpdate({ name: next });
			return;
		}

		const next = normalizeNullable(profileFields[field]);
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
				onIdentityUpdate({ genre: next });
				return;
			case 'area':
				onIdentityUpdate({ area: next });
				return;
			case 'band':
				onIdentityUpdate({ bandName: next });
				return;
			case 'bio':
				onIdentityUpdate({ bio: next });
				return;
			case 'links':
				onIdentityUpdate({ website: next });
				return;
		}
	};

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
		if (field === 'name' && profileFields.name.trim() === '') return;

		saveProfileField(field);

		const idx = PROFILE_FIELD_ORDER.indexOf(field);
		const nextField = idx >= 0 ? PROFILE_FIELD_ORDER[idx + 1] : null;

		setExpandedProfileBox(nextField ?? null);
	};

	const getProfileHeaderBg = (field: ProfileField) => {
		if (expandedProfileBox === field) return '#E0E0E0';
		if (profileFields[field].trim()) return '#94DB96';
		// Show red only if user has left the profile tab before
		return hasLeftProfileTab ? '#E47979' : '#E0E0E0';
	};

	const getProfileHeaderText = (
		field: ProfileField,
		labelWhenEmpty: string,
		labelWhenExpanded: string
	) => {
		if (expandedProfileBox === field) return labelWhenExpanded;
		return profileFields[field].trim() || labelWhenEmpty;
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
	}, [activeTab]);

	// Track focus state for the entire prompt input area
	const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const handleContainerFocus = () => {
		if (focusTimeoutRef.current) {
			clearTimeout(focusTimeoutRef.current);
			focusTimeoutRef.current = null;
		}
		onFocusChange?.(true);
	};
	const handleContainerBlur = () => {
		// Use a small timeout to check if focus moved to another element within the container
		focusTimeoutRef.current = setTimeout(() => {
			onFocusChange?.(false);
		}, 100);
	};

	const [highlightStyle, setHighlightStyle] = useState({
		left: 0,
		width: 0,
		opacity: 1,
	});
	const [isInitialRender, setIsInitialRender] = useState(true);

	const dragBounds = useRef({ min: 0, max: 0 });

	// Use useLayoutEffect to calculate position BEFORE browser paints, preventing any visual jump
	useLayoutEffect(() => {
		if (selectedModeKey === 'none') {
			setHighlightStyle({
				left: 0,
				width: 0,
				opacity: 0,
			});
			return;
		}
		let targetButton;
		if (selectedModeKey === 'full') {
			targetButton = fullModeButtonRef.current;
		} else if (selectedModeKey === 'hybrid') {
			targetButton = hybridModeButtonRef.current;
		} else {
			targetButton = manualModeButtonRef.current;
		}

		if (targetButton) {
			const newLeft = targetButton.offsetLeft + targetButton.offsetWidth / 2 - 80.38 / 2;
			setHighlightStyle({
				left: newLeft,
				width: 80.38,
				opacity: 1,
			});
		}

		if (fullModeButtonRef.current && manualModeButtonRef.current) {
			const min =
				fullModeButtonRef.current.offsetLeft +
				fullModeButtonRef.current.offsetWidth / 2 -
				80.38 / 2;
			const max =
				manualModeButtonRef.current.offsetLeft +
				manualModeButtonRef.current.offsetWidth / 2 -
				80.38 / 2;
			dragBounds.current = { min, max };
		}
	}, [selectedModeKey]);

	// Delay enabling transitions until after the first paint
	useEffect(() => {
		if (isInitialRender) {
			requestAnimationFrame(() => {
				setIsInitialRender(false);
			});
		}
	}, [isInitialRender]);

	const restrictToHorizontalAxisAndBounds = ({
		transform,
	}: {
		transform: { x: number; y: number; scaleX: number; scaleY: number };
	}) => {
		const currentX = highlightStyle.left + transform.x;
		const { min, max } = dragBounds.current;

		if (min === 0 && max === 0) {
			return { ...transform, y: 0 };
		}

		const constrainedX = Math.max(min, Math.min(currentX, max));
		const newTransformX = constrainedX - highlightStyle.left;

		return {
			...transform,
			x: newTransformX,
			y: 0,
		};
	};

	const handleHighlightDragEnd = (event: { delta: { x: number } }) => {
		const finalX = highlightStyle.left + event.delta.x;

		const positions = [
			{
				mode: 'full',
				center:
					(fullModeButtonRef.current?.offsetLeft ?? 0) +
					(fullModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
			{
				mode: 'hybrid',
				center:
					(hybridModeButtonRef.current?.offsetLeft ?? 0) +
					(hybridModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
			{
				mode: 'manual',
				center:
					(manualModeButtonRef.current?.offsetLeft ?? 0) +
					(manualModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
		];

		const closest = positions.reduce((prev, curr) => {
			return Math.abs(curr.center - (finalX + 80.38 / 2)) <
				Math.abs(prev.center - (finalX + 80.38 / 2))
				? curr
				: prev;
		});

		// Dragging a mode should behave like clicking the mode buttons: show the writing tab.
		setActiveTab('main');
		setHasLeftProfileTab(true);

		if (closest.mode === 'full') {
			switchToFull();
		} else if (closest.mode === 'hybrid') {
			switchToHybrid();
		} else {
			switchToManual();
		}
	};

	const isMobile = useIsMobile();
	const modeHighlightSensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		})
	);

	// In Hybrid mode, the "+ Text" buttons intentionally sit slightly outside the main box.
	// The scroll container (`overflow-y-auto`) will clip horizontal overflow, so we add a
	// Hybrid-only right gutter to the scroll container so those buttons remain visible.
	const shouldEnableHybridPlusGutter =
		!compactLeftOnly && activeTab === 'main' && selectedModeKey === 'hybrid' && !showTestPreview;

	// Mobile-only: measure to start overlay exactly at the big divider line under Mode
	useLayoutEffect(() => {
		// Only show the green drafting gradient on the main Writing tab
		if (!isMobile || showTestPreview || activeTab !== 'main') {
			setOverlayTopPx(null);
			return;
		}
		const recalc = () => {
			const container = mainContainerRef.current;
			const headerSection = headerSectionRef.current;
			const divider = modeDividerRef.current;
			if (!container) return;
			const containerRect = container.getBoundingClientRect();
			// Account for the container's border so our absolutely positioned overlay,
			// which is positioned relative to the padding edge, starts exactly at the
			// visual divider line without leaving a gap on mobile.
			const borderTopWidth = container.clientTop || 0;
			let startBelow = 0;
			if (divider) {
				const dividerRect = divider.getBoundingClientRect();
				startBelow = dividerRect.bottom - containerRect.top;
			} else if (headerSection) {
				const headerRect = headerSection.getBoundingClientRect();
				startBelow = headerRect.bottom - containerRect.top;
			} else {
				return;
			}
			// Subtract the borderTop so the overlay's top aligns to the inside edge.
			// Using round avoids sub-pixel gaps on some DPRs.
			const nextTop = Math.max(0, Math.round(startBelow - borderTopWidth));
			setOverlayTopPx(nextTop);
		};
		recalc();
		window.addEventListener('resize', recalc);
		window.addEventListener('orientationchange', recalc);
		return () => {
			window.removeEventListener('resize', recalc);
			window.removeEventListener('orientationchange', recalc);
		};
	}, [activeTab, isMobile, showTestPreview, fields.length, selectedModeKey]);
	return (
		<div
			className={cn(
				compactLeftOnly ? '' : 'flex justify-center',
				!showTestPreview && 'max-[480px]:pb-[60px]'
			)}
			data-hpi-root
		>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<Droppable id="droppable">
					<DraggableBox
						id="main-drafting"
						dragHandleSelector="[data-root-drag-handle]"
						enabled={false}
						onDropOver={() => {}}
					>
						<div
							ref={mainContainerRef}
							className={`${
								compactLeftOnly
									? 'flex-col'
									: 'w-[96.27vw] max-w-[499px] h-[703px] transition flex mx-auto flex-col border-[3px] border-transparent rounded-[8px] bg-[#A6E2A8]'
							} relative overflow-visible isolate`}
							style={!compactLeftOnly ? { backgroundColor: '#A6E2A8' } : undefined}
							data-campaign-main-box={compactLeftOnly ? undefined : 'writing'}
							data-hpi-container
							onFocus={handleContainerFocus}
							onBlur={handleContainerBlur}
						>
							{/* Border overlay to ensure crisp, unbroken stroke at rounded corners */}
							{!compactLeftOnly && (
								<div
									aria-hidden="true"
									className="pointer-events-none absolute -inset-[3px] z-[60] rounded-[8px] border-[3px] border-black"
								/>
							)}
							{/* Mobile-only gradient background overlay starting under Mode divider */}
							{isMobile && activeTab === 'main' && !showTestPreview && overlayTopPx !== null && (
								<div
									style={{
										position: 'absolute',
										left: 0,
										right: 0,
										top: overlayTopPx,
										bottom: 0,
										background:
											'linear-gradient(to bottom, rgba(222,242,225,0.71) 0%, rgba(222,242,225,0.5) 40%, rgba(222,242,225,0.25) 80%, rgba(222,242,225,0.15) 100%)',
										pointerEvents: 'none',
										zIndex: -1,
										// Square off the top corners so the fill meets the border flush on mobile
										borderTopLeftRadius: 0,
										borderTopRightRadius: 0,
										// Preserve the container's rounded bottoms
										borderBottomLeftRadius: 'inherit',
										borderBottomRightRadius: 'inherit',
									}}
								/>
							)}
							{/* Left side - Content area (main drafting box) */}
							<DraggableBox
								id="test-left-panel"
								dragHandleSelector="[data-left-drag-handle]"
								enabled={false}
								onDropOver={() => {}}
								className="relative flex flex-col flex-1 min-h-0"
							>
								<div
									className={cn(
										`flex flex-col`,
										compactLeftOnly
											? 'w-[350px]'
											: 'w-full min-h-0 pt-0 max-[480px]:pt-[1px] px-0 pb-0 flex-1',
										'relative'
									)}
									data-hpi-left-panel
								>
									{/* Removed explicit drag bar; header below acts as the drag handle */}
									{/* Subject header inside the box */}
									<div ref={headerSectionRef} className={cn('pt-0 pb-0')}>
										<div className={cn(!compactLeftOnly ? 'bg-white' : '', 'relative h-[31px]')}>
											{/* Left 130px gray background */}
											{!compactLeftOnly && (
												<div
													className="absolute left-0 top-0 h-full w-[130px] bg-[#f8f8f8] z-0"
													style={{ pointerEvents: 'none' }}
												/>
											)}
											{/* Profile label centered in the 130px gray area - clickable to switch tabs */}
											{!compactLeftOnly && (() => {
												const isProfileIncomplete = !profileFields.name.trim() || !profileFields.genre.trim() || !profileFields.area.trim() || !profileFields.bio.trim();
												const showRedWarning = hasLeftProfileTab && isProfileIncomplete;
												return (
													<button
														type="button"
														onClick={() => setActiveTab('profile')}
														className={cn(
															"absolute left-0 -top-[3px] h-[calc(100%+3px)] w-[130px] flex items-center justify-center font-inter font-semibold text-[13px] max-[480px]:text-[14px] z-30 cursor-pointer bg-transparent transition-colors border-r-[3px] border-r-black border-t-0 border-b-0 border-l-0",
															activeTab === 'profile'
																? 'text-black bg-[#A6E2A8] hover:bg-[#A6E2A8]'
																: showRedWarning
																	? 'text-black bg-[#E47979] hover:bg-[#E47979]'
																	: 'text-black hover:bg-[#eeeeee]'
														)}
													>
														Profile
													</button>
												);
											})()}
											<div
												className={cn(
													'h-[31px] flex items-center relative z-20',
													'w-[93.7vw] max-w-[475px] mx-auto pl-[8px] max-[480px]:pl-[6px]'
												)}
												data-left-drag-handle
												data-root-drag-handle
											>
												{compactLeftOnly && (
													<span
														className={cn(
															'font-inter font-semibold text-[13px] max-[480px]:text-[14px] ml-[8px] mr-[112px] max-[480px]:mr-[22px] text-black relative z-10'
														)}
													>
														Profile
													</span>
												)}
												{/* Spacer to keep toggles in position */}
												{!compactLeftOnly && <div className="w-[130px] shrink-0" />}
												<div
													ref={modeContainerRef}
													className="relative flex items-center gap-[78px] max-[480px]:gap-0 max-[480px]:justify-between ml-[42px] max-[480px]:ml-[2px] flex-1 max-[480px]:w-auto max-[480px]:pr-[4.4vw]"
												>
													<DndContext
														onDragEnd={handleHighlightDragEnd}
														modifiers={[restrictToHorizontalAxisAndBounds]}
														sensors={modeHighlightSensors}
													>
														{selectedModeKey !== 'none' && (
															<DraggableHighlight
																style={highlightStyle}
																isInitialRender={isInitialRender}
																mode={selectedModeKey as 'full' | 'hybrid' | 'manual'}
															disabled={isHybridModeSelected}
															onSelectMode={() => {
																// Clicking the pill should behave like selecting that mode tab.
																// Avoid re-running switch logic (which can overwrite in-progress edits).
																if (activeTab !== 'main') {
																	setActiveTab('main');
																	setHasLeftProfileTab(true);
																}
															}}
															/>
														)}
													</DndContext>
													<Button
														ref={fullModeButtonRef}
														variant="ghost"
														type="button"
														className="!p-0 h-fit !m-0 text-[13px] max-[480px]:text-[14px] font-inter font-semibold bg-transparent z-20 text-black"
														onClick={() => { setActiveTab('main'); setHasLeftProfileTab(true); switchToFull(); }}
													>
												Auto
												</Button>
													<Button
														ref={manualModeButtonRef}
														variant="ghost"
														type="button"
														className="!p-0 h-fit !m-0 text-[13px] max-[480px]:text-[14px] font-inter font-semibold bg-transparent z-20 text-black"
														onClick={() => { setActiveTab('main'); setHasLeftProfileTab(true); switchToManual(); }}
													>
														Manual
													</Button>
													<Button
														ref={hybridModeButtonRef}
														variant="ghost"
														type="button"
														className="!p-0 h-fit !m-0 text-[13px] max-[480px]:text-[14px] font-inter font-semibold bg-transparent z-20 text-black"
														onClick={() => { setActiveTab('main'); setHasLeftProfileTab(true); switchToHybrid(); }}
													>
														Hybrid
													</Button>
												</div>
											</div>
											{compactLeftOnly ? null : (
												<>
													{showTestPreview && (
														<div className="w-full border-b-[3px] border-black -mx-[18px]" />
													)}
													<div
														ref={modeDividerRef}
														className={cn(
															'w-full border-b-[3px] border-black',
															showTestPreview && 'hidden'
														)}
													/>
													{showTestPreview && <div className="h-2" />}
												</>
											)}
										</div>
										{activeTab !== 'profile' && (
											<div className="flex flex-col items-center pt-[38px] max-[480px]:pt-[38px]">
												<FormField
													control={form.control}
													name="subject"
													rules={{ required: form.watch('isAiSubject') }}
													render={({ field }) => (
														<FormItem
															className={cn(
																showTestPreview
																	? 'w-[426px] max-[480px]:w-[89.33vw]'
																	: 'w-[89.33vw] max-w-[468px]',
																// Remove default margin to control spacing to content below
																'mb-0'
															)}
														>
															<FormControl>
																{form.watch('isAiSubject') ? (
																	// Compact 110px bar when auto mode is on
																	<div className="flex items-center gap-2">
																		<div
																			className={cn(
																				'flex items-center justify-center h-[31px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden subject-bar w-[110px]'
																			)}
																			style={{ backgroundColor: '#E0E0E0' }}
																		>
																			<span className="font-inter font-medium text-[18px] max-[480px]:text-[12px] whitespace-nowrap text-black subject-label">
																				Subject
																			</span>
																		</div>
																		<span className="font-inter font-normal text-[13px] text-[#000000]">
																			Auto
																		</span>
																	</div>
																) : (
																	// Full bar when auto mode is off
																	<div
																		className={cn(
																			'flex items-center h-[31px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden subject-bar bg-white'
																		)}
																	>
																		<div
																			className={cn(
																				'pl-2 flex items-center h-full shrink-0 w-[120px]',
																				'bg-white'
																			)}
																		>
																			<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black subject-label">
																				Subject
																			</span>
																		</div>

																		<button
																			type="button"
																			onClick={() => {
																				if (!isHandwrittenMode) {
																					const newValue = !form.watch('isAiSubject');
																					form.setValue('isAiSubject', newValue);
																					if (newValue) {
																						form.setValue('subject', '');
																					}
																				}
																			}}
																			disabled={isHandwrittenMode}
																			className={cn(
																				'relative h-full flex items-center text-[12px] font-inter font-normal transition-colors shrink-0 subject-toggle',
																				'w-[100px] px-2 justify-center text-black bg-[#DADAFC] hover:bg-[#C4C4F5] active:bg-[#B0B0E8] -translate-x-[30px]',
																				isHandwrittenMode && 'opacity-50 cursor-not-allowed'
																			)}
																		>
																			<span className="absolute left-0 h-full border-l border-black"></span>
																			<span>Auto off</span>
																			<span className="absolute right-0 h-full border-r border-black"></span>
																		</button>

																		<div className={cn('flex-grow h-full', 'bg-white')}>
																			<Input
																				{...field}
																				className={cn(
																					'w-full h-full !bg-transparent pl-4 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 max-[480px]:placeholder:text-[10px] max-[480px]:!transition-none max-[480px]:!duration-0',
																					shouldShowSubjectRedStyling
																						? '!text-[#A20000] placeholder:!text-[#A20000]'
																						: '!text-black placeholder:!text-black',
																					'max-[480px]:pl-2'
																				)}
																				placeholder="Write your subject here. *required"
																				onFocus={(e) =>
																					trackFocusedField?.('subject', e.target)
																				}
																				onBlur={() => {
																					setHasSubjectBeenTouched(true);
																					field.onBlur();
																				}}
																				onChange={(e) => {
																					if (e.target.value) {
																						setHasSubjectBeenTouched(true);
																					}
																					field.onChange(e);
																				}}
																			/>
																		</div>
																	</div>
																)}
															</FormControl>
															<FormMessage />
														</FormItem>
													)}
												/>
											</div>
										)}
									</div>
								<div
									className={cn(
										'flex-1 min-h-0 flex flex-col overflow-y-auto hide-native-scrollbar',
										shouldEnableHybridPlusGutter && 'w-[calc(100%_+_90px)] -mr-[90px]'
									)}
									data-hpi-content
								>
									{/* Profile Tab Content */}
									{activeTab === 'profile' && (
										<div className="w-full flex flex-col flex-1">
											{/* Empty header row + divider (matches mock): 32px below the main header */}
											<div className="w-full h-[32px] bg-[#E7F3E8] border-b-[3px] border-black shrink-0 flex items-center justify-center">
												<div className="w-[468px] max-w-full flex items-center gap-[24px] px-4">
													{/* Progress track */}
													<div className="relative w-[223px] h-[12px] bg-white border-2 border-black rounded-[8px] overflow-hidden">
														<div
															className="absolute left-0 top-0 bottom-0 bg-[#36B24A] rounded-full transition-[width] duration-200"
															style={{ width: `${profileSuggestionFillPercent}%` }}
														/>
													</div>
													{/* Score label */}
													<span className="font-inter font-medium text-[17px] leading-none text-black whitespace-nowrap">
														{profileSuggestionDisplayLabel}
													</span>
												</div>
											</div>
											{/* Blue fill starts under the second divider */}
											<div className="flex-1 bg-[#58A6E5] relative flex flex-col">
												{/* Top-right indicator line (15x2px) */}
												<button
													type="button"
													aria-label="Back to Auto"
													onClick={() => {
														setActiveTab('main');
														setHasLeftProfileTab(true);
														switchToFull();
													}}
													className="absolute top-[14px] right-[14px] w-[15px] h-[2px] bg-black cursor-pointer p-0 border-0 focus:outline-none"
												/>
												<div className="pt-[54px] pr-3 pb-0 pl-3 flex flex-col gap-[18px] items-center flex-1">
											<div
												ref={expandedProfileBox === 'name' ? expandedProfileBoxRef : undefined}
												className={cn(
													"w-[468px] flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden",
													expandedProfileBox === 'name' ? 'h-[68px]' : 'h-[34px]'
												)}
												onClick={() => handleProfileBoxToggle('name')}
											>
												<div
													className="h-[34px] flex items-center px-3 font-inter text-[14px] font-semibold truncate"
													style={{ backgroundColor: getProfileHeaderBg('name') }}
												>
													{getProfileHeaderText('name', 'Name', 'Enter your Name')}
												</div>
												{expandedProfileBox === 'name' && (
													<input
														type="text"
														className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
														value={profileFields.name}
														onChange={(e) => setProfileFields({ ...profileFields, name: e.target.value })}
														onBlur={() => handleProfileFieldBlur('name')}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleProfileFieldEnter('name');
															}
														}}
														onClick={(e) => e.stopPropagation()}
														placeholder=""
														autoFocus
													/>
												)}
											</div>
											<div
												ref={expandedProfileBox === 'genre' ? expandedProfileBoxRef : undefined}
												className={cn(
													"w-[468px] flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden",
													expandedProfileBox === 'genre' ? 'h-[68px]' : 'h-[34px]'
												)}
												onClick={() => handleProfileBoxToggle('genre')}
											>
												<div
													className="h-[34px] flex items-center px-3 font-inter text-[14px] font-semibold truncate"
													style={{ backgroundColor: getProfileHeaderBg('genre') }}
												>
													{getProfileHeaderText('genre', 'Genre', 'Enter your Genre')}
												</div>
												{expandedProfileBox === 'genre' && (
													<input
														type="text"
														className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
														value={profileFields.genre}
														onChange={(e) => setProfileFields({ ...profileFields, genre: e.target.value })}
														onBlur={() => handleProfileFieldBlur('genre')}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleProfileFieldEnter('genre');
															}
														}}
														onClick={(e) => e.stopPropagation()}
														placeholder=""
														autoFocus
													/>
												)}
											</div>
											<div
												ref={expandedProfileBox === 'area' ? expandedProfileBoxRef : undefined}
												className={cn(
													"w-[468px] flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden",
													expandedProfileBox === 'area' ? 'h-[68px]' : 'h-[34px]'
												)}
												onClick={() => handleProfileBoxToggle('area')}
											>
												<div
													className="h-[34px] flex items-center px-3 font-inter text-[14px] font-semibold truncate"
													style={{ backgroundColor: getProfileHeaderBg('area') }}
												>
													{getProfileHeaderText('area', 'Area', 'Enter your Area')}
												</div>
												{expandedProfileBox === 'area' && (
													<input
														type="text"
														className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
														value={profileFields.area}
														onChange={(e) => setProfileFields({ ...profileFields, area: e.target.value })}
														onBlur={() => handleProfileFieldBlur('area')}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleProfileFieldEnter('area');
															}
														}}
														onClick={(e) => e.stopPropagation()}
														placeholder=""
														autoFocus
													/>
												)}
											</div>
											<div
												ref={expandedProfileBox === 'band' ? expandedProfileBoxRef : undefined}
												className={cn(
													"w-[468px] flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden",
													expandedProfileBox === 'band' ? 'h-[68px]' : 'h-[34px]'
												)}
												onClick={() => handleProfileBoxToggle('band')}
											>
												<div
													className="h-[34px] flex items-center px-3 font-inter text-[14px] font-semibold truncate"
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
														className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
														value={profileFields.band}
														onChange={(e) => setProfileFields({ ...profileFields, band: e.target.value })}
														onBlur={() => handleProfileFieldBlur('band')}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleProfileFieldEnter('band');
															}
														}}
														onClick={(e) => e.stopPropagation()}
														placeholder=""
														autoFocus
													/>
												)}
											</div>
											<div
												ref={expandedProfileBox === 'bio' ? expandedProfileBoxRef : undefined}
												className={cn(
													"w-[468px] flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden",
													expandedProfileBox === 'bio' ? 'h-[68px]' : 'h-[34px]'
												)}
												onClick={() => handleProfileBoxToggle('bio')}
											>
												<div
													className="h-[34px] flex items-center px-3 font-inter text-[14px] font-semibold truncate"
													style={{ backgroundColor: getProfileHeaderBg('bio') }}
												>
													{getProfileHeaderText('bio', 'Bio', 'Enter your Bio')}
												</div>
												{expandedProfileBox === 'bio' && (
													<input
														type="text"
														className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
														value={profileFields.bio}
														onChange={(e) => setProfileFields({ ...profileFields, bio: e.target.value })}
														onBlur={() => handleProfileFieldBlur('bio')}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleProfileFieldEnter('bio');
															}
														}}
														onClick={(e) => e.stopPropagation()}
														placeholder=""
														autoFocus
													/>
												)}
											</div>
											<div
												ref={expandedProfileBox === 'links' ? expandedProfileBoxRef : undefined}
												className={cn(
													"w-[468px] flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden",
													expandedProfileBox === 'links' ? 'h-[68px]' : 'h-[34px]'
												)}
												onClick={() => handleProfileBoxToggle('links')}
											>
												<div
													className="h-[34px] flex items-center px-3 font-inter text-[14px] font-semibold truncate"
													style={{ backgroundColor: getProfileHeaderBg('links') }}
												>
													{getProfileHeaderText('links', 'Links', 'Enter your Links')}
												</div>
												{expandedProfileBox === 'links' && (
													<input
														type="text"
														className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
														value={profileFields.links}
														onChange={(e) => setProfileFields({ ...profileFields, links: e.target.value })}
														onBlur={() => handleProfileFieldBlur('links')}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleProfileFieldEnter('links');
															}
														}}
														onClick={(e) => e.stopPropagation()}
														placeholder=""
														autoFocus
													/>
												)}
											</div>
												</div>
												<div className="absolute left-0 right-0 bottom-[139px] flex justify-center">
													<button
														type="button"
														onClick={() => {
															setActiveTab('main');
															setHasLeftProfileTab(true);
														}}
														className="w-[136px] h-[26px] rounded-[6px] bg-[#C8C8C8] text-white font-inter font-medium text-[15px] leading-none flex items-center justify-center cursor-pointer"
													>
														back to writing
													</button>
												</div>
											</div>
										</div>
									)}
									{/* Main Content area */}
									{activeTab === 'main' && (
									<div
										className={cn(
											'pt-[20px] max-[480px]:pt-[8px] pr-3 pb-3 pl-3 flex flex-col gap-4 items-center flex-1',
											shouldEnableHybridPlusGutter && 'w-[calc(100%_-_90px)]'
										)}
									>
										{fields.length === 0 && (
											<span className="text-gray-300 font-primary text-[12px]">
												Add blocks here to build your prompt...
											</span>
										)}
										<SortableContext
											items={fields.map((f) => f.id)}
											strategy={verticalListSortingStrategy}
										>
												{(() => {
													const orderedHybridTypes = [
														HybridBlock.introduction,
														HybridBlock.research,
														HybridBlock.action,
													];
													const presentHybridTypes = new Set(
														fields
															.filter(
																(f) =>
																	f.type === HybridBlock.introduction ||
																	f.type === HybridBlock.research ||
																	f.type === HybridBlock.action
															)
															.map((f) => f.type)
													);

													const shouldShowPlaceholders = selectedModeKey === 'hybrid';
													const missingHybridTypes = shouldShowPlaceholders
														? orderedHybridTypes.filter((t) => !presentHybridTypes.has(t))
														: [];

													const inserted = new Set<string>();
													const augmented: Array<
														| {
																kind: 'field';
																field: (typeof fields)[number];
																index: number;
														  }
														| { kind: 'placeholder'; blockType: HybridBlock; key: string }
													> = [];

													for (let index = 0; index < fields.length; index++) {
														const field = fields[index];
														if (
															field.type === HybridBlock.introduction ||
															field.type === HybridBlock.research ||
															field.type === HybridBlock.action
														) {
															const currentIdx = orderedHybridTypes.indexOf(field.type);
															for (let i = 0; i < currentIdx; i++) {
																const t = orderedHybridTypes[i];
																if (
																	missingHybridTypes.includes(t) &&
																	!inserted.has(`ph-${t}`)
																) {
																	augmented.push({
																		kind: 'placeholder',
																		blockType: t,
																		key: `ph-${t}-${index}`,
																	});
																	inserted.add(`ph-${t}`);
																}
															}
														}
														augmented.push({ kind: 'field', field, index });
													}

													for (const t of orderedHybridTypes) {
														if (
															missingHybridTypes.includes(t) &&
															!inserted.has(`ph-${t}`)
														) {
															augmented.push({
																kind: 'placeholder',
																blockType: t,
																key: `ph-${t}-end`,
															});
															inserted.add(`ph-${t}`);
														}
													}

													const renderHybridPlaceholder = (type: HybridBlock) => {
														if (selectedModeKey !== 'hybrid') return null;
														const label =
															type === HybridBlock.introduction
																? 'Intro'
																: type === HybridBlock.research
																? 'Research'
																: 'CTA';
														const borderColor =
															type === HybridBlock.introduction
																? '#6673FF'
																: type === HybridBlock.research
																? '#1010E7'
																: '#0E0E7F';
														return (
															<div
																className={cn(
																	'flex justify-end',
																	showTestPreview
																		? 'w-[426px] max-[480px]:w-[89.8vw]'
																		: 'w-[93.7vw] max-w-[475px]'
																)}
															>
																<Button
																	type="button"
																	onClick={() => handleAddBlock(getBlock(type))}
																	font="secondary"
																	className="w-[76px] h-[30px] bg-background hover:bg-primary/20 active:bg-primary/20 border-2 rounded-[8px] !font-normal text-[10px] text-gray-600 inline-flex items-center justify-start gap-[4px] pl-[4px]"
																	style={{ borderColor }}
																	title={`Add ${label}`}
																>
																	<TinyPlusIcon
																		width="8px"
																		height="8px"
																		className="!w-[8px] !h-[8px]"
																	/>
																	<span className="font-inter font-medium text-[10px] text-[#0A0A0A]">
																		{label}
																	</span>
																</Button>
															</div>
														);
													};

													return augmented.map((item) => {
														if (item.kind === 'placeholder') {
															return (
																<Fragment key={item.key}>
																	{renderHybridPlaceholder(item.blockType)}
																</Fragment>
															);
														}

														const field = item.field;
														const index = item.index;
														const isHybridBlock =
															field.type === HybridBlock.introduction ||
															field.type === HybridBlock.research ||
															field.type === HybridBlock.action;
														const isFullAutomatedField =
															field.type === HybridBlock.full_automated;
														const hasImmediateTextBlock =
															fields[index + 1]?.type === HybridBlock.text;

														return (
															<Fragment key={isFullAutomatedField ? 'full_automated' : field.id}>
																<div
																	className={cn(index === 0 && '-mt-2 max-[480px]:mt-0')}
																>
																	<SortableAIBlock
																		id={field.id}
																		fieldIndex={index}
																		block={getBlock(field.type)}
																		onRemove={handleRemoveBlock}
																		onCollapse={handleToggleCollapse}
																		onExpand={handleToggleCollapse}
																		isCollapsed={field.isCollapsed}
																		trackFocusedField={trackFocusedField}
																		showTestPreview={showTestPreview}
																		testMessage={testMessage}
																		onGetSuggestions={onGetSuggestions}
																		promptQualityScore={promptQualityScore}
																		promptQualityLabel={promptQualityLabel}
																		onUpscalePrompt={onUpscalePrompt}
																		isUpscalingPrompt={isUpscalingPrompt}
																		hasPreviousPrompt={hasPreviousPrompt}
																		onUndoUpscalePrompt={onUndoUpscalePrompt}
																		profileFields={profileFields}
																		onGoToProfileTab={() => setActiveTab('profile')}
																		isDragDisabled={isHybridModeSelected}
																	/>
																</div>
																{/* Plus button under hybrid blocks */}
																{isHybridBlock && !hasImmediateTextBlock && (
																	<div
																		className={cn(
																			'flex relative z-[70]',
																			showTestPreview
																				? 'justify-start w-full'
																				: 'justify-end -mr-[85px] w-[93.7vw] max-w-[475px] max-[480px]:-mr-[2vw]'
																		)}
																		style={{ transform: 'translateY(-12px)' }}
																	>
																		<Button
																			type="button"
																			onClick={() => handleAddTextBlockAt(index)}
																			className={cn(
																				'w-[52px] h-[20px] bg-background hover:bg-stone-100 active:bg-stone-200 border border-primary rounded-[4px] !font-normal text-[10px] text-gray-600 max-[480px]:translate-x-[6px]',
																				showTestPreview &&
																					'absolute left-0 -translate-x-[calc(100%+5px)]'
																			)}
																			title="Text block"
																		>
																			<TinyPlusIcon
																				width="5px"
																				height="5px"
																				className="!w-[8px] !h-[8px]"
																			/>
																			<span className="font-secondary">Text</span>
																		</Button>
																	</div>
																)}
															</Fragment>
														);
													});
												})()}
											</SortableContext>
										{/* Auto mode: Signature indicator sits directly under the Full Auto Body block */}
										{selectedModeKey === 'full' && (
											<div
												className={cn(
													showTestPreview
														? 'w-[426px] max-[480px]:w-[89.33vw]'
														: 'w-[89.33vw] max-w-[468px]'
												)}
												data-hpi-signature-auto
											>
												<div className="flex items-center gap-2">
													<div
														className={cn(
															'flex items-center justify-center h-[31px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden w-[122px]'
														)}
														style={{ backgroundColor: '#E0E0E0' }}
													>
														<span className="font-inter font-medium text-[18px] max-[480px]:text-[12px] whitespace-nowrap text-black">
															Signature
														</span>
													</div>
													<span className="font-inter font-normal text-[13px] text-[#000000]">
														Auto
													</span>
												</div>
											</div>
										)}
										{/* Full Auto: Generate Test button sits in the empty green space (desktop) */}
										{selectedModeKey === 'full' && !showTestPreview && !compactLeftOnly && (
											<div className="flex-1 w-full flex items-center justify-center max-[480px]:hidden">
												<Button
													type="button"
													onClick={() => {
														if (isMobile) {
															setShowTestPreview?.(true);
														} else {
															onTestPreviewToggle?.(true);
														}
														handleGenerateTestDrafts?.();
														setHasAttemptedTest(true);
													}}
													disabled={isGenerationDisabled?.()}
													className={cn(
														'h-[28px] w-[232px] bg-[#DBF3DC] text-black font-inter font-normal text-[17px] leading-none rounded-[4px] cursor-pointer flex items-center justify-center p-0 border-0',
														'transition-colors hover:bg-[#D6EED7] active:bg-[#D1E9D2]',
														isGenerationDisabled?.()
															? 'opacity-50 cursor-not-allowed'
															: 'opacity-100'
													)}
												>
													{isPendingGeneration && isTest ? 'Testing...' : 'Generate Test'}
												</Button>
											</div>
										)}
										</div>
									)}
									</div>

									{/* In Test Preview, keep Signature inside the left panel so it doesn't float */}
									{showTestPreview && activeTab !== 'profile' && selectedModeKey !== 'full' && (
										<div className={cn('px-3 pb-0 pt-0 flex justify-center mt-auto')}>
											<FormField
												control={form.control}
												name="signature"
												render={({ field }) => (
													<FormItem className="mb-[9px]">
														<div
															className={cn(
																`min-h-[57px] border-2 border-gray-400 rounded-md bg-white px-4 py-2`,
																showTestPreview
																	? 'w-[426px] max-[480px]:w-[89.33vw]'
																	: 'w-[89.33vw] max-w-[475px]'
															)}
														>
															<FormLabel className="text-base font-semibold font-secondary">
																Signature
															</FormLabel>
															<FormControl>
																<Textarea
																	placeholder="Enter your signature..."
																	className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden bg-white max-[480px]:text-[10px] signature-textarea"
																	style={{
																		fontFamily: form.watch('font') || 'Arial',
																	}}
																	onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
																		const target = e.currentTarget;
																		target.style.height = 'auto';
																		target.style.height = target.scrollHeight + 'px';
																	}}
																	{...field}
																/>
															</FormControl>
														</div>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									)}
								</div>
							</DraggableBox>

							{/* Bottom-anchored footer with Signature and Test */}
							<div className="flex flex-col items-center mt-auto w-full" data-hpi-footer>
								{/* Signature Block (manual/hybrid only) - positioned above Test with fixed gap */}
								{activeTab !== 'profile' && !showTestPreview && selectedModeKey !== 'full' && (
									<FormField
										control={form.control}
										name="signature"
										render={({ field }) => (
											<FormItem className={cn(!compactLeftOnly ? 'mb-[23px]' : 'mb-[9px]')}>
												<div
													className={cn(
														'min-h-[57px] border-2 border-gray-400 rounded-md bg-white px-4 py-2',
														'w-[89.33vw] max-w-[475px]'
													)}
													data-hpi-signature-card
												>
													<FormLabel className="text-base font-semibold font-secondary">
														Signature
													</FormLabel>
													<FormControl>
														<Textarea
															placeholder="Enter your signature..."
															className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden bg-white max-[480px]:text-[10px] signature-textarea"
															style={{
																fontFamily: form.watch('font') || 'Arial',
															}}
															onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
																const target = e.currentTarget;
																target.style.height = 'auto';
																target.style.height = target.scrollHeight + 'px';
															}}
															{...field}
														/>
													</FormControl>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								{/* Test button and notices (hidden in compact mode, profile tab, and Manual mode) */}
								{compactLeftOnly || activeTab === 'profile' || selectedModeKey === 'manual' ? null : (
									<>
										{/* Desktop (manual/hybrid): bottom bar Generate Test button */}
										{selectedModeKey !== 'full' && (
											<div
												className={cn(
													'w-full flex flex-col items-center',
													'max-[480px]:hidden'
												)}
											>
												{hasEmptyTextBlocks && (
													<div
														className={cn(
															hasTouchedEmptyTextBlocks || hasAttemptedTest
																? 'text-destructive'
																: 'text-black',
															'text-sm font-medium mb-2',
															'w-[93.7vw] max-w-[475px]'
														)}
													>
														Fill in all text blocks in order to compose an email.
													</div>
												)}
												<div className="w-full h-[2px] bg-black" />
												<div className="w-full h-[41px] flex items-center justify-center bg-white rounded-b-[5px]">
													<Button
														type="button"
														onClick={() => {
															if (isMobile) {
																setShowTestPreview?.(true);
															} else {
																onTestPreviewToggle?.(true);
															}
															handleGenerateTestDrafts?.();
															setHasAttemptedTest(true);
														}}
														disabled={isGenerationDisabled?.()}
														className={cn(
															'h-[28px] bg-white border-[3px] border-[#349A37] text-black font-inter font-normal text-[17px] leading-none rounded-[4px] cursor-pointer flex items-center justify-center transition-all hover:bg-primary/20 active:bg-primary/20 p-0',
															'w-[93.7vw] max-w-[475px]',
															isGenerationDisabled?.()
																? 'opacity-50 cursor-not-allowed'
																: 'opacity-100'
														)}
													>
														{isPendingGeneration && isTest ? 'Testing...' : 'Generate Test'}
													</Button>
												</div>
											</div>
										)}

										{/* Mobile sticky Test button at page bottom */}
										{!showTestPreview && (
											<div className="hidden max-[480px]:block mobile-sticky-test-button">
												<div className="fixed bottom-0 left-0 right-0 z-40">
													<div className="flex w-full">
														<Button
															type="button"
															onClick={() => {
																setShowTestPreview?.(true);
																handleGenerateTestDrafts?.();
																setHasAttemptedTest(true);
															}}
															disabled={isGenerationDisabled?.()}
															className={cn(
																'h-[53px] flex-1 rounded-none bg-[#5DAB68] text-white font-times font-bold cursor-pointer flex items-center justify-center font-primary border-2 border-black border-r-0',
																isGenerationDisabled?.()
																	? 'opacity-50 cursor-not-allowed'
																	: 'opacity-100'
															)}
														>
															{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
														</Button>
														<button
															type="button"
															onClick={() => onGoToDrafting?.()}
															className="h-[53px] w-[92px] bg-[#EEEEEE] text-black font-inter text-[16px] leading-none border-2 border-[#626262] rounded-none flex-shrink-0 border-l-[#626262]"
														>
															<span className="block">Go to</span>
															<span className="block">Drafting</span>
														</button>
													</div>
												</div>
											</div>
										)}
									</>
								)}
							</div>

							{compactLeftOnly
								? null
								: isMobile &&
								  showTestPreview && (
										<div
											className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
											onClick={() => setShowTestPreview?.(false)}
										>
											<div
												className={cn('w-[461px] max-[480px]:w-[96.27vw]')}
												data-test-preview-wrapper
												onClick={(e) => e.stopPropagation()}
											>
												<DraggableBox
													id="test-preview-panel"
													dragHandleSelector="[data-test-preview-header]"
													enabled={false}
													onDropOver={() => {}}
												>
													<TestPreviewPanel
														setShowTestPreview={setShowTestPreview}
														testMessage={testMessage || ''}
														isLoading={Boolean(isTest)}
														onTest={() => {
															setShowTestPreview?.(true);
															handleGenerateTestDrafts?.();
															setHasAttemptedTest(true);
														}}
														isDisabled={isGenerationDisabled?.()}
														isTesting={Boolean(isTest)}
														contact={contact}
													/>
												</DraggableBox>
												{/* Mobile sticky footer with Back to Testing and Go to Drafting */}
												<div className="hidden max-[480px]:block mobile-landscape-sticky-preview-footer">
													<div className="fixed bottom-0 left-0 right-0 z-40">
														<div className="flex w-full">
															<Button
																type="button"
																onClick={() => setShowTestPreview?.(false)}
																className={cn(
																	'h-[53px] flex-1 rounded-none bg-[#5DAB68] text-white font-times font-bold cursor-pointer flex items-center justify-center font-primary border-2 border-black border-r-0'
																)}
															>
																Back to Testing
															</Button>
															<button
																type="button"
																onClick={() => onGoToDrafting?.()}
																className="h-[53px] w-[92px] bg-[#EEEEEE] text-black font-inter text-[16px] leading-none border-2 border-[#626262] rounded-none flex-shrink-0 border-l-[#626262]"
															>
																<span className="block">Go to</span>
																<span className="block">Drafting</span>
															</button>
														</div>
													</div>
												</div>
											</div>
										</div>
								  )}
						</div>
						{!compactLeftOnly && !isPendingGeneration && !hideDraftButton && (
							<div
								className={cn(
									'relative h-[40px] mt-4 mx-auto',
									isNarrowDesktop
										? 'w-full max-w-[691px] px-4'
										: isNarrowestDesktop
										? 'w-full max-w-[407px]'
										: 'w-[475px]'
								)}
							>
								{draftCount > 0 ? (
									<>
										<button
											type="button"
											onClick={() => {
												if (!isDraftDisabled) {
													onDraftClick?.();
												}
											}}
											disabled={isDraftDisabled}
											className={cn(
												'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px]',
												isDraftDisabled
													? 'bg-[#E0E0E0] border-[#A0A0A0] cursor-not-allowed opacity-60'
													: 'bg-[#C7F2C9] border-[#349A37] hover:bg-[#B9E7BC] cursor-pointer'
											)}
										>
											Draft {draftCount} {draftCount === 1 ? 'Contact' : 'Contacts'}
										</button>
										{/* Right section "All" button */}
										<button
											type="button"
											className="absolute right-[3px] top-[3px] bottom-[3px] w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer border-0 border-l-[2px] border-[#349A37] z-10"
											onClick={() => {
												onSelectAllContacts?.();
											}}
										>
											All
										</button>
									</>
								) : (
									<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px]">
										Select Contacts and Draft Emails
									</div>
								)}
							</div>
						)}
					</DraggableBox>
				</Droppable>
			</DndContext>
		</div>
	);
};
