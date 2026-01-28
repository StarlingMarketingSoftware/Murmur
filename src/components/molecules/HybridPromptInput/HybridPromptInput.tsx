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
import { WriteTabChromeHeader } from './WriteTabChromeHeader';
import { cn } from '@/utils';
import { DEFAULT_FONT, FONT_OPTIONS } from '@/constants/ui';
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
import FontDropdownArrow from '@/components/atoms/_svg/FontDropdownArrow';
import FontSizeIcon from '@/components/atoms/_svg/FontSizeIcon';
import BoldIcon from '@/components/atoms/_svg/BoldIcon';
import ItalicIcon from '@/components/atoms/_svg/ItalicIcon';
import UnderlineIcon from '@/components/atoms/_svg/UnderlineIcon';
import BulletListIcon from '@/components/atoms/_svg/BulletListIcon';
import TextColorIcon from '@/components/atoms/_svg/TextColorIcon';
import CloseIcon from '@/components/atoms/_svg/CloseIcon';
import { DraggableHighlight } from '../DragAndDrop/DraggableHighlight';
import DraggableBox from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraggableBox';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';

const MANUAL_EDITOR_COLOR_SWATCHES = [
	'#000000',
	'#444444',
	'#666666',
	'#999999',
	'#B7B7B7',
	'#CCCCCC',
	'#EEEEEE',
	'#FFFFFF',
	'#FF0000',
	'#FF9900',
	'#FFFF00',
	'#00FF00',
	'#00FFFF',
	'#0000FF',
	'#9900FF',
	'#FF00FF',
	'#F4CCCC',
	'#FCE5CD',
	'#FFF2CC',
	'#D9EAD3',
	'#D0E0E3',
	'#CFE2F3',
	'#D9D2E9',
	'#EAD1DC',
	'#EA9999',
	'#F9CB9C',
	'#FFE599',
	'#B6D7A8',
	'#A2C4C9',
	'#9FC5E8',
	'#B4A7D6',
	'#D5A6BD',
	'#E06666',
	'#F6B26B',
	'#FFD966',
	'#93C47D',
	'#76A5AF',
	'#6FA8DC',
	'#8E7CC3',
	'#C27BA0',
	'#CC0000',
	'#E69138',
	'#F1C232',
	'#6AA84F',
	'#45818E',
	'#3D85C6',
	'#674EA7',
	'#A64D79',
	'#990000',
	'#B45F06',
	'#BF9000',
	'#38761D',
	'#134F5C',
	'#0B5394',
	'#351C75',
	'#741B47',
	'#660000',
	'#783F04',
	'#7F6000',
	'#274E13',
	'#0C343D',
	'#073763',
	'#20124D',
	'#4C1130',
] as const;

