'use client';

import { FC } from 'react';
import Link from 'next/link';
import { urls } from '@/constants/urls';
import { cn } from '@/utils';

interface CampaignHeaderBoxProps {
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
	campaignName,
	toListNames,
	fromName,
	contactsCount,
	draftCount,
	sentCount,
	onFromClick,
}) => {
	return (
		<div
			className="bg-white border-[2px] border-black rounded-[8px] flex flex-col justify-between px-3 py-2 box-border"
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
			<div className="font-inter font-semibold text-[18px] leading-tight truncate text-black italic">
				{campaignName}
			</div>

			{/* To/From Row */}
			<div className="flex items-center gap-4 text-[11px]">
				<div className="flex items-center gap-1">
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
							className="bg-[#EEEEEE] flex items-center justify-center px-2 transition-colors group hover:bg-[#696969] rounded-[4px]"
							style={{ height: '14px' }}
						>
							<span className="font-inter font-normal text-[10px] leading-none text-black transition-colors group-hover:text-white">
								To
							</span>
						</div>
					</Link>
					<span className="font-inter font-light text-[11px] text-gray-600 truncate max-w-[100px]">
						{toListNames || 'No recipients'}
					</span>
				</div>

				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onFromClick}
						className="bg-[#EEEEEE] flex items-center justify-center px-2 cursor-pointer transition-colors group hover:bg-[#696969] rounded-[4px]"
						style={{ height: '14px' }}
					>
						<span className="font-inter font-normal text-[10px] leading-none text-black transition-colors group-hover:text-white">
							From
						</span>
					</button>
					<span className="font-inter font-light text-[11px] text-gray-600 truncate max-w-[100px] flex items-center gap-1">
						{fromName || 'Not set'}
						<span className="inline-block align-middle">▾</span>
					</span>
				</div>
			</div>

			{/* Metrics Row */}
			<div className="flex items-center gap-2">
				<div
					className="inline-flex items-center justify-center rounded-[6px] border border-black px-2 leading-none truncate font-inter font-semibold"
					style={{
						backgroundColor: getContactsFillColor(),
						borderWidth: '1px',
						height: '17px',
						fontSize: '10px',
					}}
				>
					{`${String(contactsCount).padStart(2, '0')} Contacts`}
				</div>
				<div
					className={cn(
						'inline-flex items-center justify-center rounded-[6px] border border-black px-2 leading-none truncate font-inter font-semibold',
						draftCount === 0 && 'opacity-50'
					)}
					style={{
						backgroundColor: getDraftFillColor(),
						borderWidth: '1px',
						height: '17px',
						fontSize: '10px',
					}}
				>
					{draftCount === 0 ? 'Drafts' : `${String(draftCount).padStart(2, '0')} Drafts`}
				</div>
				<div
					className={cn(
						'inline-flex items-center justify-center rounded-[6px] border border-black px-2 leading-none truncate font-inter font-semibold',
						sentCount === 0 && 'opacity-50'
					)}
					style={{
						backgroundColor: getSentFillColor(),
						borderWidth: '1px',
						height: '17px',
						fontSize: '10px',
					}}
				>
					{sentCount === 0 ? 'Sent' : `${String(sentCount).padStart(2, '0')} Sent`}
				</div>

			</div>
		</div>
	);
};

