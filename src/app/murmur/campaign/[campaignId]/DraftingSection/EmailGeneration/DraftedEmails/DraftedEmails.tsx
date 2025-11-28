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

							return (
								<div
									key={draft.id}
									className={cn(
										'cursor-pointer transition-colors relative select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-white p-2',
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
									{/* Delete button */}
									<Button
										type="button"
										variant="icon"
										onClick={(e) => handleDeleteDraft(e, draft.id)}
										className="absolute top-[6px] right-[2px] p-1 transition-colors z-10 group"
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
										className="absolute top-[28px] right-[2px] p-1 transition-colors z-20"
										aria-label="Preview draft"
									>
										<PreviewIcon
											width="16px"
											height="16px"
											pathClassName="fill-[#4A4A4A]"
										/>
									</Button>

									{/* Fixed top-right info (Location + Title) */}
									<div className="absolute top-[6px] right-[28px] flex flex-col items-end gap-[2px] w-[92px] pointer-events-none">
										<div className="flex items-center justify-start gap-1 h-[11.67px] w-[92px]">
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
															backgroundColor:
																stateBadgeColorMap[stateAbbr] || 'transparent',
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
													className="text-[10px] text-black leading-none max-w-[70px]"
												/>
											) : null}
										</div>

										{contact?.headline ? (
											<div className="w-[92px] h-[10px] rounded-[3.71px] bg-[#E8EFFF] border border-black overflow-hidden flex items-center justify-center">
												<ScrollableText
													text={contact.headline}
													className="text-[8px] text-black leading-none px-1"
												/>
											</div>
										) : null}
									</div>

									{/* Content grid */}
									<div className="grid grid-cols-1 grid-rows-4 h-full pr-[150px] pl-[22px]">
										{/* Row 1: Name + Location */}
										<div className="row-start-1 col-start-1 flex items-center">
											<div className="font-bold text-[11px] truncate leading-none">
												{contactName}
											</div>
										</div>

										{/* Row 2: Company + Headline (only when there is a separate name) */}
										{(() => {
											const hasSeparateName = Boolean(
												(contact?.name && contact.name.trim()) ||
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
											{draft.subject || 'No subject'}
										</div>

										{/* Row 4: Message preview */}
										<div className="row-start-4 col-span-1 text-[10px] text-gray-500 truncate leading-none flex items-center">
											{draft.message
												? draft.message.replace(/<[^>]*>/g, '').substring(0, 60) + '...'
												: 'No content'}
										</div>
									</div>
								</div>
							);
						})}
						{Array.from({ length: Math.max(0, 6 - draftEmails.length) }).map((_, idx) => (
							<div
								key={`draft-placeholder-${idx}`}
								className="select-none w-[489px] h-[97px] overflow-hidden rounded-[8px] border-2 border-[#000000] bg-[#FFDC9E] p-2"
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

					<div className="w-full flex items-center justify-center">
						<div
							className="flex items-stretch rounded-[6px] overflow-hidden"
							style={{
								width: '100%',
								height: '28px',
								border: '1px solid #000000',
								backgroundColor: 'transparent',
							}}
						>
							{props.isSendingDisabled ? (
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
										'flex-1 h-full !rounded-none !border-0 !bg-[#68C575] !text-black !font-inter !font-medium !text-[14px] !flex !items-center !justify-center border-r border-[#000000]',
										hasSelection
											? 'hover:!bg-[#5FA968] active:!bg-[#569D60]'
											: '!opacity-50 !cursor-not-allowed pointer-events-none'
									)}
									message={
										props.isFreeTrial
											? `Your free trial subscription does not include the ability to send emails. To send the emails\'ve drafted, please upgrade your subscription to the paid version.`
											: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
									}
								/>
							) : (
								<Button
									type="button"
									className={cn(
										'flex-1 h-full rounded-none font-inter font-medium text-[14px] flex items-center justify-center transition-all duration-200 border-r border-[#000000]',
										showConfirm
											? 'bg-[#68C575] text-black'
											: hasSelection
											? 'bg-[#68C575] text-black hover:bg-[#5FA968] active:bg-[#569D60]'
											: 'bg-[#68C575] text-black opacity-50 cursor-not-allowed'
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
								</Button>
							)}
							<Button
								type="button"
								variant="ghost"
								className="w-[56px] h-full rounded-none text-black font-inter font-medium text-[14px]"
								onClick={() => {
									handleSelectAllDrafts();
									setShowConfirm(true);
									setTimeout(() => setShowConfirm(false), 10000);
								}}
							>
								All
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
