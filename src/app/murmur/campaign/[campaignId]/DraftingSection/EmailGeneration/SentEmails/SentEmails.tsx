import { FC, useMemo } from 'react';
import { EmailWithRelations } from '@/types/campaign';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import { cn } from '@/utils';
import { getStateAbbreviation } from '@/utils/string';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';
import { ContactWithName } from '@/types/contact';

interface SentEmailsProps {
	emails: EmailWithRelations[];
	isPendingEmails: boolean;
	onContactHover?: (contact: ContactWithName | null) => void;
}

export const SentEmails: FC<SentEmailsProps> = ({
	emails,
	isPendingEmails,
	onContactHover,
}) => {
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);
	return (
		<DraftingTable
			handleClick={() => {}}
			areAllSelected={false}
			hasData={emails.length > 0}
			noDataMessage="No sent emails"
			noDataDescription="Emails you send will appear here"
			isPending={isPendingEmails}
			title="Sent"
		>
			<div className="overflow-visible w-full flex flex-col gap-2 items-center">
				{emails.map((email) => {
					const contact = email.contact;
					const contactName = contact
						? `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
						  contact.company ||
						  'Contact'
						: 'Unknown Contact';

					const contactForResearch: ContactWithName | null = contact
						? ({
								...(contact as any),
								name: (contact as any).name ?? null,
						  } as ContactWithName)
						: null;

					return (
						<div
							key={email.id}
							className={cn(
								'transition-colors relative select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2'
							)}
							onMouseEnter={() => {
								if (contactForResearch && onContactHover) {
									onContactHover(contactForResearch);
								}
							}}
							onMouseLeave={() => {
								onContactHover?.(null);
							}}
						>
							{/* Used-contact indicator - vertically centered */}
							{usedContactIdsSet.has(email.contactId) && (
								<span
									className="absolute left-[8px]"
									title="Used in a previous campaign"
									style={{
										top: '50%',
										transform: 'translateY(-50%)',
										width: '16px',
										height: '16px',
										borderRadius: '50%',
										border: '1px solid #000000',
										backgroundColor: '#DAE6FE',
									}}
								/>
							)}
							{/* Fixed top-right info (Location + Title) */}
							<div className="absolute top-[6px] right-[6px] flex flex-col items-end gap-[2px] w-[114px] pointer-events-none">
								<div className="flex items-center justify-start gap-1 h-[11.67px] w-full">
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
												className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border overflow-hidden"
												style={{ borderColor: '#000000' }}
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
												className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border text-[8px] leading-none font-bold"
												style={{
													backgroundColor: stateBadgeColorMap[stateAbbr] || 'transparent',
													borderColor: '#000000',
												}}
											>
												{stateAbbr}
											</span>
										) : (
											<span
												className="inline-flex items-center justify-center w-[17.81px] h-[11.67px] rounded-[3.44px] border"
												style={{ borderColor: '#000000' }}
											/>
										);
									})()}
									{contact?.city ? (
										<ScrollableText
											text={contact.city}
											className="text-[10px] text-black leading-none max-w-[90px]"
										/>
									) : null}
								</div>

								{contact?.headline ? (
									<div className="w-[114px] h-[10px] rounded-[3.71px] bg-[#E8EFFF] border border-black overflow-hidden flex items-center justify-center">
										<ScrollableText
											text={contact.headline}
											className="text-[8px] text-black leading-none px-1"
										/>
									</div>
								) : null}
							</div>

							{/* Content grid */}
							<div className="grid grid-cols-1 grid-rows-4 h-full pr-[150px] pl-[22px]">
								{/* Row 1: Name */}
								<div className="row-start-1 col-start-1 flex items-center">
									<div className="font-bold text-[11px] truncate leading-none">
										{contactName}
									</div>
								</div>

								{/* Row 2: Company (only when there is a separate name) */}
								{(() => {
									const hasSeparateName = Boolean(
										(contact?.firstName && contact.firstName.trim()) ||
											(contact?.lastName && contact.lastName.trim())
									);
									return (
										<div className="row-start-2 col-start-1 flex items-center pr-2">
											<div className="text-[11px] text-black truncate leading-none">
												{hasSeparateName ? contact?.company || '' : ''}
											</div>
										</div>
									);
								})()}

								{/* Row 3: Subject */}
								<div className="row-start-3 col-span-1 text-[10px] text-black truncate leading-none flex items-center">
									{email.subject || 'No subject'}
								</div>

								{/* Row 4: Message preview */}
								<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center">
									{email.message
										? email.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
										: 'No content'}
								</div>
							</div>
						</div>
					);
				})}
				{Array.from({ length: Math.max(0, 6 - emails.length) }).map((_, idx) => (
					<div
						key={`sent-placeholder-${idx}`}
						className="select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#5AB477] p-2"
					/>
				))}
			</div>
		</DraftingTable>
	);
};

export default SentEmails;
