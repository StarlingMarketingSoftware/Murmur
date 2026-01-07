'use client';

import { FC, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { cn } from '@/utils';
import { useHoverDescription } from '@/contexts/HoverDescriptionContext';

interface CampaignHeaderBoxProps {
	campaignId: number;
	campaignName: string;
	toListNames: string;
	fromName: string;
	contactsCount: number;
	draftCount: number;
	sentCount: number;
	onFromClick?: () => void;
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
	onFromClick,
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
			{renderedHoverDescription ? (
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
			<div className="h-[26px] overflow-hidden flex-shrink-0">
				{isEditing ? (
					<input
						ref={inputRef}
						type="text"
						value={editedName}
						onChange={(e) => setEditedName(e.target.value)}
						onBlur={handleSave}
						onKeyDown={handleKeyDown}
						className="font-normal text-[26px] leading-none text-black bg-transparent border-none outline-none p-0 m-0 w-full h-[26px]"
						style={{ fontFamily: 'Times New Roman, Times, serif' }}
					/>
				) : (
					<div
						className="font-normal text-[26px] leading-none whitespace-nowrap overflow-hidden text-black cursor-text h-[26px]"
						style={{
							fontFamily: 'Times New Roman, Times, serif',
							maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
							WebkitMaskImage:
								'linear-gradient(to right, black 90%, transparent 100%)',
						}}
						onClick={() => setIsEditing(true)}
						title="Click to edit"
					>
						{campaignName}
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
			<div className={cn('flex items-center', fullWidth ? 'gap-[10px]' : 'gap-[20px]')}>
				<div
					className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold"
					style={{
						backgroundColor: getContactsFillColor(),
						borderWidth: '1px',
						width: '80px',
						height: '15px',
						fontSize: '10px',
					}}
				>
					{`${String(contactsCount).padStart(2, '0')} Contacts`}
				</div>
				<div
					className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold"
					style={{
						backgroundColor: getDraftFillColor(),
						borderWidth: '1px',
						width: '80px',
						height: '15px',
						fontSize: '10px',
					}}
				>
					{draftCount === 0 ? 'Drafts' : `${String(draftCount).padStart(2, '0')} Drafts`}
				</div>
				<div
					className="inline-flex items-center justify-center rounded-[8px] border border-black leading-none truncate font-inter font-semibold"
					style={{
						backgroundColor: getSentFillColor(),
						borderWidth: '1px',
						width: '80px',
						height: '15px',
						fontSize: '10px',
					}}
				>
					{sentCount === 0 ? 'Sent' : `${String(sentCount).padStart(2, '0')} Sent`}
				</div>
			</div>
		</div>
	);
};

