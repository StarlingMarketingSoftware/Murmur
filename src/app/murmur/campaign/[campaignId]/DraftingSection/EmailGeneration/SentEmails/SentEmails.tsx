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
	onContactClick?: (contact: ContactWithName | null) => void;
	onContactHover?: (contact: ContactWithName | null) => void;
	goToDrafts?: () => void;
	goToWriting?: () => void;
	goToContacts?: () => void;
}

export const SentEmails: FC<SentEmailsProps> = ({
	emails,
	isPendingEmails,
	onContactClick,
	onContactHover,
	goToDrafts,
	goToWriting,
	goToContacts,
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
			goToDrafts={goToDrafts}
			goToWriting={goToWriting}
			goToContacts={goToContacts}
		>
			<div className="overflow-visible w-full flex flex-col gap-2 items-center">
				{emails.map((email) => {
					const contact = email.contact;
					const contactName = contact
						? (contact as any).name ||
						  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
						  contact.company ||
						  'Contact'
						: 'Unknown Contact';

					const contactForResearch: ContactWithName | null = contact
						? ({
								...(contact as any),
								name: (contact as any).name ?? null,
						  } as ContactWithName)
						: null;

					// Check if we have a separate name to decide layout
					const hasSeparateName = Boolean(
						((contact as any)?.name && (contact as any).name.trim()) ||
							(contact?.firstName && contact.firstName.trim()) ||
							(contact?.lastName && contact.lastName.trim())
					);

					return (
						<div
							key={email.id}
							className={cn(
								'cursor-pointer transition-colors relative select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2'
							)}
							onMouseEnter={() => {
								if (contactForResearch) {
									onContactHover?.(contactForResearch);
								}
							}}
							onMouseLeave={() => {
								onContactHover?.(null);
							}}
							onClick={() => {
								if (contactForResearch) {
									onContactClick?.(contactForResearch);
								}
							}}
						>
							{/* Used-contact indicator - vertically centered */}
							{usedContactIdsSet.has(email.contactId) && (
								<span
									className="absolute left-[8px]"
									title="Used in a previous campaign"
									style={{
										top: hasSeparateName ? '50%' : '30px',
										transform: 'translateY(-50%)',
										width: '16px',
										height: '16px',
										borderRadius: '50%',
										border: '1px solid #000000',
										backgroundColor: '#DAE6FE',
									}}
								/>
							)}

							{/* Fixed top-right info (Title + Location) - matching drafts table design */}
							<div className="absolute top-[6px] right-[4px] flex flex-col items-start gap-[2px] pointer-events-none">
								{contact?.headline ? (
									<div className="h-[21px] w-[240px] rounded-[6px] px-2 flex items-center bg-[#E8EFFF] border border-black overflow-hidden">
										<ScrollableText
											text={contact.headline}
											className="text-[10px] text-black leading-none"
											scrollPixelsPerSecond={60}
										/>
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
												className="inline-flex items-center justify-center rounded-[6px] border text-[12px] leading-none font-bold flex-shrink-0"
												style={{
													width: '39px',
													height: '20px',
													backgroundColor:
														stateBadgeColorMap[stateAbbr] || 'transparent',
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
							<div className="flex flex-col justify-center h-full pl-[30px] gap-[2px] pr-[30px]">
								{/* Row 1 & 2: Name / Company */}
								{(() => {
									const topRowMargin = contact?.headline
										? 'mr-[220px]'
										: 'mr-[120px]';
									if (hasSeparateName) {
										return (
											<>
												{/* Name */}
												<div
													className={cn(
														'flex items-center min-h-[20px]',
														topRowMargin
													)}
												>
													<div className="text-[15px] font-inter font-semibold truncate leading-none">
														{contactName}
													</div>
												</div>
												{/* Company */}
												<div
													className={cn(
														'flex items-center min-h-[20px]',
														topRowMargin
													)}
												>
													<div className="text-[15px] font-inter font-medium text-black leading-tight line-clamp-2">
														{contact?.company || ''}
													</div>
												</div>
											</>
										);
									}

									// No separate name - Company (in contactName) spans 2 rows height
									return (
										<div
											className={cn(
												'flex items-center min-h-[42px] pb-[6px]',
												topRowMargin
											)}
										>
											<div className="text-[15px] font-inter font-medium text-black leading-tight line-clamp-2">
												{contactName}
											</div>
										</div>
									);
								})()}

								{/* Row 3: Subject */}
								<div className="flex items-center min-h-[14px]">
									<div className="text-[14px] font-inter font-semibold text-black truncate leading-none">
										{email.subject || 'No subject'}
									</div>
								</div>

								{/* Row 4: Message preview */}
								<div className="flex items-center min-h-[14px]">
									<div className="text-[10px] text-gray-500 truncate leading-none">
										{email.message
											? email.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
											: 'No content'}
									</div>
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
