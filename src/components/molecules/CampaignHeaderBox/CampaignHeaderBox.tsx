'use client';

import { FC, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';

interface CampaignHeaderBoxProps {
	campaignId: number;
	campaignName: string;
	toListNames: string;
	fromName: string;
	contactsCount: number;
	draftCount: number;
	sentCount: number;
	onFromClick?: () => void;
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
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editedName, setEditedName] = useState(campaignName);
	const inputRef = useRef<HTMLInputElement>(null);

	const { mutate: editCampaign } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			setIsEditing(false);
		},
	});

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
			className="bg-white border-[2px] border-black rounded-[8px] flex flex-col px-3 pt-0 pb-1 box-border"
			style={{
				width: '374px',
				height: '71px',
				minWidth: '374px',
				maxWidth: '374px',
				minHeight: '71px',
				maxHeight: '71px',
			}}
		>
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
						className="font-normal text-[26px] leading-none truncate text-black cursor-text h-[26px]"
						style={{ fontFamily: 'Times New Roman, Times, serif' }}
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
			<div className="flex items-center text-[11px] flex-shrink-0">
				{/* To section - left half */}
				<div className="flex items-center gap-1 w-1/2">
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

				{/* From section - right half, starting at midpoint */}
				<div className="flex items-center gap-1 w-1/2">
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
			<div className="flex items-center" style={{ gap: '20px' }}>
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

