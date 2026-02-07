'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { cn } from '@/utils';
import { useHoverDescription } from '@/contexts/HoverDescriptionContext';
import { CampaignTitlePills } from '@/components/molecules/CampaignTitlePills/CampaignTitlePills';

interface CampaignHeaderBoxProps {
	campaignId: number;
	campaignName: string;
	toListNames: string;
	fromName: string;
	contactsCount: number;
	draftCount: number;
	sentCount: number;
	/**
	 * When provided, shows the drafting progress box 9px above the header.
	 * Each entry represents one queued/running drafting operation.
	 */
	draftingProgress?: Array<{ current: number; total: number }> | null;
	onFromClick?: () => void;
	onContactsClick?: () => void;
	onDraftsClick?: () => void;
	onSentClick?: () => void;
	width?: number;
	/** When true, uses responsive width (matching writing box) with left-aligned content */
	fullWidth?: boolean;
	/** Additional className for the container */
	className?: string;
}

const getContactsFillColor = (): string => '#F5DADA';
const getDraftFillColor = (): string => '#FFE3AA';
const getSentFillColor = (): string => '#B0E0A6';

export const CampaignHeaderBox: FC<CampaignHeaderBoxProps> = ({
	campaignId,
	campaignName,
	toListNames,
	fromName,
	contactsCount,
	draftCount,
	sentCount,
	draftingProgress,
	onFromClick,
	onContactsClick,
	onDraftsClick,
	onSentClick,
	width = 374,
	fullWidth = false,
	className,
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(campaignName);
	const inputRef = useRef<HTMLInputElement>(null);
	const { enabled: hoverDescriptionsEnabled, description: hoverDescription } =
		useHoverDescription();
	const [renderedHoverDescription, setRenderedHoverDescription] = useState('');
	const [isHoverDescriptionVisible, setIsHoverDescriptionVisible] = useState(false);
	const hoverDescriptionTimeoutRef = useRef<number | null>(null);

	const draftingOperationsRaw = draftingProgress ?? [];
	const draftingOperations = draftingOperationsRaw.filter(
		(op) => typeof op.total === 'number' && op.total > 0 && typeof op.current === 'number'
	);
	const shouldShowDraftingProgress = draftingOperations.length > 0;
	// Keep the header progress UI compact: render at most 2 stacked bars.
	// When there are 3+ operations, the label communicates the full count.
	const draftingOperationsForBars = draftingOperations.slice(0, 2);
	const draftingLabel = shouldShowDraftingProgress
		? draftingOperations.length === 1
			? `${draftingOperations[0].total} email${
					draftingOperations[0].total === 1 ? '' : 's'
			  } drafting`
			: `${draftingOperations.length} operations in progress`
		: '';

	// Track which metric box is hovered for chrome-style animation
	const [hoveredMetric, setHoveredMetric] = useState<'contacts' | 'drafts' | 'sent' | null>(null);

	const { mutate: editCampaign } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			setIsEditing(false);
		},
	});

	// Smooth hover-description transitions (tiny fade out -> swap -> fade in).
	useEffect(() => {
		const FADE_MS = 140;
		const SWAP_DELAY_MS = 70;

		const next = hoverDescriptionsEnabled ? hoverDescription : '';

		if (hoverDescriptionTimeoutRef.current != null) {
			window.clearTimeout(hoverDescriptionTimeoutRef.current);
			hoverDescriptionTimeoutRef.current = null;
		}

		// If nothing to show, fade out (briefly) and then clear.
		if (!next) {
			if (!renderedHoverDescription) {
				setIsHoverDescriptionVisible(false);
				return;
			}

			// Delay the fade-out a touch so quick cursor movement across gaps doesn't flicker.
			hoverDescriptionTimeoutRef.current = window.setTimeout(() => {
				setIsHoverDescriptionVisible(false);
				hoverDescriptionTimeoutRef.current = window.setTimeout(() => {
					setRenderedHoverDescription('');
					hoverDescriptionTimeoutRef.current = null;
				}, FADE_MS);
			}, 90);
			return;
		}

		// First show: render immediately and fade in.
		if (!renderedHoverDescription) {
			setRenderedHoverDescription(next);
			setIsHoverDescriptionVisible(true);
			return;
		}

		// No change.
		if (next === renderedHoverDescription) {
			setIsHoverDescriptionVisible(true);
			return;
		}

		// Swap with a quick fade.
		setIsHoverDescriptionVisible(false);
		hoverDescriptionTimeoutRef.current = window.setTimeout(() => {
			setRenderedHoverDescription(next);
			setIsHoverDescriptionVisible(true);
			hoverDescriptionTimeoutRef.current = null;
		}, SWAP_DELAY_MS);
	}, [hoverDescription, hoverDescriptionsEnabled, renderedHoverDescription]);

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			if (hoverDescriptionTimeoutRef.current != null) {
				window.clearTimeout(hoverDescriptionTimeoutRef.current);
				hoverDescriptionTimeoutRef.current = null;
			}
		};
	}, []);

	// Focus input when entering edit mode
	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	// Sync editedName when campaignName prop changes
	useEffect(() => {
		setEditedName(campaignName);
	}, [campaignName]);

	const handleSave = () => {
		if (editedName.trim() && editedName !== campaignName) {
			editCampaign({
				id: campaignId,
				data: { name: editedName.trim() },
			});
		} else {
			setEditedName(campaignName);
			setIsEditing(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Escape') {
			setEditedName(campaignName);
			setIsEditing(false);
		}
	};

	return (
		<div
			data-campaign-header-box="true"
			className={cn(
				'relative overflow-visible bg-white border-[2px] border-black rounded-[8px] flex flex-col px-3 pt-0 pb-2 box-border',
				fullWidth && 'w-[96.27vw] max-w-[499px]',
				className
			)}
			style={
				fullWidth
					? {
							height: '71px',
							minHeight: '71px',
							maxHeight: '71px',
					  }
					: {
							width: `${width}px`,
							height: '71px',
							minWidth: `${width}px`,
							maxWidth: `${width}px`,
							minHeight: '71px',
							maxHeight: '71px',
					  }
			}
		>
			{/* Drafting progress box (shown above the header; must NOT shift layout) */}
			{shouldShowDraftingProgress ? (
				<div
					aria-hidden="true"
					style={{
						position: 'absolute',
						// Absolute children position against the padding box; offset by the 2px header border
						// so this 374x35 box aligns with the header's outer border edges.
						left: '-2px',
						right: '-2px',
						// Anchor the BOTTOM of the progress box 9px above the header border,
						// while allowing the box to grow upward for multi-operation stacks.
						top: '-11px', // 9px gap + 2px header border (padding-box origin)
						transform: 'translateY(-100%)',
						boxSizing: 'border-box',
						border: '2px solid rgba(176, 176, 176, 0.2)',
						borderRadius: '5px',
						background: 'transparent',
						pointerEvents: 'none',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'flex-start',
						// Keep the progress bar exactly 6px from the stroke without affecting layout.
						// (Asymmetric right padding preserves the 359px bar width at the 374px header size.)
						paddingTop: '6px',
						paddingBottom: '6px',
						paddingLeft: '6px',
						paddingRight: '5px',
						gap: '6px',
						zIndex: 90,
					}}
				>
					<div
						className="font-inter font-medium text-black"
						style={{ fontSize: '11px', lineHeight: '11px', transform: 'translateY(-1px)' }}
					>
						{draftingLabel}
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
						{draftingOperationsForBars.map((op, idx) => {
							const pct = Math.min(
								100,
								Math.max(
									0,
									(Math.min(Math.max(0, op.current), op.total) / Math.max(1, op.total)) *
										100
								)
							);
							const fillColor = idx === 0 ? '#EDB552' : '#5AB477';
							return (
								<div
									key={`drafting-op-${idx}`}
									style={{
										width: '100%',
										height: '6px',
										backgroundColor: '#D1D1D1',
										borderRadius: '6px',
										overflow: 'hidden',
										position: 'relative',
									}}
								>
									<div
										style={{
											position: 'absolute',
											top: 0,
											left: 0,
											height: '100%',
											width: `${pct}%`,
											backgroundColor: fillColor,
											borderRadius: '6px',
										}}
									/>
								</div>
							);
						})}
					</div>
				</div>
			) : null}

			{renderedHoverDescription && !shouldShowDraftingProgress ? (
				<div
					data-hover-description-ignore="true"
					className={cn(
						'pointer-events-none absolute left-0 right-0 top-0 -translate-y-full',
						'-mt-[15px]',
						'z-[80]',
						'px-3 font-inter font-extralight text-[13px] leading-[1.15] text-black',
						'transition-opacity duration-150 ease-out',
						isHoverDescriptionVisible ? 'opacity-100' : 'opacity-0'
					)}
					style={{ willChange: 'opacity' }}
				>
					{renderedHoverDescription}
				</div>
			) : null}
			{/* Campaign Title */}
			<div className="h-[28px] overflow-hidden flex-shrink-0 mt-[6px]">
				{isEditing ? (
					<input
						ref={inputRef}
						type="text"
						value={editedName}
						onChange={(e) => setEditedName(e.target.value)}
						onBlur={handleSave}
						onKeyDown={handleKeyDown}
						className="font-normal text-[26px] leading-none text-black bg-transparent border-none outline-none p-0 m-0 w-full h-[28px]"
						style={{ fontFamily: 'Times New Roman, Times, serif' }}
					/>
				) : (
					<div
						className="font-normal text-[26px] leading-none whitespace-nowrap overflow-hidden text-black cursor-text h-[28px]"
						style={{
							fontFamily: 'Times New Roman, Times, serif',
							maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
							WebkitMaskImage:
								'linear-gradient(to right, black 90%, transparent 100%)',
						}}
						onClick={() => setIsEditing(true)}
						title="Click to edit"
					>
						<CampaignTitlePills title={campaignName} size="header" />
					</div>
				)}
			</div>

			{/* Spacer above To/From */}
			<div className="flex-1" />

			{/* To/From Row */}
			<div
				aria-hidden="true"
				className={cn(
					'flex items-center text-[11px] flex-shrink-0 invisible pointer-events-none',
					fullWidth && 'gap-[20px]'
				)}
			>
				{/* To section */}
				<div className={cn('flex items-center gap-1', !fullWidth && 'w-1/2')}>
					<Link
						href={urls.murmur.dashboard.index}
						prefetch
						onClick={(e) => {
							e.preventDefault();
							if (typeof window !== 'undefined') {
								window.location.assign(urls.murmur.dashboard.index);
							}
						}}
						className="block"
					>
						<div
							className="bg-[#EEEEEE] flex items-center justify-start pl-1 transition-colors group hover:bg-[#696969] rounded-[6px]"
							style={{ width: '41px', height: '13px' }}
						>
							<span className="font-inter font-normal text-[13px] leading-none text-black transition-colors group-hover:text-white">
								To
							</span>
						</div>
					</Link>
					<span className="font-inter font-light text-[11px] text-gray-600 truncate max-w-[100px]">
						{toListNames || 'No recipients'}
					</span>
				</div>

				{/* From section */}
				<div className={cn('flex items-center gap-1', !fullWidth && 'w-1/2')}>
					<button
						type="button"
						onClick={onFromClick}
						className="bg-[#EEEEEE] flex items-center justify-start pl-1 cursor-pointer transition-colors group hover:bg-[#696969] rounded-[6px]"
						style={{ width: '41px', height: '13px' }}
					>
						<span className="font-inter font-normal text-[13px] leading-none text-black transition-colors group-hover:text-white">
							From
						</span>
					</button>
					<span className="font-inter font-light text-[11px] text-gray-600 truncate max-w-[100px] flex items-center gap-1">
						{fromName || 'Not set'}
						<span className="inline-block align-middle">▾</span>
					</span>
				</div>
			</div>

			{/* Spacer below To/From */}
			<div className="flex-1" />

		{/* Metrics Row */}
		<div
			className={cn('flex items-center -mt-[6px]', fullWidth ? 'gap-[10px]' : 'gap-[20px]')}
			onMouseLeave={() => setHoveredMetric(null)}
		>
			<button
				type="button"
				onClick={onContactsClick}
				onMouseEnter={() => setHoveredMetric('contacts')}
				className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold cursor-pointer hover:brightness-95"
				style={{
					backgroundColor:
						hoveredMetric !== null && hoveredMetric !== 'contacts'
							? '#FFFFFF'
							: getContactsFillColor(),
					borderWidth: '1px',
					width: '80px',
					height: '15px',
					fontSize: '10px',
					transition: 'background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					style={{
						opacity: hoveredMetric !== null && hoveredMetric !== 'contacts' ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					{`${String(contactsCount).padStart(2, '0')} Contacts`}
				</span>
			</button>
			<button
				type="button"
				onClick={onDraftsClick}
				onMouseEnter={() => setHoveredMetric('drafts')}
				className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold cursor-pointer hover:brightness-95"
				style={{
					backgroundColor:
						hoveredMetric !== null && hoveredMetric !== 'drafts'
							? '#FFFFFF'
							: getDraftFillColor(),
					borderWidth: '1px',
					width: '80px',
					height: '15px',
					fontSize: '10px',
					transition: 'background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					style={{
						opacity: hoveredMetric !== null && hoveredMetric !== 'drafts' ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					{draftCount === 0 ? 'Drafts' : `${String(draftCount).padStart(2, '0')} Drafts`}
				</span>
			</button>
			<button
				type="button"
				onClick={onSentClick}
				onMouseEnter={() => setHoveredMetric('sent')}
				className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold cursor-pointer hover:brightness-95"
				style={{
					backgroundColor:
						hoveredMetric !== null && hoveredMetric !== 'sent'
							? '#FFFFFF'
							: getSentFillColor(),
					borderWidth: '1px',
					width: '80px',
					height: '15px',
					fontSize: '10px',
					transition: 'background-color 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
				}}
			>
				<span
					style={{
						opacity: hoveredMetric !== null && hoveredMetric !== 'sent' ? 0 : 1,
						transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
					}}
				>
					{sentCount === 0 ? 'Sent' : `${String(sentCount).padStart(2, '0')} Sent`}
				</span>
			</button>
		</div>
		</div>
	);
};

