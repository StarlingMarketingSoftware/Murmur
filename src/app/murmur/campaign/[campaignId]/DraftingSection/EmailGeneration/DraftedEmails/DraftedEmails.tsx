import {
	FC,
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { DraftedEmailsProps, useDraftedEmails } from './useDraftedEmails';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { Button } from '@/components/ui/button';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { cn, convertHtmlToPlainText } from '@/utils';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import DeleteandOpenIcon from '@/components/atoms/_svg/DeleteandOpen';
import ApproveCheckIcon from '@/components/atoms/svg/ApproveCheckIcon';
import RejectXIcon from '@/components/atoms/svg/RejectXIcon';
import LeftArrowReviewIcon from '@/components/atoms/svg/LeftArrowReviewIcon';
import RightArrowReviewIcon from '@/components/atoms/svg/RightArrowReviewIcon';
import { getStateAbbreviation, splitTrailingNumericSuffix } from '@/utils/string';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { useGetUsedContactCampaigns, useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import LeftArrow from '@/components/atoms/_svg/LeftArrow';
import RightArrow from '@/components/atoms/_svg/RightArrow';
import { useIsMobile } from '@/hooks/useIsMobile';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { isRestaurantTitle, isCoffeeShopTitle, isMusicVenueTitle, isMusicFestivalTitle, isWeddingPlannerTitle, isWeddingVenueTitle, isWineBeerSpiritsTitle, getWineBeerSpiritsLabel } from '@/utils/restaurantTitle';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';

const FadeOverflowText: FC<{
	text: string;
	className?: string;
	fadePx?: number;
	measureKey?: unknown;
}> = ({ text, className, fadePx = 16, measureKey }) => {
	const spanRef = useRef<HTMLSpanElement | null>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);
	const { base, suffixNumber } = splitTrailingNumericSuffix(text);

	const measure = useCallback(() => {
		const el = spanRef.current;
		if (!el) return;
		// A tiny epsilon avoids flicker from sub-pixel rounding.
		setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
	}, []);

	useLayoutEffect(() => {
		measure();
	}, [measure, text, measureKey]);

	useEffect(() => {
		const el = spanRef.current;
		if (!el) return;

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', measure);
			return () => window.removeEventListener('resize', measure);
		}

		const ro = new ResizeObserver(() => measure());
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure]);

	const safeFadePx = Math.max(0, fadePx);
	const style = isOverflowing
		? {
				maskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
				WebkitMaskImage: `linear-gradient(to right, black calc(100% - ${safeFadePx}px), transparent 100%)`,
			}
		: undefined;

	return (
		<span
			ref={spanRef}
			className={cn('block w-full whitespace-nowrap overflow-hidden', className)}
			style={style}
			title={text}
		>
			{suffixNumber ? (
				<>
					<span>{base}</span>
					<sup className="ml-[4px] relative top-[1px] align-super text-[0.65em] font-medium leading-none opacity-70">
						{suffixNumber}
					</sup>
				</>
			) : (
				text
			)}
		</span>
	);
};

interface ScrollableTextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	containerClassName?: string;
	thumbColor?: string;
	trackColor?: string;
	thumbWidth?: number;
	trackOffset?: number;
}

const ScrollableTextarea: FC<ScrollableTextareaProps> = ({
	containerClassName,
	thumbColor = '#000000',
	trackColor = 'transparent',
	thumbWidth = 2,
	trackOffset = 4,
	className,
	style,
	onScroll,
	...textareaProps
}) => {
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const [thumbHeight, setThumbHeight] = useState(0);
	const [thumbTop, setThumbTop] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStartY, setDragStartY] = useState(0);
	const [scrollStartY, setScrollStartY] = useState(0);

	const updateScrollbar = useCallback(() => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const { scrollTop, scrollHeight, clientHeight } = textarea;

		if (!clientHeight || scrollHeight <= clientHeight) {
			setThumbHeight((prev) => (prev !== 0 ? 0 : prev));
			setThumbTop(0);
			return;
		}

		const maxScrollTop = scrollHeight - clientHeight;
		const ratio = clientHeight / scrollHeight;
		const calculatedHeight = Math.max(ratio * clientHeight, 30);
		const maxThumbTop = clientHeight - calculatedHeight;
		const newThumbTop =
			maxThumbTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

		setThumbHeight(calculatedHeight);
		setThumbTop(newThumbTop);
	}, []);

	const handleTextareaScroll = useCallback(
		(event: React.UIEvent<HTMLTextAreaElement>) => {
			onScroll?.(event);
			updateScrollbar();
		},
		[onScroll, updateScrollbar]
	);

	useEffect(() => {
		updateScrollbar();
	}, [updateScrollbar, textareaProps.value]);

	useEffect(() => {
		if (typeof ResizeObserver === 'undefined') return;

		const textarea = textareaRef.current;
		if (!textarea) return;

		const resizeObserver = new ResizeObserver(updateScrollbar);
		resizeObserver.observe(textarea);

		return () => {
			resizeObserver.disconnect();
		};
	}, [updateScrollbar]);

	const handleThumbMouseDown = useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		setIsDragging(true);
		setDragStartY(event.clientY);
		const textarea = textareaRef.current;
		if (textarea) {
			setScrollStartY(textarea.scrollTop);
		}
	}, []);

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (event: MouseEvent) => {
			const textarea = textareaRef.current;
			if (!textarea) return;

			const { scrollHeight, clientHeight } = textarea;
			const maxScrollTop = scrollHeight - clientHeight;
			if (maxScrollTop <= 0) return;

			const maxThumbTravel = Math.max(clientHeight - thumbHeight, 1);
			const scrollRatio = maxScrollTop / maxThumbTravel;
			const deltaY = event.clientY - dragStartY;
			textarea.scrollTop = scrollStartY + deltaY * scrollRatio;
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
	}, [dragStartY, isDragging, scrollStartY, thumbHeight]);

	const handleTrackClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const textarea = textareaRef.current;
		if (!textarea || event.target !== event.currentTarget) return;

		const rect = event.currentTarget.getBoundingClientRect();
		const clickY = event.clientY - rect.top;
		const { scrollHeight, clientHeight } = textarea;
		const maxScrollTop = scrollHeight - clientHeight;
		if (maxScrollTop <= 0) return;

		textarea.scrollTop = (clickY / clientHeight) * maxScrollTop;
	}, []);

	return (
		<div className={cn('relative h-full w-full', containerClassName)}>
			<textarea
				{...textareaProps}
				ref={textareaRef}
				className={cn('scrollbar-hide', className)}
				style={{
					...style,
					overflowY: 'auto',
					scrollbarWidth: 'none',
					msOverflowStyle: 'none',
					overscrollBehavior: 'contain',
					WebkitOverflowScrolling: 'touch',
					touchAction: 'pan-y',
				}}
				onScroll={handleTextareaScroll}
			/>
			{thumbHeight > 0 && (
				<div
					className="absolute top-0 bottom-0 cursor-pointer"
					style={{
						width: `${thumbWidth}px`,
						right: `${trackOffset}px`,
						backgroundColor: trackColor,
					}}
					onClick={handleTrackClick}
				>
					<div
						className="absolute left-0 cursor-grab active:cursor-grabbing"
						style={{
							width: `${thumbWidth}px`,
							height: `${thumbHeight}px`,
							transform: `translateY(${thumbTop}px)`,
							backgroundColor: thumbColor,
							borderRadius: thumbWidth / 2,
						}}
						onMouseDown={handleThumbMouseDown}
					/>
				</div>
			)}
		</div>
	);
};

// Hover/click zones for a draft row:
// - Left: selection zone (matches the green accent line)
// - Middle: open zone (most of the row)
// - Right: delete zone (the last/rightmost slice)
type DraftRowHoverRegion = 'left' | 'middle' | 'right';

const DRAFT_ROW_SELECT_ZONE_PX = 115;
// Keep the delete hover/click zone intentionally narrow to prevent accidental deletes,
// while allowing the "open" (middle) zone to extend further right.
const DRAFT_ROW_DELETE_ZONE_PX = 48;

export type DraftedEmailsHandle = {
	/** Exit the embedded regen settings preview (HybridPromptInput) and return to the normal draft editor / approve-reject view. */
	exitRegenSettingsPreview: () => void;
};

function getDraftRowHoverRegion(event: React.MouseEvent<HTMLElement>): DraftRowHoverRegion {
	const rect = event.currentTarget.getBoundingClientRect();
	const x = event.clientX - rect.left;
	const width = rect.width;

	// Clamp zones so we never end up with negative widths on very small layouts.
	const selectZone = Math.min(DRAFT_ROW_SELECT_ZONE_PX, width);
	const deleteZone = Math.min(DRAFT_ROW_DELETE_ZONE_PX, Math.max(0, width - selectZone));

	if (x < selectZone) return 'left';
	if (x > width - deleteZone) return 'right';
	return 'middle';
}

