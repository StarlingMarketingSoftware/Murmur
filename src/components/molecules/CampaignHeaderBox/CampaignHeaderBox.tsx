'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { cn } from '@/utils';
import { useHoverDescription } from '@/contexts/HoverDescriptionContext';
import { useSendingSessionState } from '@/contexts/SendingSessionContext';
import { CampaignTitlePills } from '@/components/molecules/CampaignTitlePills/CampaignTitlePills';
import DashboardActionBarFolderIcon from '@/components/atoms/_svg/DashboardActionBarFolderIcon';

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

const FOLDER_BOX_FILL = '#B9EAF1';
const FOLDER_ICON_COLOR = '#C5494F';

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
	const {
		enabled: hoverDescriptionsEnabled,
		description: hoverDescription,
		toggle: toggleHoverDescriptions,
		canToggle: canToggleHoverDescriptions,
	} = useHoverDescription();
	const [renderedHoverDescription, setRenderedHoverDescription] = useState('');
	const [isHoverDescriptionVisible, setIsHoverDescriptionVisible] = useState(false);
	const hoverDescriptionTimeoutRef = useRef<number | null>(null);

	// "{N} in send queue" pill while the campaign send session runs (idle default
	// outside the SendingSessionProvider).
	const sendingSession = useSendingSessionState();
	const sendQueueRemaining =
		sendingSession.status === 'sending' && !sendingSession.dismissed
			? Math.max(
					0,
					sendingSession.total - sendingSession.sentCount - sendingSession.failedCount
				)
			: 0;

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
			? (() => {
					const op = draftingOperations[0];
					const step = Math.min(op.total, Math.max(0, op.current) + 1);
					return `Drafting ${step}/${op.total} email${op.total === 1 ? '' : 's'}`;
				})()
			: `${draftingOperations.length} operations in progress`
		: '';

	// Track which metric box is hovered for chrome-style animation
	const [hoveredMetric, setHoveredMetric] = useState<
		'contacts' | 'drafts' | 'sent' | null
	>(null);

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
				'relative overflow-visible border border-black rounded-[8px] flex flex-col px-3 pt-0 pb-[6px] box-border',
				fullWidth && 'w-[96.27vw] max-w-[499px]',
				className
			)}
			style={
				fullWidth
					? {
							height: '59px',
							minHeight: '59px',
							maxHeight: '59px',
							background: 'rgba(255, 255, 255, 0.31)',
						}
					: {
							width: `${width}px`,
							height: '59px',
							minWidth: `${width}px`,
							maxWidth: `${width}px`,
							minHeight: '59px',
							maxHeight: '59px',
							background: 'rgba(255, 255, 255, 0.31)',
						}
			}
		>
			{/* Drafting progress box (shown above the header; must NOT shift layout) */}
			{shouldShowDraftingProgress ? (
				<div
					aria-hidden="true"
					style={{
						position: 'absolute',
						// Absolute children position against the padding box; offset by the 1px header border
						// so this progress box aligns with the header's outer border edges.
						left: '-1px',
						right: '-1px',
						// Anchor the BOTTOM of the progress box 9px above the header border,
						// while allowing the box to grow upward for multi-operation stacks.
						top: '-10px', // 9px gap + 1px header border (padding-box origin)
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
						style={{
							fontSize: '11px',
							lineHeight: '11px',
							transform: 'translateY(-1px)',
						}}
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
			{/* Campaign Title — folder icon + name inside a light-blue folder box */}
			<div className="h-[28px] flex-shrink-0 mt-[6px] flex items-center">
				<div
					className="flex items-center gap-[8px] overflow-hidden box-border pl-[8px] pr-[28px]"
					style={{
						width: 'fit-content',
						maxWidth: '258px',
						height: '26px',
						borderRadius: '6px',
						background: FOLDER_BOX_FILL,
					}}
				>
					<DashboardActionBarFolderIcon
						width={26}
						height={15}
						aria-hidden="true"
						style={{ color: FOLDER_ICON_COLOR, flexShrink: 0, display: 'block' }}
					/>
					{isEditing ? (
						<input
							ref={inputRef}
							type="text"
							value={editedName}
							onChange={(e) => setEditedName(e.target.value)}
							onBlur={handleSave}
							onKeyDown={handleKeyDown}
							className="min-w-0 flex-1 font-normal text-[26px] leading-none text-black bg-transparent border-none outline-none p-0 m-0"
							style={{ fontFamily: 'Times New Roman, Times, serif' }}
						/>
					) : (
						<div
							className="min-w-0 flex-1 font-normal text-[26px] leading-none whitespace-nowrap overflow-hidden text-black cursor-text"
							style={{
								fontFamily: 'Times New Roman, Times, serif',
								maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
								WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
							}}
							onClick={() => setIsEditing(true)}
							title="Click to edit"
						>
							<CampaignTitlePills title={campaignName} size="header" />
						</div>
					)}
				</div>
				{canToggleHoverDescriptions ? (
					<button
						type="button"
						onClick={toggleHoverDescriptions}
						aria-label={hoverDescriptionsEnabled ? 'Turn info off' : 'Turn info on'}
						className="group ml-[8px] flex h-[26px] w-[26px] flex-shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none focus:outline-none"
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 13 13"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className={cn(
								'transition-opacity',
								hoverDescriptionsEnabled
									? 'opacity-100'
									: 'opacity-40 group-hover:opacity-100'
							)}
						>
							<g>
								<circle
									cx="6.22656"
									cy="6.05078"
									r="5.80078"
									fill={hoverDescriptionsEnabled ? '#51A2E4' : 'none'}
									stroke="black"
									strokeWidth="0.5"
								/>
								<path
									d="M8.05656 2.82696C7.8419 2.82696 7.68856 2.75796 7.59656 2.61996C7.53523 2.54329 7.50456 2.44363 7.50456 2.32096C7.50456 2.07563 7.61956 1.87629 7.84956 1.72296C8.01823 1.63096 8.17156 1.58496 8.30956 1.58496C8.53956 1.58496 8.70056 1.65396 8.79256 1.79196C8.8539 1.86863 8.88456 1.96829 8.88456 2.09096C8.88456 2.33629 8.7619 2.53563 8.51656 2.68896C8.37856 2.78096 8.22523 2.82696 8.05656 2.82696ZM4.05456 11.682C3.90123 11.682 3.7709 11.6513 3.66356 11.59C3.57156 11.5286 3.52556 11.4136 3.52556 11.245C3.52556 11.0303 3.57923 10.7773 3.68656 10.486C3.80923 10.1946 3.93956 9.90329 4.07756 9.61196C4.2309 9.32063 4.3459 9.08296 4.42256 8.89896C4.5299 8.68429 4.66023 8.40829 4.81356 8.07096C4.98223 7.71829 5.13556 7.38863 5.27356 7.08196C5.4269 6.75996 5.53423 6.53763 5.59556 6.41496C5.3809 6.64496 5.12023 6.93629 4.81356 7.28896C4.52223 7.62629 4.24623 7.95596 3.98556 8.27796C3.7249 8.59996 3.52556 8.85296 3.38756 9.03696C3.34156 9.09829 3.30323 9.12896 3.27256 9.12896C3.2419 9.12896 3.22656 9.09063 3.22656 9.01396C3.22656 8.89129 3.2649 8.77629 3.34156 8.66896C3.6329 8.30096 3.9549 7.88696 4.30756 7.42696C4.67556 6.96696 5.00523 6.54529 5.29656 6.16196C5.5879 5.76329 5.7719 5.50263 5.84856 5.37996C6.01723 5.34929 6.26256 5.30329 6.58456 5.24196C6.9219 5.18063 7.1519 5.09629 7.27456 4.98896C7.32056 4.94296 7.36656 4.91996 7.41256 4.91996C7.44323 4.91996 7.45856 4.95063 7.45856 5.01196C7.4739 5.05796 7.45856 5.11163 7.41256 5.17296C7.32056 5.28029 7.15956 5.54096 6.92956 5.95496C6.69956 6.36896 6.45423 6.82896 6.19356 7.33496C5.94823 7.82563 5.71823 8.27029 5.50356 8.66896C5.2889 9.08296 5.1049 9.48163 4.95156 9.86496C4.79823 10.2483 4.72156 10.5243 4.72156 10.693C4.72156 10.9076 4.8289 11.015 5.04356 11.015C5.2429 11.015 5.4959 10.8923 5.80256 10.647C6.12456 10.4016 6.44656 10.1103 6.76856 9.77296C7.09056 9.42029 7.37423 9.09829 7.61956 8.80696C7.69623 8.71496 7.78823 8.60763 7.89556 8.48496C8.01823 8.34696 8.0949 8.26263 8.12556 8.23196C8.15623 8.26263 8.17156 8.31629 8.17156 8.39296C8.15623 8.50029 8.1179 8.60763 8.05656 8.71496C7.99523 8.80696 7.9339 8.89129 7.87256 8.96796C7.55056 9.36663 7.1979 9.78063 6.81456 10.21C6.43123 10.624 6.00956 10.9766 5.54956 11.268C5.08956 11.544 4.59123 11.682 4.05456 11.682Z"
									fill="black"
								/>
							</g>
						</svg>
					</button>
				) : null}
				{sendQueueRemaining > 0 ? (
					<div
						className="ml-[8px] flex items-center px-2 whitespace-nowrap font-inter font-semibold text-[12px] leading-none text-black"
						style={{
							height: '26px',
							borderRadius: '6px',
							background: '#85D790',
						}}
					>
						{sendQueueRemaining} in send queue
					</div>
				) : null}
			</div>

			{/* Spacer above To/From */}
			<div className="flex-1" />

			{/* To/From Row */}
			<div
				aria-hidden="true"
				className={cn(
					'flex h-0 overflow-hidden items-center text-[11px] flex-shrink-0 invisible pointer-events-none',
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
				className={cn(
					'flex items-center -mt-[3px]',
					fullWidth ? 'gap-[10px]' : 'gap-[20px]'
				)}
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
						{draftCount === 0
							? 'Drafts'
							: `${String(draftCount).padStart(2, '0')} Drafts`}
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
