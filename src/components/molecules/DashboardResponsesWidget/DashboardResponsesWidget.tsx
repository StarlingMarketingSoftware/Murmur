'use client';

import { FC, useMemo, useState } from 'react';
import { useGetInboundEmails } from '@/hooks/queryHooks/useInboundEmails';
import type { InboundEmailWithRelations } from '@/types';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { SearchIconDesktop } from '@/components/atoms/_svg/SearchIconDesktop';
import { cn } from '@/utils/ui';
import { getStateAbbreviation } from '@/utils/string';
import { stateBadgeColorMap } from '@/constants/ui';
import {
	isCoffeeShopTitle,
	isMusicVenueTitle,
	isRestaurantTitle,
	isWeddingPlannerTitle,
	isWeddingVenueTitle,
	isWineBeerSpiritsTitle,
} from '@/utils/restaurantTitle';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { CornerUpLeft } from 'lucide-react';

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
	const contact: any = email.contact;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const legacyName: string | undefined =
		contact && typeof contact.name === 'string' ? contact.name : undefined;

	return (
		fullName ||
		legacyName?.trim() ||
		contact?.company?.trim() ||
		email.senderName?.trim() ||
		email.sender?.trim() ||
		'Unknown sender'
	);
};

const getSecondaryCompanyLabel = (email: InboundEmailWithRelations) => {
	const contact: any = email.contact;
	if (!contact) return null;
	const fullName = `${contact?.firstName || ''} ${contact?.lastName || ''}`.trim();
	const legacyName: string | undefined =
		contact && typeof contact.name === 'string' ? contact.name : undefined;

	const hasName = Boolean(fullName) || Boolean(legacyName?.trim());
	const company: string | undefined =
		contact && typeof contact.company === 'string' ? contact.company : undefined;

	if (!hasName) return null;
	if (!company || !company.trim()) return null;
	return company.trim();
};

const getCategoryIcon = (email: InboundEmailWithRelations) => {
	const contact: any = email.contact;
	const headline: string = (contact?.headline || contact?.title || '').trim();
	if (!headline) return null;

	if (isRestaurantTitle(headline)) return <RestaurantsIcon size={14} className="flex-shrink-0" />;
	if (isCoffeeShopTitle(headline)) return <CoffeeShopsIcon size={8} className="flex-shrink-0" />;
	if (isMusicVenueTitle(headline)) return <MusicVenuesIcon size={14} className="flex-shrink-0" />;
	if (isWeddingPlannerTitle(headline) || isWeddingVenueTitle(headline)) {
		return <WeddingPlannersIcon size={14} className="flex-shrink-0" />;
	}
	if (isWineBeerSpiritsTitle(headline)) {
		return <WineBeerSpiritsIcon size={14} className="flex-shrink-0" />;
	}

	return null;
};

