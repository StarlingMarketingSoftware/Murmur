import { FC, useMemo, useState } from 'react';
import { DraftedEmailsProps, useDraftedEmails } from './useDraftedEmails';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { Button } from '@/components/ui/button';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { X } from 'lucide-react';
import { cn } from '@/utils';
import { DraftingTable } from '../DraftingTable/DraftingTable';
import PreviewIcon from '@/components/atoms/_svg/PreviewIcon';
import { getStateAbbreviation } from '@/utils/string';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import {
	canadianProvinceAbbreviations,
	canadianProvinceNames,
	stateBadgeColorMap,
} from '@/constants/ui';
import { CanadianFlag } from '@/components/atoms/_svg/CanadianFlag';
import { useGetUsedContactIds } from '@/hooks/queryHooks/useContacts';

export const DraftedEmails: FC<DraftedEmailsProps> = (props) => {
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
	const { onContactClick, onContactHover } = props;

	const [showConfirm, setShowConfirm] = useState(false);

	// Used contacts indicator
	const { data: usedContactIds } = useGetUsedContactIds();
	const usedContactIdsSet = useMemo(
		() => new Set(usedContactIds || []),
		[usedContactIds]
	);
	const selectedCount = selectedDraftIds.size;
	const hasSelection = selectedCount > 0;
	const toCount = selectedCount; // used in confirmation details
	const subjectPreview = useMemo(() => props.subject || '', [props.subject]);

	if (selectedDraft) {
		const contact = contacts?.find((c) => c.id === selectedDraft.contactId);
		const contactName = contact
			? contact.name ||
			  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
			  contact.company ||
			  'Contact'
			: 'Unknown Contact';

		return (
			<div style={{ width: '499px', height: '703px', position: 'relative' }}>
				{/* Container box with header - matching the table view */}
				<div
					style={{
						width: '100%',
						height: '100%',
						border: '2px solid #ABABAB',
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
							borderBottom: '2px solid #ABABAB',
							padding: '12px 16px',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							height: '48px',
							backgroundColor: 'white',
						}}
					>
						<div style={{ transform: 'translateY(-6px)' }}>
							<div className="text-sm font-inter font-medium text-black">Drafts</div>
						</div>
					</div>

					{/* Editor container */}
					<div
						className="bg-background flex-1 overflow-x-hidden overflow-y-auto pr-[10px] flex flex-col p-3 relative"
						data-lenis-prevent
						style={{ margin: '0', border: 'none' }}
					>
						{/* Close button */}
						<Button
							type="button"
							variant="ghost"
							onClick={handleBack}
							className="absolute top-2 right-2 p-1 h-auto w-auto hover:bg-gray-100 rounded"
						>
							<X size={16} className="text-black" />
						</Button>
						{/* Recipient info */}
						<div className="mb-3">
							<div className="text-sm font-medium">{contactName}</div>
						</div>

						{/* Subject input */}
						<div className="mb-3">
							<input
								type="text"
								value={editedSubject}
								onChange={(e) => setEditedSubject(e.target.value)}
								className="h-8 text-xs w-full bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
							/>
						</div>

						{/* Message editor - plain text */}
						<div className="flex-1 flex flex-col min-h-0">
							<textarea
								value={editedMessage}
								onChange={(e) => setEditedMessage(e.target.value)}
								className="flex-1 w-full p-0 text-sm resize-none focus:outline-none focus:ring-0 bg-transparent border-0 whitespace-pre-wrap"
								placeholder="Type your message here..."
							/>
						</div>

						{/* Save button */}
						<div className="mt-3 flex justify-end gap-2">
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
		);
	}

	return (
		<div className="flex flex-col gap-2 items-center">
			{/* Right table - Generated Drafts */}
			<DraftingTable
				handleClick={handleSelectAllDrafts}
				areAllSelected={
					selectedDraftIds.size === draftEmails.length && draftEmails.length > 0
				}
				hasData={draftEmails.length > 0}
				noDataMessage="No drafts generated"
				noDataDescription='Click "Generate Drafts" to create emails for the selected contacts'
				isPending={isPendingEmails}
				title="Drafts"
				goToWriting={props.goToWriting}
				goToSearch={props.goToSearch}
			>
				<>
					<div className="overflow-visible w-full flex flex-col gap-2 items-center">
						{draftEmails.map((draft) => {
							const contact = contacts?.find((c) => c.id === draft.contactId);
							const contactName = contact
								? contact.name ||
								  `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
								  contact.company ||
								  'Contact'
								: 'Unknown Contact';
							const isSelected = selectedDraftIds.has(draft.id);

							// Check if we have a separate name to decide layout
							const hasSeparateName = Boolean(
								(contact?.name && contact.name.trim()) ||
									(contact?.firstName && contact.firstName.trim()) ||
									(contact?.lastName && contact.lastName.trim())
							);

							return (
								<div
									key={draft.id}
									className={cn(
										'cursor-pointer transition-colors relative select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2 group/draft',
										isSelected && 'bg-[#E8EFFF]'
									)}
									onMouseDown={(e) => {
										// Prevent text selection on shift-click
										if (e.shiftKey) {
											e.preventDefault();
										}
									}}
									onMouseEnter={() => {
										if (contact) {
											onContactHover?.(contact);
										}
									}}
									onMouseLeave={() => {
										onContactHover?.(null);
									}}
									onClick={(e) => {
										handleDraftSelect(draft, e);
										if (contact) {
											onContactClick?.(contact);
										}
									}}
									onDoubleClick={() => handleDraftDoubleClick(draft)}
								>
									{/* Used-contact indicator - vertically centered */}
									{usedContactIdsSet.has(draft.contactId) && (
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
									{/* Delete button */}
									<Button
										type="button"
										variant="icon"
										onClick={(e) => handleDeleteDraft(e, draft.id)}
										className="absolute top-[50px] right-[2px] p-1 transition-colors z-10 group hidden group-hover/draft:block"
									>
										<X size={16} className="text-gray-500 group-hover:text-red-500" />
									</Button>

									{/* Preview button */}
									<Button
										type="button"
										variant="icon"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											if (props.onPreview) {
												props.onPreview(draft);
											} else {
												handleDraftDoubleClick(draft);
											}
										}}
										className="absolute top-[72px] right-[2px] p-1 transition-colors z-20 hidden group-hover/draft:block"
										aria-label="Preview draft"
									>
										<PreviewIcon
											width="16px"
											height="16px"
											pathClassName="fill-[#4A4A4A]"
										/>
									</Button>

									{/* Fixed top-right info (Title + Location) - matching contacts table design */}
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
												{draft.subject || 'No subject'}
											</div>
										</div>

										{/* Row 4: Message preview */}
										<div className="flex items-center min-h-[14px]">
											<div className="text-[10px] text-gray-500 truncate leading-none">
												{draft.message
													? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
													: 'No content'}
											</div>
										</div>
									</div>
								</div>
							);
						})}
						{Array.from({ length: Math.max(0, 6 - draftEmails.length) }).map((_, idx) => (
							<div
								key={`draft-placeholder-${idx}`}
								className="select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#FFCD73] p-2"
							/>
						))}
					</div>
				</>

				{isPendingDeleteEmail && (
					<div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
						<Spinner size="small" />
					</div>
				)}
			</DraftingTable>
			{draftEmails.length > 0 && (
				<div className="w-[499px] flex flex-col gap-2">
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

					<div className="relative w-[475px] h-[40px] mx-auto">
						{hasSelection ? (
							props.isSendingDisabled ? (
								<UpgradeSubscriptionDrawer
									triggerButtonText={
										showConfirm
											? 'Click to Confirm and Send'
											: hasSelection
											? `Send ${selectedCount} Selected`
											: 'Send'
									}
									buttonVariant="primary"
									className={cn(
										'w-full h-full rounded-[4px] border-[3px] text-black font-inter font-normal text-[17px] !flex !items-center !justify-center',
										hasSelection
											? '!bg-[#C7F2C9] !border-[#349A37] hover:!bg-[#B9E7BC] cursor-pointer'
											: '!bg-[#E0E0E0] !border-[#A0A0A0] !cursor-not-allowed !opacity-60 pointer-events-none'
									)}
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
										className={cn(
											'flex-1 h-full flex items-center justify-center text-center text-black font-inter font-normal text-[17px] pl-[62px]',
											hasSelection
												? 'bg-[#FFDC9F] hover:bg-[#F4C87E] cursor-pointer'
												: 'bg-[#E0E0E0] cursor-not-allowed opacity-60'
										)}
										onClick={async () => {
											if (!hasSelection) return;
											if (!showConfirm) {
												setShowConfirm(true);
												setTimeout(() => setShowConfirm(false), 10000);
												return;
											}
											setShowConfirm(false);
											await props.onSend();
										}}
										disabled={!hasSelection}
									>
										{showConfirm
											? 'Click to Confirm and Send'
											: hasSelection
											? `Send ${selectedCount} Selected`
											: 'Send'}
									</button>

									{/* Right section "All" button */}
									<button
										type="button"
										className="w-[62px] h-full bg-[#C69A4D] flex items-center justify-center font-inter font-normal text-[17px] text-black hover:bg-[#B2863F] cursor-pointer border-l-[2px] border-[#000000]"
										onClick={(e) => {
											e.stopPropagation();
											handleSelectAllDrafts();
											setShowConfirm(true);
											setTimeout(() => setShowConfirm(false), 10000);
										}}
									>
										All
									</button>
								</div>
							)
						) : (
							<div className="w-full h-full flex items-center justify-center text-center text-[15px] font-inter text-black">
								Select Drafts and Send Emails
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