const HPI_GREEN_BG_GRADIENT =
	'linear-gradient(to bottom, #7BDB7E 0%, #7BDB7E 25%, #A6E2A8 100%)';

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
	/**
	 * Full Auto: notify parent when Custom Instructions expander opens/closes.
	 */
	onCustomInstructionsOpenChange?: (isOpen: boolean) => void;
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
	/**
	 * Full Auto: when true, start with Custom Instructions expanded.
	 * Useful for demos (e.g. landing page) to show the full UI immediately.
	 */
	defaultOpenCustomInstructions?: boolean;
	/**
	 * When true, the Booking For dropdown is positioned statically below its trigger
	 * button instead of using a portal with viewport-based fixed positioning.
	 */
	useStaticDropdownPosition?: boolean;
	forceDesktop?: boolean;
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
	onCustomInstructionsOpenChange,
	profileFields,
	onGoToProfileTab,
	isDragDisabled = false,
	defaultOpenCustomInstructions,
	useStaticDropdownPosition = false,
	forceDesktop,
}: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id, disabled: isDragDisabled });
	const form = useFormContext<DraftingFormValues>();
	// Track if the text field has been touched (user has interacted with it)
	const [hasBeenTouched, setHasBeenTouched] = useState(false);
	// Track if advanced mode is enabled for hybrid blocks
	const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
	// Full Auto: custom instructions expander (stored in hybridBlockPrompts[fieldIndex].value)
	const [isCustomInstructionsOpen, setIsCustomInstructionsOpen] = useState(
		() => Boolean(defaultOpenCustomInstructions) && block.value === HybridBlock.full_automated
	);
	// Used by effects below (declared early to avoid TDZ issues)
	const isFullAutomatedBlock = block.value === HybridBlock.full_automated;
	const customInstructionsRef = useRef<HTMLTextAreaElement | null>(null);
	const customInstructionsContainerRef = useRef<HTMLDivElement | null>(null);
	// If we default-open Custom Instructions, avoid auto-focusing on mount (especially for landing page demos).
	const shouldSkipInitialCustomInstructionsFocusRef = useRef(
		Boolean(defaultOpenCustomInstructions) && block.value === HybridBlock.full_automated
	);
	// Full Auto: Booking For dropdown
	type BookingForTab = 'Anytime' | 'Season' | 'Calendar';
	type BookingForSeason = 'Spring' | 'Summer' | 'Fall' | 'Winter';
	const BOOKING_FOR_SEASON_STYLES: Record<
		BookingForSeason,
		{ bgClass: string; textClass: string }
	> = {
		Spring: { bgClass: 'bg-[#9BD2FF]', textClass: 'text-black' },
		Summer: { bgClass: 'bg-[#7ADF85]', textClass: 'text-black' },
		Fall: { bgClass: 'bg-[#D77C2C]', textClass: 'text-white' },
		Winter: { bgClass: 'bg-[#1960AC]', textClass: 'text-white' },
	};
	const isBookingForSeason = (value: string): value is BookingForSeason =>
		value === 'Spring' || value === 'Summer' || value === 'Fall' || value === 'Winter';
	const [isBookingForOpen, setIsBookingForOpen] = useState(false);
	const bookingForValue = form.watch('bookingFor') || 'Anytime';
	const bookingForSeasonFromValue = isBookingForSeason(bookingForValue) ? bookingForValue : null;
	const bookingForTriggerBgClass = bookingForSeasonFromValue
		? BOOKING_FOR_SEASON_STYLES[bookingForSeasonFromValue].bgClass
		: 'bg-white';
	const bookingForTriggerTextClass = bookingForSeasonFromValue
		? BOOKING_FOR_SEASON_STYLES[bookingForSeasonFromValue].textClass
		: 'text-black';
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
		// Use the container's position to match static positioning (which uses left: 0 relative to container)
		const container = bookingForContainerRef.current;
		const button = bookingForButtonRef.current;
		if (!container || !button) return;

		// Get the page zoom factor. Murmur uses `zoom: 0.9` (or similar) on <html>.
		// getBoundingClientRect() returns zoomed coordinates, but position: fixed uses unzoomed.
		// We need to divide by zoom to convert.
		const getZoomFactor = (): number => {
			const html = document.documentElement;
			const computed = window.getComputedStyle(html);
			const zoom = computed.zoom;
			if (zoom && zoom !== 'normal') {
				const zoomValue = parseFloat(zoom);
				if (Number.isFinite(zoomValue) && zoomValue > 0) return zoomValue;
			}
			return 1;
		};
		const zoom = getZoomFactor();

		const containerRect = container.getBoundingClientRect();
		const buttonRect = button.getBoundingClientRect();
		const margin = 6;
		const viewportPadding = 8;

		// For Calendar, we want the tabs CENTERED in the Calendar box,
		// but the whole Calendar shifted left so those centered tabs roughly align with Anytime/Season tabs.
		// 
		// Anytime/Season (317px): tabs (284px) centered = tab center at 158.5px from dropdown left
		// Calendar (829px): tabs centered = tab center at 414.5px from dropdown left
		// Base shift: (414.5 - 158.5) = 256px, but we offset 20px right for better visual balance
		const tabStripWidth = 284;
		const narrowDropdownWidth = 317;
		const calendarWidth = bookingForDropdownSize.width; // 829
		const narrowTabCenter = narrowDropdownWidth / 2; // 158.5
		const calendarTabCenter = calendarWidth / 2; // 414.5
		const calendarShift = calendarTabCenter - narrowTabCenter - 20; // 236 (20px less shift = 20px right)

		// Convert zoomed coordinates to unzoomed for fixed positioning
		const baseLeft = containerRect.left / zoom;
		let left = bookingForTab === 'Calendar' ? baseLeft - calendarShift : baseLeft;
		let top = (buttonRect.bottom + margin) / zoom;

		// Make sure it doesn't overflow viewport edges (in unzoomed coordinates)
		const viewportWidth = window.innerWidth / zoom;
		const viewportHeight = window.innerHeight / zoom;
		const maxLeft = Math.max(viewportPadding, viewportWidth - bookingForDropdownSize.width - viewportPadding);
		left = Math.min(left, maxLeft);
		left = Math.max(left, viewportPadding);

		// For Calendar, adjust tab position to compensate for the 20px right shift of the box.
		// Tabs centered in Calendar would be at (829-284)/2 = 272.5px from Calendar left.
		// To shift tabs 20px LEFT (to align with Anytime/Season), use paddingLeft of 272.5 - 20 = 252.5px
		if (bookingForTab === 'Calendar') {
			const centeredTabsLeft = (calendarWidth - tabStripWidth) / 2; // 272.5
			setBookingForTabStripLeft(Math.round(centeredTabsLeft - 20)); // 252.5, shifts tabs 20px left of center
		} else {
			setBookingForTabStripLeft(null);
		}

		// Check if would overflow bottom, flip above if possible
		const wouldOverflowBottom =
			top + bookingForDropdownSize.height > viewportHeight - viewportPadding;
		const canOpenAbove = buttonRect.top / zoom - margin - bookingForDropdownSize.height >= viewportPadding;
		if (wouldOverflowBottom && canOpenAbove) {
			top = buttonRect.top / zoom - margin - bookingForDropdownSize.height;
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
		if (shouldSkipInitialCustomInstructionsFocusRef.current) {
			shouldSkipInitialCustomInstructionsFocusRef.current = false;
			return;
		}
		requestAnimationFrame(() => customInstructionsRef.current?.focus());
	}, [isCustomInstructionsOpen]);

	// Notify parent when Custom Instructions opens/closes (Full Auto only)
	useEffect(() => {
		if (!isFullAutomatedBlock) return;
		onCustomInstructionsOpenChange?.(isCustomInstructionsOpen);
	}, [isCustomInstructionsOpen, isFullAutomatedBlock, onCustomInstructionsOpenChange]);

	// Ensure parent state resets when this block unmounts (e.g. mode switch)
	useEffect(() => {
		if (!isFullAutomatedBlock) return;
		return () => {
			onCustomInstructionsOpenChange?.(false);
		};
	}, [isFullAutomatedBlock, onCustomInstructionsOpenChange]);

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
		setBookingForCalendarBaseMonth((prev) =>
			prev.getTime() < minBaseMonth.getTime() ? minBaseMonth : prev
		);
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
	const isMobileHook = useIsMobile();
	const isMobile = forceDesktop ? false : isMobileHook;

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
						? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.8vw]')
						: cn(!forceDesktop ? 'w-[93.7vw]' : 'w-full', 'max-w-[475px]')
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
			isFullAutomatedBlock && 'border border-[#51A2E4] bg-[#51A2E4]',
			isTextBlock
				? showTestPreview
					? cn('w-[426px] min-h-[44px]', !forceDesktop && 'max-[480px]:w-[89.33vw]')
					: isManualModeSelected
					? cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[475px]', 'max-w-[475px] min-h-[188px]')
					: cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[475px]', 'max-w-[475px] min-h-[80px]')
					: isCompactBlock
					? showTestPreview
						? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.33vw]', isAdvancedEnabled ? 'h-[78px]' : cn('h-[31px]', !forceDesktop && 'max-[480px]:h-[24px]'))
						: cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[475px]', 'max-w-[475px]', isAdvancedEnabled ? 'h-[78px]' : cn('h-[31px]', !forceDesktop && 'max-[480px]:h-[24px]'))
					: isFullAutomatedBlock
					? showTestPreview
						? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.33vw]', isCustomInstructionsOpen ? 'h-auto min-h-[233px]' : 'h-[233px]')
						: cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[468px]', 'max-w-[468px]', isCustomInstructionsOpen ? 'h-auto min-h-[233px]' : 'h-[233px]')
					: showTestPreview
					? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.33vw]')
					: cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[475px]', 'max-w-[475px]'),
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
										isAdvancedEnabled ? 'h-[78px]' : cn('h-[31px]', !forceDesktop && 'max-[480px]:h-[24px]')
								  } w-[80px]`
								: `${
										isAdvancedEnabled ? 'h-[78px]' : cn('h-[31px]', !forceDesktop && 'max-[480px]:h-[24px]')
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
														isManualModeSelected && !forceDesktop && 'max-[480px]:placeholder:text-[10px]'
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
														<span className={cn('text-sm font-inter italic text-[#5d5d5d] truncate', !forceDesktop && 'max-[480px]:text-[10px]')}>
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
																	cn('flex-1 outline-none text-sm truncate min-w-0', !forceDesktop && 'max-[480px]:text-[10px]'),
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? '!bg-[#DADAFC]'
																		: 'bg-white placeholder:text-gray-400',
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																		cn('font-inter placeholder:italic placeholder:text-[#5d5d5d]', !forceDesktop && 'max-[480px]:placeholder:text-[10px]'),
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
											<div
												className={cn(
													'h-[27px] flex items-stretch transition-colors duration-75 ease-out',
													selectedPowerMode === 'high'
														? 'bg-[#95CFFF]'
														: 'bg-[#58A6E5]'
												)}
											>
												{/* Full Auto label section */}
												<div className="flex-1 flex items-center pl-[16px]">
													<Typography
														variant="h4"
														className="font-inter font-semibold text-[17px] text-[#000000]"
													>
														Body
													</Typography>
												</div>
												{/* Divider (only when Standard is selected) */}
												{selectedPowerMode === 'normal' && (
													<div className="w-[1px] flex-shrink-0 bg-[#000000]" />
												)}
												{/* Standard Power section */}
												<button
													type="button"
													onClick={() => setSelectedPowerMode('normal')}
													className={cn(
														'h-full flex items-center justify-center cursor-pointer border-0 p-0 m-0 flex-shrink-0 outline-none focus:outline-none whitespace-nowrap transition-[background-color,width] duration-75 ease-out',
														selectedPowerMode === 'high'
															? 'w-[108px]'
															: 'w-[132px]',
														selectedPowerMode === 'normal'
															? 'bg-[#88C5F7]'
															: 'bg-transparent'
													)}
												>
													<span
														className="font-inter font-normal italic text-[14px] max-[480px]:text-[12px] text-[#000000]"
													>
														{selectedPowerMode === 'high'
															? 'Standard'
															: 'Standard Power'}
													</span>
												</button>
												{/* Divider */}
												<div className="w-[1px] flex-shrink-0 bg-[#000000]" />
												{/* High section */}
												<button
													type="button"
													onClick={() => setSelectedPowerMode('high')}
													className={cn(
														'h-full flex items-center justify-center cursor-pointer border-0 p-0 m-0 flex-shrink-0 outline-none focus:outline-none whitespace-nowrap transition-[background-color,width] duration-75 ease-out',
														selectedPowerMode === 'high'
															? 'w-[100px]'
															: 'w-[46px]',
														selectedPowerMode === 'high'
															? 'bg-[#58A6E5]'
															: 'bg-transparent'
													)}
												>
													<span
														className={cn(
															'font-inter font-normal italic text-[14px] max-[480px]:text-[12px] transition-colors duration-75 ease-out',
															selectedPowerMode === 'high'
																? 'text-[#FFFFFF]'
																: 'text-[#000000]'
														)}
													>
														{selectedPowerMode === 'high' ? 'High Power' : 'High'}
													</span>
												</button>
												{/* Divider (only when High is selected) */}
												{selectedPowerMode === 'high' && (
													<div className="w-[1px] flex-shrink-0 bg-[#000000]" />
												)}
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
										<div
											className={cn(
												'w-full rounded-b-[6px] p-2 flex justify-center transition-colors duration-75 ease-out',
												selectedPowerMode === 'high'
													? 'bg-[#58A6E5]'
													: 'bg-[#88C5F7]'
											)}
										>
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

												{/* Booking For box (203 x 28px) + dropdown - rendered before Custom Instructions when closed */}
												{!isCustomInstructionsOpen && (
													<div ref={bookingForContainerRef} className="relative mt-[10px] w-full">
														<button
															ref={bookingForButtonRef}
															type="button"
															data-hover-description="What timeframe are you booking in. There's a calendar in there as well as picking seasons"
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
															className={cn(
																'w-full h-[28px] rounded-[8px] border-2 border-black flex items-center px-4 whitespace-nowrap',
																bookingForTriggerBgClass
															)}
															aria-haspopup="dialog"
															aria-expanded={isBookingForOpen}
														>
															<div className="inline-flex min-w-[203px] items-center justify-between gap-2 pr-12">
																<span
																	className={cn(
																		'font-inter font-normal text-[14px] leading-[14px] whitespace-nowrap',
																		bookingForTriggerTextClass
																	)}
																>
																	Booking For
																</span>
																<span
																	className={cn(
																		'font-inter font-bold text-[14px] leading-[14px] mr-1 whitespace-nowrap',
																		bookingForTriggerTextClass
																	)}
																>
																	{bookingForValue}
																</span>
															</div>
														</button>

														{isBookingForOpen &&
														(bookingForDropdownPosition || bookingForTab !== 'Calendar') &&
														(() => {
															// Anytime/Season use static (absolute) positioning - they fit in the container.
															// Calendar uses portal with fixed positioning so it's not clipped by overflow.
															const useStatic = bookingForTab !== 'Calendar';
															
															// For Calendar in landing page mode, calculate position to align tabs with button
															// Note: In landing mode the entire HybridPromptInput panel is scaled down (see `LandingDraftingDemo`).
															// The Calendar dropdown is portaled to `document.body`, so we must:
															// - Scale the Calendar dropdown by the same factor, and
															// - Compute its fixed position in *screen* pixels so the tab strip doesn't "jump".
															const landingScale = (() => {
																// If the panel isn't scaled, this should be ~1.
																const anchor = bookingForButtonRef.current;
																if (!anchor) return 1;
																const unscaledWidth = anchor.offsetWidth;
																if (!unscaledWidth) return 1;
																const scaledWidth = anchor.getBoundingClientRect().width;
																const scale = scaledWidth / unscaledWidth;
																return Number.isFinite(scale) && scale > 0 ? scale : 1;
															})();
															// For landing page, position Calendar so centered tabs align with Anytime/Season tabs.
															// With transformOrigin: 'top left', the left edge stays in place during scaling.
															const getCalendarLandingPosition = () => {
																if (!useStaticDropdownPosition || bookingForTab !== 'Calendar') {
																	return null;
																}
																const containerRect = bookingForContainerRef.current?.getBoundingClientRect();
																if (!containerRect) return null;
																
																// Anytime/Season tabs are centered in 317px at 16.5px from dropdown left
																// Calendar tabs are centered in 829px at 272.5px from dropdown left
																// To align: Calendar left = container left - (272.5 - 16.5) = container left - 256
																// Fine-tuned to 250px for better visual alignment
																const tabsAlignShift = 250 * landingScale;
																
																return {
																	top: containerRect.bottom + 6 * landingScale,
																	left: containerRect.left - tabsAlignShift,
																};
															};
															const calendarPos = getCalendarLandingPosition();
															
															const dropdownContent = (
																<div
																	ref={bookingForDropdownRef}
																	style={
																		useStatic
																			? {
																					position: 'absolute',
																					top: '100%',
																					left: 0,
																					marginTop: 6,
																					width: bookingForDropdownSize.width,
																					height: bookingForDropdownSize.height,
																			  }
																			: {
																					position: 'fixed',
																					top: calendarPos?.top ?? bookingForDropdownPosition?.top ?? 0,
																					left: calendarPos?.left ?? bookingForDropdownPosition?.left ?? 0,
																					width: bookingForDropdownSize.width,
																					height: bookingForDropdownSize.height,
																					// Scale down Calendar in landing page mode to match the scaled container
																					...(useStaticDropdownPosition && bookingForTab === 'Calendar' ? {
																						transform: `scale(${landingScale})`,
																						transformOrigin: 'top left',
																					} : {}),
																			  }
																	}
																	className={cn(
																		'z-[9999] rounded-[6px]',
																		bookingForTab === 'Season'
																			? BOOKING_FOR_SEASON_STYLES[bookingForSeason].bgClass
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
																			// On landing page (useStaticDropdownPosition), always center tabs
																			// On campaign page, use paddingLeft to align tabs
																			!useStaticDropdownPosition && bookingForTabStripLeft != null ? 'justify-start' : 'justify-center'
																		)}
																		style={!useStaticDropdownPosition && bookingForTabStripLeft != null ? { paddingLeft: bookingForTabStripLeft } : undefined}
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
																	<div className="flex-1 w-full p-[14px]" data-hover-description="Pick a date range that you want to book within. This will be included in the drafting">
																		<div className="w-full h-full flex flex-col gap-[16px]">
																			{/* Top row */}
																			<div className="w-full flex items-center justify-center gap-[24px]" data-hover-description-suppress="true">
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
																								data-hover-description-suppress="true"
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
																								<div className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]" data-hover-description-suppress="true">
																									<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																										{currentMonth}
																									</span>
																								</div>
																								<div className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]" data-hover-description-suppress="true">
																									<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																										{nextMonth}
																									</span>
																								</div>
																							</div>

																							<button
																								type="button"
																								data-hover-description-suppress="true"
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
																			<div className="w-full flex items-center justify-center gap-[24px]" data-hover-description-suppress="true">
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
																							<div className="w-[364px] h-[312px] rounded-[8px] bg-[#E2E2E2] p-[18px] flex flex-col" data-hover-description-suppress="true">
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
																												data-hover-description-suppress="true"
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
															</div>
														);
														return useStatic
															? dropdownContent
															: typeof document !== 'undefined'
																// Portal to <html> instead of <body> because Murmur uses
																// body { transform: scale() } on Firefox, which would offset
																// position: fixed children.
																? createPortal(dropdownContent, document.documentElement)
																: null;
													})()}
													</div>
												)}

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
																		'w-full h-[22px] rounded-[8px] border-2 border-black transition-colors duration-75 ease-out',
																		selectedPowerMode === 'high'
																			? 'bg-[#58A6E5]'
																			: 'bg-[#88C5F7]',
																		'flex items-center justify-start gap-1 px-4 max-[480px]:gap-[2px] max-[480px]:px-3',
																		'font-inter font-semibold text-[11px] max-[480px]:text-[9px] leading-none text-black whitespace-nowrap',
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
																	'flex flex-col transition-colors duration-75 ease-out',
																	selectedPowerMode === 'high'
																		? 'bg-[#58A6E5]'
																		: 'bg-[#88C5F7]'
																)}
																aria-label="Custom Instructions"
															>
																<div className="h-[22px] flex items-center justify-between px-2">
																	<span className="font-inter font-semibold text-[11px] max-[480px]:text-[9px] leading-none text-black whitespace-nowrap">
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
																			!forceDesktop && 'max-[480px]:text-[10px]'
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
																<div className="h-[22px] bg-[#F0F0F0] px-3 flex items-start justify-end gap-[6px]">
																	{/* Score (159 x 20) */}
																	<div className="w-[159px] h-[20px] box-border bg-transparent border-2 border-transparent rounded-[8px] flex items-center gap-[6px] px-[6px]">
																		<div className="w-[92px] h-[12px] box-border bg-white border-2 border-black rounded-[8px] overflow-hidden shrink-0">
																			<div
																				className="h-full bg-[#36B24A] rounded-full transition-[width] duration-200"
																				style={{ width: `${promptScoreFillPercent}%` }}
																			/>
																		</div>
																		<span className="font-inter font-semibold text-[12px] leading-none text-black flex-1 text-center tabular-nums truncate">
																			{promptQualityLabel ?? clampedPromptScore ?? ''}
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
																			'w-[20px] h-[20px] box-border rounded-[6px] border-2 border-transparent bg-transparent flex items-center justify-center p-0',
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
																			'w-[73px] h-[20px] box-border rounded-[8px] border-2 border-transparent bg-transparent flex items-center justify-between gap-[4px] px-[4px] py-0',
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

												{/* Booking For box - rendered AFTER Custom Instructions when it's open */}
												{isCustomInstructionsOpen && (
													<div ref={bookingForContainerRef} className="relative mt-[10px] w-full">
														<button
															ref={bookingForButtonRef}
															type="button"
															data-hover-description="What timeframe are you booking in. There's a calendar in there as well as picking seasons"
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
															className={cn(
																'w-full h-[28px] rounded-[8px] border-2 border-black flex items-center px-4 whitespace-nowrap',
																bookingForTriggerBgClass
															)}
															aria-haspopup="dialog"
															aria-expanded={isBookingForOpen}
														>
															<div className="inline-flex min-w-[203px] items-center justify-between gap-2 pr-16">
																<span
																	className={cn(
																		'font-inter font-normal text-[14px] leading-[14px] whitespace-nowrap',
																		bookingForTriggerTextClass
																	)}
																>
																	Booking For
																</span>
																<span
																	className={cn(
																		'font-inter font-bold text-[14px] leading-[14px] mr-1 whitespace-nowrap',
																		bookingForTriggerTextClass
																	)}
																>
																	{bookingForValue}
																</span>
															</div>
														</button>

														{isBookingForOpen &&
															(bookingForDropdownPosition || bookingForTab !== 'Calendar') &&
															(() => {
																// Anytime/Season use static (absolute) positioning - they fit in the container.
																// Calendar uses portal with fixed positioning so it's not clipped by overflow.
																const useStatic2 = bookingForTab !== 'Calendar';
																
																// For Calendar in landing page mode, calculate position to align tabs with button
																// See comment in the other Booking For render path for why this needs
																// special handling when the panel is scaled on the landing page.
																const landingScale2 = (() => {
																	const anchor = bookingForButtonRef.current;
																	if (!anchor) return 1;
																	const unscaledWidth = anchor.offsetWidth;
																	if (!unscaledWidth) return 1;
																	const scaledWidth = anchor.getBoundingClientRect().width;
																	const scale = scaledWidth / unscaledWidth;
																	return Number.isFinite(scale) && scale > 0 ? scale : 1;
																})();
																// For landing page, position Calendar so centered tabs align with Anytime/Season tabs.
																// With transformOrigin: 'top left', the left edge stays in place during scaling.
																const getCalendarLandingPosition2 = () => {
																	if (!useStaticDropdownPosition || bookingForTab !== 'Calendar') {
																		return null;
																	}
																	const containerRect = bookingForContainerRef.current?.getBoundingClientRect();
																	if (!containerRect) return null;
																	
																	// Anytime/Season tabs are centered in 317px at 16.5px from dropdown left
																	// Calendar tabs are centered in 829px at 272.5px from dropdown left
																	// To align: Calendar left = container left - (272.5 - 16.5) = container left - 256
																	// Fine-tuned to 250px for better visual alignment
																	const tabsAlignShift = 250 * landingScale2;
																	
																	return {
																		top: containerRect.bottom + 6 * landingScale2,
																		left: containerRect.left - tabsAlignShift,
																	};
																};
																const calendarPos2 = getCalendarLandingPosition2();
																
																const dropdownContent2 = (
																	<div
																		ref={bookingForDropdownRef}
																		style={
																			useStatic2
																				? {
																						position: 'absolute',
																						top: '100%',
																						left: 0,
																						marginTop: 6,
																						width: bookingForDropdownSize.width,
																						height: bookingForDropdownSize.height,
																				  }
																				: {
																						position: 'fixed',
																						top: calendarPos2?.top ?? bookingForDropdownPosition?.top ?? 0,
																						left: calendarPos2?.left ?? bookingForDropdownPosition?.left ?? 0,
																						width: bookingForDropdownSize.width,
																						height: bookingForDropdownSize.height,
																						// Scale down Calendar in landing page mode to match the scaled container
																						...(useStaticDropdownPosition && bookingForTab === 'Calendar' ? {
																							transform: `scale(${landingScale2})`,
																							transformOrigin: 'top left',
																						} : {}),
																				  }
																		}
																		className={cn(
																			'z-[9999] rounded-[6px]',
																			bookingForTab === 'Season'
																				? BOOKING_FOR_SEASON_STYLES[bookingForSeason].bgClass
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
																				// On landing page (useStaticDropdownPosition), always center tabs
																				// On campaign page, use paddingLeft to align tabs
																				!useStaticDropdownPosition && bookingForTabStripLeft != null ? 'justify-start' : 'justify-center'
																			)}
																			style={!useStaticDropdownPosition && bookingForTabStripLeft != null ? { paddingLeft: bookingForTabStripLeft } : undefined}
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
																		<div className="flex-1 w-full p-[14px]" data-hover-description="Pick a date range that you want to book within. This will be included in the drafting">
																			<div className="w-full h-full flex flex-col gap-[16px]">
																				<div className="w-full flex items-center justify-center gap-[24px]" data-hover-description-suppress="true">
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
																									data-hover-description-suppress="true"
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
																									<div className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]" data-hover-description-suppress="true">
																										<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																											{currentMonth}
																										</span>
																									</div>
																									<div className="w-[364px] h-[42px] rounded-[8px] bg-[#E2E2E2] flex items-center px-[18px]" data-hover-description-suppress="true">
																										<span className="font-inter font-semibold text-[16px] leading-[16px] text-black">
																											{nextMonth}
																										</span>
																									</div>
																								</div>

																								<button
																									type="button"
																									data-hover-description-suppress="true"
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

																				<div className="w-full flex items-center justify-center gap-[24px]" data-hover-description-suppress="true">
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
																							if (date.getTime() < today.getTime()) return;

																							if (
																								bookingForCalendarStartDate == null ||
																								bookingForCalendarEndDate != null
																							) {
																								setBookingForCalendarStartDate(date);
																								setBookingForCalendarEndDate(null);
																								setBookingForValue(formatMonthDay(date));
																								return;
																							}

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
																							const firstDayOfWeek = new Date(year, month, 1).getDay();
																							const daysInMonth = new Date(year, month + 1, 0).getDate();

																							const cells = Array.from({ length: 42 }, (_, idx) => {
																								const dayNumber = idx - firstDayOfWeek + 1;
																								if (dayNumber < 1 || dayNumber > daysInMonth) return null;
																								return new Date(year, month, dayNumber);
																							});

																							return (
																								<div className="w-[364px] h-[312px] rounded-[8px] bg-[#E2E2E2] p-[18px] flex flex-col" data-hover-description-suppress="true">
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
																													data-hover-description-suppress="true"
																													onClick={() => handleSelectCalendarDate(cellDayStart)}
																													aria-label={new Intl.DateTimeFormat('en-US', {
																														month: 'long',
																														day: 'numeric',
																														year: 'numeric',
																													}).format(cellDayStart)}
																												>
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
																</div>
															);
															return useStatic2
																? dropdownContent2
																: typeof document !== 'undefined'
																	// Portal to <html> instead of <body> because Murmur uses
																	// body { transform: scale() } on Firefox, which would offset
																	// position: fixed children.
																	? createPortal(dropdownContent2, document.documentElement)
																	: null;
														})()}
													</div>
												)}
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
		onHoverChange,
		onCustomInstructionsOpenChange,
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
		useStaticDropdownPosition,
		hideMobileStickyTestFooter,
		hideGenerateTestButton,
		containerHeightPx,
		dataCampaignMainBox,
		onGoToContacts,
		onGoToInbox,
		forceDesktop,
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

	// Signature auto/manual mode toggle (local state for Full Auto mode)
	const [isAutoSignature, setIsAutoSignature] = useState(true);
	const [manualSignatureValue, setManualSignatureValue] = useState('');

	// Track if Custom Instructions is open (for adjusting Generate Test button position)
	const [isLocalCustomInstructionsOpen, setIsLocalCustomInstructionsOpen] = useState(false);

	// Wrap the parent callback to also update local state
	const handleCustomInstructionsOpenChange = useCallback(
		(isOpen: boolean) => {
			setIsLocalCustomInstructionsOpen(isOpen);
			onCustomInstructionsOpenChange?.(isOpen);
		},
		[onCustomInstructionsOpenChange]
	);

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
	const isManualModeSelected = selectedModeKey === 'manual';

	type HybridStructureSelection =
		| { kind: 'none' }
		| { kind: 'subject' }
		| { kind: 'signature' }
		| { kind: 'block'; blockId: string };

	const [hybridStructureSelection, setHybridStructureSelection] =
		useState<HybridStructureSelection>({ kind: 'none' });
	const [expandedHybridTextBlockId, setExpandedHybridTextBlockId] = useState<string | null>(null);
	const [expandedHybridCoreBlockId, setExpandedHybridCoreBlockId] = useState<string | null>(null);
	const [isHybridProfileExpanded, setIsHybridProfileExpanded] = useState(false);

	// Reset hybrid-only UI when switching modes
	useEffect(() => {
		if (selectedModeKey !== 'hybrid') {
			setHybridStructureSelection({ kind: 'none' });
			setExpandedHybridTextBlockId(null);
			setExpandedHybridCoreBlockId(null);
			setIsHybridProfileExpanded(false);
		}
	}, [selectedModeKey]);

	// If the selected block disappears, clear selection
	useEffect(() => {
		if (hybridStructureSelection.kind !== 'block') return;
		const exists = fields.some((f) => f.id === hybridStructureSelection.blockId);
		if (!exists) setHybridStructureSelection({ kind: 'none' });
	}, [fields, hybridStructureSelection]);

	// If an expanded text block disappears, collapse it
	useEffect(() => {
		if (!expandedHybridTextBlockId) return;
		const exists = fields.some((f) => f.id === expandedHybridTextBlockId);
		if (!exists) setExpandedHybridTextBlockId(null);
	}, [expandedHybridTextBlockId, fields]);

	// If an expanded core block disappears, collapse it
	useEffect(() => {
		if (!expandedHybridCoreBlockId) return;
		const exists = fields.some((f) => f.id === expandedHybridCoreBlockId);
		if (!exists) setExpandedHybridCoreBlockId(null);
	}, [expandedHybridCoreBlockId, fields]);

	const getHybridStructureLabel = useCallback((type: HybridBlock) => {
		switch (type) {
			case HybridBlock.introduction:
				return 'Intro';
			case HybridBlock.research:
				return 'Research';
			case HybridBlock.action:
				return 'Call to Action';
			case HybridBlock.text:
				return 'Text';
			default:
				return 'Block';
		}
	}, []);

	// Manual tab redesign assumes a single unified body editor. If multiple manual Text blocks exist,
	// collapse them into one so the editor can display/edit everything.
	useEffect(() => {
		if (!isManualModeSelected) return;
		const blocks = form.getValues('hybridBlockPrompts') || [];
		if (blocks.length <= 1) return;
		if (!blocks.every((b) => b.type === HybridBlock.text)) return;

		const combined = blocks
			.map((b) => (b.value ?? '').toString())
			.map((v) => v.trimEnd())
			.filter((v) => v.length > 0)
			.join('\n\n');

		form.setValue(
			'hybridBlockPrompts',
			[{ id: 'text-0', type: HybridBlock.text, value: combined }],
			{ shouldDirty: true }
		);
	}, [form, isManualModeSelected]);

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
		// Manual mode uses a unified editor; close any open Test Preview UI.
		setShowTestPreview?.(false);
		onTestPreviewToggle?.(false);

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
	
	// Custom font dropdown state (to avoid Radix positioning issues with zoom)
	const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
	const fontDropdownRef = useRef<HTMLDivElement>(null);
	
	// Custom font size dropdown state
	const [isFontSizeDropdownOpen, setIsFontSizeDropdownOpen] = useState(false);
	const fontSizeDropdownRef = useRef<HTMLDivElement>(null);
	const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 36] as const;
	const DEFAULT_FONT_SIZE = 12;
	
	// Manual mode color picker dropdown state
	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	const colorPickerRef = useRef<HTMLDivElement>(null);
	const [manualSelectedTextColor, setManualSelectedTextColor] = useState<string | null>(null);
	const [manualSelectedBgColor, setManualSelectedBgColor] = useState<string | null>(null);

	// Fill-ins dropdown state
	const [isFillInsDropdownOpen, setIsFillInsDropdownOpen] = useState(false);
	const fillInsDropdownRef = useRef<HTMLDivElement>(null);
	const FILL_IN_OPTIONS = ['Company', 'State', 'City'] as const;

	// Manual mode link popover state
	const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
	const linkPopoverRef = useRef<HTMLDivElement>(null);
	const [linkText, setLinkText] = useState('');
	const [linkUrl, setLinkUrl] = useState('');
	const [savedRange, setSavedRange] = useState<Range | null>(null);
	const [linkPopoverPosition, setLinkPopoverPosition] = useState<{ top: number; left: number } | null>(null);

	// Manual mode body editor ref (contentEditable)
	const manualBodyEditorRef = useRef<HTMLDivElement>(null);
	const manualBodyInitializedRef = useRef(false);

	// Track active formatting state
	const [activeFormatting, setActiveFormatting] = useState({
		bold: false,
		italic: false,
		underline: false,
		bulletList: false,
	});

	// Check current formatting state at selection
	const updateActiveFormatting = useCallback(() => {
		setActiveFormatting({
			bold: document.queryCommandState('bold'),
			italic: document.queryCommandState('italic'),
			underline: document.queryCommandState('underline'),
			bulletList: document.queryCommandState('insertUnorderedList'),
		});
	}, []);

	// Listen for selection changes to update formatting state
	useEffect(() => {
		if (selectedModeKey !== 'manual') return;
		
		const handleSelectionChange = () => {
			updateActiveFormatting();
		};
		
		document.addEventListener('selectionchange', handleSelectionChange);
		return () => document.removeEventListener('selectionchange', handleSelectionChange);
	}, [selectedModeKey, updateActiveFormatting]);

	// Initialize the contentEditable with form value (only once when entering manual mode)
	useEffect(() => {
		if (selectedModeKey === 'manual' && manualBodyEditorRef.current && !manualBodyInitializedRef.current) {
			const currentValue = form.getValues('hybridBlockPrompts.0.value') || '';
			manualBodyEditorRef.current.innerHTML = currentValue;
			manualBodyInitializedRef.current = true;
		}
		// Reset initialization flag when leaving manual mode
		if (selectedModeKey !== 'manual') {
			manualBodyInitializedRef.current = false;
		}
	}, [selectedModeKey, form]);

	// Apply formatting to the manual mode body editor
	const applyManualFormatting = useCallback(
		(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
		const editor = manualBodyEditorRef.current;
		if (!editor) return;
		
		// Focus the editor to ensure selection is active
		editor.focus();
		
		// Apply the formatting command
		document.execCommand(command, false);
		
		// Update active formatting state
		updateActiveFormatting();
		
		// Sync back to form after applying formatting
		const html = editor.innerHTML || '';
		form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });
	},
		[form, updateActiveFormatting]
	);

	const applyManualColor = useCallback(
		(command: 'foreColor' | 'hiliteColor', color: string) => {
			const editor = manualBodyEditorRef.current;
			if (!editor) return;

			// Focus the editor to ensure selection is active
			editor.focus();

			// Prefer CSS spans over <font> tags when supported
			try {
				document.execCommand('styleWithCSS', false, 'true');
			} catch {
				// ignore (not supported everywhere)
			}

			if (command === 'hiliteColor') {
				setManualSelectedBgColor(color);
				const ok = document.execCommand('hiliteColor', false, color);
				if (!ok) {
					// Some browsers use backColor instead
					document.execCommand('backColor', false, color);
				}
			} else {
				setManualSelectedTextColor(color);
				document.execCommand('foreColor', false, color);
			}

			// Update active formatting state
			updateActiveFormatting();

			// Sync back to form after applying color
			const html = editor.innerHTML || '';
			form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });
		},
		[form, updateActiveFormatting]
	);

	// Insert a fill-in placeholder at cursor position
	const insertFillIn = useCallback(
		(fillInType: 'Company' | 'State' | 'City') => {
			const editor = manualBodyEditorRef.current;
			if (!editor) return;

			// Focus the editor to ensure we have a selection
			editor.focus();

			const selection = window.getSelection();
			let range: Range;

			// If no selection or not in editor, insert at end
			if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
				range = document.createRange();
				range.selectNodeContents(editor);
				range.collapse(false); // Collapse to end
				if (selection) {
					selection.removeAllRanges();
					selection.addRange(range);
				}
			} else {
				range = selection.getRangeAt(0);
			}

			// Insert a styled box span with the fill-in placeholder
			const fillInHtml = `<span contenteditable="false" data-fill-in="${fillInType}" style="display: inline-block; background-color: #E8EFFF; color: #000000; padding: 2px 8px; border-radius: 6px; border: 1px solid #000000; font-size: 12px; font-family: Inter, sans-serif; font-weight: 500; margin: 0 2px; user-select: all; vertical-align: baseline;">${fillInType}</span>`;
			document.execCommand('insertHTML', false, fillInHtml);

			// Sync back to form
			const html = editor.innerHTML || '';
			form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });

			// Close the dropdown
			setIsFillInsDropdownOpen(false);
		},
		[form]
	);

	// Sanitize manual editor content to remove banned fill-ins ({{email}}, {{phone}})
	const sanitizeBannedFillIns = useCallback((html: string): string => {
		// Remove {{email}} and {{phone}} patterns (case insensitive)
		// This handles both plain text typed by user and any styled spans with these data attributes
		let sanitized = html.replace(/\{\{email\}\}/gi, '');
		sanitized = sanitized.replace(/\{\{phone\}\}/gi, '');
		// Also remove any styled fill-in spans with banned types
		sanitized = sanitized.replace(/<span[^>]*data-fill-in="(email|phone)"[^>]*>[^<]*<\/span>/gi, '');
		return sanitized;
	}, []);

	// Open link popover and save the current selection
	const openLinkPopover = useCallback(() => {
		const editor = manualBodyEditorRef.current;
		if (!editor) return;

		// Focus the editor first to ensure we can get/create a selection
		editor.focus();

		let selection = window.getSelection();
		let range: Range;

		// If no selection or selection not in editor, create one at the end
		if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
			range = document.createRange();
			range.selectNodeContents(editor);
			range.collapse(false); // Collapse to end
			selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(range);
			}
		} else {
			range = selection.getRangeAt(0);
		}

		// Save the current range
		setSavedRange(range.cloneRange());

		// Get the selected text
		const selectedText = selection?.toString() || '';
		setLinkText(selectedText);
		setLinkUrl('');

		// Calculate position for the popover (at cursor position)
		const rect = range.getBoundingClientRect();
		const editorRect = editor.getBoundingClientRect();
		
		// Position popover below the selection (with fallback if rect is zero)
		const popoverTop = rect.height > 0 ? rect.bottom - editorRect.top + 8 : 40;
		const popoverLeft = rect.width > 0 || rect.left > 0 ? Math.max(0, rect.left - editorRect.left) : 0;
		
		setLinkPopoverPosition({
			top: popoverTop,
			left: Math.min(popoverLeft, 150),
		});

		// Close other dropdowns
		setIsFontDropdownOpen(false);
		setIsFontSizeDropdownOpen(false);
		setIsColorPickerOpen(false);

		setIsLinkPopoverOpen(true);
	}, []);

	// Apply the link to the saved selection
	const applyLink = useCallback(() => {
		const editor = manualBodyEditorRef.current;
		if (!editor || !linkUrl.trim()) return;

		// Normalize the URL
		const normalizedUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
			? linkUrl 
			: `https://${linkUrl}`;

		// Determine the text to display (use URL if no text provided)
		const displayText = linkText.trim() || normalizedUrl;

		editor.focus();

		// Restore the saved selection if we have one
		if (savedRange) {
			const selection = window.getSelection();
			if (selection) {
				selection.removeAllRanges();
				selection.addRange(savedRange);
			}
		}

		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			const selectedContent = selection.toString();
			
			// Delete current selection content if any
			if (selectedContent) {
				range.deleteContents();
			}
			
			// Create and insert the link element
			const linkElement = document.createElement('a');
			linkElement.href = normalizedUrl;
			linkElement.textContent = displayText;
			linkElement.target = '_blank';
			linkElement.rel = 'noopener noreferrer';
			linkElement.style.color = '#0066cc';
			linkElement.style.textDecoration = 'underline';
			range.insertNode(linkElement);
			
			// Move cursor after the link
			range.setStartAfter(linkElement);
			range.setEndAfter(linkElement);
			selection.removeAllRanges();
			selection.addRange(range);
		} else {
			// No selection - append at end
			const linkElement = document.createElement('a');
			linkElement.href = normalizedUrl;
			linkElement.textContent = displayText;
			linkElement.target = '_blank';
			linkElement.rel = 'noopener noreferrer';
			linkElement.style.color = '#0066cc';
			linkElement.style.textDecoration = 'underline';
			editor.appendChild(linkElement);
		}

		// Sync back to form
		const html = editor.innerHTML || '';
		form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });

		// Reset and close popover
		setLinkText('');
		setLinkUrl('');
		setSavedRange(null);
		setLinkPopoverPosition(null);
		setIsLinkPopoverOpen(false);
	}, [form, linkText, linkUrl, savedRange]);

	// Close link popover when clicking outside
	useEffect(() => {
		if (!isLinkPopoverOpen) return;
		
		const handleClickOutside = (e: MouseEvent) => {
			if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target as Node)) {
				setIsLinkPopoverOpen(false);
				setLinkText('');
				setLinkUrl('');
				setSavedRange(null);
				setLinkPopoverPosition(null);
			}
		};
		
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsLinkPopoverOpen(false);
				setLinkText('');
				setLinkUrl('');
				setSavedRange(null);
				setLinkPopoverPosition(null);
			}
		};
		
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isLinkPopoverOpen]);

	// Close link popover when leaving manual mode
	useEffect(() => {
		if (selectedModeKey !== 'manual') {
			setIsLinkPopoverOpen(false);
			setLinkText('');
			setLinkUrl('');
			setSavedRange(null);
			setLinkPopoverPosition(null);
		}
	}, [selectedModeKey]);
	
	// Close font dropdown when clicking outside
	useEffect(() => {
		if (!isFontDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
				setIsFontDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isFontDropdownOpen]);
	
	// Close font size dropdown when clicking outside
	useEffect(() => {
		if (!isFontSizeDropdownOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (fontSizeDropdownRef.current && !fontSizeDropdownRef.current.contains(e.target as Node)) {
				setIsFontSizeDropdownOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isFontSizeDropdownOpen]);

	// Close color picker when leaving manual mode
	useEffect(() => {
		if (selectedModeKey !== 'manual') setIsColorPickerOpen(false);
	}, [selectedModeKey]);
	
	// Close color picker when clicking outside / pressing Escape
	useEffect(() => {
		if (!isColorPickerOpen) return;
		
		const handleClickOutside = (e: MouseEvent) => {
			if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
				setIsColorPickerOpen(false);
			}
		};
		
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsColorPickerOpen(false);
		};
		
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isColorPickerOpen]);

	// Close fill-ins dropdown when clicking outside / pressing Escape
	useEffect(() => {
		if (!isFillInsDropdownOpen) return;
		
		const handleClickOutside = (e: MouseEvent) => {
			if (fillInsDropdownRef.current && !fillInsDropdownRef.current.contains(e.target as Node)) {
				setIsFillInsDropdownOpen(false);
			}
		};
		
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setIsFillInsDropdownOpen(false);
		};
		
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isFillInsDropdownOpen]);

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

	// Hybrid: profile chips (match Full Auto Profile section formatting)
	type HybridProfileChipItem = {
		key: string;
		text: string;
		bgClass: string;
		isEmpty: boolean;
	};
	const hybridProfileChipItems = useMemo<HybridProfileChipItem[]>(() => {
		const truncate = (value: string, max: number) => {
			const v = (value || '').trim();
			if (v.length <= max) return v;
			return v.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
		};

		const chips: HybridProfileChipItem[] = [];

		const name = (profileFields?.name ?? '').trim();
		const genre = (profileFields?.genre ?? '').trim();
		const area = (profileFields?.area ?? '').trim();
		const band = (profileFields?.band ?? '').trim();
		const bio = (profileFields?.bio ?? '').trim();
		const linksRaw = (profileFields?.links ?? '').trim();

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
	}, [profileFields]);

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

	const handleClearAllProfileFields = () => {
		// Close any expanded field (we are clearing values)
		setExpandedProfileBox(null);

		// Name is required; keep it and clear the rest.
		setProfileFields((prev) => ({
			...prev,
			genre: '',
			area: '',
			band: '',
			bio: '',
			links: '',
		}));

		if (!onIdentityUpdate || !identityProfile) return;
		onIdentityUpdate({
			genre: '',
			area: '',
			bandName: '',
			bio: '',
			website: '',
		});
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

	const MODE_HIGHLIGHT_WIDTH = 80.38;
	// Hide until we can measure and position it, so it never flashes off-center during tab transitions.
	const [highlightStyle, setHighlightStyle] = useState(() => ({
		left: 0,
		width: MODE_HIGHLIGHT_WIDTH,
		opacity: 0,
	}));
	const [isInitialRender, setIsInitialRender] = useState(true);

	// Chrome-style mode hover preview (active turns white, hovered mode appears)
	const [hoveredModeKey, setHoveredModeKey] = useState<'full' | 'hybrid' | 'manual' | null>(null);
	const isModePreviewingOther =
		hoveredModeKey !== null && selectedModeKey !== 'none' && hoveredModeKey !== selectedModeKey;

	const wasModePreviewingRef = useRef(false);
	const isSwitchingBetweenModePreviews = wasModePreviewingRef.current && isModePreviewingOther;
	useEffect(() => {
		wasModePreviewingRef.current = isModePreviewingOther;
	}, [isModePreviewingOther]);

	const modePreviewAnimatedTransition = '0.6s cubic-bezier(0.22, 1, 0.36, 1)';
	const modePreviewInstantTransition = '0s';
	const modePreviewOpacityTransition = isSwitchingBetweenModePreviews
		? modePreviewInstantTransition
		: modePreviewAnimatedTransition;

	const [hoverPreviewHighlightStyle, setHoverPreviewHighlightStyle] = useState(() => ({
		left: 0,
		width: MODE_HIGHLIGHT_WIDTH,
		opacity: 0,
	}));

	const getModeHighlightBackgroundColor = useCallback((mode: 'full' | 'hybrid' | 'manual') => {
		switch (mode) {
			case 'hybrid':
				return 'rgba(74, 74, 217, 0.31)'; // #4A4AD9 at 31% opacity
			case 'manual':
				return 'rgba(109, 171, 104, 0.47)'; // #6DAB68 at 47% opacity
			case 'full':
			default:
				return '#DAE6FE';
		}
	}, []);

	useLayoutEffect(() => {
		if (!isModePreviewingOther || !hoveredModeKey) {
			setHoverPreviewHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
			return;
		}

		let targetButton: HTMLButtonElement | null = null;
		if (hoveredModeKey === 'full') targetButton = fullModeButtonRef.current;
		else if (hoveredModeKey === 'hybrid') targetButton = hybridModeButtonRef.current;
		else targetButton = manualModeButtonRef.current;

		if (!targetButton) return;

		const newLeft =
			targetButton.offsetLeft + targetButton.offsetWidth / 2 - MODE_HIGHLIGHT_WIDTH / 2;
		setHoverPreviewHighlightStyle({
			left: newLeft,
			width: MODE_HIGHLIGHT_WIDTH,
			opacity: 1,
		});
	}, [MODE_HIGHLIGHT_WIDTH, hoveredModeKey, isModePreviewingOther]);

	const dragBounds = useRef({ min: 0, max: 0 });

	// Use useLayoutEffect to calculate position BEFORE browser paints, preventing any visual jump
	useLayoutEffect(() => {
		if (selectedModeKey === 'none') {
			setHighlightStyle({
				left: 0,
				width: MODE_HIGHLIGHT_WIDTH,
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
			const newLeft =
				targetButton.offsetLeft + targetButton.offsetWidth / 2 - MODE_HIGHLIGHT_WIDTH / 2;
			setHighlightStyle({
				left: newLeft,
				width: MODE_HIGHLIGHT_WIDTH,
				opacity: 1,
			});
		}

		if (fullModeButtonRef.current && manualModeButtonRef.current) {
			const min =
				fullModeButtonRef.current.offsetLeft +
				fullModeButtonRef.current.offsetWidth / 2 -
				MODE_HIGHLIGHT_WIDTH / 2;
			const max =
				manualModeButtonRef.current.offsetLeft +
				manualModeButtonRef.current.offsetWidth / 2 -
				MODE_HIGHLIGHT_WIDTH / 2;
			dragBounds.current = { min, max };
		}
	}, [MODE_HIGHLIGHT_WIDTH, selectedModeKey]);

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
			return Math.abs(curr.center - (finalX + MODE_HIGHLIGHT_WIDTH / 2)) <
				Math.abs(prev.center - (finalX + MODE_HIGHLIGHT_WIDTH / 2))
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

	const isMobileHook = useIsMobile();
	const isMobile = forceDesktop ? false : isMobileHook;
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

	const hoverDescription = useMemo(() => {
		if (activeTab === 'profile') {
			return 'This is where you provide context that will feed into creating the best possible drafts.';
		}
		if (selectedModeKey === 'manual') {
			return 'In Manual Mode, you can fully customize and write your own emails to send out';
		}
		if (selectedModeKey === 'hybrid') {
			return 'This is where we can mix automated text with your own manually written text for the best of both worlds';
		}
		return 'Writing: Build your email (subject + blocks + signature), then generate drafts for selected contacts.';
	}, [activeTab, selectedModeKey]);

	return (
		<div
			className={cn(
				compactLeftOnly ? '' : 'flex justify-center',
				!showTestPreview && !forceDesktop && 'max-[480px]:pb-[60px]'
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
							className={cn(
								compactLeftOnly
									? 'flex-col'
									: cn(
											cn(!forceDesktop ? 'w-[96.27vw]' : 'w-[499px]', 'max-w-[499px] transition flex mx-auto flex-col border-[3px] border-transparent rounded-[8px]'),
											containerHeightPx ? null : 'h-[703px]'
									  ),
								'relative overflow-visible isolate'
							)}
							style={
								!compactLeftOnly
									? {
											backgroundColor: '#A6E2A8',
											backgroundImage: HPI_GREEN_BG_GRADIENT,
											...(containerHeightPx ? { height: `${containerHeightPx}px` } : {}),
									  }
									: undefined
							}
							data-campaign-main-box={
								compactLeftOnly
									? undefined
									: dataCampaignMainBox === undefined
										? 'writing'
										: dataCampaignMainBox || undefined
							}
							data-hover-description={hoverDescription}
							data-hpi-container
							onFocus={handleContainerFocus}
							onBlur={handleContainerBlur}
							onMouseEnter={() => onHoverChange?.(true)}
							onMouseLeave={() => onHoverChange?.(false)}
						>
							{/* Write tab chrome header (pill + dots) */}
							{!isMobile && !compactLeftOnly && (
								<WriteTabChromeHeader
									onContactsClick={onGoToContacts}
									onDraftsClick={onGoToDrafting}
									onInboxClick={onGoToInbox}
								/>
							)}
							{/* Border overlay to ensure crisp, unbroken stroke at rounded corners */}
							{!compactLeftOnly && (
								<div
									aria-hidden="true"
									className="pointer-events-none absolute -inset-[3px] z-[60] rounded-[8px] border-[3px] border-black"
								/>
							)}
							{/* Mobile-only background overlay starting under Mode divider (match desktop fill) */}
							{isMobile && activeTab === 'main' && !showTestPreview && overlayTopPx !== null && (
								<div
									style={{
										position: 'absolute',
										left: 0,
										right: 0,
										top: overlayTopPx,
										bottom: 0,
										backgroundColor: '#A6E2A8',
										backgroundImage: HPI_GREEN_BG_GRADIENT,
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
										<div className={cn(!compactLeftOnly ? 'bg-white' : '', 'relative')}>
											<div className="relative h-[31px]">
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
														data-hover-description="Add information about yourself so you can pitch well to the contacts you're reaching out to"
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
													cn(!forceDesktop ? 'w-[93.7vw]' : 'w-[475px]', 'max-w-[475px] mx-auto pl-[8px]', !forceDesktop && 'max-[480px]:pl-[6px]')
												)}
												data-left-drag-handle
												data-root-drag-handle
											>
												{compactLeftOnly && (
													<span
														className={cn(
															cn('font-inter font-semibold text-[13px] ml-[8px] mr-[112px] text-black relative z-10', !forceDesktop && 'max-[480px]:text-[14px] max-[480px]:mr-[22px]')
														)}
													>
														Profile
													</span>
												)}
												{/* Spacer to keep toggles in position */}
												{!compactLeftOnly && <div className="w-[130px] shrink-0" />}
												<div
													ref={modeContainerRef}
													onMouseLeave={() => setHoveredModeKey(null)}
													className={cn(
														'relative flex items-center flex-1',
														forceDesktop ? 'gap-[70px] ml-[30px]' : 'gap-[78px] ml-[42px]',
														!forceDesktop &&
															'max-[480px]:gap-0 max-[480px]:justify-between max-[480px]:ml-[2px] max-[480px]:w-auto max-[480px]:px-[24px]'
													)}
													data-hover-description-suppress="true"
												>
													{/* Hover preview pill (appears under hovered mode; selected pill turns white) */}
													{selectedModeKey !== 'none' && (
														<div
															aria-hidden="true"
															className="absolute top-1/2 -translate-y-1/2 z-10 rounded-[8px] pointer-events-none"
															style={{
																left: hoverPreviewHighlightStyle.left,
																width: MODE_HIGHLIGHT_WIDTH,
																opacity: hoverPreviewHighlightStyle.opacity,
																transition: `opacity ${modePreviewOpacityTransition}`,
															}}
														>
															<div
																style={{
																	width: MODE_HIGHLIGHT_WIDTH,
																	height: 19,
																	backgroundColor:
																		hoveredModeKey && isModePreviewingOther
																			? getModeHighlightBackgroundColor(hoveredModeKey)
																			: 'transparent',
																	border: '1.3px solid #000000',
																	borderRadius: '8px',
																	transition: `background-color ${modePreviewOpacityTransition}`,
																}}
															/>
														</div>
													)}
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
																backgroundColorOverride={isModePreviewingOther ? '#FFFFFF' : undefined}
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
														onMouseEnter={() => setHoveredModeKey('full')}
														style={{ transition: `opacity ${modePreviewAnimatedTransition}` }}
														className={cn(
															'!p-0 h-fit !m-0 text-[13px] font-inter font-semibold bg-transparent z-20 text-black transition-opacity',
															!forceDesktop && 'max-[480px]:text-[14px]',
															isModePreviewingOther && selectedModeKey === 'full' && 'opacity-0'
														)}
														onClick={() => { setActiveTab('main'); setHasLeftProfileTab(true); switchToFull(); }}
													>
														Auto
													</Button>
													<Button
														ref={manualModeButtonRef}
														variant="ghost"
														type="button"
														onMouseEnter={() => setHoveredModeKey('manual')}
														style={{ transition: `opacity ${modePreviewAnimatedTransition}` }}
														className={cn(
															'!p-0 h-fit !m-0 text-[13px] font-inter font-semibold bg-transparent z-20 text-black transition-opacity',
															!forceDesktop && 'max-[480px]:text-[14px]',
															isModePreviewingOther && selectedModeKey === 'manual' && 'opacity-0'
														)}
														onClick={() => { setActiveTab('main'); setHasLeftProfileTab(true); switchToManual(); }}
													>
														Manual
													</Button>
													<Button
														ref={hybridModeButtonRef}
														variant="ghost"
														type="button"
														onMouseEnter={() => setHoveredModeKey('hybrid')}
														style={{ transition: `opacity ${modePreviewAnimatedTransition}` }}
														className={cn(
															'!p-0 h-fit !m-0 text-[13px] font-inter font-semibold bg-transparent z-20 text-black transition-opacity',
															!forceDesktop && 'max-[480px]:text-[14px]',
															isModePreviewingOther && selectedModeKey === 'hybrid' && 'opacity-0'
														)}
														onClick={() => { setActiveTab('main'); setHasLeftProfileTab(true); switchToHybrid(); }}
													>
														Hybrid
													</Button>
												</div>
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
										{activeTab !== 'profile' &&
											selectedModeKey !== 'manual' &&
											selectedModeKey !== 'hybrid' && (
											<div className="flex flex-col items-center pt-[38px] max-[480px]:pt-[38px]">
												<FormField
													control={form.control}
													name="subject"
													rules={{ required: form.watch('isAiSubject') }}
													render={({ field }) => (
														<FormItem
															className={cn(
																showTestPreview
																	? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.33vw]')
																	: cn(!forceDesktop ? 'w-[89.33vw]' : 'w-[468px]', 'max-w-[468px]'),
																// Remove default margin to control spacing to content below
																'mb-0'
															)}
														>
															<FormControl>
																{form.watch('isAiSubject') ? (
																	// Compact bar that expands to full width on hover when auto mode is on
																	<div className="flex items-center">
																		<div
																			className={cn(
																				// Default: only the 110px Subject box is hoverable (so it doesn't expand from the right-side area).
																				// On hover: expand to full width so the user can interact with the expanded controls.
																				'relative group/subject peer/subject w-[110px] hover:w-full transition-none'
																			)}
																		>
																			{/* Collapsed state - shown by default, hidden on hover */}
																			<div className="flex items-center group-hover/subject:hidden">
																				<div
																					className={cn(
																						cn(
																							'flex items-center justify-center h-[31px] rounded-[8px] border-2 border-black overflow-hidden subject-bar w-[110px]',
																							!forceDesktop && 'max-[480px]:h-[24px]'
																						)
																					)}
																					style={{ backgroundColor: '#E0E0E0' }}
																				>
																					<span className="font-inter font-medium text-[18px] max-[480px]:text-[12px] whitespace-nowrap text-black subject-label">
																						Subject
																					</span>
																				</div>
																			</div>
																			{/* Expanded state - hidden by default, shown on hover */}
																			<div
																				className={cn(
																					cn(
																						'hidden group-hover/subject:flex items-center h-[31px] rounded-[8px] border-2 border-black overflow-hidden subject-bar bg-white w-full',
																						!forceDesktop && 'max-[480px]:h-[24px]'
																					)
																				)}
																			>
																				<div
																					className={cn(
																						'pl-2 flex items-center h-full shrink-0 w-[130px]',
																						'bg-[#E0E0E0]'
																					)}
																				>
																					<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black subject-label">
																						Auto Subject
																					</span>
																				</div>

																			<button
																				type="button"
																				data-hover-description="click to disable automatic drafting for this and write your own"
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
																					'w-[55px] px-2 justify-center text-black bg-[#91E193] hover:bg-[#91E193] active:bg-[#91E193]',
																					isHandwrittenMode && 'opacity-50 cursor-not-allowed'
																				)}
																			>
																				<span className="absolute left-0 h-full border-l-2 border-[#000000]"></span>
																				<span>on</span>
																				<span className="absolute right-0 h-full border-r-2 border-[#000000]"></span>
																			</button>

																			<div className={cn('flex-grow h-full', 'bg-[#F0F0F0]')}>
																				<Input
																					{...field}
																					className={cn(
																						cn('w-full h-full !bg-transparent pl-4 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0', !forceDesktop && 'max-[480px]:placeholder:text-[10px] max-[480px]:!transition-none max-[480px]:!duration-0'),
																						'!text-black placeholder:!text-[#9E9E9E]',
																						'max-[480px]:pl-2'
																					)}
																					placeholder="Write manual subject here"
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
																	</div>

																		{/* Right-side hover zone (where "Auto" used to be).
																		    - Does NOT trigger expansion.
																		    - Reveals "AUTO" only while hovering this area. */}
																		<div
																			aria-hidden="true"
																			className={cn(
																				'group/subject-auto flex items-center pl-2 w-[52px] h-[31px] shrink-0 select-none peer-hover/subject:hidden',
																				!forceDesktop && 'max-[480px]:h-[24px]'
																			)}
																		>
																			<span className="font-inter font-normal text-[13px] text-[#000000] opacity-0 group-hover/subject-auto:opacity-100 transition-opacity">
																				AUTO
																			</span>
																		</div>
																	</div>
																) : (
																	// Auto OFF: expand downward (matches the signature manual box pattern)
																	<div className="w-full h-[97px] rounded-[8px] border-2 border-black overflow-hidden flex flex-col">
																		{/* Header row */}
																		<div className="flex items-center h-[31px] shrink-0 bg-[#8DDF90]">
																			<div className="pl-2 flex items-center h-full shrink-0 w-[120px] bg-[#8DDF90]">
																				<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black subject-label">
																					Subject
																				</span>
																			</div>

																			<button
																				type="button"
																				data-hover-description="Turn back on automated drafting for here"
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
																					'w-[80px] px-2 justify-center text-black bg-[#DADAFC] hover:bg-[#C4C4F5] active:bg-[#B0B0E8]',
																					isHandwrittenMode && 'opacity-50 cursor-not-allowed'
																				)}
																			>
																				<span className="absolute left-0 h-full border-l-2 border-black"></span>
																				<span>Auto off</span>
																				<span className="absolute right-0 h-full border-r-2 border-black"></span>
																			</button>

																			<div className="flex-grow h-full bg-[#8DDF90]" />
																		</div>
																		{/* Divider line */}
																		<div className="w-full h-[2px] bg-black shrink-0" />
																		{/* Text entry area */}
																		<div className="flex-1 bg-white">
																			<Textarea
																				{...field}
																				className={cn(
																					'w-full h-full !bg-transparent px-3 py-2 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none',
																					shouldShowSubjectRedStyling
																						? '!text-[#A20000] placeholder:!text-[#A20000]'
																						: '!text-black placeholder:!text-black',
																					'max-[480px]:px-2 max-[480px]:py-1'
																				)}
																				placeholder="Write manual subject here"
																				onKeyDown={(e) => {
																					// Prevent Enter from creating new lines (email subjects don't support newlines)
																					if (e.key === 'Enter') e.preventDefault();
																				}}
																				onFocus={(e) => trackFocusedField?.('subject', e.target)}
																				onBlur={() => {
																					setHasSubjectBeenTouched(true);
																					field.onBlur();
																				}}
																				onChange={(e) => {
																					if (e.target.value) setHasSubjectBeenTouched(true);
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
										'flex-1 min-h-0 flex flex-col hide-native-scrollbar relative',
										props.clipProfileTabOverflow && activeTab === 'profile'
											? 'overflow-y-hidden'
											: 'overflow-y-auto',
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
											{/* Body container (380px tall) - positioned 64px below the score line */}
											<div className="flex-1 bg-[#92CE94] relative flex flex-col">
												{/* Green top space box (122 x 34) */}
												<div
													aria-hidden="true"
													className="absolute left-[15px] top-[14px] w-[122px] h-[34px] rounded-[8px] border-2 border-black bg-[#84CB86]"
												/>
												<div className="w-full mt-[64px]">
													<div
														className={cn(
															'relative w-full bg-[#4597DA] border-t-[3px] border-b-[3px] border-black rounded-[8px] overflow-hidden flex flex-col',
															expandedProfileBox ? 'h-[414px]' : 'h-[380px]'
														)}
													>
														{/* Header band (30px fill + 3px divider) */}
														<div className="shrink-0 h-[33px] bg-[#95CFFF] border-b-[3px] border-black flex items-center">
															<span className="pl-4 font-inter font-semibold text-[15px] leading-none text-black">
																Body
															</span>
															{/* Right controls: divider @ 138px from right, "Clear all" segment (89px), divider @ 49px from right */}
															<div className="ml-auto flex items-stretch h-full">
																<button
																	type="button"
																	onClick={handleClearAllProfileFields}
																	className="w-[89px] shrink-0 h-full bg-[#58A6E5] border-l-[3px] border-black flex items-center justify-center font-inter font-semibold text-[13px] leading-none text-black cursor-pointer p-0 border-0 focus:outline-none focus-visible:outline-none"
																>
																	Clear all
																</button>
																<div className="w-[49px] shrink-0 border-l-[3px] border-black" />
															</div>
														</div>

														{/* Top-right "-" button (positioned in the main Body area, not the header strip) */}
														<button
															type="button"
															aria-label="Back to Auto"
															onClick={() => {
																setActiveTab('main');
																setHasLeftProfileTab(true);
																switchToFull();
															}}
															className="absolute right-[14px] top-[43px] w-[15px] h-[2px] bg-black cursor-pointer p-0 border-0 focus:outline-none"
														/>

														{/* Profile fields live inside the 380px Body container */}
														<div className="flex-1 min-h-0 overflow-y-auto hide-native-scrollbar">
															<div className="px-3 pt-[14px] pb-[14px] flex flex-col gap-[18px]">
																<div
																	ref={
																		expandedProfileBox === 'name'
																			? expandedProfileBoxRef
																			: undefined
																	}
																	className={cn(
																		'w-[413px] max-w-full mx-auto flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden',
																		expandedProfileBox === 'name' ? 'h-[68px]' : 'h-[34px]'
																	)}
																	onClick={() => handleProfileBoxToggle('name')}
																>
																	<div
																		className="h-[34px] flex items-center font-inter text-[14px] font-semibold overflow-hidden"
																		style={{ backgroundColor: getProfileHeaderBg('name') }}
																	>
																		{expandedProfileBox !== 'name' &&
																		profileFields.name.trim() ? (
																			<div className="flex items-stretch w-full h-full">
																				<div className="w-[20px] shrink-0" />
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-0 max-w-[calc(100%_-_46px)] bg-[#E5EEE6] h-full flex items-center px-4">
																					<span className="truncate">
																						{profileFields.name.trim()}
																					</span>
																				</div>
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-[20px] flex-1" />
																			</div>
																		) : (
																			<div className="w-full px-3 truncate">
																				{getProfileHeaderText(
																					'name',
																					'Name',
																					'Enter your Name'
																				)}
																			</div>
																		)}
																	</div>
																	{expandedProfileBox === 'name' && (
																		<input
																			type="text"
																			className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
																			value={profileFields.name}
																			onChange={(e) =>
																				setProfileFields({
																					...profileFields,
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
																			placeholder=""
																			autoFocus
																		/>
																	)}
																</div>

																<div
																	ref={
																		expandedProfileBox === 'genre'
																			? expandedProfileBoxRef
																			: undefined
																	}
																	className={cn(
																		'w-[413px] max-w-full mx-auto flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden',
																		expandedProfileBox === 'genre' ? 'h-[68px]' : 'h-[34px]'
																	)}
																	onClick={() => handleProfileBoxToggle('genre')}
																>
																	<div
																		className="h-[34px] flex items-center font-inter text-[14px] font-semibold overflow-hidden"
																		style={{ backgroundColor: getProfileHeaderBg('genre') }}
																	>
																		{expandedProfileBox !== 'genre' &&
																		profileFields.genre.trim() ? (
																			<div className="flex items-stretch w-full h-full">
																				<div className="w-[20px] shrink-0" />
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-0 max-w-[calc(100%_-_46px)] bg-[#E5EEE6] h-full flex items-center px-4">
																					<span className="truncate">
																						{profileFields.genre.trim()}
																					</span>
																				</div>
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-[20px] flex-1" />
																			</div>
																		) : (
																			<div className="w-full px-3 truncate">
																				{getProfileHeaderText(
																					'genre',
																					'Genre',
																					'Enter your Genre'
																				)}
																			</div>
																		)}
																	</div>
																	{expandedProfileBox === 'genre' && (
																		<input
																			type="text"
																			className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
																			value={profileFields.genre}
																			onChange={(e) =>
																				setProfileFields({
																					...profileFields,
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
																			placeholder=""
																			autoFocus
																		/>
																	)}
																</div>

																<div
																	ref={
																		expandedProfileBox === 'area'
																			? expandedProfileBoxRef
																			: undefined
																	}
																	className={cn(
																		'w-[413px] max-w-full mx-auto flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden',
																		expandedProfileBox === 'area' ? 'h-[68px]' : 'h-[34px]'
																	)}
																	onClick={() => handleProfileBoxToggle('area')}
																>
																	<div
																		className="h-[34px] flex items-center font-inter text-[14px] font-semibold overflow-hidden"
																		style={{ backgroundColor: getProfileHeaderBg('area') }}
																	>
																		{expandedProfileBox !== 'area' &&
																		profileFields.area.trim() ? (
																			<div className="flex items-stretch w-full h-full">
																				<div className="w-[20px] shrink-0" />
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-0 max-w-[calc(100%_-_46px)] bg-[#E5EEE6] h-full flex items-center px-4">
																					<span className="truncate">
																						{profileFields.area.trim()}
																					</span>
																				</div>
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-[20px] flex-1" />
																			</div>
																		) : (
																			<div className="w-full px-3 truncate">
																				{getProfileHeaderText(
																					'area',
																					'Area',
																					'Enter your Area'
																				)}
																			</div>
																		)}
																	</div>
																	{expandedProfileBox === 'area' && (
																		<input
																			type="text"
																			className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
																			value={profileFields.area}
																			onChange={(e) =>
																				setProfileFields({
																					...profileFields,
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
																			placeholder=""
																			autoFocus
																		/>
																	)}
																</div>

																<div
																	ref={
																		expandedProfileBox === 'band'
																			? expandedProfileBoxRef
																			: undefined
																	}
																	className={cn(
																		'w-[413px] max-w-full mx-auto flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden',
																		expandedProfileBox === 'band' ? 'h-[68px]' : 'h-[34px]'
																	)}
																	onClick={() => handleProfileBoxToggle('band')}
																>
																	<div
																		className="h-[34px] flex items-center font-inter text-[14px] font-semibold overflow-hidden"
																		style={{ backgroundColor: getProfileHeaderBg('band') }}
																	>
																		{expandedProfileBox !== 'band' &&
																		profileFields.band.trim() ? (
																			<div className="flex items-stretch w-full h-full">
																				<div className="w-[20px] shrink-0" />
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-0 max-w-[calc(100%_-_46px)] bg-[#E5EEE6] h-full flex items-center px-4">
																					<span className="truncate">
																						{profileFields.band.trim()}
																					</span>
																				</div>
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-[20px] flex-1" />
																			</div>
																		) : (
																			<div className="w-full px-3 truncate">
																				{getProfileHeaderText(
																					'band',
																					'Band/Artist Name',
																					'Enter your Band/Artist Name'
																				)}
																			</div>
																		)}
																	</div>
																	{expandedProfileBox === 'band' && (
																		<input
																			type="text"
																			className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
																			value={profileFields.band}
																			onChange={(e) =>
																				setProfileFields({
																					...profileFields,
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
																			placeholder=""
																			autoFocus
																		/>
																	)}
																</div>

																<div
																	ref={
																		expandedProfileBox === 'bio'
																			? expandedProfileBoxRef
																			: undefined
																	}
																	className={cn(
																		'w-[413px] max-w-full mx-auto flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden',
																		expandedProfileBox === 'bio' ? 'h-[68px]' : 'h-[34px]'
																	)}
																	onClick={() => handleProfileBoxToggle('bio')}
																>
																	<div
																		className="h-[34px] flex items-center font-inter text-[14px] font-semibold overflow-hidden"
																		style={{ backgroundColor: getProfileHeaderBg('bio') }}
																	>
																		{expandedProfileBox !== 'bio' &&
																		profileFields.bio.trim() ? (
																			<div className="flex items-stretch w-full h-full">
																				<div className="w-[20px] shrink-0" />
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-0 max-w-[calc(100%_-_46px)] bg-[#E5EEE6] h-full flex items-center px-4">
																					<span className="truncate">
																						{profileFields.bio.trim()}
																					</span>
																				</div>
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-[20px] flex-1" />
																			</div>
																		) : (
																			<div className="w-full px-3 truncate">
																				{getProfileHeaderText('bio', 'Bio', 'Enter your Bio')}
																			</div>
																		)}
																	</div>
																	{expandedProfileBox === 'bio' && (
																		<input
																			type="text"
																			className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
																			value={profileFields.bio}
																			onChange={(e) =>
																				setProfileFields({
																					...profileFields,
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
																			placeholder=""
																			autoFocus
																		/>
																	)}
																</div>

																<div
																	ref={
																		expandedProfileBox === 'links'
																			? expandedProfileBoxRef
																			: undefined
																	}
																	className={cn(
																		'w-[413px] max-w-full mx-auto flex flex-col rounded-[8px] border-[3px] border-black cursor-pointer overflow-hidden',
																		expandedProfileBox === 'links' ? 'h-[68px]' : 'h-[34px]'
																	)}
																	onClick={() => handleProfileBoxToggle('links')}
																>
																	<div
																		className="h-[34px] flex items-center font-inter text-[14px] font-semibold overflow-hidden"
																		style={{ backgroundColor: getProfileHeaderBg('links') }}
																	>
																		{expandedProfileBox !== 'links' &&
																		profileFields.links.trim() ? (
																			<div className="flex items-stretch w-full h-full">
																				<div className="w-[20px] shrink-0" />
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-0 max-w-[calc(100%_-_46px)] bg-[#E5EEE6] h-full flex items-center px-4">
																					<span className="truncate">
																						{profileFields.links.trim()}
																					</span>
																				</div>
																				<div className="w-[3px] bg-black" />
																				<div className="min-w-[20px] flex-1" />
																			</div>
																		) : (
																			<div className="w-full px-3 truncate">
																				{getProfileHeaderText(
																					'links',
																					'Links',
																					'Enter your Links'
																				)}
																			</div>
																		)}
																	</div>
																	{expandedProfileBox === 'links' && (
																		<input
																			type="text"
																			className="h-[34px] bg-white px-3 font-inter text-[14px] outline-none border-0"
																			value={profileFields.links}
																			onChange={(e) =>
																				setProfileFields({
																					...profileFields,
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
																			placeholder=""
																			autoFocus
																		/>
																	)}
																</div>
															</div>
														</div>

														{/* Bottom band (3px divider + 10px fill) */}
														<div className="shrink-0 h-[13px] bg-[#58A6E5] border-t-[3px] border-black" />
													</div>
												</div>

												{/* New containers below Body box */}
												<div className="w-full flex flex-col items-center mt-[9px]">
													{/* 472 x 93 container */}
													<div className="relative w-[472px] h-[93px] max-w-full rounded-[8px] bg-[#84CB86] border-2 border-black">
														{/* Decorative inner boxes (no fill) */}
														<div
															aria-hidden="true"
															className="pointer-events-none absolute left-[12px] top-[15px] w-[203px] h-[28px] rounded-[8px] border-2 border-black z-0"
														/>
														<div
															aria-hidden="true"
															className="pointer-events-none absolute left-[12px] top-[56px] w-[160px] h-[25px] rounded-[8px] border-2 border-black z-0"
														/>
														{/* Inner content wrapper: flush to top + centered (matches mock) */}
														{/* Note: offset upward by the container border width so borders overlap (prevents “double line”). */}
														<div className="absolute -top-[2px] left-1/2 -translate-x-1/2 flex flex-col items-center w-full z-10">
															<button
																type="button"
																onClick={() => {
																	setActiveTab('main');
																	setHasLeftProfileTab(true);
																}}
																className="w-[298px] h-[26px] rounded-[6px] bg-[#B1B1B1] hover:bg-[#A7A7A7] active:bg-[#A1A1A1] transition-colors duration-150 border-2 border-black text-white font-inter font-medium text-[15px] leading-none flex items-center justify-center cursor-pointer"
															>
																back
															</button>
															{/* next prompt: we'll add the smaller inner boxes here */}
														</div>
													</div>

													{/* 229 x 34 box, 13px below the 472 x 93 container */}
													{!props.hideProfileBottomMiniBox && (
														<div className="w-[472px] max-w-full mt-[13px]">
															<div
																aria-hidden="true"
																className="w-[229px] h-[34px] rounded-[8px] bg-[#84CB86] border-2 border-black"
															/>
														</div>
													)}
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
										{selectedModeKey === 'manual' && (
											<div
												className={cn(
													'w-[468px] h-[623px] bg-white border-[3px] border-[#0B5C0D] rounded-[8px] flex flex-col',
													!forceDesktop && 'max-[480px]:w-[89.33vw]'
												)}
												style={{
													overflow: 'visible',
													...(props.manualEntryHeightPx != null
														? { height: props.manualEntryHeightPx }
														: {}),
												}}
												data-hpi-manual-entry
											>
												{/* Header wrapper clips the top corners cleanly while preserving overflow-visible for popovers */}
												<div className="bg-white overflow-hidden rounded-t-[5px]">
													{/* Subject (inside the unified manual box) */}
													<div className="min-h-[39px] flex items-start px-3 py-2 bg-white cursor-text">
														<FormField
															control={form.control}
															name="subject"
															rules={{ required: form.watch('isAiSubject') }}
															render={({ field }) => (
																<FormItem className="flex-1 mb-0">
																	<FormControl>
																		<Textarea
																			{...field}
																			className={cn(
																				// Auto-expanding textarea for subject (up to 4 lines)
																				'w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 !bg-transparent p-0 min-h-[20px] leading-[20px] resize-none overflow-hidden',
																				// Subject spec: Inter semi-bold, 16px (placeholder + typed text).
																				'font-inter font-semibold text-[16px] md:text-[16px] placeholder:font-semibold placeholder:text-[16px] placeholder:opacity-100',
																				shouldShowSubjectRedStyling
																					? '!text-[#A20000] placeholder:text-[#A20000] focus:placeholder:text-[#A20000]'
																					: '!text-black placeholder:text-black focus:placeholder:text-gray-400'
																			)}
																			style={{ maxHeight: '80px' }} // 4 lines max (20px * 4)
																			placeholder="Subject"
																			rows={1}
																			onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
																				const target = e.currentTarget;
																				target.style.height = 'auto';
																				// Limit to 4 lines (80px)
																				target.style.height = Math.min(target.scrollHeight, 80) + 'px';
																			}}
																			onKeyDown={(e) => {
																				// Prevent Enter from creating new lines (email subjects don't support newlines)
																				if (e.key === 'Enter') {
																					e.preventDefault();
																				}
																			}}
																			onFocus={(e) =>
																				trackFocusedField?.(
																					'subject',
																					e.target as HTMLTextAreaElement
																				)
																			}
																			onBlur={() => {
																				setHasSubjectBeenTouched(true);
																				field.onBlur();
																			}}
																			onChange={(e) => {
																				if (e.target.value) setHasSubjectBeenTouched(true);
																				field.onChange(e);
																			}}
																		/>
																	</FormControl>
																</FormItem>
															)}
														/>
													</div>
													{/* Subject divider line (full width) */}
													<div className="px-0 bg-white">
														<div className="w-full h-[2px] bg-[#AFAFAF]" />
													</div>
												</div>

												{/* Body (single editor for Manual - no separate signature) */}
												<div className="flex-1 min-h-0 bg-white px-3 py-2 relative">
													{/* Tailwind preflight strips list markers; re-enable bullets/numbering inside the manual editor */}
													<style>{`
														[data-hpi-manual-body-editor] ul {
															list-style: disc;
															padding-left: 1.25rem;
															margin: 0.5rem 0;
														}
														[data-hpi-manual-body-editor] ol {
															list-style: decimal;
															padding-left: 1.25rem;
															margin: 0.5rem 0;
														}
														[data-hpi-manual-body-editor] li {
															margin: 0.125rem 0;
														}
														[data-hpi-manual-body-editor] a {
															color: #0066cc;
															text-decoration: underline;
															cursor: pointer;
														}
														[data-hpi-manual-body-editor] a:hover {
															color: #0052a3;
														}
													`}</style>
													<div
														ref={manualBodyEditorRef}
														contentEditable
														suppressContentEditableWarning
														data-hpi-manual-body-editor
														className={cn(
															'absolute inset-0 resize-none border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
															'bg-white px-3 py-2 font-inter text-black',
															'overflow-y-auto'
														)}
														style={{
															fontFamily: form.watch('font') || 'Arial',
															fontSize: `${form.watch('fontSize') || DEFAULT_FONT_SIZE}px`,
															lineHeight: '1.4',
														}}
														onFocus={(e) =>
															trackFocusedField?.('hybridBlockPrompts.0.value', e.target as unknown as HTMLTextAreaElement)
														}
														onBlur={() => {
															// Sync contentEditable HTML back to form (with banned fill-ins removed)
															const rawHtml = manualBodyEditorRef.current?.innerHTML || '';
															const html = sanitizeBannedFillIns(rawHtml);
															// Update the editor if content was sanitized
															if (html !== rawHtml && manualBodyEditorRef.current) {
																manualBodyEditorRef.current.innerHTML = html;
															}
															form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });
														}}
														onInput={() => {
															// Sync contentEditable HTML to form on every input (with banned fill-ins removed)
															const rawHtml = manualBodyEditorRef.current?.innerHTML || '';
															const html = sanitizeBannedFillIns(rawHtml);
															// Update the editor if content was sanitized
															if (html !== rawHtml && manualBodyEditorRef.current) {
															manualBodyEditorRef.current.innerHTML = html;
															// Try to restore cursor (simplified - goes to end if complex)
															try {
																const selection = window.getSelection();
																const range = document.createRange();
																range.selectNodeContents(manualBodyEditorRef.current);
																range.collapse(false);
																selection?.removeAllRanges();
																selection?.addRange(range);
															} catch {}
															}
															form.setValue('hybridBlockPrompts.0.value', html, { shouldDirty: true });
														}}
														onClick={(e) => {
															// Allow clicking links with Ctrl/Cmd key
															const target = e.target as HTMLElement;
															if (target.tagName === 'A' && (e.ctrlKey || e.metaKey)) {
																e.preventDefault();
																const href = target.getAttribute('href');
																if (href) {
																	window.open(href, '_blank', 'noopener,noreferrer');
																}
															}
														}}
													/>
													
													{/* Link popover */}
													{isLinkPopoverOpen && linkPopoverPosition && (
														<div
															ref={linkPopoverRef}
															className="absolute z-[9999] bg-[#E0E0E0] rounded-[8px] p-3 w-[280px]"
															style={{
																top: linkPopoverPosition.top,
																left: Math.min(linkPopoverPosition.left, 150),
															}}
														>
															<div className="flex items-center gap-2">
																{/* Input fields column */}
																<div className="flex-1 flex flex-col gap-2">
																	{/* Text input */}
																	<input
																		type="text"
																		value={linkText}
																		onChange={(e) => setLinkText(e.target.value)}
																		placeholder="Text"
																		className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400 font-inter"
																	/>
																	
																	{/* URL input */}
																	<input
																		type="text"
																		value={linkUrl}
																		onChange={(e) => setLinkUrl(e.target.value)}
																		placeholder="Type or paste a link"
																		className="w-full px-2 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:border-gray-400 font-inter"
																		onKeyDown={(e) => {
																			if (e.key === 'Enter') {
																				e.preventDefault();
																				applyLink();
																			}
																		}}
																	/>
																</div>
																
																{/* Apply button - vertically centered on the right */}
																<button
																	type="button"
																	onClick={applyLink}
																	disabled={!linkUrl.trim()}
																	className={cn(
																		"px-3 py-1.5 text-sm font-inter font-medium rounded transition-colors self-center",
																		linkUrl.trim()
																			? "text-gray-700 hover:bg-gray-100 cursor-pointer"
																			: "text-gray-400 cursor-not-allowed"
																	)}
																>
																	Apply
																</button>
															</div>
														</div>
													)}
												</div>

												{/* Bottom action box */}
												<div className="flex justify-center mb-[18px] flex-shrink-0 overflow-visible">
											<div
												className="w-[430px] h-[32px] rounded-[16px] bg-[#DDE6F5] relative flex items-center overflow-visible"
												style={{ backgroundColor: '#DDE6F5' }}
											>
												{/* Left section (Font) - custom dropdown to avoid Radix zoom issues */}
												<div 
													ref={fontDropdownRef}
													className="w-[109px] h-full flex items-center pl-[16px] pr-0 relative"
												>
													{/* Custom font trigger button */}
													<button
														type="button"
														onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
														className={cn(
															'w-full h-full flex items-center',
															'bg-transparent border-0 shadow-none rounded-none',
															'px-0 py-0 relative cursor-pointer',
															'font-inter font-normal text-[14px] leading-none text-black',
															'hover:bg-transparent focus:bg-transparent focus:outline-none'
														)}
														style={{
															fontFamily: form.watch('font') || DEFAULT_FONT,
														}}
														aria-label="Font"
														aria-expanded={isFontDropdownOpen}
													>
	<div
		className="flex-1 flex items-center justify-center min-w-0 overflow-hidden pr-[24px] whitespace-nowrap text-center"
		style={{
			maskImage: 'linear-gradient(to right, black 50%, transparent 85%)',
			WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 85%)',
		}}
	>
		<span>
			{(() => {
				const currentFont = form.watch('font') || DEFAULT_FONT;
				if (currentFont === 'Arial') return 'Sans Serif';
				if (currentFont === 'serif') return 'Serif';
				if (currentFont === 'Courier New') return 'Fixed Width';
				if (currentFont === 'Arial Black') return 'Wide';
				if (currentFont === 'Arial Narrow') return 'Narrow';
				return currentFont;
			})()}
		</span>
	</div>
														<FontDropdownArrow className="!block pointer-events-none absolute right-[7px] bottom-[11px] !w-[8px] !h-[5px]" />
													</button>
													
													{/* Custom dropdown menu */}
													{isFontDropdownOpen && (
														<div
															id="font-dropdown-scroll-wrapper"
															className={cn(
																'absolute w-[119px] overflow-visible',
																'rounded-[8px] bg-[#E0E0E0]',
																'z-[9999]'
															)}
															style={{
																left: '0px',
																bottom: 'calc(100% + 8px)',
																height: '161px',
															}}
														>
															<style>{`
																#font-dropdown-scroll-wrapper *::-webkit-scrollbar {
																	display: none !important;
																	width: 0 !important;
																	height: 0 !important;
																	background: transparent !important;
																}
																#font-dropdown-scroll-wrapper * {
																	-ms-overflow-style: none !important;
																	scrollbar-width: none !important;
																}
															`}</style>
															<CustomScrollbar
																className="w-full h-full"
																thumbColor="#000000"
																thumbWidth={2}
																offsetRight={-6}
															>
																{FONT_OPTIONS.map((font) => {
																	const label =
																		font === 'Arial'
																			? 'Sans Serif'
																			: font === 'serif'
																			? 'Serif'
																			: font === 'Courier New'
																			? 'Fixed Width'
																			: font === 'Arial Black'
																			? 'Wide'
																			: font === 'Arial Narrow'
																			? 'Narrow'
																			: font;
																	const isSelected = (form.watch('font') || DEFAULT_FONT) === font;
																	return (
																		<button
																			key={font}
																			type="button"
																			onClick={() => {
																				form.setValue('font', font as DraftingFormValues['font'], {
																					shouldDirty: true,
																				});
																				setIsFontDropdownOpen(false);
																			}}
																			className={cn(
																				'w-full px-2 py-1.5 text-left text-[12px] leading-none',
																				'hover:bg-gray-300 cursor-pointer',
																				isSelected && 'bg-gray-300/60'
																			)}
																			style={{ fontFamily: font }}
																		>
																			<span>{label}</span>
																		</button>
																	);
																})}
															</CustomScrollbar>
														</div>
													)}
												</div>

												{/* Divider (109px from left, 23px tall) */}
												<div
													aria-hidden="true"
													className="absolute left-[109px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
												/>

												{/* Font size dropdown */}
												<div 
													ref={fontSizeDropdownRef}
													className="absolute left-[111px] top-0 bottom-0 w-[40px] flex items-center justify-center"
												>
													<button
														type="button"
														onClick={() => setIsFontSizeDropdownOpen(!isFontSizeDropdownOpen)}
														className={cn(
															'w-full h-full flex items-center justify-center gap-[5px]',
															'bg-transparent border-0 shadow-none rounded-none',
															'px-0 py-0 cursor-pointer',
															'hover:bg-transparent focus:bg-transparent focus:outline-none'
														)}
														aria-label="Font Size"
														aria-expanded={isFontSizeDropdownOpen}
													>
														<FontSizeIcon width={12} height={12} />
														<FontDropdownArrow className="!block pointer-events-none !w-[8px] !h-[5px] relative top-[1px]" />
													</button>
													
													{/* Font size dropdown menu */}
													{isFontSizeDropdownOpen && (
														<div
															id="font-size-dropdown-scroll-wrapper"
															className={cn(
																'absolute w-[50px] overflow-visible',
																'rounded-[8px] bg-[#E0E0E0]',
																'z-[9999]'
															)}
															style={{
																left: '50%',
																transform: 'translateX(-50%)',
																bottom: 'calc(100% + 8px)',
																height: '161px',
															}}
														>
															<style>{`
																#font-size-dropdown-scroll-wrapper *::-webkit-scrollbar {
																	display: none !important;
																	width: 0 !important;
																	height: 0 !important;
																	background: transparent !important;
																}
																#font-size-dropdown-scroll-wrapper * {
																	-ms-overflow-style: none !important;
																	scrollbar-width: none !important;
																}
															`}</style>
															<CustomScrollbar
																className="w-full h-full"
																thumbColor="#000000"
																thumbWidth={2}
																offsetRight={-6}
															>
																{FONT_SIZE_OPTIONS.map((size) => {
																	const currentSize = form.watch('fontSize') || DEFAULT_FONT_SIZE;
																	const isSelected = currentSize === size;
																	return (
																		<button
																			key={size}
																			type="button"
																			onClick={() => {
																				form.setValue('fontSize', size, {
																					shouldDirty: true,
																				});
																				setIsFontSizeDropdownOpen(false);
																			}}
																			className={cn(
																				'w-full px-2 py-1.5 text-center text-[12px] leading-none',
																				'hover:bg-gray-300 cursor-pointer',
																				isSelected && 'bg-gray-300/60 font-semibold'
																			)}
																		>
																			<span>{size}</span>
																		</button>
																	);
																})}
															</CustomScrollbar>
														</div>
													)}
												</div>

												{/* Second divider */}
												<div
													aria-hidden="true"
													className="absolute left-[151px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
												/>

												{/* Bold icon */}
												<button
													type="button"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => applyManualFormatting('bold')}
													className={cn(
														"absolute left-[159px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]",
														activeFormatting.bold
															? "bg-[#B8C8E0]"
															: "hover:bg-[#C5D3E8]"
													)}
													aria-label="Bold"
												>
													<BoldIcon width={8} height={11} />
												</button>

												{/* Italic icon */}
												<button
													type="button"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => applyManualFormatting('italic')}
													className={cn(
														"absolute left-[183px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]",
														activeFormatting.italic
															? "bg-[#B8C8E0]"
															: "hover:bg-[#C5D3E8]"
													)}
													aria-label="Italic"
												>
													<ItalicIcon width={4} height={11} />
												</button>

												{/* Underline icon - top aligned with B/I, underline extends below */}
												<button
													type="button"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => applyManualFormatting('underline')}
													className={cn(
														"absolute left-[207px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]",
														activeFormatting.underline
															? "bg-[#B8C8E0]"
															: "hover:bg-[#C5D3E8]"
													)}
													aria-label="Underline"
												>
													<UnderlineIcon width={11} height={14} />
												</button>

												{/* Bullet list icon */}
												<button
													type="button"
													onMouseDown={(e) => e.preventDefault()}
													onClick={() => applyManualFormatting('insertUnorderedList')}
													className={cn(
														"absolute left-[236px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]",
														activeFormatting.bulletList
															? "bg-[#B8C8E0]"
															: "hover:bg-[#C5D3E8]"
													)}
													aria-label="Bullet list"
												>
													<BulletListIcon width={15} height={11} />
												</button>

												{/* Text + background color picker */}
												<div
													ref={colorPickerRef}
													className="absolute left-[260px] top-[4px] w-[32px] h-[24px] flex items-center justify-center"
												>
													<button
														type="button"
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															// avoid overlapping dropdowns
															setIsFontDropdownOpen(false);
															setIsFontSizeDropdownOpen(false);
															setIsColorPickerOpen((v) => !v);
														}}
														className={cn(
															"w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]",
															isColorPickerOpen ? "bg-[#B8C8E0]" : "hover:bg-[#C5D3E8]"
														)}
														aria-label="Text & background color"
														aria-expanded={isColorPickerOpen}
													>
														<TextColorIcon width={11} height={14} />
													</button>

													{isColorPickerOpen && (
														<div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[9999]">
															<div className="flex gap-6 rounded-[8px] bg-[#E0E0E0] p-3">
																<div className="min-w-[150px]">
																	<div className="mb-2 text-[12px] font-inter font-medium text-black/80">
																		Background color
																	</div>
																	<div className="grid grid-cols-8 gap-[4px]">
																		{MANUAL_EDITOR_COLOR_SWATCHES.map((color) => (
																			(() => {
																				const isSelected =
																					(manualSelectedBgColor ?? '').toLowerCase() ===
																					color.toLowerCase();
																				return (
																			<button
																				key={`hpi-bg-${color}`}
																				type="button"
																				onMouseDown={(e) => e.preventDefault()}
																				onClick={() => applyManualColor('hiliteColor', color)}
																				className={cn(
																					"w-[14px] h-[14px] rounded-[2px] border border-black/10 hover:outline hover:outline-2 hover:outline-black/20",
																					isSelected &&
																						"ring-2 ring-black ring-offset-1 ring-offset-white border-transparent"
																				)}
																				style={{ backgroundColor: color }}
																				aria-label={`Background ${color}`}
																				aria-pressed={isSelected}
																			/>
																				);
																			})()
																		))}
																	</div>
																</div>

																<div className="min-w-[150px]">
																	<div className="mb-2 text-[12px] font-inter font-medium text-black/80">
																		Text color
																	</div>
																	<div className="grid grid-cols-8 gap-[4px]">
																		{MANUAL_EDITOR_COLOR_SWATCHES.map((color) => (
																			(() => {
																				const isSelected =
																					(manualSelectedTextColor ?? '').toLowerCase() ===
																					color.toLowerCase();
																				return (
																			<button
																				key={`hpi-text-${color}`}
																				type="button"
																				onMouseDown={(e) => e.preventDefault()}
																				onClick={() => applyManualColor('foreColor', color)}
																				className={cn(
																					"w-[14px] h-[14px] rounded-[2px] border border-black/10 hover:outline hover:outline-2 hover:outline-black/20",
																					isSelected &&
																						"ring-2 ring-black ring-offset-1 ring-offset-white border-transparent"
																				)}
																				style={{ backgroundColor: color }}
																				aria-label={`Text ${color}`}
																				aria-pressed={isSelected}
																			/>
																				);
																			})()
																		))}
																	</div>
																</div>
															</div>
														</div>
													)}
												</div>

												{/* Link icon button */}
												<button
													type="button"
													onMouseDown={(e) => e.preventDefault()}
													onClick={openLinkPopover}
													className={cn(
														"absolute left-[295px] top-[4px] w-[24px] h-[24px] flex items-center justify-center cursor-pointer transition-all rounded-[4px]",
														isLinkPopoverOpen
															? "bg-[#B8C8E0]"
															: "hover:bg-[#C5D3E8]"
													)}
													aria-label="Insert link"
												>
													<svg
														width={18}
														height={18}
														viewBox="0 0 23 23"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															d="M3.0751 14.325C2.3251 13.575 1.8001 12.45 1.8001 11.25C1.8001 10.05 2.2501 8.99996 3.0751 8.17496C3.9001 7.34996 4.9501 6.89996 6.1501 6.89996H9.0001C9.3001 6.89996 9.5251 7.12497 9.5251 7.42497C9.5251 7.72497 9.30011 7.94996 9.00011 7.94996L6.1501 7.94997C5.2501 7.94997 4.5001 8.24996 3.8251 8.92496C3.1501 9.59996 2.8501 10.35 2.8501 11.25C2.8501 13.05 4.3501 14.55 6.0751 14.475H8.9251C9.2251 14.475 9.4501 14.7 9.4501 15C9.4501 15.3 9.22511 15.525 8.92511 15.525L6.0751 15.525C4.9501 15.6 3.9001 15.15 3.0751 14.325Z"
															fill="#231815"
														/>
														<path
															d="M13.3503 15.45C13.2753 15.375 13.1253 15.225 13.1253 15.075C13.1253 14.775 13.3503 14.55 13.6503 14.55L16.5003 14.55C18.3003 14.55 19.7253 13.125 19.7253 11.325C19.7253 9.52499 18.3003 8.09999 16.5003 8.09999L13.6503 8.09999C13.3503 8.09999 13.1253 7.87499 13.1253 7.57499C13.1253 7.27499 13.3503 7.04999 13.6503 7.04999L16.5003 7.04999C18.9003 7.04999 20.7753 8.92499 20.7753 11.325C20.7753 13.725 18.9003 15.6 16.5003 15.6H13.6503C13.5003 15.6 13.4253 15.525 13.3503 15.45Z"
															fill="#231815"
														/>
														<path
															d="M5.70029 11.7C5.62529 11.625 5.47529 11.475 5.47529 11.325C5.47529 11.025 5.70029 10.8 6.00029 10.8L16.3503 10.8C16.6503 10.8 16.8753 11.025 16.8753 11.325C16.8753 11.625 16.6503 11.85 16.3503 11.85L6.00029 11.85C6.00029 11.85 5.85029 11.85 5.70029 11.7Z"
															fill="#231815"
														/>
													</svg>
												</button>

												{/* Third divider (102px from right edge) */}
												<div
													aria-hidden="true"
													className="absolute right-[102px] top-1/2 -translate-y-1/2 w-px h-[23px] bg-black"
												/>

												{/* Fill-ins section */}
												<div
													ref={fillInsDropdownRef}
													className="absolute right-[30px] top-0 h-full flex items-center"
												>
													<button
														type="button"
														onMouseDown={(e) => e.preventDefault()}
														onClick={() => {
															// Close other dropdowns
															setIsFontDropdownOpen(false);
															setIsFontSizeDropdownOpen(false);
															setIsColorPickerOpen(false);
															setIsFillInsDropdownOpen(!isFillInsDropdownOpen);
														}}
														className="flex items-center cursor-pointer bg-transparent border-0 p-0"
														aria-label="Fill-ins"
														aria-expanded={isFillInsDropdownOpen}
													>
														<span className="font-inter font-medium text-[14px] leading-none text-black">
															Fill-ins
														</span>
														<FontDropdownArrow className="!block pointer-events-none ml-[6px] !w-[8px] !h-[5px] relative top-[3px]" />
													</button>

													{/* Fill-ins dropdown menu */}
													{isFillInsDropdownOpen && (
														<div
															className={cn(
																'absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-[9999]',
																'rounded-[8px] bg-[#E0E0E0] py-1 min-w-[100px] shadow-md'
															)}
														>
															{FILL_IN_OPTIONS.map((option) => (
																<button
																	key={option}
																	type="button"
																	onMouseDown={(e) => e.preventDefault()}
																	onClick={() => insertFillIn(option)}
																	className={cn(
																		'w-full px-3 py-2 text-left text-[13px] font-inter',
																		'hover:bg-gray-300 cursor-pointer',
																		'text-black'
																	)}
																>
																	{option}
																</button>
															))}
														</div>
													)}
												</div>
											</div>
												</div>

											</div>
										)}

										{selectedModeKey === 'hybrid' && (
											<div className="w-full flex flex-col items-center mt-[14px]">
												{/* Profile box (collapsed 33px; expands to 110px) */}
												<div
													className={cn(
														cn('w-[448px]', !forceDesktop && 'max-w-[89.33vw]', 'rounded-[8px] border-2 border-black overflow-hidden flex flex-col'),
														isHybridProfileExpanded ? 'h-[110px]' : 'h-[33px]'
													)}
													data-hpi-hybrid-profile-bar
												>
													<button
														type="button"
														onClick={() => setIsHybridProfileExpanded((v) => !v)}
														className={cn(
															'w-full h-[33px] flex items-center px-3 bg-[#BCBCF2]',
															'font-inter font-semibold text-[14px] text-black text-left',
															isHybridProfileExpanded && 'border-b-2 border-black'
														)}
														style={{ backgroundColor: '#BCBCF2' }}
														aria-expanded={isHybridProfileExpanded}
														aria-label="Toggle Profile"
													>
														Profile
													</button>

													{isHybridProfileExpanded && (
														<div
															role="button"
															tabIndex={0}
															aria-label="Open Profile tab"
															onClick={() => setActiveTab('profile')}
															onKeyDown={(e) => {
																if (e.key === 'Enter' || e.key === ' ') {
																	e.preventDefault();
																	setActiveTab('profile');
																}
															}}
															className="flex-1 bg-white px-2 py-2 overflow-y-auto overflow-x-hidden hide-native-scrollbar cursor-pointer"
														>
															<div className="flex flex-wrap gap-x-[6px] gap-y-[10px] content-start">
																{hybridProfileChipItems.map((chip) => (
																	<span
																		key={chip.key}
																		className={cn(
																			'inline-flex items-center rounded-[5px] px-[5px] py-[0.5px] font-inter font-normal text-[10px] leading-[12px] text-black max-w-full whitespace-nowrap',
																			chip.bgClass,
																			chip.isEmpty && 'opacity-50'
																		)}
																	>
																		{chip.text}
																	</span>
																))}
															</div>
														</div>
													)}
												</div>

												{/* Hybrid (compressed) structure box */}
												<div
													className={cn(
														cn('w-[448px]', !forceDesktop && 'max-w-[89.33vw]', 'min-h-[230px] rounded-[8px] border-2 border-black bg-[#8989E1] flex flex-col'),
														// Left inset is 10px as requested; right inset is tuned so a 429px hover width fits cleanly.
														'pl-[10px] pr-[5px] py-[14px]',
														'mt-[14px]'
													)}
													style={{ backgroundColor: '#8989E1' }}
													data-hpi-hybrid-structure
												>
													{/* Subject (matches Auto-tab toggle behavior) */}
													{(() => {
														const isAiSubjectLocal = form.watch('isAiSubject');
														const subjectText = form.watch('subject') || '';

														const toggleAiSubject = () => {
															const next = !form.getValues('isAiSubject');
															form.setValue('isAiSubject', next, { shouldDirty: true });
															// When turning Auto back on, clear manual subject (matches Auto tab behavior)
															if (next) form.setValue('subject', '', { shouldDirty: true });
														};

														// Auto ON: compact by default, expands on hover.
														// Auto OFF: stays expanded so the user can type.
														return (
															<div
																className={cn(
																	'relative group/hybrid-subject transition-none',
																	isAiSubjectLocal ? 'w-[150px] hover:w-[429px]' : 'w-[429px]'
																)}
															>
																{/* Collapsed pill (Auto ON only) */}
																{isAiSubjectLocal && (
																	<button
																		type="button"
																		className={cn(
																			'w-[150px] h-[28px] rounded-[8px] border-[3px] border-black bg-[#E0E0E0]',
																			'flex items-center justify-start px-3',
																			'font-inter font-medium text-[14px] text-black',
																			'group-hover/hybrid-subject:hidden'
																		)}
																		aria-label="Subject"
																	>
																		Subject
																	</button>
																)}

																{/* Expanded bar (Auto ON on hover; Auto OFF always) */}
																<div
																	className={cn(
																		'items-center h-[28px] rounded-[8px] border-2 border-black overflow-hidden bg-white w-full',
																		isAiSubjectLocal
																			? 'hidden group-hover/hybrid-subject:flex'
																			: 'flex'
																	)}
																>
																	{/* Left label */}
																	<div
																		className={cn(
																			'pl-2 flex items-center h-full shrink-0',
																			isAiSubjectLocal ? 'w-[130px] bg-[#E0E0E0]' : 'w-[110px] bg-white'
																		)}
																	>
																		<span className="font-inter font-semibold text-[14px] whitespace-nowrap text-black">
																			{isAiSubjectLocal ? 'Auto Subject' : 'Subject'}
																		</span>
																	</div>

																	{/* Toggle */}
																	<button
																		type="button"
																		onClick={toggleAiSubject}
																		className={cn(
																			'relative h-full flex items-center text-[12px] font-inter font-normal shrink-0',
																			isAiSubjectLocal
																				? 'w-[55px] px-2 justify-center text-black bg-[#91E193]'
																				: 'w-[80px] px-2 justify-center text-black bg-[#DADAFC]'
																		)}
																		aria-pressed={isAiSubjectLocal}
																		aria-label={isAiSubjectLocal ? 'Auto on' : 'Auto off'}
																	>
																		<span className="absolute left-0 h-full border-l-2 border-[#000000]" />
																		<span>{isAiSubjectLocal ? 'on' : 'Auto off'}</span>
																		<span className="absolute right-0 h-full border-r-2 border-[#000000]" />
																	</button>

																	{/* Input */}
																	<div className={cn('flex-grow h-full', isAiSubjectLocal ? 'bg-[#F0F0F0]' : 'bg-white')}>
																		<Input
																			value={subjectText}
																			onChange={(e) => {
																				if (e.target.value) setHasSubjectBeenTouched(true);
																				form.setValue('subject', e.target.value, { shouldDirty: true });
																			}}
																			onFocus={(e) => trackFocusedField?.('subject', e.target)}
																			onBlur={() => setHasSubjectBeenTouched(true)}
																			disabled={isAiSubjectLocal}
																			className={cn(
																				'w-full h-full !bg-transparent pl-3 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0',
																				shouldShowSubjectRedStyling
																					? '!text-[#A20000] placeholder:!text-[#A20000]'
																					: '!text-black placeholder:!text-[#9E9E9E]',
																				isAiSubjectLocal && 'cursor-not-allowed'
																			)}
																			placeholder={
																				isAiSubjectLocal
																					? 'Write manual subject here'
																					: 'Write your subject here. *required'
																			}
																		/>
																	</div>
																</div>
															</div>
														);
													})()}

													{(() => {
														// NOTE: `useFieldArray` uses `id` as an internal key by default, so we must
														// use the field-array ids here (not the block type string).
														const introField = fields.find(
															(f) => f.type === HybridBlock.introduction
														);
														const researchField = fields.find(
															(f) => f.type === HybridBlock.research
														);
														const actionField = fields.find((f) => f.type === HybridBlock.action);

														const introId = introField?.id;
														const researchId = researchField?.id;
														const actionId = actionField?.id;

														const openOrCreateTextAfter = (coreType: HybridBlock) => {
															// Only allow one expanded block at a time in the structure UI
															setExpandedHybridCoreBlockId(null);
															const coreIndex = fields.findIndex((f) => f.type === coreType);
															if (coreIndex === -1) return;
															const next = fields[coreIndex + 1];
															if (next?.type === HybridBlock.text) {
																setHybridStructureSelection({
																	kind: 'block',
																	blockId: next.id,
																});
																setExpandedHybridTextBlockId(next.id);
																return;
															}
															const newId = handleAddTextBlockAt(coreIndex);
															setHybridStructureSelection({ kind: 'block', blockId: newId });
															setExpandedHybridTextBlockId(newId);
														};

														const getImmediateTextAfter = (coreType: HybridBlock) => {
															const coreIndex = fields.findIndex((f) => f.type === coreType);
															if (coreIndex === -1) return null;
															const next = fields[coreIndex + 1];
															return next?.type === HybridBlock.text ? next : null;
														};

														const introText = getImmediateTextAfter(HybridBlock.introduction);
														const researchText = getImmediateTextAfter(HybridBlock.research);
														const actionText = getImmediateTextAfter(HybridBlock.action);

														const AddTextGap = ({
															height,
															onClick,
														}: {
															height: number;
															onClick: () => void;
														}) => (
															<div
																className="group relative w-full overflow-visible"
																style={{ height }}
															>
																{/* Larger hover target so the +Text button is easier to reveal (without changing spacing).
																    Starts at the pill edge (150px) so it won't interfere with the pills themselves. */}
																<div
																	aria-hidden="true"
																	className="absolute left-[150px] top-0 w-[140px] h-[36px] z-0"
																/>
																<button
																	type="button"
																	onClick={onClick}
																	className={cn(
																		// Place the button 17px to the right of the 150px pill:
																		// pillWidth (150) + gap (17) = 167px
																		'absolute left-[167px] top-1/2 -translate-y-1/2 z-10',
																		'w-[57px] h-[22px] rounded-[4px] border border-[#0B741A] bg-[#9EDDB6]',
																		'flex items-center justify-center gap-[5px] box-border',
																		'opacity-0 pointer-events-none',
																		'group-hover:opacity-100 group-hover:pointer-events-auto',
																		'transition-opacity duration-150',
																		'font-inter font-medium text-[12px] leading-none text-black'
																	)}
																	aria-label="Add Text"
																>
																	<span className="text-[12px] leading-[12px]">+</span>
																	<span className="text-[12px] leading-[12px]">Text</span>
																</button>
															</div>
														);

														const TextPill = ({ id }: { id: string }) => {
															const isOpen = expandedHybridTextBlockId === id;
															const idx = fields.findIndex((f) => f.id === id);
															// Use getValues (snapshot) instead of watch to avoid re-renders on each keystroke
															const initialTextValue =
																idx >= 0
																	? ((form.getValues(`hybridBlockPrompts.${idx}.value`) as string) || '')
																	: '';

															if (!isOpen) {
																return (
																	<div
																		role="button"
																		tabIndex={0}
																		onClick={() => {
																			setHybridStructureSelection({ kind: 'block', blockId: id });
																			setExpandedHybridCoreBlockId(null);
																			setExpandedHybridTextBlockId(id);
																		}}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter' || e.key === ' ') {
																				e.preventDefault();
																				setHybridStructureSelection({
																					kind: 'block',
																					blockId: id,
																				});
																				setExpandedHybridCoreBlockId(null);
																				setExpandedHybridTextBlockId(id);
																			}
																		}}
																		className={cn(
																			'relative h-[28px] cursor-pointer select-none',
																			// IMPORTANT: keep the hover hitbox to the pill itself (150px),
																			// so it doesn't cover the "+ Text" buttons at x=167px.
																			'w-[150px] hover:w-[429px] transition-none',
																			'rounded-[8px] border-[3px] bg-[#A6E2A8] border-[#0B741A]',
																			'flex items-center justify-start px-3',
																			'font-inter font-medium text-[14px] text-black',
																			'group/hybrid-structure-text-pill'
																		)}
																	>
																		<span className="pr-[56px]">Text</span>
																		<div className="hidden group-hover/hybrid-structure-text-pill:flex items-center gap-[8px] absolute right-[8px] top-1/2 -translate-y-1/2">
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					setExpandedHybridTextBlockId(null);
																					handleRemoveBlock(id);
																				}}
																				className="h-[18px] w-[18px] flex items-center justify-center bg-transparent border-0 p-0 text-black"
																				aria-label="Delete Text block"
																			>
																				<CloseIcon width={7} height={7} />
																			</button>
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					setHybridStructureSelection({
																						kind: 'block',
																						blockId: id,
																					});
																					setExpandedHybridTextBlockId(id);
																				}}
																				className="h-[18px] w-[18px] flex items-center justify-center bg-transparent border-0 p-0"
																				aria-label="Expand Text block"
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
																);
															}

															return (
																<div
																	className={cn(
																		'relative group/hybrid-structure-text-open',
																		'w-[429px] rounded-[8px] border-[3px] border-[#0B741A] overflow-hidden bg-[#A6E2A8]'
																	)}
																>
																	{/* Header row */}
																	<div
																		role="button"
																		tabIndex={0}
																		onMouseDown={() => setExpandedHybridTextBlockId(null)}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter' || e.key === ' ') {
																				e.preventDefault();
																				setExpandedHybridTextBlockId(null);
																			}
																		}}
																		className="h-[28px] flex items-center justify-between px-3 relative cursor-pointer select-none"
																		aria-label="Collapse Text"
																	>
																		<span className="font-inter font-medium text-[14px] text-black">
																			Text
																		</span>
																		<div className="hidden group-hover/hybrid-structure-text-open:flex items-center gap-[8px] absolute right-[8px] top-1/2 -translate-y-1/2">
																			<button
																				type="button"
																				onMouseDown={(e) => {
																					e.stopPropagation();
																					setExpandedHybridTextBlockId(null);
																					handleRemoveBlock(id);
																				}}
																				className="h-[18px] w-[18px] flex items-center justify-center bg-transparent border-0 p-0 text-black"
																				aria-label="Delete Text block"
																			>
																				<CloseIcon width={7} height={7} />
																			</button>
																			<button
																				type="button"
																				onMouseDown={(e) => {
																					e.stopPropagation();
																					setExpandedHybridTextBlockId(null);
																				}}
																				className="h-[18px] w-[18px] flex items-center justify-center bg-transparent border-0 p-0"
																				aria-label="Collapse Text block"
																			>
																				<span
																					aria-hidden="true"
																					className="block w-[12px] h-[2px] bg-black rounded-[1px]"
																				/>
																			</button>
																		</div>
																	</div>
																	{/* Divider */}
																	<div className="h-[2px] bg-black" />
																	{/* Text area (limited height) */}
																	<div className="bg-white">
																		<Textarea
																			placeholder="Type anything you want to include"
																			className={cn(
																				'h-[72px] w-full border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
																				'bg-white',
																				'px-3 py-2 resize-none overflow-y-auto',
																				'font-inter text-[12px] leading-[14px] text-black'
																			)}
																			onMouseDown={(e) => e.stopPropagation()}
																			autoFocus
																			defaultValue={initialTextValue}
																			onBlur={(e) => {
																				if (idx < 0) return;
																				form.setValue(
																					`hybridBlockPrompts.${idx}.value`,
																					e.target.value,
																					{ shouldDirty: true }
																				);
																			}}
																		/>
																	</div>
																</div>
															);
														};

														const HybridCoreBlock = ({
															id,
															label,
															bgClass,
															borderClass,
															placeholder,
														}: {
															id: string;
															label: string;
															bgClass: string;
															borderClass: string;
															placeholder: string;
														}) => {
															const isOpen = expandedHybridCoreBlockId === id;
															const idx = fields.findIndex((f) => f.id === id);
															// Use getValues (snapshot) instead of watch to avoid re-renders on each keystroke
															const initialValue =
																idx >= 0
																	? ((form.getValues(`hybridBlockPrompts.${idx}.value`) as string) || '')
																	: '';

															if (!isOpen) {
																return (
																	<div
																		role="button"
																		tabIndex={0}
																		onClick={() => {
																			setHybridStructureSelection({ kind: 'block', blockId: id });
																			setExpandedHybridTextBlockId(null);
																			setExpandedHybridCoreBlockId(id);
																		}}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter' || e.key === ' ') {
																				e.preventDefault();
																				setHybridStructureSelection({
																					kind: 'block',
																					blockId: id,
																				});
																				setExpandedHybridTextBlockId(null);
																				setExpandedHybridCoreBlockId(id);
																			}
																		}}
																		className={cn(
																			'relative h-[28px] cursor-pointer select-none',
																			// IMPORTANT: keep the hover hitbox to the pill itself (150px),
																			// so it doesn't cover the "+ Text" buttons at x=167px.
																			'w-[150px] hover:w-[429px] transition-none',
																			'rounded-[8px] border-[3px]',
																			bgClass,
																			borderClass,
																			'flex items-center justify-start px-3 max-[480px]:px-2',
																			'font-inter font-medium text-[14px] max-[480px]:text-[12px] max-[480px]:leading-none text-black',
																			'group/hybrid-core'
																		)}
																	>
																		<span className="pr-3 group-hover/hybrid-core:pr-[130px] whitespace-nowrap">
																			{label}
																		</span>
																		{/* Expand chevron (matches Text pill) */}
																		<div className="hidden group-hover/hybrid-core:flex items-center absolute right-[8px] top-1/2 -translate-y-1/2 z-10">
																			<button
																				type="button"
																				onClick={(e) => {
																					e.stopPropagation();
																					setHybridStructureSelection({ kind: 'block', blockId: id });
																					setExpandedHybridTextBlockId(null);
																					setExpandedHybridCoreBlockId(id);
																				}}
																				className="h-[18px] w-[18px] flex items-center justify-center bg-transparent border-0 p-0"
																				aria-label={`Expand ${label}`}
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
																		{/* Advanced chrome (hover-only) */}
																		<div className="hidden group-hover/hybrid-core:block absolute inset-0 pointer-events-none">
																			<div className="absolute top-0 bottom-0 w-px bg-black right-[32px]" />
																			<div className="absolute top-0 bottom-0 w-px bg-black right-[112px]" />
																			<div className="absolute top-0 bottom-0 right-[32px] w-[80px] flex items-center justify-center">
																				<span className="font-inter font-medium text-[14px] text-black">
																					Advanced
																				</span>
																			</div>
																		</div>
																	</div>
																);
															}

															return (
																<div
																	className={cn(
																		'w-[429px] rounded-[8px] border-[3px] overflow-hidden',
																		bgClass,
																		borderClass
																	)}
																>
																	{/* Header row (click anywhere to collapse) */}
																	<div
																		role="button"
																		tabIndex={0}
																		onMouseDown={() => setExpandedHybridCoreBlockId(null)}
																		onKeyDown={(e) => {
																			if (e.key === 'Enter' || e.key === ' ') {
																				e.preventDefault();
																				setExpandedHybridCoreBlockId(null);
																			}
																		}}
																		className="h-[28px] flex items-center justify-start px-3 relative cursor-pointer select-none"
																		aria-label={`Collapse ${label}`}
																	>
																		<span className="pr-[130px] font-inter font-medium text-[14px] max-[480px]:text-[12px] max-[480px]:leading-none text-black whitespace-nowrap">
																			{label}
																		</span>
																		{/* Advanced chrome (always visible while expanded) */}
																		<div className="absolute top-0 bottom-0 w-px bg-black right-[32px]" />
																		<div className="absolute top-0 bottom-0 w-px bg-black right-[112px]" />
																		<div className="absolute top-0 bottom-0 right-[32px] w-[80px] flex items-center justify-center">
																			<span className="font-inter font-medium text-[14px] text-black">
																				Advanced
																			</span>
																		</div>
																		{/* Collapse indicator in the rightmost 32px region */}
																		<div className="absolute top-0 bottom-0 right-0 w-[32px] flex items-center justify-center">
																			<span
																				aria-hidden="true"
																				className="block w-[12px] h-[2px] bg-black rounded-[1px]"
																			/>
																		</div>
																	</div>
																	{/* Divider */}
																	<div className="h-[2px] bg-black" />
																	{/* Text area (limited height) */}
																	<div className="bg-white">
																		<Textarea
																			placeholder={placeholder}
																			className={cn(
																				'h-[72px] w-full border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
																				'bg-white',
																				'px-3 py-2 resize-none overflow-y-auto',
																				'font-inter text-[12px] leading-[14px] text-black'
																			)}
																			onMouseDown={(e) => e.stopPropagation()}
																			autoFocus
																			defaultValue={initialValue}
																			onBlur={(e) => {
																				if (idx < 0) return;
																				form.setValue(
																					`hybridBlockPrompts.${idx}.value`,
																					e.target.value,
																					{ shouldDirty: true }
																				);
																			}}
																		/>
																	</div>
																</div>
															);
														};

														return (
															<div className="w-full flex flex-col items-start">
																{/* Subject -> Intro gap: 17px (no +Text) */}
																<div className="h-[17px]" />

																{/* Intro */}
																{introId ? (
																	<HybridCoreBlock
																		id={introId}
																		label="Intro"
																		bgClass="bg-[#DADAFC]"
																		borderClass="border-[#6673FF]"
																		placeholder="Automated Intro"
																	/>
																) : null}

																{/* Intro -> Research slot */}
																{introText ? (
																	<>
																		<div className="h-[12px]" />
																		<TextPill id={introText.id} />
																		<div className="h-[12px]" />
																	</>
																) : (
																	<AddTextGap
																		height={12}
																		onClick={() =>
																			openOrCreateTextAfter(HybridBlock.introduction)
																		}
																	/>
																)}

																{/* Research */}
																{researchId ? (
																	<HybridCoreBlock
																		id={researchId}
																		label="Research"
																		bgClass="bg-[#C7C7FF]"
																		borderClass="border-[#1010E7]"
																		placeholder="Automated Research on who you’re sending to"
																	/>
																) : null}

																{/* Research -> CTA slot */}
																{researchText ? (
																	<>
																		<div className="h-[12px]" />
																		<TextPill id={researchText.id} />
																		<div className="h-[12px]" />
																	</>
																) : (
																	<AddTextGap
																		height={12}
																		onClick={() => openOrCreateTextAfter(HybridBlock.research)}
																	/>
																)}

																{/* Call to Action */}
																{actionId ? (
																	<HybridCoreBlock
																		id={actionId}
																		label="Call to Action"
																		bgClass="bg-[#A0A0D5]"
																		borderClass="border-[#0E0E7F]"
																		placeholder="Automated Call to Action"
																	/>
																) : null}

																{/* CTA -> Signature slot */}
																{actionText ? (
																	<>
																		<div className="h-[15px]" />
																		<TextPill id={actionText.id} />
																		<div className="h-[15px]" />
																	</>
																) : (
																	<AddTextGap
																		height={15}
																		onClick={() => openOrCreateTextAfter(HybridBlock.action)}
																	/>
																)}
															</div>
														);
													})()}

													{/* Signature (matches Auto-tab signature behavior) */}
													{(() => {
														// Auto ON: compact pill by default, expands on hover.
														// Auto OFF: stays expanded and reveals textarea (expands downward).
														return (
															<div
																className={cn(
																	'relative group/hybrid-signature transition-none',
																	isAutoSignature ? 'w-[150px] hover:w-[429px]' : 'w-[429px]'
																)}
															>
																{isAutoSignature ? (
																	<>
																		{/* Collapsed pill (shown by default, hidden on hover) */}
																		<div className="group-hover/hybrid-signature:hidden">
																			<div
																				className={cn(
																					'w-[150px] h-[28px] rounded-[8px] border-[3px] border-black bg-[#E0E0E0]',
																					'flex items-center justify-start px-3',
																					'font-inter font-medium text-[14px] text-black'
																				)}
																				aria-label="Signature"
																			>
																				Signature
																			</div>
																		</div>

																		{/* Expanded bar (shown on hover) */}
																		<div className="hidden group-hover/hybrid-signature:flex items-center h-[28px] rounded-[8px] border-2 border-black overflow-hidden bg-white w-full">
																			<div className="pl-2 flex items-center h-full shrink-0 w-[140px] bg-[#E0E0E0]">
																				<span className="font-inter font-semibold text-[14px] whitespace-nowrap text-black">
																					Auto Signature
																				</span>
																			</div>
																			<button
																				type="button"
																				data-hover-description="click to disable automatic drafting for this and write your own"
																				onClick={() => setIsAutoSignature(false)}
																				className={cn(
																					'relative h-full flex items-center text-[12px] font-inter font-normal shrink-0',
																					'w-[55px] px-2 justify-center text-black bg-[#91E193]'
																				)}
																				aria-label="Auto Signature on"
																			>
																				<span className="absolute left-0 h-full border-l-2 border-[#000000]" />
																				<span>on</span>
																				<span className="absolute right-0 h-full border-r-2 border-[#000000]" />
																			</button>
																			<div className="flex-grow h-full bg-[#F0F0F0]">
																				<Input
																					className={cn(
																						'w-full h-full !bg-transparent pl-3 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0',
																						'!text-black placeholder:!text-[#9E9E9E]',
																						'cursor-not-allowed'
																					)}
																					placeholder="Write manual Signature here"
																					disabled
																				/>
																			</div>
																		</div>
																	</>
																) : (
																	/* Manual signature mode: expanded downward with textarea */
																	<div className="w-full rounded-[8px] border-2 border-black overflow-hidden flex flex-col bg-white">
																		{/* Header row */}
																		<div className="flex items-center h-[31px] shrink-0 bg-[#8DDF90]">
																			<div className="pl-2 flex items-center h-full shrink-0 w-[120px] bg-[#8DDF90]">
																				<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black">
																					Signature
																				</span>
																			</div>
																			<button
																				type="button"
																				data-hover-description="Turn back on automated drafting for here"
																				onClick={() => {
																					setIsAutoSignature(true);
																					setManualSignatureValue('');
																				}}
																				className={cn(
																					'relative h-full flex items-center text-[12px] font-inter font-normal shrink-0',
																					'w-[80px] px-2 justify-center text-black bg-[#DADAFC] hover:bg-[#C4C4F5] active:bg-[#B0B0E8]'
																				)}
																				aria-label="Auto Signature off"
																			>
																				<span className="absolute left-0 h-full border-l-2 border-black" />
																				<span>Auto off</span>
																				<span className="absolute right-0 h-full border-r-2 border-black" />
																			</button>
																			<div className="flex-grow h-full bg-[#8DDF90]" />
																		</div>
																		{/* Divider */}
																		<div className="w-full h-[2px] bg-black shrink-0" />
																		{/* Text entry */}
																		<div className="bg-white">
																			<Textarea
																				value={manualSignatureValue}
																				onChange={(e) => setManualSignatureValue(e.target.value)}
																				className={cn(
																					'w-full !bg-transparent px-3 py-2 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none',
																					'!text-black placeholder:!text-[#9E9E9E] font-inter text-[14px]'
																				)}
																				style={{ height: 66 }}
																				placeholder="Write manual signature here"
																			/>
																		</div>
																	</div>
																)}
															</div>
														);
													})()}
												</div>

												{/* Hybrid: Generate Test button (Auto-tab style) — 26px below the main box (desktop) */}
												{!hideGenerateTestButton && !showTestPreview && !compactLeftOnly && (
													<div className={cn('mt-[26px] w-[448px] flex items-center justify-center', !forceDesktop && 'max-w-[89.33vw] max-[480px]:hidden')}>
														<Button
															type="button"
															data-hover-description="This will show you a test draft, given all of what you provided"
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
																'h-[28px] w-[232px] bg-[#DBF3DC] text-black font-inter font-normal text-[17px] leading-none rounded-[4px] cursor-pointer flex items-center justify-center p-0 border-2 border-transparent',
																'transition-colors hover:bg-[#EAF9EB] hover:border-black active:bg-[#D1E9D2]',
																isGenerationDisabled?.()
																	? 'opacity-50 cursor-not-allowed'
																	: 'opacity-100'
															)}
														>
															{isPendingGeneration && isTest ? 'Testing...' : 'Generate Test'}
														</Button>
													</div>
												)}

												{/* Hybrid editor panel (legacy): hidden for Intro/Research/CTA/Text (now inline-expanded) */}
												{hybridStructureSelection.kind === 'block' &&
													(() => {
														const idx = fields.findIndex(
															(f) => f.id === hybridStructureSelection.blockId
														);
														if (idx === -1) return false;
														const t = fields[idx].type;
														return (
															t !== HybridBlock.text &&
															t !== HybridBlock.introduction &&
															t !== HybridBlock.research &&
															t !== HybridBlock.action
														);
													})() && (
													<div
														className={cn(
															cn('w-[448px] rounded-[8px] border-2 border-black bg-white', !forceDesktop && 'max-w-[89.33vw]'),
															'px-4 py-3',
															'mt-3'
														)}
														data-hpi-hybrid-structure-editor
													>
														{(() => {
															if (hybridStructureSelection.kind === 'block') {
																const idx = fields.findIndex(
																	(f) => f.id === hybridStructureSelection.blockId
																);
																if (idx === -1) return null;
																const field = fields[idx];
																const fieldProps = form.register(
																	`hybridBlockPrompts.${idx}.value`
																);
																const meta = getBlock(field.type as HybridBlock);
																const label = getHybridStructureLabel(field.type as HybridBlock);

																return (
																	<div className="flex flex-col gap-2">
																		<span className="font-inter font-semibold text-[14px] text-black">
																			{label}
																		</span>
																		{field.type === HybridBlock.text ? (
																			<Textarea
																				placeholder={meta.placeholder || ''}
																				className={cn(
																					'min-h-[120px] border-2 border-black rounded-[8px] bg-white',
																					'font-inter text-[14px] text-black'
																				)}
																				{...fieldProps}
																			/>
																		) : (
																			<Input
																				placeholder={meta.placeholder || ''}
																				className={cn(
																					'h-[34px] border-2 border-black rounded-[8px] bg-white',
																					'font-inter text-[14px] text-black'
																				)}
																				{...fieldProps}
																			/>
																		)}
																	</div>
																);
															}

															return null;
														})()}
													</div>
												)}
											</div>
										)}

										{selectedModeKey !== 'manual' && selectedModeKey !== 'hybrid' && (
											<>
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

													// Placeholders are only relevant in Hybrid mode; this list is rendered only in non-hybrid modes.
													const shouldShowPlaceholders = false;
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
																		defaultOpenCustomInstructions={
																			field.type === HybridBlock.full_automated
																				? props.defaultOpenFullAutoCustomInstructions
																				: undefined
																		}
																		onCustomInstructionsOpenChange={
																			field.type === HybridBlock.full_automated
																				? handleCustomInstructionsOpenChange
																				: undefined
																		}
																		profileFields={profileFields}
																		onGoToProfileTab={() => setActiveTab('profile')}
																		isDragDisabled={isHybridModeSelected}
																		useStaticDropdownPosition={useStaticDropdownPosition}
																		forceDesktop={forceDesktop}
																	/>
																</div>
																{/* Plus button under hybrid blocks */}
																{isHybridBlock && !hasImmediateTextBlock && (
																	<div
																		className={cn(
																			'flex relative z-[70]',
																			showTestPreview
																				? 'justify-start w-full'
																				: cn('justify-end -mr-[85px] max-w-[475px]', !forceDesktop ? 'w-[93.7vw] max-[480px]:-mr-[2vw]' : 'w-full')
																		)}
																		style={{ transform: 'translateY(-12px)' }}
																	>
																		<Button
																			type="button"
																			onClick={() => handleAddTextBlockAt(index)}
																			className={cn(
																				cn('w-[52px] h-[20px] bg-background hover:bg-stone-100 active:bg-stone-200 border border-primary rounded-[4px] !font-normal text-[10px] text-gray-600', !forceDesktop && 'max-[480px]:translate-x-[6px]'),
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
														? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.33vw]')
														: cn(
																!forceDesktop ? 'w-[89.33vw]' : 'w-[468px]',
																'max-w-[468px]',
																'mx-auto'
														  ),
													'h-[97px] flex flex-col'
												)}
												data-hpi-signature-auto
											>
												{isAutoSignature ? (
													<div className="flex items-center">
														<div
															className={cn(
																// Default: only the 122px Signature box is hoverable (so it doesn't expand from the right-side area).
																// On hover: expand to full width so the user can interact with the expanded controls.
																'relative group/signature peer/signature w-[122px] hover:w-full transition-none'
															)}
														>
															{/* Collapsed state - shown by default, hidden on hover */}
															<div className="flex items-center group-hover/signature:hidden">
																<div
																	className={cn(
																		cn(
																			'flex items-center justify-center h-[31px] rounded-[8px] border-2 border-black overflow-hidden w-[122px]',
																			!forceDesktop && 'max-[480px]:h-[24px]'
																		)
																	)}
																	style={{ backgroundColor: '#E0E0E0' }}
																>
																	<span className="font-inter font-medium text-[18px] max-[480px]:text-[12px] whitespace-nowrap text-black">
																		Signature
																	</span>
																</div>
															</div>
															{/* Expanded state - hidden by default, shown on hover */}
															<div
																className={cn(
																	cn(
																		'hidden group-hover/signature:flex items-center h-[31px] rounded-[8px] border-2 border-black overflow-hidden bg-white w-full',
																		!forceDesktop && 'max-[480px]:h-[24px]'
																	)
																)}
															>
																<div
																	className={cn(
																		'pl-2 flex items-center h-full shrink-0 w-[140px]',
																		'bg-[#E0E0E0]'
																	)}
																>
																	<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black">
																		Auto Signature
																	</span>
																</div>

															<button
																type="button"
																data-hover-description="click to disable automatic drafting for this and write your own"
																onClick={() => setIsAutoSignature(false)}
																className={cn(
																	'relative h-full flex items-center text-[12px] font-inter font-normal transition-colors shrink-0',
																	'w-[55px] px-2 justify-center text-black bg-[#91E193] hover:bg-[#91E193] active:bg-[#91E193]'
																)}
															>
																<span className="absolute left-0 h-full border-l-2 border-[#000000]"></span>
																<span>on</span>
																<span className="absolute right-0 h-full border-r-2 border-[#000000]"></span>
															</button>

															<div className={cn('flex-grow h-full', 'bg-[#F0F0F0]')}>
																<Input
																	className={cn(
																		cn('w-full h-full !bg-transparent pl-4 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0', !forceDesktop && 'max-[480px]:placeholder:text-[10px] max-[480px]:!transition-none max-[480px]:!duration-0'),
																		'!text-black placeholder:!text-[#9E9E9E]',
																		'max-[480px]:pl-2'
																	)}
																	placeholder="Write manual Signature here"
																/>
															</div>
														</div>
													</div>

														{/* Right-side hover zone (where "Auto" used to be).
														    - Does NOT trigger expansion.
														    - Reveals "AUTO" only while hovering this area. */}
														<div
															aria-hidden="true"
															className={cn(
																'group/signature-auto flex items-center pl-2 w-[52px] h-[31px] shrink-0 select-none peer-hover/signature:hidden',
																!forceDesktop && 'max-[480px]:h-[24px]'
															)}
														>
															<span className="font-inter font-normal text-[13px] text-[#000000] opacity-0 group-hover/signature-auto:opacity-100 transition-opacity">
																AUTO
															</span>
														</div>
													</div>
												) : (
													/* Manual signature mode: 467x97px box with header and text area */
													<div
														className={cn(
															'w-full h-[97px] rounded-[8px] border-2 border-black overflow-hidden flex flex-col'
														)}
													>
														{/* Header row */}
														<div className="flex items-center h-[31px] shrink-0 bg-[#8DDF90]">
															<div
																className={cn(
																	'pl-2 flex items-center h-full shrink-0 w-[120px]',
																	'bg-[#8DDF90]'
																)}
															>
																<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black">
																	Signature
																</span>
															</div>

															<button
																type="button"
																data-hover-description="Turn back on automated drafting for here"
																onClick={() => {
																	setIsAutoSignature(true);
																	setManualSignatureValue('');
																}}
																className={cn(
																	'relative h-full flex items-center text-[12px] font-inter font-normal transition-colors shrink-0',
																	'w-[80px] px-2 justify-center text-black bg-[#DADAFC] hover:bg-[#C4C4F5] active:bg-[#B0B0E8]'
																)}
															>
																<span className="absolute left-0 h-full border-l-2 border-black"></span>
																<span>Auto off</span>
																<span className="absolute right-0 h-full border-r-2 border-black"></span>
															</button>

															<div className="flex-grow h-full bg-[#8DDF90]" />
														</div>
														{/* Divider line */}
														<div className="w-full h-[2px] bg-black shrink-0" />
														{/* Text entry area */}
														<div className="flex-1 bg-white">
															<Textarea
																value={manualSignatureValue}
																onChange={(e) => setManualSignatureValue(e.target.value)}
																className={cn(
																	'w-full h-full !bg-transparent px-3 py-2 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none',
																	'!text-black placeholder:!text-[#9E9E9E] font-inter text-[14px]'
																)}
																placeholder="Write manual signature here"
															/>
														</div>
													</div>
												)}
											</div>
										)}
										{/* Full Auto: Generate Test button sits in the empty green space (desktop) */}
										{!hideGenerateTestButton && selectedModeKey === 'full' && !showTestPreview && !compactLeftOnly && (
											<div className={cn(
												cn('absolute left-0 right-0 w-full flex items-center justify-center', !forceDesktop && 'max-[480px]:hidden'),
												// This button is absolutely positioned; when Custom Instructions and/or Signature expand,
												// the content can slide into this area. Prefer dropping the button lower (smaller `bottom`)
												// to avoid overlap with the Signature box.
												!isAutoSignature
													? (isLocalCustomInstructionsOpen ? 'bottom-[58px]' : 'bottom-[128px]')
													: isManualSubject
														? (isLocalCustomInstructionsOpen ? 'bottom-[82px]' : 'bottom-[152px]')
														: (isLocalCustomInstructionsOpen ? 'bottom-[124px]' : 'bottom-[194px]')
											)}>
												<Button
													type="button"
													data-hover-description="This will show you a test draft, given all of what you provided"
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
														'h-[28px] w-[232px] bg-[#DBF3DC] text-black font-inter font-normal text-[17px] leading-none rounded-[4px] cursor-pointer flex items-center justify-center p-0 border-2 border-transparent',
														'transition-colors hover:bg-[#EAF9EB] hover:border-black active:bg-[#D1E9D2]',
														isGenerationDisabled?.()
															? 'opacity-50 cursor-not-allowed'
															: 'opacity-100'
													)}
												>
													{isPendingGeneration && isTest ? 'Testing...' : 'Generate Test'}
												</Button>
											</div>
										)}
											</>
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
																	? cn('w-[426px]', !forceDesktop && 'max-[480px]:w-[89.33vw]')
																	: cn(!forceDesktop ? 'w-[89.33vw]' : 'w-full', 'max-w-[475px]')
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
								{activeTab !== 'profile' &&
									!showTestPreview &&
									selectedModeKey !== 'full' &&
									selectedModeKey !== 'hybrid' &&
									selectedModeKey !== 'manual' && (
									<FormField
										control={form.control}
										name="signature"
										render={({ field }) => (
											<FormItem className={cn(!compactLeftOnly ? 'mb-[23px]' : 'mb-[9px]')}>
												<div
													className={cn(
														'min-h-[57px] border-2 border-gray-400 rounded-md bg-white px-4 py-2',
														cn(!forceDesktop ? 'w-[89.33vw]' : 'w-full', 'max-w-[475px]')
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
								{compactLeftOnly ||
								activeTab === 'profile' ||
								selectedModeKey === 'manual' ||
								hideGenerateTestButton ? null : (
									<>
										{/* Desktop (manual/hybrid): bottom bar Generate Test button */}
										{selectedModeKey !== 'full' && selectedModeKey !== 'hybrid' && (
											<div
												className={cn(
													'w-full flex flex-col items-center',
													!forceDesktop && 'max-[480px]:hidden'
												)}
											>
												{hasEmptyTextBlocks && (
													<div
														className={cn(
															hasTouchedEmptyTextBlocks || hasAttemptedTest
																? 'text-destructive'
																: 'text-black',
															'text-sm font-medium mb-2',
															cn(!forceDesktop ? 'w-[93.7vw]' : 'w-full', 'max-w-[475px]')
														)}
													>
														Fill in all text blocks in order to compose an email.
													</div>
												)}
												<div className="w-full h-[2px] bg-black" />
												<div className="w-full h-[41px] flex items-center justify-center bg-white rounded-b-[5px]">
													<Button
														type="button"
														data-hover-description="This will show you a test draft, given all of what you provided"
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
															'h-[28px] bg-white border-[3px] border-[#349A37] text-black font-inter font-normal text-[17px] leading-none rounded-[4px] cursor-pointer flex items-center justify-center transition-all hover:bg-[#EAF9EB] hover:border-black active:bg-primary/20 p-0',
															cn(!forceDesktop ? 'w-[93.7vw]' : 'w-full', 'max-w-[475px]'),
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
										{!hideMobileStickyTestFooter && !showTestPreview && (
											<div className="hidden max-[480px]:block mobile-sticky-test-button">
												<div className="fixed bottom-0 left-0 right-0 z-40">
													<div className="flex w-full">
														<Button
															type="button"
															data-hover-description="This will show you a test draft, given all of what you provided"
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
												className={cn('w-[461px]', !forceDesktop && 'max-[480px]:w-[96.27vw]')}
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
												{!hideMobileStickyTestFooter && (
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
												)}
											</div>
										</div>
								  )}
						</div>
						{!compactLeftOnly && !isPendingGeneration && !hideDraftButton && (
							<div
								className={cn(
									'group relative h-[40px] mt-4 mx-auto',
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
											data-hover-description="See all the tabs here"
											className="absolute right-[3px] top-[3px] bottom-[3px] w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer border-0 border-l-[2px] border-[#349A37] z-10"
											onClick={() => {
												onSelectAllContacts?.();
											}}
										>
											All
										</button>
									</>
								) : (
									<div className="relative w-full h-full rounded-[4px] border-[3px] border-transparent overflow-hidden transition-colors group-hover:bg-[#EEF5EF] group-hover:border-black">
										<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px] cursor-default">
											Select Contacts and Draft Emails
										</div>
										<button
											type="button"
											aria-label="Select all contacts"
											className="absolute right-0 top-0 bottom-0 w-[62px] bg-[#74D178] rounded-r-[1px] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#65C269] cursor-pointer z-10 opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto"
											onClick={() => {
												onSelectAllContacts?.();
											}}
										>
											<div className="absolute left-0 top-0 bottom-0 w-[3px] bg-black" />
											All
										</button>
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
