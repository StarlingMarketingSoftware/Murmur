'use client';

import { FC, useMemo } from 'react';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';
import { cn } from '@/utils/ui';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';

const getDayOrdinalSuffix = (day: number) => {
	// 11, 12, 13 are special-cased
	if (day % 100 >= 11 && day % 100 <= 13) return 'th';
	switch (day % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
};

const formatInboxTimestamp = (value: string | Date | null | undefined) => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const now = new Date();
	const isSameDay = date.toDateString() === now.toDateString();

	if (isSameDay) {
		return date
			.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
			.toLowerCase();
	}

	const month = date.toLocaleDateString('en-US', { month: 'short' });
	const day = date.getDate();
	return `${month} ${day}${getDayOrdinalSuffix(day)}`;
};

const getEmailSnippet = (email: InboundEmailWithRelations) => {
	const raw = email.strippedText || email.bodyPlain || email.bodyHtml || '';
	const withoutHtml = raw.replace(/<[^>]*>/g, ' ');
	return withoutHtml.replace(/\s+/g, ' ').trim();
};

const getCanonicalSenderLabel = (email: InboundEmailWithRelations) => {
	const contact = email.contact;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();

	return (
		fullName ||
		contact?.company?.trim() ||
		email.senderName?.trim() ||
		email.sender?.trim() ||
		'Unknown sender'
	);
};

export const InboundEmailNotificationList: FC<{
	enabled?: boolean;
	maxItems?: number;
	className?: string;
}> = ({ enabled = true, maxItems, className }) => {
	const { data: inboundEmails, isLoading, error } = useGetInboundEmails({ enabled });

	const senderCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const email of inboundEmails ?? []) {
			const key = (email.sender || '').toLowerCase().trim();
			if (!key) continue;
			counts[key] = (counts[key] || 0) + 1;
		}
		return counts;
	}, [inboundEmails]);

	const visibleEmails = useMemo(() => {
		const list = inboundEmails ?? [];
		return typeof maxItems === 'number' ? list.slice(0, maxItems) : list;
	}, [inboundEmails, maxItems]);

	if (!enabled) return null;
	if (isLoading) return null;
	if (error) return null;
	if (!inboundEmails || inboundEmails.length === 0) return null;

	return (
		<div className={cn('w-full flex flex-col items-center', className)}>
			<div className="flex justify-center mb-[12px]">
				<div className="w-[126px] h-[22px] rounded-[22px] bg-[#A9D7FF] text-black text-[14px] font-medium flex items-center justify-center">
					{inboundEmails.length} new
				</div>
			</div>

			<div className="flex flex-col items-center gap-[8px] w-[603px] max-w-full max-h-[216px] overflow-y-auto">
				{visibleEmails.map((email) => {
					const senderLabel = getCanonicalSenderLabel(email);
					const senderKey = (email.sender || '').toLowerCase().trim();
					const senderCount = senderKey ? senderCounts[senderKey] || 0 : 0;
					const subject = email.subject?.trim() || '(No Subject)';
					const snippet = getEmailSnippet(email);
					const timeLabel = formatInboxTimestamp(email.receivedAt);
					const stateAbbr = email.contact?.state
						? getStateAbbreviation(email.contact.state)?.trim().toUpperCase() || ''
						: '';

					return (
						<div
							key={email.id}
							className="flex-none w-[603px] max-w-full h-[48px] rounded-[6px] bg-[#F2F2F2] hover:bg-[#EDEDED] transition-colors px-[12px] grid grid-cols-[170px_1fr_auto] gap-[12px] items-center"
							style={{ boxShadow: '0px 1px 0px rgba(0,0,0,0.05)' }}
						>
							{/* Sender */}
							<div className="min-w-0">
								<div className="flex items-baseline gap-[8px] min-w-0">
									<span className="font-semibold text-[14px] leading-[16px] text-black truncate">
										{senderLabel}
									</span>
									{senderCount > 1 && (
										<span className="text-[13px] leading-[16px] text-[#6B6B6B] flex-shrink-0">
											{senderCount}
										</span>
									)}
								</div>
								<div className="mt-[2px] flex items-center gap-[6px]">
									{stateAbbr ? (
										<span
											className="inline-flex items-center justify-center w-[40px] h-[19px] rounded-[5.6px] border border-black text-[16px] leading-none font-bold flex-shrink-0"
											style={{
												backgroundColor:
													stateBadgeColorMap[stateAbbr] || 'transparent',
											}}
										>
											{stateAbbr}
										</span>
									) : (
										<span className="inline-flex w-[40px]" aria-hidden="true" />
									)}
								</div>
							</div>

							{/* Subject + preview */}
							<div className="min-w-0">
								<div className="text-[14px] leading-[16px] text-black truncate">
									{subject}
								</div>
								<div className="text-[12px] leading-[14px] text-[#7A7A7A] truncate">
									{snippet}
								</div>
							</div>

							{/* Timestamp */}
							<div className="text-[14px] leading-[16px] font-medium text-black whitespace-nowrap">
								{timeLabel}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