export const DraftedEmails = forwardRef<DraftedEmailsHandle, DraftedEmailsProps>((props, ref) => {
	const {
		draftEmails,
		isPendingEmails,
		isPendingDeleteEmail,
		handleDeleteDraft,
		contacts,
		selectedDraft,
		handleBack,
		handleSave,
		handleDraftSelect,
		handleDraftDoubleClick,
		isPendingUpdate,
		editedSubject,
		editedMessage,
		setEditedMessage,
		setEditedSubject,
		setSelectedDraft,
		selectedDraftIds,
		handleSelectAllDrafts,
	} = useDraftedEmails(props);
	const { onContactClick, onContactHover, onDraftHover, onRegenerateDraft } = props;

	const isMobile = useIsMobile();
	const draftReviewContainerRef = useRef<HTMLDivElement | null>(null);
	// Keep a ref to the currently-open draft id so async regen doesn't stomp UI state
	// if the user navigates to another draft mid-request.
	const selectedDraftIdRef = useRef<number | null>(null);

	useEffect(() => {
		selectedDraftIdRef.current = selectedDraft?.id ?? null;
	}, [selectedDraft?.id]);

	// Close the draft review UI when clicking anywhere outside of it.
	// This should return the user back to the normal drafts table view.
	useEffect(() => {
		if (!selectedDraft) return;
		if (props.disableOutsideClickClose) return;

		const handlePointerDown = (event: PointerEvent) => {
			const container = draftReviewContainerRef.current;
			const target = event.target as Node | null;
			if (!container || !target) return;

			// If the click is inside the review UI, do nothing.
			if (container.contains(target)) return;

			// Otherwise, do NOT close the review if the user is clicking on other drafting UI
			// (e.g., DraftsExpandedList, research panel, header boxes, or action buttons).
			const targetEl = target instanceof Element ? target : null;
			const isClickInAllowedDraftingUI = targetEl
				? Boolean(
						targetEl.closest(
							[
								// Side preview container (used while regen settings preview is open)
								'[data-draft-review-side-preview]',
								// Campaign header box (title + counts)
								'[data-campaign-header-box]',
								// Mini email structure panel
								'[data-mini-email-hide-text]',
								'[data-mini-email-readonly]',
								// Research panel (standard + narrow layouts)
								'[data-research-panel-container]',
								'[data-contact-research-panel]',
								// Expanded lists / previews (Drafts/Sent/Inbox/etc.)
								'[role="region"][aria-label^="Expanded"]',
								// Draggable EmailGeneration layout
								'[data-draggable-box-id]',
								'[data-drafting-container]',
								// Interactive controls should never dismiss the review pre-emptively
								'button',
								'[role="button"]',
								'a',
								'input',
								'textarea',
								'select',
								'[contenteditable="true"]',
							].join(', ')
						)
				  )
				: false;

			if (isClickInAllowedDraftingUI) return;

			setSelectedDraft(null);
		};

		document.addEventListener('pointerdown', handlePointerDown, true);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown, true);
		};
	}, [selectedDraft, setSelectedDraft, props.disableOutsideClickClose]);

	// Mobile-specific width values (using CSS calc for responsive sizing)
	// 4px margins on each side for edge-to-edge feel
	const mobileEmailRowWidth = 'calc(100vw - 24px)'; // Full width minus padding

	const [showConfirm, setShowConfirm] = useState(false);
	const [isRegenerating, setIsRegenerating] = useState(false);
	const [isRegenSettingsPreviewOpen, setIsRegenSettingsPreviewOpen] = useState(false);
	const [isHoveringAllButton, setIsHoveringAllButton] = useState(false);
	const [hoveredDraftRow, setHoveredDraftRow] = useState<{
		draftId: number;
		region: DraftRowHoverRegion;
	} | null>(null);
	// Track hovered draft index for keyboard navigation (separate from hoveredDraftRow which tracks region)
	const [hoveredDraftIndex, setHoveredDraftIndex] = useState<number | null>(null);
	
	// Used contacts indicator
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);

	// Used-contact hover tooltip ("Appears in" + Go To), matching ContactsSelection behavior.
	const router = useRouter();
	const { campaignId: campaignIdParam } = useParams() as { campaignId?: string };
	const currentCampaignId = useMemo(() => {
		const n = campaignIdParam ? Number(campaignIdParam) : NaN;
		return Number.isFinite(n) ? n : null;
	}, [campaignIdParam]);

	const [hoveredUsedContactId, setHoveredUsedContactId] = useState<number | null>(null);
	const { data: hoveredUsedContactCampaigns } = useGetUsedContactCampaigns(hoveredUsedContactId);
	const [activeUsedContactCampaignIndex, setActiveUsedContactCampaignIndex] = useState<number | null>(null);
	const resolvedUsedContactCampaigns = useMemo(() => {
		const all = hoveredUsedContactCampaigns ?? [];
		const other = currentCampaignId ? all.filter((c) => c.id !== currentCampaignId) : all;
		return other.length ? other : all;
	}, [hoveredUsedContactCampaigns, currentCampaignId]);

	const usedContactAnchorElRef = useRef<HTMLElement | null>(null);
	const usedContactTooltipCloseTimeoutRef = useRef<number | null>(null);
	const [usedContactTooltipPos, setUsedContactTooltipPos] = useState<{
		left: number;
		top: number;
	} | null>(null);

	const getBodyScaleContext = useCallback(() => {
		// In some compact modes (Firefox fallback), `<body>` is scaled via `transform: scale(...)`.
		// In that case, `position: fixed` children of body are positioned in *body coordinates*,
		// while getBoundingClientRect() returns *viewport coordinates*.
		// This helper lets us convert between the two so the tooltip is pixel-perfect.
		const body = document.body;
		const rect = body.getBoundingClientRect();
		const scaleX = body.offsetWidth ? rect.width / body.offsetWidth : 1;
		const scaleY = body.offsetHeight ? rect.height / body.offsetHeight : 1;
		return {
			left: rect.left,
			top: rect.top,
			scaleX: scaleX || 1,
			scaleY: scaleY || 1,
		};
	}, []);

	const clearUsedContactTooltipCloseTimeout = useCallback(() => {
		if (usedContactTooltipCloseTimeoutRef.current !== null) {
			window.clearTimeout(usedContactTooltipCloseTimeoutRef.current);
			usedContactTooltipCloseTimeoutRef.current = null;
		}
	}, []);

	const openUsedContactTooltip = useCallback(
		(contactId: number, anchorEl?: HTMLElement | null) => {
			clearUsedContactTooltipCloseTimeout();
			usedContactAnchorElRef.current = anchorEl ?? null;
			const el = anchorEl ?? null;
			if (el) {
				const rect = el.getBoundingClientRect();
				const bodyCtx = getBodyScaleContext();
				const anchorLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
				const anchorTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
				setUsedContactTooltipPos({
					// Draft dot is positioned at (rowLeft + 8, rowTop + 11).
					// Tooltip should start 49px down from the top of the row box.
					// Tooltip should start 43px to the right of the left edge of the row box:
					// rowLeft = anchorLeft - 8px  =>  rowLeft + 43 = anchorLeft + 35
					left: anchorLeftInBody + 35,
					top: anchorTopInBody + 38,
				});
			}
			// Start with first campaign active, but don't reset if we're already on this contact.
			setActiveUsedContactCampaignIndex((prev) =>
				hoveredUsedContactId === contactId ? (prev ?? 0) : 0
			);
			setHoveredUsedContactId(contactId);
		},
		[clearUsedContactTooltipCloseTimeout, getBodyScaleContext, hoveredUsedContactId]
	);

	const goToUsedContactCampaign = useCallback(
		(contactId: number) => {
			// Only navigate when this contact's hover state is active.
			if (hoveredUsedContactId !== contactId) return;
			if (!resolvedUsedContactCampaigns.length) return;

			const idx = Math.min(
				resolvedUsedContactCampaigns.length - 1,
				Math.max(0, activeUsedContactCampaignIndex ?? 0)
			);
			const selected = resolvedUsedContactCampaigns[idx];
			if (!selected?.id) return;

			router.push(`/murmur/campaign/${selected.id}`);
		},
		[activeUsedContactCampaignIndex, hoveredUsedContactId, resolvedUsedContactCampaigns, router]
	);

	const scheduleCloseUsedContactTooltip = useCallback(
		(contactId: number) => {
			clearUsedContactTooltipCloseTimeout();
			usedContactTooltipCloseTimeoutRef.current = window.setTimeout(() => {
				setHoveredUsedContactId((prev) => (prev === contactId ? null : prev));
			}, 120);
		},
		[clearUsedContactTooltipCloseTimeout]
	);

	useEffect(() => {
		if (hoveredUsedContactId === null) {
			usedContactAnchorElRef.current = null;
			setUsedContactTooltipPos(null);
			setActiveUsedContactCampaignIndex(null);
			return;
		}

		let rafId = 0;
		const update = () => {
			const el = usedContactAnchorElRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const bodyCtx = getBodyScaleContext();

			const anchorLeftInBody = (rect.left - bodyCtx.left) / bodyCtx.scaleX;
			const anchorTopInBody = (rect.top - bodyCtx.top) / bodyCtx.scaleY;
			setUsedContactTooltipPos({
				left: anchorLeftInBody + 35,
				top: anchorTopInBody + 38,
			});
		};

		const schedule = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(update);
		};

		update();
		// Capture scroll from any scroll container.
		window.addEventListener('scroll', schedule, true);
		window.addEventListener('resize', schedule);

		return () => {
			window.removeEventListener('scroll', schedule, true);
			window.removeEventListener('resize', schedule);
			cancelAnimationFrame(rafId);
		};
	}, [getBodyScaleContext, hoveredUsedContactId]);
	const filteredDrafts = useMemo(() => {
		if (props.statusFilter === 'approved') {
			return draftEmails.filter((d) => props.approvedDraftIds?.has(d.id));
		}
		if (props.statusFilter === 'rejected') {
			return draftEmails.filter((d) => props.rejectedDraftIds?.has(d.id));
		}
		return draftEmails;
	}, [draftEmails, props.approvedDraftIds, props.rejectedDraftIds, props.statusFilter]);
	
	// Keyboard navigation for draft list: up/down arrows move keyboard focus between rows
	// This works independently of mouse hover - both can highlight different rows
	const handleDraftListKeyboardNavigation = useCallback((e: KeyboardEvent) => {
		// Only handle up/down arrows
		if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
		
		// Only work if we have a hovered draft and NOT in the review/selected draft view
		if (hoveredDraftIndex === null || selectedDraft) return;
		
		// Check if a text input element is focused (don't intercept typing)
		const activeElement = document.activeElement;
		if (activeElement) {
			const tagName = activeElement.tagName.toLowerCase();
			if (
				tagName === 'input' ||
				tagName === 'textarea' ||
				(activeElement as HTMLElement).isContentEditable
			) {
				return;
			}
		}
		
		e.preventDefault();
		e.stopImmediatePropagation(); // Prevent campaign page tab navigation
		
		// Handle up/down arrows: move keyboard focus between rows
		let newIndex: number;
		if (e.key === 'ArrowUp') {
			newIndex = hoveredDraftIndex > 0 ? hoveredDraftIndex - 1 : filteredDrafts.length - 1;
		} else {
			newIndex = hoveredDraftIndex < filteredDrafts.length - 1 ? hoveredDraftIndex + 1 : 0;
		}
		
		setHoveredDraftIndex(newIndex);
		const newDraft = filteredDrafts[newIndex];
		if (newDraft) {
			// Preserve the current region (left/middle/right) when moving to a new row
			const currentRegion = hoveredDraftRow?.region ?? 'middle';
			setHoveredDraftRow({ draftId: newDraft.id, region: currentRegion });
			// Notify parent about hover for the keyboard-focused row
			const contact = contacts?.find((c) => c.id === newDraft.contactId);
			onContactHover?.(contact ?? null);
			onDraftHover?.(newDraft);
		}
	}, [hoveredDraftIndex, selectedDraft, filteredDrafts, contacts, onContactHover, onDraftHover, hoveredDraftRow]);

	useEffect(() => {
		// Only add listener if we have a hovered draft and not in review mode
		if (hoveredDraftIndex === null || selectedDraft) return;
		
		// Use capture phase to run before campaign page handler
		document.addEventListener('keydown', handleDraftListKeyboardNavigation, true);
		return () => {
			document.removeEventListener('keydown', handleDraftListKeyboardNavigation, true);
		};
	}, [hoveredDraftIndex, selectedDraft, handleDraftListKeyboardNavigation]);

	const approvedCount = props.approvedDraftIds?.size ?? 0;
	const rejectedCount = props.rejectedDraftIds?.size ?? 0;
	const allFilteredSelected =
		filteredDrafts.length > 0 &&
		filteredDrafts.every((draft) => selectedDraftIds.has(draft.id));
	const selectedCount = selectedDraftIds.size;
	const hasSelection = selectedCount > 0;
	const toCount = selectedCount; // used in confirmation details
	const subjectPreview = useMemo(() => props.subject || '', [props.subject]);
	const hasDrafts = filteredDrafts.length > 0;

	const handleNavigateDraft = useCallback(
		(direction: 'previous' | 'next') => {
			if (!hasDrafts) return;

			const totalDrafts = draftEmails.length;
			const currentIndex = selectedDraft
				? draftEmails.findIndex((draft) => draft.id === selectedDraft.id)
				: -1;

			if (currentIndex === -1) {
				const fallbackIndex = direction === 'next' ? 0 : totalDrafts - 1;
				handleDraftDoubleClick(draftEmails[fallbackIndex]);
				return;
			}

			const nextIndex =
				direction === 'next'
					? (currentIndex + 1) % totalDrafts
					: (currentIndex - 1 + totalDrafts) % totalDrafts;

			handleDraftDoubleClick(draftEmails[nextIndex]);
		},
		[draftEmails, handleDraftDoubleClick, hasDrafts, selectedDraft]
	);

	const handleNavigatePrevious = useCallback(
		() => handleNavigateDraft('previous'),
		[handleNavigateDraft]
	);

	const handleNavigateNext = useCallback(
		() => handleNavigateDraft('next'),
		[handleNavigateDraft]
	);

	// Keyboard navigation for draft review UI:
	// - Escape: if regen settings preview is open, exit regen view; otherwise close the review and return to drafts list
	// - ArrowUp/ArrowDown: navigate between drafts (when not in text entry)
	useEffect(() => {
		if (!selectedDraft) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.stopImmediatePropagation(); // Prevent campaign page tab navigation
				// Side preview override: allow parent to decide what "close" means in this context.
				if (props.onDraftReviewCloseOverride) {
					props.onDraftReviewCloseOverride();
					return;
				}

				// In regenerate view, Esc should exit regen preview (back to the normal editor / approve-reject view),
				// not close the entire draft review UI.
				if (isRegenSettingsPreviewOpen) {
					setIsRegenSettingsPreviewOpen(false);
					return;
				}

				handleBack();
				return;
			}

			// Check if user is currently in a text entry field
			const activeElement = document.activeElement;
			const isTextEntry =
				activeElement instanceof HTMLInputElement ||
				activeElement instanceof HTMLTextAreaElement ||
				activeElement?.getAttribute('contenteditable') === 'true';

			if (isTextEntry) return;

			if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
				event.preventDefault();
				event.stopImmediatePropagation(); // Prevent campaign page tab navigation
				handleNavigatePrevious();
			} else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
				event.preventDefault();
				event.stopImmediatePropagation(); // Prevent campaign page tab navigation
				handleNavigateNext();
			}
		};

		// Use capture phase to ensure this handler runs before the campaign page's tab navigation handler
		document.addEventListener('keydown', handleKeyDown, true);
		return () => {
			document.removeEventListener('keydown', handleKeyDown, true);
		};
	}, [
		selectedDraft,
		handleBack,
		handleNavigatePrevious,
		handleNavigateNext,
		isRegenSettingsPreviewOpen,
		props.onDraftReviewCloseOverride,
	]);

	const handleRegenerateSelectedDrafts = useCallback(async () => {
		if (!props.onRegenerateDraft) return;
		const selected = filteredDrafts.filter((d) => selectedDraftIds.has(d.id));
		for (const draft of selected) {
			// Sequential to reuse existing regeneration flow with existing toasts
			// and state updates.
			await props.onRegenerateDraft(draft);
		}
	}, [filteredDrafts, props, selectedDraftIds]);

	const handleRegenerate = useCallback(async () => {
		if (!selectedDraft || !onRegenerateDraft || isRegenerating) return;

		// First click: open the embedded prompt/settings preview so the user can confirm settings.
		// Second click (while preview is open): confirm and run regeneration.
		if (!isRegenSettingsPreviewOpen) {
			setIsRegenSettingsPreviewOpen(true);
			return;
		}
		
		const targetDraftId = selectedDraft.id;
		setIsRegenerating(true);
		let didUpdateDraft = false;
		try {
			const result = await onRegenerateDraft(selectedDraft);
			if (result) {
				// If the user switched drafts while regeneration was running, don't apply UI updates.
				if (selectedDraftIdRef.current !== targetDraftId) return;

				// Update the local state with the regenerated content
				didUpdateDraft = true;
				setEditedSubject(result.subject);
				setEditedMessage(result.message);
				// Also update the selectedDraft to reflect the new content
				setSelectedDraft((prev) => {
					if (!prev || prev.id !== targetDraftId) return prev;
					return {
						...prev,
						subject: result.subject,
						message: result.message,
					};
				});
			}
		} finally {
			// Only exit regen mode if we actually got regenerated content back.
			// Close regen preview first to avoid briefly flashing the settings UI again.
			if (didUpdateDraft) {
				setIsRegenSettingsPreviewOpen(false);
			}
			setIsRegenerating(false);
		}
	}, [selectedDraft, onRegenerateDraft, isRegenerating, isRegenSettingsPreviewOpen, setEditedSubject, setEditedMessage, setSelectedDraft]);

	// Reset the regen settings preview any time the selected draft changes (or closes).
	useEffect(() => {
		setIsRegenSettingsPreviewOpen(false);
	}, [selectedDraft?.id]);

	// Notify parent when the embedded regen settings preview is opened/closed.
	useEffect(() => {
		props.onRegenSettingsPreviewOpenChange?.(isRegenSettingsPreviewOpen);
	}, [isRegenSettingsPreviewOpen, props.onRegenSettingsPreviewOpenChange]);

	useImperativeHandle(
		ref,
		() => ({
			exitRegenSettingsPreview: () => setIsRegenSettingsPreviewOpen(false),
		}),
		[]
	);

	const handleDraftReviewCloseButtonClick = useCallback(() => {
		// Side preview override: allow parent to decide what "close" means in this context.
		if (props.onDraftReviewCloseOverride) {
			props.onDraftReviewCloseOverride();
			return;
		}

		// When we're in regenerate settings preview mode, the "-" button should exit regen mode
		// (back to the normal editor / approve-reject view), not close the draft entirely.
		if (isRegenSettingsPreviewOpen) {
			setIsRegenSettingsPreviewOpen(false);
			return;
		}

		handleBack();
	}, [props.onDraftReviewCloseOverride, isRegenSettingsPreviewOpen, handleBack]);

	if (selectedDraft) {
		const contact = contacts?.find((c) => c.id === selectedDraft.contactId);
		const contactTitle = contact?.headline || contact?.title || '';
		// Check if we have a separate name (not just company)
		const hasName = Boolean(
			contact?.name?.trim() ||
			contact?.firstName?.trim() ||
			contact?.lastName?.trim()
		);
		const displayName = contact
			? contact.name?.trim() ||
			  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			  ''
			: '';
		const companyName = contact?.company || '';
		const fullStateName = (contact?.state as string) || '';
		const stateAbbr = getStateAbbreviation(fullStateName) || '';
		const normalizedState = fullStateName.trim();
		const lowercaseCanadianProvinceNames = canadianProvinceNames.map((s) => s.toLowerCase());
		const isCanadianProvince =
			lowercaseCanadianProvinceNames.includes(normalizedState.toLowerCase()) ||
			canadianProvinceAbbreviations.includes(normalizedState.toUpperCase()) ||
			canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
		const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);
		const isDraftApproved = props.approvedDraftIds?.has(selectedDraft.id) ?? false;
		const isDraftRejected = props.rejectedDraftIds?.has(selectedDraft.id) ?? false;
		const hasStatusBar =
			(isDraftApproved || isDraftRejected) && !isRegenSettingsPreviewOpen;
		// Keep the bottom strip (Send / Delete + dividers) a consistent height across drafts.
		// When a status bar is present, the editor container is shorter; we compensate by slightly
		// increasing the body box height so the remaining bottom strip stays the same "small" height.
		const bottomStripTop = hasStatusBar ? '574px' : '625px';
		const isNarrowestDesktop = props.isNarrowestDesktop ?? false;
		const isNarrowDesktop = props.isNarrowDesktop ?? false;
		const showBottomCounter =
			!props.hideDraftReviewCounter && (isNarrowestDesktop || isNarrowDesktop);
		// Show tab navigation arrows only on narrow desktop; hide them on the
		// narrowest breakpoint when the draft review (Approve/Reject) view is open.
		const showTabNavArrows = showBottomCounter && !isNarrowestDesktop;
		// Keep the tab navigation arrows aligned with the "Send" button + arrows row
		// rendered by DraftingSection at the same breakpoint.
		const tabNavGap = '29px';
		const tabNavMiddleWidth = '691px';

			return (
			<div
				ref={draftReviewContainerRef}
				className={cn("flex flex-col items-center", isMobile && "w-full px-1")}
				data-hover-description="Revise your draft here. Type out your revisions. Approve and Reject Drafts"
			>
				<div style={{ 
					width: isMobile ? 'calc(100vw - 8px)' : '499px', 
					height: isMobile ? 'calc(100dvh - 160px)' : '703px', 
					position: 'relative' 
				}}>
				{/* Counter box - above preview on wide screens, bottom-left corner on narrow/narrowest breakpoint, hidden on mobile */}
				{!props.hideDraftReviewCounter && !showBottomCounter && !isMobile && (
					<div
						style={{
							position: 'absolute',
							top: '-31px',
							left: '50%',
							transform: 'translateX(-50%)',
							width: '95px',
							height: '21px',
							border: '2px solid #000000',
							borderRadius: '8px',
							backgroundColor: 'transparent',
							zIndex: 10,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: '8px',
						}}
					>
						{/* Approved count */}
						<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
							<span className="font-bold text-[12px] text-black" style={{ fontFamily: 'Times New Roman, serif' }}>{approvedCount}</span>
							<ApproveCheckIcon width={12} height={9} className="text-black" />
						</div>
						{/* Rejected count */}
						<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
							<span className="font-bold text-[12px] text-black" style={{ fontFamily: 'Times New Roman, serif' }}>{rejectedCount}</span>
							<RejectXIcon width={10} height={10} className="text-black" />
						</div>
					</div>
				)}
				{/* Container box with header - matching the table view */}
				<div
					style={{
						width: '100%',
						height: '100%',
						border: '3px solid #000000',
						borderRadius: '8px',
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					{/* Header section with top rounded corners */}
					<div
						style={{
							borderTopLeftRadius: '8px',
							borderTopRightRadius: '8px',
							borderBottomWidth: isRegenSettingsPreviewOpen ? '0px' : '2px',
							borderBottomStyle: isRegenSettingsPreviewOpen ? 'none' : 'solid',
							borderBottomColor: '#000000',
							// Keep header a consistent height in both cases (company-only vs company+name)
							// while still giving enough vertical room so text doesn't get clipped.
							padding: '8px 16px',
							boxSizing: 'border-box',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							height: '48px',
							backgroundColor: '#FFE4B5',
							position: 'relative',
						}}
					>
						{/* Close button */}
						<Button
							type="button"
							variant="ghost"
							onClick={handleDraftReviewCloseButtonClick}
							className="absolute rounded z-10 flex items-center justify-center hover:bg-transparent"
							style={{ 
								top: '17px', 
								right: '21px',
								padding: '8px 12px',
								margin: '-8px -12px',
								width: 'auto',
								height: 'auto'
							}}
						>
							<div style={{ width: '16px', height: '2px', backgroundColor: '#000000' }} />
						</Button>
						<div style={{
							display: 'flex',
							flexDirection: 'column',
							justifyContent: 'center',
							alignSelf: 'stretch',
							// Let company/name use more of the header before the right-side state/title pills.
							// (Right block starts at ~284px from the left inside a 499px header; 268px keeps us flush without overlap.)
							maxWidth: isMobile ? 'calc(100% - 40px)' : '268px',
							overflow: 'hidden',
							transform: 'translateY(-1px)',
						}}>
							{hasName && companyName ? (
								<>
									<div 
										className="font-inter font-bold text-black leading-none whitespace-nowrap overflow-hidden"
										style={{ 
											fontSize: '17px',
											lineHeight: '18px',
											WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
											maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
										}}
									>
										{companyName}
									</div>
									<div 
										className="font-inter font-normal text-black leading-none whitespace-nowrap overflow-hidden"
										style={{ 
											fontSize: '11px', 
											lineHeight: '12px',
											marginTop: '1px',
											WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
											maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
										}}
									>
										{displayName}
									</div>
								</>
							) : (
								<div 
									className="font-inter font-bold text-black leading-none whitespace-nowrap overflow-hidden"
									style={{ 
										fontSize: '17px',
										lineHeight: '18px',
										WebkitMaskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
										maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
									}}
								>
									{companyName || displayName || 'Unknown Contact'}
								</div>
							)}
						</div>
						<div
							className={cn("flex flex-col items-start", isMobile && "hidden")}
							style={{
								position: 'absolute',
								right: '63px',
								bottom: '7px',
								width: '152px',
							}}
						>
							<div
								className="flex items-center justify-start gap-2 w-full"
								style={{ marginBottom: contactTitle ? '2px' : 0 }}
							>
								{stateAbbr ? (
									isCanadianProvince ? (
										<div
											className="inline-flex items-center justify-center rounded-[4px] border border-black overflow-hidden flex-shrink-0"
											style={{ width: '28px', height: '15px' }}
											title="Canadian province"
										>
											<CanadianFlag width="100%" height="100%" className="w-full h-full" />
										</div>
									) : isUSAbbr ? (
										<span
											className="inline-flex items-center justify-center rounded-[4px] border text-[12px] leading-none font-bold flex-shrink-0"
											style={{
												width: '28px',
												height: '15px',
												backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
												borderColor: '#000000',
											}}
										>
											{stateAbbr}
										</span>
									) : (
										<span
											className="inline-flex items-center justify-center rounded-[6px] border flex-shrink-0"
											style={{ width: '39px', height: '20px', borderColor: '#000000' }}
										/>
									)
								) : null}

								{contact?.city ? (
									<div
										className="text-[12px] font-inter text-black leading-none truncate"
										style={{
											maxWidth: '160px',
											WebkitMaskImage:
												'linear-gradient(90deg, #000 92%, transparent 100%)',
											maskImage: 'linear-gradient(90deg, #000 92%, transparent 100%)',
										}}
									>
										{contact.city}
									</div>
								) : null}
							</div>
							{contactTitle ? (
								<div
									className="rounded-[6px] border border-black px-2 flex items-center gap-1 justify-start"
									style={{
										width: '152px',
										height: '18px',
										backgroundColor: isRestaurantTitle(contactTitle)
											? '#C3FBD1'
											: isCoffeeShopTitle(contactTitle)
												? '#D6F1BD'
												: isMusicVenueTitle(contactTitle)
													? '#B7E5FF'
													: isMusicFestivalTitle(contactTitle)
														? '#C1D6FF'
														: (isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle))
															? '#FFF2BC'
															: isWineBeerSpiritsTitle(contactTitle)
																? '#BFC4FF'
																: '#E8EFFF',
									}}
								>
									{isRestaurantTitle(contactTitle) && (
										<RestaurantsIcon size={12} />
									)}
									{isCoffeeShopTitle(contactTitle) && (
										<CoffeeShopsIcon size={7} />
									)}
									{isMusicVenueTitle(contactTitle) && (
										<MusicVenuesIcon size={12} className="flex-shrink-0" />
									)}
									{isMusicFestivalTitle(contactTitle) && (
										<FestivalsIcon size={12} className="flex-shrink-0" />
									)}
									{(isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle)) && (
										<WeddingPlannersIcon size={12} />
									)}
									{isWineBeerSpiritsTitle(contactTitle) && (
										<WineBeerSpiritsIcon size={12} className="flex-shrink-0" />
									)}
									<ScrollableText
										text={
											isRestaurantTitle(contactTitle)
												? 'Restaurant'
												: isCoffeeShopTitle(contactTitle)
													? 'Coffee Shop'
													: isMusicVenueTitle(contactTitle)
														? 'Music Venue'
														: isMusicFestivalTitle(contactTitle)
															? 'Music Festival'
															: isWeddingPlannerTitle(contactTitle)
																? 'Wedding Planner'
																: isWeddingVenueTitle(contactTitle)
																	? 'Wedding Venue'
																	: isWineBeerSpiritsTitle(contactTitle)
																		? getWineBeerSpiritsLabel(contactTitle) ?? contactTitle
																		: contactTitle
										}
										className="text-[11px] font-inter text-black leading-none w-full"
									/>
								</div>
							) : null}
						</div>
					</div>

					{/* Approved status bar - 6px from header, 11px above subject box */}
					{!isRegenSettingsPreviewOpen && isDraftApproved && (
						<div
							style={{
								backgroundColor: '#FFDC9E',
								paddingTop: '6px',
								paddingBottom: '11px',
							}}
						>
							<div
								style={{
									height: '30px',
									backgroundColor: '#8FC981',
									display: 'flex',
									alignItems: 'center',
									paddingLeft: '12px',
									borderTop: '2px solid #000000',
									borderBottom: '2px solid #000000',
									position: 'relative',
								}}
							>
								<span className="font-inter font-semibold text-[14px] text-black">
									Approved
								</span>
								<span 
									className="font-inter font-medium text-[14px] text-black" 
									style={{ 
										position: 'absolute', 
										left: '50%', 
										transform: 'translateX(-50%)',
										textAlign: 'center',
									}}
								>
									Send this Email
								</span>
								{/* Left divider - 54px from right edge (15px + 39px) */}
								<div
									style={{
										position: 'absolute',
										right: '54px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
								{/* Send button container - between the two dividers */}
								<button
									type="button"
									className="font-inter font-semibold text-[9px] text-black hover:bg-[#4a9d41] flex items-center justify-center"
									style={{
										position: 'absolute',
										right: '17px',
										width: '37px',
										height: '100%',
										backgroundColor: '#59B44E',
										border: 'none',
										cursor: props.isSendingDisabled ? 'not-allowed' : 'pointer',
										opacity: props.isSendingDisabled ? 0.6 : 1,
									}}
									disabled={props.isSendingDisabled}
									onClick={() => {
										if (!selectedDraft || props.isSendingDisabled) return;
										props.setSelectedDraftIds(new Set([selectedDraft.id]));
										void props.onSend([selectedDraft.id]);
									}}
								>
									Send
								</button>
								{/* Right divider - 15px from right edge */}
								<div
									style={{
										position: 'absolute',
										right: '15px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
							</div>
						</div>
					)}

					{/* Rejected status bar - 6px from header, 11px above subject box */}
					{!isRegenSettingsPreviewOpen && isDraftRejected && (
						<div
							style={{
								backgroundColor: '#FFDC9E',
								paddingTop: '6px',
								paddingBottom: '11px',
							}}
						>
							<div
								style={{
									height: '30px',
									backgroundColor: '#E8A0A0',
									display: 'flex',
									alignItems: 'center',
									paddingLeft: '12px',
									borderTop: '2px solid #000000',
									borderBottom: '2px solid #000000',
									position: 'relative',
								}}
							>
								<span className="font-inter font-semibold text-[14px] text-black">
									Rejected
								</span>
								<span 
									className="font-inter font-medium text-[14px] text-black" 
									style={{ 
										position: 'absolute', 
										left: '50%', 
										transform: 'translateX(-50%)',
										textAlign: 'center',
									}}
								>
									Delete this Email
								</span>
								{/* Left divider - 54px from right edge (15px + 39px) */}
								<div
									style={{
										position: 'absolute',
										right: '54px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
								{/* Delete button container - between the two dividers */}
								<button
									type="button"
									className="font-inter font-semibold text-[9px] text-black hover:bg-[#c44a4a] flex items-center justify-center"
									style={{
										position: 'absolute',
										right: '17px',
										width: '37px',
										height: '100%',
										backgroundColor: '#D65C5C',
										border: 'none',
										cursor: isPendingDeleteEmail ? 'not-allowed' : 'pointer',
										opacity: isPendingDeleteEmail ? 0.6 : 1,
									}}
									disabled={isPendingDeleteEmail}
									onClick={async (e) => {
										if (selectedDraft) {
											await handleDeleteDraft(e, selectedDraft.id);
											setSelectedDraft(null);
										}
									}}
								>
									Delete
								</button>
								{/* Right divider - 15px from right edge */}
								<div
									style={{
										position: 'absolute',
										right: '15px',
										top: 0,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
									}}
								/>
							</div>
						</div>
					)}

					{/* Editor container */}
					<div
						className="flex-1 overflow-hidden flex flex-col relative"
						data-lenis-prevent
						style={{
							margin: '0',
							border: 'none',
							padding: isRegenSettingsPreviewOpen
								? '0'
								: hasStatusBar
									? '0 4px 12px 4px'
									: '6px 4px 12px 4px',
							borderBottomLeftRadius: '5px',
							borderBottomRightRadius: '5px',
							backgroundColor: isRegenSettingsPreviewOpen ? '#FFE3B3' : '#FFDC9E',
						}}
					>
						{!isRegenSettingsPreviewOpen && (
							<>
								{/* Vertical divider line 20px from right - bottom area only */}
								<div
									style={{
										position: 'absolute',
										right: '20px',
										top: bottomStripTop,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
										pointerEvents: 'none',
										zIndex: 6,
									}}
								/>
								{/* Bottom-left breadcrumb label (Drafts > Contact) */}
								{!isMobile && !showBottomCounter && (
									<div
										className="absolute flex items-center font-inter font-normal text-[11px] text-black leading-none"
										style={{
											left: '12px',
											right: '212px', // stop before the Send/Delete dividers
											top: bottomStripTop,
											bottom: 0,
											paddingRight: '12px',
											pointerEvents: 'none',
											WebkitMaskImage:
												'linear-gradient(90deg, #000 92%, transparent 100%)',
											maskImage: 'linear-gradient(90deg, #000 92%, transparent 100%)',
										}}
									>
										<button
											type="button"
											aria-label="Back to drafts list"
											className="whitespace-nowrap cursor-pointer underline-offset-2 hover:underline"
											style={{ pointerEvents: 'auto' }}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												handleBack();
											}}
										>
											Drafts
										</button>
										<span className="mx-[10px] whitespace-nowrap">{'>'}</span>
										<span className="min-w-0 truncate">
											{displayName || companyName || 'Unknown Contact'}
										</span>
									</div>
								)}
								{/* Double divider between Delete and Send (two equal-width lines) */}
								<div
									style={{
										position: 'absolute',
										right: '114px', // flush with Delete's left edge
										top: bottomStripTop,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
										pointerEvents: 'none',
										zIndex: 5,
									}}
								/>
								<div
									style={{
										position: 'absolute',
										// Place the second line so its left edge aligns with Send's right edge (119px).
										// With a 2px width, `right: 118px` yields left edge at 120px.
										right: '118px',
										top: bottomStripTop,
										bottom: 0,
										width: '2px',
										backgroundColor: '#000000',
										pointerEvents: 'none',
										zIndex: 5,
									}}
								/>
								{/* Delete button between lines */}
								<button
									type="button"
									onClick={async (e) => {
										if (selectedDraft) {
											await handleDeleteDraft(e, selectedDraft.id);
											setSelectedDraft(null);
										}
									}}
									disabled={isPendingDeleteEmail}
									className="absolute font-inter text-[14px] font-normal text-black hover:bg-[#E17272] hover:text-white flex items-center justify-center transition-colors leading-none"
									style={{
										right: '20px',
										width: '94px',
										top: bottomStripTop,
										bottom: 0,
									}}
								>
									{isPendingDeleteEmail ? '...' : 'Delete'}
								</button>
									{/* Fourth divider line 92px to the left of the third one (119 + 92 = 211) */}
									<div
										style={{
											position: 'absolute',
											right: '212px',
											top: bottomStripTop,
											bottom: 0,
											width: '1.5px',
											backgroundColor: '#000000',
										}}
									/>
								{/* Send button between lines */}
								<button
									type="button"
									onClick={() => {
										if (!selectedDraft || props.isSendingDisabled) return;
										props.setSelectedDraftIds(new Set([selectedDraft.id]));
										void props.onSend([selectedDraft.id]);
									}}
									disabled={props.isSendingDisabled}
									className="absolute font-inter text-[14px] font-normal text-black hover:bg-[#83C37C] hover:text-white flex items-center justify-center transition-colors leading-none"
									style={{
										right: '120px',
										width: '92px',
										top: bottomStripTop,
										bottom: 0,
									}}
								>
									Send
								</button>
								{/* Counter in bottom-left corner - at narrow/narrowest breakpoint */}
								{showBottomCounter && (
									<>
										{/* Left divider for counter */}
										<div
											style={{
												position: 'absolute',
												left: '35px',
												top: bottomStripTop,
												bottom: 0,
												width: '2px',
												backgroundColor: '#000000',
											}}
										/>
										<div
											className="absolute flex items-center justify-center gap-[8px]"
											style={{
												left: '35px',
												width: '95px',
												top: bottomStripTop,
												bottom: 0,
											}}
										>
											{/* Approved count */}
											<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
												<span
													className="font-bold text-[12px] text-black"
													style={{ fontFamily: 'Times New Roman, serif' }}
												>
													{approvedCount}
												</span>
												<ApproveCheckIcon width={12} height={9} className="text-black" />
											</div>
											{/* Rejected count */}
											<div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
												<span
													className="font-bold text-[12px] text-black"
													style={{ fontFamily: 'Times New Roman, serif' }}
												>
													{rejectedCount}
												</span>
												<RejectXIcon width={10} height={10} className="text-black" />
											</div>
										</div>
										{/* Right divider for counter */}
										<div
											style={{
												position: 'absolute',
												left: '130px',
												top: bottomStripTop,
												bottom: 0,
												width: '2px',
												backgroundColor: '#000000',
											}}
										/>
									</>
								)}
							</>
						)}
						{isRegenSettingsPreviewOpen && !isMobile && !showBottomCounter && (
							<>
								{/* Bottom-left breadcrumb label (Drafts > Contact > Regenerate) */}
								<div
									className="absolute flex items-center font-inter font-normal text-[11px] text-black leading-none"
									style={{
										left: '12px',
										right: '12px',
										top: bottomStripTop,
										bottom: 0,
										paddingRight: '12px',
										pointerEvents: 'none',
										overflow: 'hidden',
										zIndex: 6,
									}}
								>
									<button
										type="button"
										aria-label="Back to drafts list"
										className="whitespace-nowrap flex-shrink-0 cursor-pointer underline-offset-2 hover:underline"
										style={{ pointerEvents: 'auto' }}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											handleBack();
										}}
									>
										Drafts
									</button>
									<span className="mx-[10px] whitespace-nowrap flex-shrink-0">{'>'}</span>
									<button
										type="button"
										aria-label="Back to draft review"
										className="min-w-0 truncate cursor-pointer text-left underline-offset-2 hover:underline"
										style={{ pointerEvents: 'auto' }}
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											setIsRegenSettingsPreviewOpen(false);
										}}
									>
										{displayName || companyName || 'Unknown Contact'}
									</button>
									<span className="mx-[10px] whitespace-nowrap flex-shrink-0">{'>'}</span>
									<span className="whitespace-nowrap flex-shrink-0">Regenerate</span>
								</div>
							</>
						)}

						{isRegenSettingsPreviewOpen ? (
							isRegenerating ? (
								// While regenerating, show the same "blank wave" animation style
								// used by the Write tab Test Preview box (instead of a static settings UI).
								<div
									className="flex flex-col items-center flex-1"
									style={{ paddingTop: '6px', paddingBottom: '12px' }}
									aria-label="Regenerating draft"
								>
									{/* Subject placeholder */}
									<div
										className="border-2 border-black rounded-[7px] overflow-hidden test-preview-blank-wave-subject"
										style={{
											width: isMobile ? 'calc(100% - 16px)' : '484px',
											height: '39px',
											marginBottom: '8px',
										}}
									/>
									{/* Body placeholder */}
									<div
										className="border-2 border-black rounded-[7px] overflow-hidden test-preview-blank-wave-body"
										style={{
											width: isMobile ? 'calc(100% - 16px)' : '484px',
											height: '572px',
											flex: isMobile ? 1 : undefined,
										}}
									/>
								</div>
							) : (
								<div className="flex justify-center flex-1">
									<HybridPromptInput
										contact={contact || null}
										identity={props.identity ?? null}
										onIdentityUpdate={props.onIdentityUpdate}
										hideDraftButton
										hideGenerateTestButton
										hideProfileBottomMiniBox
										clipProfileTabOverflow
										manualEntryHeightPx={550}
										containerHeightPx={625}
										useStaticDropdownPosition
										hideMobileStickyTestFooter
										dataCampaignMainBox={null}
									/>
								</div>
							)
						) : (
							<>
								{/* Subject input */}
								<div
									className="flex justify-center"
									style={{
										marginBottom: '8px',
										padding: isMobile ? '0 8px' : undefined,
									}}
								>
									<input
										type="text"
										value={editedSubject}
										onChange={(e) => setEditedSubject(e.target.value)}
										className="font-inter text-[14px] font-extrabold bg-white border-2 border-black rounded-[7px] px-2 focus:outline-none focus:ring-0"
										style={{ width: isMobile ? '100%' : '484px', height: '39px' }}
									/>
								</div>

								{/* Message editor - rich text for links, plain textarea otherwise */}
								<div
									className="flex justify-center flex-1"
									style={{ padding: isMobile ? '0 8px' : undefined }}
								>
									<div
										className="bg-white border-2 border-black rounded-[7px] overflow-visible draft-review-box"
										style={{
											width: isMobile ? '100%' : '484px',
											height: hasStatusBar ? '527px' : '572px',
											flex: isMobile ? 1 : undefined,
										}}
										data-hover-description="Revise your draft here. Type out your revisions. Approve and Reject Drafts"
									>
										{/* Check if original message has links - if so, use RichTextEditor for proper link editing */}
										{selectedDraft?.message && /<a\s+[^>]*href=/i.test(selectedDraft.message) ? (
											<div
												data-hover-description="Revise your draft here. Type out your revisions. Approve and Reject Drafts"
												className="w-full h-full"
											>
												<CustomScrollbar
													className="w-full h-full"
													thumbWidth={2}
													thumbColor="#000000"
													offsetRight={-6}
													contentClassName="[&_.ProseMirror]:min-h-full [&_.ProseMirror]:border-0 [&_.ProseMirror]:bg-transparent [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:focus:outline-none"
												>
													<RichTextEditor
														value={editedMessage}
														onChange={setEditedMessage}
														hideMenuBar
														className="w-full h-full border-0 bg-transparent !min-h-0 text-sm"
														placeholder="Type your message here..."
													/>
												</CustomScrollbar>
											</div>
										) : (
											<ScrollableTextarea
												value={editedMessage}
												onChange={(e) => setEditedMessage(e.target.value)}
												className="w-full h-full p-3 text-sm resize-none focus:outline-none focus:ring-0 bg-transparent border-0 whitespace-pre-wrap"
												placeholder="Type your message here..."
												thumbWidth={2}
												thumbColor="#000000"
												trackOffset={-6}
												data-hover-description="Revise your draft here. Type out your revisions. Approve and Reject Drafts"
											/>
										)}
									</div>
								</div>
							</>
						)}

						{/* Save and Delete buttons - hidden for now */}
						<div className="hidden mt-3 flex justify-end gap-2">
							<Button
								type="button"
								onClick={handleSave}
								disabled={isPendingUpdate}
								className="w-[100px] font-secondary h-[20px] bg-primary/50 border border-primary rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-primary/60 hover:border-primary-dark active:bg-primary/70 transition-colors"
							>
								{isPendingUpdate ? '...' : 'Save'}
							</Button>
							<Button
								type="button"
								onClick={async (e) => {
									if (selectedDraft) {
										await handleDeleteDraft(e, selectedDraft.id);
										setSelectedDraft(null);
									}
								}}
								disabled={isPendingDeleteEmail}
								className="font-secondary w-[100px] h-[20px] bg-destructive/50 border border-destructive rounded-[8px] text-black text-[11px] font-medium flex items-center justify-center hover:bg-destructive/60 hover:border-destructive-dark active:bg-destructive/70 transition-colors"
							>
								{isPendingDeleteEmail ? '...' : 'Delete'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{!props.hideDraftReviewActionRow && (
			<div
				className="flex items-center justify-center"
				style={{
					marginTop: isMobile ? '12px' : '22px',
					// Ensure this row has a stable width so centering math is correct
					// (otherwise it can shrink-to-fit in narrow layouts and appear shifted right).
					width: '100%',
					// For narrow desktop (two-column layout), shift left by 170px to center on page
					// For narrowest desktop (single-column), no shift needed as layout is already centered
					...(isNarrowDesktop && !isMobile ? { transform: 'translateX(-170px)' } : {}),
					...(showTabNavArrows && !isMobile ? { gap: tabNavGap } : {}),
				}}
			>
				{/* Tab navigation left arrow - only in narrow breakpoints, hidden on mobile */}
				{showTabNavArrows && !isMobile && props.goToPreviousTab && !isRegenSettingsPreviewOpen && (
					<button
						type="button"
						onClick={props.goToPreviousTab}
						className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
						aria-label="Previous tab"
					>
						<LeftArrow width="20" height="39" />
					</button>
				)}
				{/* Inner container with draft navigation and buttons */}
				<div
					className="flex items-center justify-center flex-shrink-0"
					style={
						isRegenSettingsPreviewOpen
							? { width: '100%' }
							: showTabNavArrows && !isMobile
								? { width: tabNavMiddleWidth }
								: undefined
					}
				>
					{isRegenSettingsPreviewOpen ? (
						<div className="relative w-full flex items-center justify-center">
							<button
								type="button"
								onClick={() => setIsRegenSettingsPreviewOpen(false)}
								aria-label="Back"
								className="absolute left-0 top-0 bottom-0 p-0 bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
							>
								<LeftArrowReviewIcon />
							</button>
							<Button
								type="button"
								variant="ghost"
								className={cn(
									"font-secondary font-semibold text-black border-[2px] border-black transition enabled:hover:brightness-95",
									isRegenerating && "disabled:opacity-100",
									isMobile ? "text-[12px]" : "text-[14px]"
								)}
								style={{
									width: isMobile ? 'calc(100vw - 140px)' : '397px',
									maxWidth: '397px',
									height: isMobile ? '36px' : '40px',
									borderRadius: '8px',
									backgroundColor: isRegenerating ? '#FEF3E0' : '#FFDC9E',
								}}
								data-hover-description="Regenerate this email using the settings shown above"
								onClick={handleRegenerate}
								disabled={isRegenerating || !onRegenerateDraft}
							>
								{isRegenerating ? (
									<span className="sr-only">Regenerating...</span>
								) : (
									'Regenerate'
								)}
							</Button>
						</div>
					) : (
						<>
							<button
								type="button"
								onClick={handleNavigatePrevious}
								disabled={!hasDrafts}
								aria-label="View previous draft"
								className="p-0 bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
								style={{ marginRight: isMobile ? '10px' : '20px' }}
							>
								<LeftArrowReviewIcon />
							</button>
							<div className="flex" style={{ gap: isMobile ? '6px' : '13px' }}>
								<Button
									type="button"
									variant="ghost"
									className={cn(
										"font-secondary font-semibold text-black border-[2px] border-black rounded-none transition enabled:hover:brightness-95",
										isMobile ? "text-[12px]" : "text-[14px]"
									)}
									style={{
										width: isMobile ? '80px' : '124px',
										height: isMobile ? '36px' : '40px',
										borderTopLeftRadius: '8px',
										borderBottomLeftRadius: '8px',
										backgroundColor: '#D5FFCB',
									}}
									data-hover-description="Approve you draft. This draft turned out good"
									onClick={() => {
										if (selectedDraft) {
											const isCurrentlyApproved =
												props.approvedDraftIds?.has(selectedDraft.id) ?? false;
											props.onApproveDraft?.(selectedDraft.id, isCurrentlyApproved);
											// Only navigate to next if we're approving, not toggling off
											if (!isCurrentlyApproved) {
												handleNavigateNext();
											}
										}
									}}
								>
									<span>Approve</span>
									{!isMobile && <ApproveCheckIcon />}
								</Button>
								<Button
									type="button"
									variant="ghost"
									className={cn(
										"font-secondary font-semibold text-black border-[2px] border-black rounded-none transition enabled:hover:brightness-95",
										isRegenerating && "disabled:opacity-100",
										isMobile ? "text-[12px]" : "text-[14px]"
									)}
									style={{
										width: isMobile ? '80px' : '124px',
										height: isMobile ? '36px' : '40px',
										backgroundColor: isRegenerating ? '#FEF3E0' : '#FFDC9E',
									}}
									data-hover-description="Click to preview your prompt/settings before regenerating this draft"
									onClick={handleRegenerate}
									disabled={isRegenerating || !onRegenerateDraft}
								>
									{isRegenerating ? (
										<span className="sr-only">Regenerating...</span>
									) : isMobile ? (
										'Regen'
									) : (
										'Regenerate'
									)}
								</Button>
								<Button
									type="button"
									variant="ghost"
									className={cn(
										"font-secondary font-semibold text-black border-[2px] border-black rounded-none transition enabled:hover:brightness-95",
										isMobile ? "text-[12px]" : "text-[14px]"
									)}
									style={{
										width: isMobile ? '80px' : '124px',
										height: isMobile ? '36px' : '40px',
										borderTopRightRadius: '8px',
										borderBottomRightRadius: '8px',
										backgroundColor: '#E17272',
									}}
									data-hover-description="Reject this contact. This isn't deleting it, but putting it into a rejection folder for you to review"
									onClick={() => {
										if (selectedDraft) {
											const isCurrentlyRejected =
												props.rejectedDraftIds?.has(selectedDraft.id) ?? false;
											props.onRejectDraft?.(selectedDraft.id, isCurrentlyRejected);
											// Only navigate to next if we're rejecting, not toggling off
											if (!isCurrentlyRejected) {
												handleNavigateNext();
											}
										}
									}}
								>
									<span>Reject</span>
									{!isMobile && <RejectXIcon />}
								</Button>
							</div>
							<button
								type="button"
								onClick={handleNavigateNext}
								disabled={!hasDrafts}
								aria-label="View next draft"
								className="p-0 bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
								style={{ marginLeft: isMobile ? '10px' : '20px' }}
							>
								<RightArrowReviewIcon />
							</button>
						</>
					)}
				</div>
				{/* Tab navigation right arrow - only in narrow breakpoints, hidden on mobile */}
				{showTabNavArrows && !isMobile && props.goToNextTab && !isRegenSettingsPreviewOpen && (
					<button
						type="button"
						onClick={props.goToNextTab}
						className="bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
						aria-label="Next tab"
					>
						<RightArrow width="20" height="39" />
					</button>
				)}
			</div>
		)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 items-center">
			{/* Right table - Generated Drafts */}
			<DraftingTable
				handleClick={() => handleSelectAllDrafts(filteredDrafts)}
				areAllSelected={allFilteredSelected}
				hasData={draftEmails.length > 0}
				noDataMessage="No drafts generated"
				noDataDescription='Click "Generate Drafts" to create emails for the selected contacts'
				isPending={isPendingEmails || isPendingDeleteEmail}
				title="Drafts"
				mainBoxId={props.mainBoxId}
				goToWriting={props.goToWriting}
				goToContacts={props.goToContacts}
				goToSearch={props.goToSearch}
				goToSent={props.goToSent}
				goToInbox={props.goToInbox}
				selectedCount={selectedDraftIds.size}
				statusFilter={props.statusFilter}
				onStatusFilterChange={props.onStatusFilterChange}
				approvedCount={approvedCount}
				rejectedCount={rejectedCount}
				totalDraftsCount={draftEmails.length}
				isMobile={isMobile}
			>
				<>
					<div
						className="overflow-visible w-full flex flex-col items-center"
						onMouseLeave={() => {
							setHoveredDraftRow(null);
							setHoveredDraftIndex(null);
							onContactHover?.(null);
							onDraftHover?.(null);
						}}
					>
						{typeof document !== 'undefined' &&
							hoveredUsedContactId !== null &&
							usedContactTooltipPos &&
							(() => {
								const resolvedCampaigns = resolvedUsedContactCampaigns;
								const isLoadingCampaigns = hoveredUsedContactCampaigns === undefined;
								if (isLoadingCampaigns) return null;
								const hasCampaigns = resolvedCampaigns.length > 0;
								const isMultiCampaign = hasCampaigns && resolvedCampaigns.length > 1;
								const resolvedCampaign = resolvedCampaigns[0] ?? null;
								const campaignName = resolvedCampaign?.name ?? '';
								const campaignIdToNavigate = resolvedCampaign?.id ?? null;

								return createPortal(
									<div
										className={cn(
											'fixed z-[9999] w-[322px] rounded-[8px] bg-[#DAE6FE] text-black border-2 border-black shadow-none',
											!isMultiCampaign && hasCampaigns && 'h-[60px]'
										)}
										style={{ left: usedContactTooltipPos.left, top: usedContactTooltipPos.top }}
										onMouseEnter={() => {
											clearUsedContactTooltipCloseTimeout();
										}}
										onMouseLeave={() => {
											// Allow moving between tooltip <-> icon without losing state.
											scheduleCloseUsedContactTooltip(hoveredUsedContactId as number);
										}}
									>
										<span className="absolute left-[12px] top-[6px] text-[17px] font-inter font-medium text-black leading-none pointer-events-none">
											Appears in
										</span>

										{!hasCampaigns ? (
											<div className="pt-[28px] pb-[8px] px-[12px]">
												<div className="text-[15px] font-inter font-medium text-black leading-snug">
													No campaigns found for this contact yet.
												</div>
											</div>
										) : isMultiCampaign ? (
											<div className="pt-[28px] pb-[4px]">
												<div className="flex flex-col gap-[6px] px-[3px]">
													{resolvedCampaigns.map((c, idx) => {
														const isActive = activeUsedContactCampaignIndex === idx;
														return (
															<button
																key={c.id}
																type="button"
																className={cn(
																	'w-[312px] h-[26px] rounded-[4px] border-2 border-black text-[17px] font-inter font-medium text-black cursor-pointer flex items-center gap-[10px] px-[10px] box-border',
																	isActive ? 'bg-[#AAE19E]' : 'bg-[#CFE4FF]'
																)}
																onMouseEnter={() =>
																	setActiveUsedContactCampaignIndex(idx)
																}
																onClick={(e) => {
																	e.stopPropagation();
																	router.push(`/murmur/campaign/${c.id}`);
																}}
															>
																{isActive && (
																	<span className="leading-none whitespace-nowrap shrink-0">
																		Go To
																	</span>
																)}
																<div className="h-[22px] w-fit max-w-full min-w-0 rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
																	<FadeOverflowText
																		text={c.name}
																		fadePx={16}
																		measureKey={isActive}
																		className="text-[17px] font-inter font-medium text-black leading-none"
																	/>
																</div>
															</button>
														);
													})}
												</div>
											</div>
										) : (
											<>
												<div className="absolute top-[4px] right-[3px] w-[204px] h-[22px] rounded-[4px] bg-[#F9FAFB] border-2 border-black px-2 flex items-center overflow-hidden box-border">
													<FadeOverflowText
														text={campaignName}
														fadePx={16}
														className="text-[17px] font-inter font-medium text-black leading-none"
													/>
												</div>

												<button
													type="button"
													className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-[312px] h-[26px] rounded-[4px] border-2 border-black bg-[#AAE19E] text-[17px] font-inter font-medium text-black cursor-pointer flex items-center justify-center box-border"
													disabled={!campaignIdToNavigate}
													onClick={(e) => {
														e.stopPropagation();
														if (campaignIdToNavigate) {
															router.push(
																`/murmur/campaign/${campaignIdToNavigate}`
															);
														}
													}}
												>
													Go To
												</button>
											</>
										)}
									</div>,
									document.body
								);
							})()}
						{filteredDrafts.map((draft, idx) => {
							const contact = contacts?.find((c) => c.id === draft.contactId);
							const contactName = contact
								? contact.name ||
								  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
								  contact.company ||
								  'Contact'
								: 'Unknown Contact';

							// Treat Company + Name as two distinct "slots" (rows).
							// Company is always the top slot (aligned with the right-side title pill),
							// and Name is the second slot just below. If Name is missing, we still
							// reserve the slot so Company doesn't vertically center.
							const displayName = contact
								? (contact.name?.trim() ||
										`${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
										'')
								: '';
							const displayCompany = contact?.company?.trim() || '';
							const draftRowCompany = displayCompany || displayName || contactName;
							const draftRowName =
								displayCompany && displayName && displayName !== draftRowCompany
									? displayName
									: '';
							const isSelected = selectedDraftIds.has(draft.id);
							const isRejected = props.rejectedDraftIds?.has(draft.id) ?? false;
							const isApproved = props.approvedDraftIds?.has(draft.id) ?? false;
							const isUsedContact = usedContactIdsSet.has(draft.contactId);
							const isUsedContactHoverCardVisible =
								hoveredUsedContactId === draft.contactId &&
								Boolean(usedContactTooltipPos) &&
								Boolean(hoveredUsedContactCampaigns?.length);
							const shouldHighlightRowForUsedContact = isUsedContactHoverCardVisible;

							const contactTitle = contact?.headline || contact?.title || '';

							// Colors based on tab
							const isRejectedTab = props.statusFilter === 'rejected';
							const selectedBgColor = isRejectedTab ? 'bg-[#D99696]' : 'bg-[#8BDA76]';
							const hoveredRegion =
								hoveredDraftRow?.draftId === draft.id ? hoveredDraftRow.region : null;
							const actionTitlePill = shouldHighlightRowForUsedContact
								? null
								: hoveredRegion === 'left'
									? { label: 'Select', backgroundColor: '#9DE9B0' }
									: hoveredRegion === 'middle'
										? { label: 'Open', backgroundColor: '#FFDE97' }
										: hoveredRegion === 'right'
											? { label: 'Delete', backgroundColor: '#F78989' }
											: null;
							const hoveredBgColor = isHoveringAllButton
								? 'bg-[#FFEDCA]'
								: shouldHighlightRowForUsedContact
									? 'bg-[#DAE6FE]'
									: hoveredRegion === 'left'
										? 'bg-[#ECFBF0]'
										: hoveredRegion === 'right'
											? 'bg-[#F78989]'
											: hoveredRegion === 'middle'
												? 'bg-[#F9E5BA]'
												: null;
							const rowBgColor = isHoveringAllButton
								? hoveredBgColor
								: isSelected
									? selectedBgColor
									: hoveredBgColor ?? 'bg-white';
							const hoverDescription =
								hoveredRegion === 'left'
									? 'Click to select row'
									: hoveredRegion === 'right'
										? 'Click to delete draft'
										: 'Click to open and review';
							
							// hoveredDraftRow is updated by both mouse hover and keyboard navigation,
							// so hoveredBgColor already reflects the correct region color for both cases

							return (
								<div key={draft.id} className="w-full flex flex-col items-center overflow-visible">
									{idx > 0 && <div className="h-[10px]" />}
									<div
										className={cn(
											'cursor-pointer relative select-none overflow-visible border-2 p-2 group/draft rounded-[8px] transition-colors duration-200 ease-in-out',
											isMobile ? 'h-[100px]' : 'h-[97px]',
											'border-[#000000]',
											rowBgColor,
										)}
										style={isMobile ? { width: mobileEmailRowWidth } : { width: '489px' }}
										data-hover-description={hoverDescription}
										onMouseDown={(e) => {
											// Prevent text selection on shift-click
											if (e.shiftKey) {
												e.preventDefault();
											}
										}}
										onMouseEnter={(e) => {
											if (contact) {
												onContactHover?.(contact);
											}
											onDraftHover?.(draft);
											const region = getDraftRowHoverRegion(e);
											setHoveredDraftRow({ draftId: draft.id, region });
											setHoveredDraftIndex(idx);
										}}
										onMouseMove={(e) => {
											const region = getDraftRowHoverRegion(e);
											setHoveredDraftRow((prev) => {
												if (prev?.draftId === draft.id && prev.region === region) return prev;
												return { draftId: draft.id, region };
											});
										}}
										onMouseLeave={() => {
											setHoveredDraftRow((prev) => (prev?.draftId === draft.id ? null : prev));
										}}
										onClick={(e) => {
											const region = getDraftRowHoverRegion(e);

											// Left zone: select row
											if (region === 'left') {
												handleDraftSelect(draft, e);
												return;
											}

											// Middle zone: open draft (existing behavior)
											if (region === 'middle') {
												handleDraftDoubleClick(draft);
												if (contact) {
													onContactClick?.(contact);
												}
												return;
											}

											// Right zone: delete draft
											void handleDeleteDraft(e, draft.id);
										}}
									>
									{/* Left-hover accent bar (156px x 5px) */}
									{hoveredRegion === 'left' && !shouldHighlightRowForUsedContact && (
										<span
											className="absolute left-0 top-0 w-[156px] h-[5px] bg-[#CCECD4] pointer-events-none rounded-tl-[6px]"
										/>
									)}
									{/* Middle-hover accent bar (from x=156px to right edge, 5px tall) */}
									{hoveredRegion === 'middle' && !shouldHighlightRowForUsedContact && (
										<span
											className="absolute left-[156px] right-0 top-0 h-[5px] bg-[#FFDE97] pointer-events-none rounded-tr-[6px]"
										/>
									)}
									{/* Used-contact indicator - morphs circle -> pill (expands downward) when hover card is active */}
									{isUsedContact &&
										(() => {
											const isMultiCampaignIndicator =
												isUsedContactHoverCardVisible &&
												resolvedUsedContactCampaigns.length > 1;
											const isSingleCampaignIndicator =
												isUsedContactHoverCardVisible &&
												resolvedUsedContactCampaigns.length === 1;
											// For multi-campaign: #A0C0FF with sliding dot
											// For single-campaign: #B0EAA4 (green, no dot)
											// For default (not hovered): #DAE6FE
											const pillBg =
												hoveredRegion === 'right'
													? '#F78989'
													: isMultiCampaignIndicator
														? '#A0C0FF'
														: isSingleCampaignIndicator
															? '#B0EAA4'
															: '#DAE6FE';

											// Handle mouse move on the pill to drive campaign selection
											const handlePillMouseMove = isMultiCampaignIndicator
												? (e: React.MouseEvent<HTMLSpanElement>) => {
														// We render a thin stroke via box-shadow (doesn't affect box-model), so the
														// interactive area is the full pill rect.
														const PILL_BORDER = 0;
														const rect = e.currentTarget.getBoundingClientRect();
														const actualHeight = rect.height;
														const offsetY = e.clientY - rect.top;
														const innerHeight = Math.max(1, actualHeight - PILL_BORDER * 2);
														const innerOffsetY = offsetY - PILL_BORDER;
														const campaignCount = resolvedUsedContactCampaigns.length;
														if (campaignCount <= 1) return;
														// Map cursor Y position to campaign index (0 at top, max at bottom)
														const ratio = Math.max(0, Math.min(1, innerOffsetY / innerHeight));
														const idx = Math.round(ratio * (campaignCount - 1));
														const clampedIdx = Math.max(0, Math.min(campaignCount - 1, idx));
														setActiveUsedContactCampaignIndex((prev) =>
															prev === clampedIdx ? prev : clampedIdx
														);
												  }
												: undefined;

											return (
												<span
													className="absolute z-10 cursor-pointer transition-all duration-200 ease-in-out"
													style={{
														left: '8px',
														top: '11px',
														boxSizing: 'border-box',
														// Default state: 16×16 circle. Hover state (single/multi): 14×37 pill.
														// Anchor top stays fixed so it expands downward (not centered).
														width: isUsedContactHoverCardVisible ? '14px' : '16px',
														height: isUsedContactHoverCardVisible ? '37px' : '16px',
														borderRadius: isUsedContactHoverCardVisible ? '9999px' : '50%',
														// Thin stroke: use box-shadow so sizes stay exact (per design spec).
														border: isUsedContactHoverCardVisible
															? 'none'
															: '1px solid #000000',
														boxShadow: isUsedContactHoverCardVisible
															? '0 0 0 1px #000000'
															: undefined,
														backgroundColor: pillBg,
														overflow: 'hidden',
													}}
													onMouseEnter={(e) =>
														openUsedContactTooltip(draft.contactId, e.currentTarget)
													}
													onMouseLeave={() =>
														scheduleCloseUsedContactTooltip(draft.contactId)
													}
													onMouseMove={handlePillMouseMove}
													onClick={(e) => {
														// Only hijack click when the hover card is visible (prevents breaking
														// draft row click behavior on the indicator in its default state).
														if (!isUsedContactHoverCardVisible) return;
														e.preventDefault();
														e.stopPropagation();
														goToUsedContactCampaign(draft.contactId);
													}}
												>
													{/* Sliding dot for multi-campaign */}
													{isMultiCampaignIndicator && (
														<span
															className={cn(
																'rounded-full pointer-events-none transition-all duration-200 ease-in-out',
																hoveredRegion === 'right' ? 'bg-[#F78989]' : 'bg-[#DAE6FE]'
															)}
															style={(() => {
																// Spec: 14×37 pill, 14×14 circle, thin stroke.
																const PILL_HEIGHT = 37;
																const DOT_SIZE = 14;
																const maxTop = Math.max(0, PILL_HEIGHT - DOT_SIZE);
																const campaignCount = resolvedUsedContactCampaigns.length;
																const clampedIdx =
																	typeof activeUsedContactCampaignIndex === 'number' &&
																	campaignCount > 0
																		? Math.min(
																				campaignCount - 1,
																				Math.max(0, activeUsedContactCampaignIndex)
																		  )
																		: 0;
																// Position dot based on active index
																const top =
																	campaignCount > 1
																		? (maxTop * clampedIdx) / (campaignCount - 1)
																		: maxTop / 2;
																return {
																	position: 'absolute' as const,
																	left: '0px',
																	top: `${top}px`,
																	width: `${DOT_SIZE}px`,
																	height: `${DOT_SIZE}px`,
																	// Thin stroke without changing geometry.
																	boxShadow: '0 0 0 1px #000000',
																};
															})()}
														/>
													)}
												</span>
											);
										})()}
									{/* Rejected indicator - stacked below used-contact when present */}
									{isRejected && (
										<span
											className="absolute z-10 transition-all duration-150 ease-out"
											title="Marked for rejection"
											aria-label="Rejected draft"
											style={{
												left: '8px',
												// When the used-contact dot expands into the pill, push status dots DOWN (not right).
												top: isUsedContactHoverCardVisible
													? '53px'
													: isUsedContact
														? '33px'
														: '11px',
												width: '16px',
												height: '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#A03C3C',
											}}
										/>
									)}
									{/* Approved indicator - stacked below used-contact when present */}
									{isApproved && (
										<span
											className="absolute z-10 transition-all duration-150 ease-out"
											title="Marked for approval"
											aria-label="Approved draft"
											style={{
												left: '8px',
												// When the used-contact dot expands into the pill, push status dots DOWN (not right).
												top: isUsedContactHoverCardVisible
													? '53px'
													: isUsedContact
														? '33px'
														: '11px',
												width: '16px',
												height: '16px',
												borderRadius: '50%',
												border: '1px solid #000000',
												backgroundColor: '#69AF69',
											}}
										/>
									)}
									{/* Selection switch (replaces old checkbox square) */}
									<div
										className={cn(
											'absolute left-[10px] bottom-[4px] z-0 w-[9px] h-[36px] rounded-[11px] border-2 border-black bg-white overflow-hidden pointer-events-none',
											// Hide the selection switch when the used-contact indicator is expanded into the pill
											// (keeps the left edge uncluttered while hovering "Appears in").
											isUsedContactHoverCardVisible ? 'hidden' : 'hidden group-hover/draft:block'
										)}
									>
										<div
											className={cn(
												'absolute left-0 top-0 w-full rounded-[11px] transition-all duration-200 ease-out',
												isSelected ? 'h-full bg-[#ECF5EE]' : 'h-[26px] bg-[#6DC683]'
											)}
										/>
									</div>
									{/* Delete + Preview icon (centered in the right "delete" zone) */}
									<div
										className="absolute right-[14px] top-[calc(50%+5px)] -translate-y-1/2 z-20 hidden group-hover/draft:block"
										style={{ width: '16px', height: '29px' }}
									>
										<DeleteandOpenIcon
											width={16}
											height={29}
											className="block"
											style={{ pointerEvents: 'none' }}
											aria-hidden="true"
										/>

										{/* Top half: delete */}
										<button
											type="button"
											className="absolute left-0 top-0 w-full h-[14px] bg-transparent border-0 p-0 cursor-pointer"
											aria-label="Delete draft"
											onMouseEnter={() => {
												// Ensure hovering the top glyph keeps the row in "Delete" (red) mode.
												setHoveredDraftRow({ draftId: draft.id, region: 'right' });
											}}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												void handleDeleteDraft(e, draft.id);
											}}
										/>

										{/* Bottom half: preview/open */}
										<button
											type="button"
											className="absolute left-0 bottom-0 w-full h-[15px] bg-transparent border-0 p-0 cursor-pointer"
											aria-label="Preview draft"
											onMouseEnter={(e) => {
												// Treat hovering the *eye* as "Open" (yellow), even though it's in the right zone.
												e.stopPropagation();
												setHoveredDraftRow({ draftId: draft.id, region: 'middle' });
											}}
											onMouseMove={(e) => {
												// Prevent the row's mousemove handler from re-classifying this as "Delete".
												e.stopPropagation();
												setHoveredDraftRow((prev) => {
													if (prev?.draftId === draft.id && prev.region === 'middle') return prev;
													return { draftId: draft.id, region: 'middle' };
												});
											}}
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												if (props.onPreview) {
													props.onPreview(draft);
												} else {
													handleDraftDoubleClick(draft);
												}
											}}
										/>
									</div>

									{/* Fixed top-right info (Title + Location) - matching contacts table design */}
									<div 
										className="absolute top-[6px] flex flex-col items-start gap-[2px] pointer-events-none"
										style={{ right: '4px' }}
									>
										{(contactTitle || actionTitlePill) ? (
											<div
												className="h-[21px] w-[240px] rounded-[6px] px-2 flex items-center gap-1 border border-black overflow-hidden transition-colors duration-200 ease-in-out"
												style={{
													backgroundColor: actionTitlePill
														? actionTitlePill.backgroundColor
														: isRestaurantTitle(contactTitle)
															? '#C3FBD1'
															: isCoffeeShopTitle(contactTitle)
																? '#D6F1BD'
																: isMusicVenueTitle(contactTitle)
																	? '#B7E5FF'
																	: isMusicFestivalTitle(contactTitle)
																		? '#C1D6FF'
																		: (isWeddingPlannerTitle(contactTitle) || isWeddingVenueTitle(contactTitle))
																			? '#FFF2BC'
																			: '#E8EFFF',
												}}
											>
												{actionTitlePill ? (
													<span className="text-[13px] font-inter font-medium text-black leading-[21px]">
														{actionTitlePill.label}
													</span>
												) : (
													<>
														{isRestaurantTitle(contactTitle) && (
															<RestaurantsIcon size={14} />
														)}
														{isCoffeeShopTitle(contactTitle) && (
															<CoffeeShopsIcon size={8} />
														)}
														{isMusicVenueTitle(contactTitle) && (
															<MusicVenuesIcon size={14} className="flex-shrink-0" />
														)}
														{isMusicFestivalTitle(contactTitle) && (
															<FestivalsIcon size={14} className="flex-shrink-0" />
														)}
														{(isWeddingPlannerTitle(contactTitle) ||
															isWeddingVenueTitle(contactTitle)) && (
															<WeddingPlannersIcon size={14} />
														)}
														<ScrollableText
															text={
																isRestaurantTitle(contactTitle)
																	? 'Restaurant'
																	: isCoffeeShopTitle(contactTitle)
																		? 'Coffee Shop'
																		: isMusicVenueTitle(contactTitle)
																			? 'Music Venue'
																			: isMusicFestivalTitle(contactTitle)
																				? 'Music Festival'
																				: isWeddingPlannerTitle(contactTitle)
																					? 'Wedding Planner'
																					: isWeddingVenueTitle(contactTitle)
																						? 'Wedding Venue'
																						: contactTitle
															}
															className="text-[10px] text-black leading-none"
															scrollPixelsPerSecond={60}
														/>
													</>
												)}
											</div>
										) : null}

										<div className="flex items-center justify-start gap-1 h-[20px]">
											{(() => {
												const fullStateName = (contact?.state as string) || '';
												const stateAbbr = getStateAbbreviation(fullStateName) || '';
												const normalizedState = fullStateName.trim();
												const lowercaseCanadianProvinceNames = canadianProvinceNames.map(
													(s) => s.toLowerCase()
												);
												const isCanadianProvince =
													lowercaseCanadianProvinceNames.includes(
														normalizedState.toLowerCase()
													) ||
													canadianProvinceAbbreviations.includes(
														normalizedState.toUpperCase()
													) ||
													canadianProvinceAbbreviations.includes(stateAbbr.toUpperCase());
												const isUSAbbr = /^[A-Z]{2}$/.test(stateAbbr);

												if (!stateAbbr) return null;
												return isCanadianProvince ? (
													<div
														className="inline-flex items-center justify-center rounded-[6px] border overflow-hidden flex-shrink-0"
														style={{
															width: '39px',
															height: '20px',
															borderColor: '#000000',
														}}
														title="Canadian province"
													>
														<CanadianFlag
															width="100%"
															height="100%"
															className="w-full h-full"
														/>
													</div>
												) : isUSAbbr ? (
													<span
														className="inline-flex items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold flex-shrink-0 transition-colors duration-200 ease-in-out"
														style={{
															width: '39px',
															height: '20px',
															backgroundColor:
																hoveredRegion === 'right'
																	? '#F78989'
																	: stateBadgeColorMap[stateAbbr] || 'transparent',
															borderColor: '#000000',
														}}
													>
														{stateAbbr}
													</span>
												) : (
													<span
														className="inline-flex items-center justify-center rounded-[6px] border flex-shrink-0"
														style={{
															width: '39px',
															height: '20px',
															borderColor: '#000000',
														}}
													/>
												);
											})()}
											{contact?.city ? (
												<ScrollableText
													text={contact.city}
													className="text-[12px] font-inter font-normal text-black leading-none"
												/>
											) : null}
										</div>
									</div>

									{/* Content flex column */}
									<div className={cn(
										"flex flex-col justify-center h-full gap-[2px]",
										"pl-[30px] pr-[30px]"
									)}>
										{/* Row 1 & 2: Company / Name */}
										{(() => {
											const topRowMargin = contactTitle
												? 'mr-[220px]'
												: 'mr-[120px]';
											return (
												<>
													{/* Company slot (top row) */}
													<div className={cn('flex items-center min-h-[20px]', topRowMargin)}>
														<div className="text-[15px] font-inter font-semibold truncate leading-none">
															{draftRowCompany}
														</div>
													</div>
													{/* Name slot (second row) */}
													<div className={cn('flex items-center min-h-[20px]', topRowMargin)}>
														{draftRowName ? (
															<div className="text-[15px] font-inter font-medium text-black truncate leading-none">
																{draftRowName}
															</div>
														) : null}
													</div>
												</>
											);
										})()}

										{/* Row 3: Subject */}
										<div className="flex items-center min-h-[14px]">
											<div
												className="text-[14px] font-inter font-semibold text-black leading-none whitespace-nowrap overflow-hidden w-full pr-2"
												style={{
													WebkitMaskImage:
														'linear-gradient(90deg, #000 96%, transparent 100%)',
													maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
												}}
											>
												{draft.subject || 'No subject'}
											</div>
										</div>

										{/* Row 4: Message preview */}
										<div className="flex items-center min-h-[14px]">
											<div
												className="text-[10px] text-gray-500 leading-none whitespace-nowrap overflow-hidden w-full pr-2"
												style={{
													WebkitMaskImage:
														'linear-gradient(90deg, #000 96%, transparent 100%)',
													maskImage: 'linear-gradient(90deg, #000 96%, transparent 100%)',
												}}
											>
												{draft.message
													? convertHtmlToPlainText(draft.message)
													: 'No content'}
											</div>
										</div>
									</div>
									</div>
								</div>
						);
						})}
						{Array.from({ length: Math.max(0, (isMobile ? 4 : 6) - filteredDrafts.length) }).map((_, idx) => (
							<>
								{(idx > 0 || filteredDrafts.length > 0) && (
									<div key={`placeholder-spacer-${idx}`} className="h-[10px]" />
								)}
								<div
									key={`draft-placeholder-${idx}`}
									className={cn(
										"select-none overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#FFDC9E] p-2",
										isMobile ? 'h-[100px]' : 'w-[489px] h-[97px]'
									)}
									style={isMobile ? { width: mobileEmailRowWidth } : undefined}
								/>
							</>
						))}
					</div>
				</>

				{isPendingDeleteEmail && (
					<div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
						<Spinner size="small" />
					</div>
				)}
			</DraftingTable>
			{draftEmails.length > 0 && !props.hideSendButton && (
				<div className="w-[499px] flex flex-col gap-2 mt-2">
					{/* Inline confirmation details */}
					<div className={cn('w-full', !showConfirm && 'hidden')}>
						<div
							className="grid w-full gap-x-3 gap-y-1 items-start"
							style={{ gridTemplateColumns: '120px 1fr' }}
						>
							<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
								To:
							</div>
							<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-words pl-1">
								{toCount} emails selected
							</div>

							<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
								From:
							</div>
							<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-words pl-1">
								{props.fromName || ''}
							</div>

							<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
								Return Address:
							</div>
							<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-all pl-1">
								{props.fromEmail || ''}
							</div>

							{subjectPreview && (
								<>
									<div className="text-[12px] leading-tight font-semibold text-[#000000] font-secondary whitespace-nowrap">
										Subject:
									</div>
									<div className="text-[12px] leading-tight text-[#000000] font-secondary min-w-0 break-words pl-1">
										{subjectPreview}
									</div>
								</>
							)}
						</div>
					</div>

					{/** Action buttons (send/regenerate) */}
					<div className="relative w-[475px] h-[40px] mx-auto">
						{/** Label strings depend on the tab (send vs regenerate) */}
						{(() => {
							const isRejectedTab = props.statusFilter === 'rejected';
							const actionVerb = isRejectedTab ? 'Regenerate' : 'Send';
							const confirmLabel = `Click to Confirm and ${actionVerb}`;
							const actionLabel = `${actionVerb} ${selectedCount} Selected`;

							// Show just text when nothing is selected
							if (!hasSelection) {
								return (
									<div className="w-full h-full flex items-center justify-center text-black font-inter font-normal text-[17px]">
										Select Emails to Send
									</div>
								);
							}

							return (
								props.isSendingDisabled ? (
									<UpgradeSubscriptionDrawer
										triggerButtonText={showConfirm ? confirmLabel : actionLabel}
										buttonVariant="primary"
										className="w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px] !flex !items-center !justify-center !bg-[#C7F2C9] !border-[#349A37] hover:!bg-[#B9E7BC] cursor-pointer"
										message={
											props.isFreeTrial
												? `Your free trial subscription does not include the ability to send emails. To send the emails\'ve drafted, please upgrade your subscription to the paid version.`
												: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
										}
									/>
								) : (
									<div className="w-full h-full rounded-[4px] border-[3px] border-[#000000] flex overflow-hidden">
										<button
											type="button"
											className="flex-1 h-full flex items-center justify-center text-center text-black font-inter font-normal text-[17px] pl-[89px] bg-[#FFDC9F] hover:bg-[#F4C87E] cursor-pointer"
											onClick={async () => {
												if (!showConfirm) {
													setShowConfirm(true);
													setTimeout(() => setShowConfirm(false), 10000);
													return;
												}
												setShowConfirm(false);
												if (isRejectedTab) {
													await handleRegenerateSelectedDrafts();
												} else {
											await props.onSend(selectedDraftIds);
												}
											}}
										>
											{showConfirm ? confirmLabel : actionLabel}
										</button>

										{/* Right section "All" button */}
										<button
											type="button"
											className={cn(
												'w-[89px] h-full flex items-center justify-center font-inter font-normal text-[17px] text-black cursor-pointer border-l-[2px] border-[#000000] transition-colors duration-200 ease-in-out',
												// When hovering the row's Delete region, tint the ancillary "All" control to match.
												hoveredDraftRow?.region === 'right'
													? 'bg-[#F78989] hover:bg-[#F78989]'
													: isRejectedTab
														? 'bg-[#C76A6A] hover:bg-[#B34E4E]'
														: 'bg-[#7CB67C] hover:bg-[#6FA36F]'
											)}
											onMouseEnter={() => setIsHoveringAllButton(true)}
											onMouseLeave={() => setIsHoveringAllButton(false)}
											onClick={(e) => {
												e.stopPropagation();
												handleSelectAllDrafts(filteredDrafts);
												setShowConfirm(true);
												setTimeout(() => setShowConfirm(false), 10000);
											}}
										>
											All
										</button>
									</div>
								)
							);
						})()}
					</div>
				</div>
			)}
		</div>
	);
});

DraftedEmails.displayName = 'DraftedEmails';