export const DashboardResponsesWidget: FC<{
	enabled?: boolean;
	className?: string;
}> = ({ enabled = true, className }) => {
	const { data: inboundEmails, isLoading } = useGetInboundEmails({ enabled });
	const [searchQuery, setSearchQuery] = useState('');
	const [openedEmailIds, setOpenedEmailIds] = useState<Record<number, true>>({});

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
		const list = [...(inboundEmails ?? [])];

		// Sort newest-first (defensive: hook ordering isn't guaranteed).
		list.sort((a, b) => {
			const aMs = a.receivedAt ? new Date(a.receivedAt).getTime() : 0;
			const bMs = b.receivedAt ? new Date(b.receivedAt).getTime() : 0;
			return bMs - aMs;
		});

		const q = searchQuery.trim().toLowerCase();
		if (!q) return list;

		return list.filter((email) => {
			const sender = (email.sender || '').toLowerCase();
			const senderName = (email.senderName || '').toLowerCase();
			const subject = (email.subject || '').toLowerCase();
			const snippet = getEmailSnippet(email).toLowerCase();
			const company = (getSecondaryCompanyLabel(email) || '').toLowerCase();
			const canonical = getCanonicalSenderLabel(email).toLowerCase();

			return (
				sender.includes(q) ||
				senderName.includes(q) ||
				canonical.includes(q) ||
				company.includes(q) ||
				subject.includes(q) ||
				snippet.includes(q)
			);
		});
	}, [inboundEmails, searchQuery]);

	if (!enabled) return null;

	return (
		<div
			className={cn('flex flex-col items-center', className)}
			style={{
				width: '654px',
				height: '206px',
				borderRadius: '8px',
				backgroundColor: '#84C1E2',
				paddingTop: '6px',
				paddingBottom: '6px',
			}}
		>
			{/* Top bar (639 x 28) */}
			<div
				style={{
					width: '639px',
					height: '28px',
					borderTopLeftRadius: '8px',
					borderTopRightRadius: '8px',
					borderBottomLeftRadius: '0px',
					borderBottomRightRadius: '0px',
					backgroundColor: '#F4F4F4',
					display: 'flex',
					alignItems: 'center',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						paddingLeft: '12px',
						paddingRight: '12px',
						borderRight: '1px solid rgba(0,0,0,0.12)',
						fontFamily: 'Inter, sans-serif',
						fontSize: '14px',
						fontWeight: 600,
						color: '#000000',
						whiteSpace: 'nowrap',
					}}
				>
					Responses
				</div>

				<div
					className="min-w-0"
					style={{
						flex: 1,
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						gap: '10px',
						paddingLeft: '14px',
						paddingRight: '14px',
					}}
				>
					<SearchIconDesktop width={16} height={16} stroke="black" strokeWidth={2} />
					<input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search Mail"
						className="min-w-0"
						style={{
							flex: 1,
							height: '100%',
							border: 'none',
							outline: 'none',
							background: 'transparent',
							fontFamily: 'Inter, sans-serif',
							fontSize: '14px',
							color: '#000000',
						}}
					/>
				</div>
			</div>

			{/* Rows list */}
			<CustomScrollbar
				className="w-full flex-1 min-h-0"
				contentClassName="flex flex-col items-center"
				thumbWidth={2}
				thumbColor="#000000"
				trackColor="transparent"
				offsetRight={0}
				lockHorizontalScroll
				style={{
					marginTop: '6px',
				}}
			>
				{/* Blue gaps between rows */}
				<div className="w-full flex flex-col items-center gap-[8px] pb-[6px]">
					{isLoading ? (
						Array.from({ length: 3 }).map((_, idx) => (
							<div
								key={`responses-loading-${idx}`}
								style={{
									width: '639px',
									height: '48px',
									borderRadius: '8px',
									backgroundColor: '#F4F4F4',
									opacity: 0.6,
								}}
							/>
						))
					) : visibleEmails.length === 0 ? (
						<div
							className="flex items-center justify-center"
							style={{
								width: '639px',
								height: '48px',
								borderRadius: '8px',
								backgroundColor: '#F4F4F4',
								fontFamily: 'Inter, sans-serif',
								fontSize: '14px',
								fontWeight: 500,
								color: '#000000',
							}}
						>
							No responses yet
						</div>
					) : (
						visibleEmails.map((email) => {
							const senderLabel = getCanonicalSenderLabel(email);
							const senderKey = (email.sender || '').toLowerCase().trim();
							const senderCount = senderKey ? senderCounts[senderKey] || 0 : 0;
							const subject = email.subject?.trim() || '(No Subject)';
							const snippet = getEmailSnippet(email);
							const timeLabel = formatInboxTimestamp(email.receivedAt);

							const companyLabel = getSecondaryCompanyLabel(email);
							const stateAbbr = email.contact?.state
								? getStateAbbreviation(email.contact.state)?.trim().toUpperCase() || ''
								: '';
							const categoryIcon = getCategoryIcon(email);

							const isOpened = openedEmailIds[email.id] === true;
							const rowFill = isOpened ? '#F4F4F4' : '#FFFFFF';

							return (
								<button
									key={email.id}
									type="button"
									className="text-left hover:brightness-[0.985] transition-[filter]"
									style={{
										width: '639px',
										height: '48px',
										borderRadius: '8px',
										backgroundColor: rowFill,
										boxShadow: '0px 1px 0px rgba(0,0,0,0.05)',
										paddingLeft: '12px',
										paddingRight: '12px',
										display: 'grid',
										gridTemplateColumns: '176px 1fr auto',
										gap: '12px',
										alignItems: 'center',
									}}
									onClick={() => {
										setOpenedEmailIds((prev) => {
											if (prev[email.id]) return prev;
											return { ...prev, [email.id]: true };
										});
									}}
								>
									{/* Sender + badges */}
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
											{categoryIcon ? (
												<span className="text-black flex items-center">{categoryIcon}</span>
											) : (
												<span className="inline-flex w-[14px]" aria-hidden="true" />
											)}

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

											<CornerUpLeft className="w-[14px] h-[14px] text-black opacity-80" />
										</div>
									</div>

									{/* Subject + preview */}
									<div className="min-w-0">
										<div className="text-[14px] leading-[16px] text-black truncate">
											{subject}
										</div>
										<div className="text-[12px] leading-[14px] truncate">
											{companyLabel ? (
												<>
													<span className="text-black">{companyLabel}</span>
													<span className="text-[#7A7A7A]">{snippet ? ` ${snippet}` : ''}</span>
												</>
											) : (
												<span className="text-[#7A7A7A]">{snippet}</span>
											)}
										</div>
									</div>

									{/* Timestamp */}
									<div className="text-[14px] leading-[16px] font-medium text-black whitespace-nowrap">
										{timeLabel}
									</div>
								</button>
							);
						})
					)}
				</div>
			</CustomScrollbar>
		</div>
	);
};

export default DashboardResponsesWidget;

