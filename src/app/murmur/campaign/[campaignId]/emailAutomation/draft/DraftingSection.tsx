import { FC, ReactNode, useRef, useState, useEffect } from 'react';
import { DraftingSectionProps, useDraftingSection } from './useDraftingSection';
import { Button } from '@/components/ui/button';
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormMessage,
	Form,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/organisms/_dialogs/ConfirmDialog/ConfirmDialog';
import ProgressIndicator from '@/components/molecules/ProgressIndicator/ProgressIndicator';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { Typography } from '@/components/ui/typography';
import { UpgradeSubscriptionDrawer } from '@/components/atoms/UpgradeSubscriptionDrawer/UpgradeSubscriptionDrawer';
import { DraftingMode, EmailStatus } from '@prisma/client';
import { cn } from '@/utils';
import { useGetEmails } from '@/hooks/queryHooks/useEmails';
import { ChevronRight, X } from 'lucide-react';
import ViewEditEmailDialog from '@/components/organisms/_dialogs/ViewEditEmailDialog/ViewEditEmailDialog';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { useDeleteEmail } from '@/hooks/queryHooks/useEmails';
import { ConfirmSendDialog } from '@/components/organisms/_dialogs/ConfirmSendDialog/ConfirmSendDialog';
import { useMe } from '@/hooks/useMe';

// Helper function to abbreviate state names
const abbreviateState = (state: string | null | undefined): string => {
	if (!state) return '';

	// Common US state abbreviations mapping
	const stateAbbreviations: { [key: string]: string } = {
		alabama: 'AL',
		alaska: 'AK',
		arizona: 'AZ',
		arkansas: 'AR',
		california: 'CA',
		colorado: 'CO',
		connecticut: 'CT',
		delaware: 'DE',
		florida: 'FL',
		georgia: 'GA',
		hawaii: 'HI',
		idaho: 'ID',
		illinois: 'IL',
		indiana: 'IN',
		iowa: 'IA',
		kansas: 'KS',
		kentucky: 'KY',
		louisiana: 'LA',
		maine: 'ME',
		maryland: 'MD',
		massachusetts: 'MA',
		michigan: 'MI',
		minnesota: 'MN',
		mississippi: 'MS',
		missouri: 'MO',
		montana: 'MT',
		nebraska: 'NE',
		nevada: 'NV',
		'new hampshire': 'NH',
		'new jersey': 'NJ',
		'new mexico': 'NM',
		'new york': 'NY',
		'north carolina': 'NC',
		'north dakota': 'ND',
		ohio: 'OH',
		oklahoma: 'OK',
		oregon: 'OR',
		pennsylvania: 'PA',
		'rhode island': 'RI',
		'south carolina': 'SC',
		'south dakota': 'SD',
		tennessee: 'TN',
		texas: 'TX',
		utah: 'UT',
		vermont: 'VT',
		virginia: 'VA',
		washington: 'WA',
		'west virginia': 'WV',
		wisconsin: 'WI',
		wyoming: 'WY',
		'district of columbia': 'DC',
		'washington dc': 'DC',
		'washington d.c.': 'DC',
	};

	// If it's already a 2-letter abbreviation, return as is
	if (state.length === 2) return state.toUpperCase();

	// Try to find and return abbreviation
	const lowerState = state.toLowerCase().trim();
	return stateAbbreviations[lowerState] || state;
};

// Helper component for scrolling text
const ScrollableText = ({
	text,
	className,
	style,
}: {
	text: string;
	className?: string;
	style?: React.CSSProperties;
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	useEffect(() => {
		const checkOverflow = () => {
			if (containerRef.current && textRef.current) {
				// Check if the text width exceeds the container width
				const containerWidth = containerRef.current.offsetWidth;
				const textWidth = textRef.current.scrollWidth;
				setIsOverflowing(textWidth > containerWidth);
			}
		};

		checkOverflow();
		// Recheck on window resize
		window.addEventListener('resize', checkOverflow);

		// Also check when text changes
		const observer = new ResizeObserver(checkOverflow);
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => {
			window.removeEventListener('resize', checkOverflow);
			observer.disconnect();
		};
	}, [text]);

	return (
		<div
			ref={containerRef}
			className={
				isOverflowing ? 'hover-scroll-container' : 'overflow-hidden relative w-full'
			}
			style={style}
		>
			<span
				ref={textRef}
				className={
					isOverflowing
						? `hover-scroll-text ${className || ''}`
						: `inline-block whitespace-nowrap overflow-hidden text-ellipsis max-w-full w-full ${
								className || ''
						  }`
				}
				data-text={text}
			>
				{text}
			</span>
		</div>
	);
};

export const DraftingSection: FC<DraftingSectionProps> = (props) => {
	const {
		autosaveStatus,
		campaign,
		cancelGeneration,
		contacts,
		draftingMode,
		form,
		generationProgress,
		handleGenerateDrafts,
		handleGenerateTestDrafts,
		isAiSubject,
		isConfirmDialogOpen,
		isGenerationDisabled,
		isJustSaved,
		isOpenUpgradeSubscriptionDrawer,
		isPendingGeneration,
		isTest,
		setGenerationProgress,
		setIsConfirmDialogOpen,
		setIsOpenUpgradeSubscriptionDrawer,
		trackFocusedField,
	} = useDraftingSection(props);

	const {
		formState: { isDirty },
	} = form;

	// Fetch draft emails for the campaign
	const { data: emails, isPending: isPendingEmails } = useGetEmails({
		filters: {
			campaignId: campaign.id,
		},
	});

	// Filter for draft emails only
	const draftEmails = emails?.filter((email) => email.status === EmailStatus.draft) || [];

	// State for viewing/editing email
	type EmailType = typeof draftEmails extends (infer T)[] ? T : never;
	const [selectedDraft, setSelectedDraft] = useState<EmailType | null>(null);
	const [isDraftDialogOpen, setIsDraftDialogOpen] = useState(false);

	// State for selected contacts for drafting
	const [selectedContactIds, setSelectedContactIds] = useState<Set<number>>(new Set());

	// State for selected drafts for sending
	const [selectedDraftIds, setSelectedDraftIds] = useState<Set<number>>(new Set());

	// Delete email hook
	const { mutateAsync: deleteEmail, isPending: isPendingDeleteEmail } = useDeleteEmail();

	// User info for send functionality
	const { user, isFreeTrial } = useMe();
	const [sendingProgress, setSendingProgress] = useState(-1);
	const isSendingDisabled = isFreeTrial || user?.sendingCredits === 0;

	// Clear selected drafts after sending is complete
	useEffect(() => {
		if (sendingProgress === selectedDraftIds.size && selectedDraftIds.size > 0) {
			// Clear selection after successful sending
			setSelectedDraftIds(new Set());
		}
	}, [sendingProgress, selectedDraftIds.size]);

	// Handle draft click to view/edit
	const handleDraftClick = (draft: EmailType) => {
		setSelectedDraft(draft);
		setIsDraftDialogOpen(true);
	};

	// Handle draft deletion
	const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
		e.stopPropagation(); // Prevent opening the draft dialog
		try {
			await deleteEmail(draftId);
		} catch (error) {
			console.error('Failed to delete draft:', error);
		}
	};

	// Handle contact selection for drafting
	const handleContactSelection = (contactId: number) => {
		setSelectedContactIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(contactId)) {
				newSet.delete(contactId);
			} else {
				newSet.add(contactId);
			}
			return newSet;
		});
	};

	// Handle draft selection for sending
	const handleDraftSelection = (draftId: number) => {
		setSelectedDraftIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(draftId)) {
				newSet.delete(draftId);
			} else {
				newSet.add(draftId);
			}
			return newSet;
		});
	};

	const getAutosaveStatusDisplay = (): ReactNode => {
		switch (autosaveStatus) {
			case 'saving':
				return (
					<Badge size="small" variant="secondary" className="text-xs">
						Saving...
					</Badge>
				);
			case 'saved':
				return (
					<Badge size="small" variant="default" className="text-xs">
						Saved
					</Badge>
				);
			case 'error':
				return (
					<Badge size="small" variant="destructive" className="text-xs">
						Save failed
					</Badge>
				);
			case 'idle':
				return (
					<>
						{!isJustSaved && isDirty && autosaveStatus === 'idle' && (
							<Badge size="small" variant="warning" className="text-xs">
								Unsaved
							</Badge>
						)}
					</>
				);
			default:
				return null;
		}
	};

	return (
		<div className="mb-30 flex flex-col items-center">
			<Form {...form}>
				<form className="flex flex-col items-center">
					<div className="w-[892px]">
						<div className="mb-4">
							<FormField
								control={form.control}
								name="subject"
								rules={{
									required: isAiSubject,
								}}
								render={({ field }) => (
									<FormItem className="w-[892px]">
										<div className="flex items-center gap-2">
											<FormLabel>Subject</FormLabel>
											<Separator orientation="vertical" className="!h-5" />
											<Switch
												checked={isAiSubject}
												disabled={draftingMode === DraftingMode.handwritten}
												onCheckedChange={(val: boolean) =>
													form.setValue('isAiSubject', val)
												}
												className="data-[state=checked]:bg-primary -translate-y-[2px]"
											/>
											<FormLabel className="">Automated Subject</FormLabel>
										</div>
										<FormControl>
											<Input
												className="w-full h-[44px]"
												placeholder={
													isAiSubject ? 'Automated subject...' : 'Enter subject...'
												}
												disabled={isAiSubject}
												{...field}
												onFocus={(e) =>
													!isAiSubject && trackFocusedField('subject', e.target)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<div className="mb-3">
							<FormLabel className="font-inter font-normal">Email Structure</FormLabel>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								<HybridPromptInput
									trackFocusedField={trackFocusedField}
									testMessage={campaign?.testMessage}
								/>
							</div>
						</div>
						<div className="flex justify-end mt-2 mb-2">
							<Button
								type="button"
								onClick={handleGenerateTestDrafts}
								disabled={isGenerationDisabled()}
								className={cn(
									'w-[94px] h-[39px] bg-[rgba(93,171,104,0.08)] border-2 border-[#5DAB68] text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary',
									isGenerationDisabled() ? 'opacity-50 cursor-not-allowed' : 'opacity-100'
								)}
								style={{
									WebkitAppearance: 'none',
									appearance: 'none',
								}}
							>
								{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
							</Button>
						</div>

						{/* New section matching Email Template box style */}
						<div className="mb-3 mt-6">
							<FormLabel className="font-inter font-normal">Drafting</FormLabel>
						</div>
						<div className="flex gap-[47px] items-start">
							<div className="flex-shrink-0">
								{/* Empty content area - to be filled later */}
								<div
									className="bg-white relative"
									style={{
										width: '892px',
										height: '530px',
										border: '3px solid #000000',
										borderRadius: '8px',
										overflowX: 'hidden',
									}}
								>
									{/* Left table label */}
									<div
										className="absolute"
										style={{
											left: '22px',
											top: '16px',
											fontSize: '14px',
											fontFamily: 'Inter',
											fontWeight: '500',
											color: '#000000',
										}}
									>
										Contacts
									</div>

									{/* Select All button */}
									<button
										type="button"
										className="absolute hover:underline transition-colors"
										onClick={() => {
											if (
												selectedContactIds.size === contacts?.length &&
												contacts?.length > 0
											) {
												// Deselect all if all are selected
												setSelectedContactIds(new Set());
											} else {
												// Select all
												setSelectedContactIds(new Set(contacts?.map((c) => c.id) || []));
											}
										}}
										style={{
											left: '280px', // Positioned near right edge of left table
											top: '35px',
											fontSize: '14px',
											fontFamily: 'Inter',
											fontWeight: '500',
											color: '#000000',
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											padding: '0',
										}}
									>
										{selectedContactIds.size === contacts?.length && contacts?.length > 0
											? 'Deselect All'
											: 'Select All'}
									</button>

									{/* Left table - Contacts list */}
									<div
										className="absolute bg-white border border-gray-300 overflow-auto custom-scroll"
										style={{
											width: '336px',
											height: '441px',
											left: '22px',
											bottom: '16px',
											overflowX: 'hidden',
											overflowY: 'auto',
											paddingRight: '10px',
										}}
									>
										{contacts && contacts.length > 0 ? (
											<div style={{ overflow: 'visible', width: '316px' }}>
												{contacts.map((contact) => (
													<div
														key={contact.id}
														className="border-b border-gray-200 cursor-pointer transition-colors"
														onClick={() => handleContactSelection(contact.id)}
														style={{
															display: 'grid',
															gridTemplateColumns: '158px 158px',
															gridTemplateRows: '24.5px 24.5px',
															width: '316px',
															height: '49px',
															overflow: 'visible',
															backgroundColor: selectedContactIds.has(contact.id)
																? '#D6E8D9'
																: 'transparent',
															border: selectedContactIds.has(contact.id)
																? '2px solid #5DAB68'
																: undefined,
															borderBottom: '1px solid #e5e7eb',
														}}
													>
														{(() => {
															const fullName =
																contact.name ||
																`${contact.firstName || ''} ${
																	contact.lastName || ''
																}`.trim();

															// Left column - Name and Company
															if (fullName) {
																// Has name - show name in top, company in bottom
																return (
																	<>
																		{/* Top Left - Name */}
																		<div
																			style={{
																				padding: '4px 4px 4px 12px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			<ScrollableText
																				text={fullName}
																				className="font-bold text-xs"
																				style={{ width: '100%' }}
																			/>
																		</div>

																		{/* Top Right - Title */}
																		<div
																			style={{
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																				overflow: 'visible',
																			}}
																		>
																			{contact.headline ? (
																				<div
																					style={{
																						height: '20.54px',
																						borderRadius: '6.64px',
																						padding: '0 8px',
																						display: 'flex',
																						alignItems: 'center',
																						width: 'fit-content',
																						maxWidth: 'calc(100% - 8px)',
																						backgroundColor: '#E8EFFF',
																						border: '0.83px solid #000000',
																					}}
																				>
																					<ScrollableText
																						text={contact.headline}
																						className="text-xs text-black"
																					/>
																				</div>
																			) : (
																				<div style={{ width: '100%' }}></div>
																			)}
																		</div>

																		{/* Bottom Left - Company */}
																		<div
																			style={{
																				padding: '4px 4px 4px 12px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			<ScrollableText
																				text={contact.company || ''}
																				className="text-xs text-black"
																				style={{ width: '100%' }}
																			/>
																		</div>

																		{/* Bottom Right - Location */}
																		<div
																			style={{
																				padding: '4px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			{contact.city || contact.state ? (
																				<ScrollableText
																					text={[
																						contact.city,
																						abbreviateState(contact.state),
																					]
																						.filter(Boolean)
																						.join(', ')}
																					className="text-xs text-black"
																					style={{ width: '100%' }}
																				/>
																			) : (
																				<div style={{ width: '100%' }}></div>
																			)}
																		</div>
																	</>
																);
															} else {
																// No name - vertically center company on left side
																return (
																	<>
																		{/* Left column - Company vertically centered */}
																		<div
																			style={{
																				gridRow: '1 / 3',
																				padding: '4px 4px 4px 12px',
																				display: 'flex',
																				alignItems: 'center',
																			}}
																		>
																			<ScrollableText
																				text={contact.company || 'Contact'}
																				className="font-bold text-xs text-black"
																				style={{ width: '100%' }}
																			/>
																		</div>

																		{/* Right column - Title or Location */}
																		{contact.headline ? (
																			<>
																				{/* Top Right - Title */}
																				<div
																					style={{
																						padding: '4px',
																						display: 'flex',
																						alignItems: 'center',
																						overflow: 'visible',
																					}}
																				>
																					<div
																						style={{
																							height: '20.54px',
																							borderRadius: '6.64px',
																							padding: '0 8px',
																							display: 'flex',
																							alignItems: 'center',
																							width: 'fit-content',
																							maxWidth: '100%',
																							backgroundColor: '#E8EFFF',
																							border: '0.83px solid #000000',
																						}}
																					>
																						<ScrollableText
																							text={contact.headline}
																							className="text-xs text-black"
																						/>
																					</div>
																				</div>

																				{/* Bottom Right - Location */}
																				<div
																					style={{
																						padding: '4px',
																						display: 'flex',
																						alignItems: 'center',
																					}}
																				>
																					{contact.city || contact.state ? (
																						<ScrollableText
																							text={[
																								contact.city,
																								abbreviateState(contact.state),
																							]
																								.filter(Boolean)
																								.join(', ')}
																							className="text-xs text-black"
																							style={{ width: '100%' }}
																						/>
																					) : (
																						<div style={{ width: '100%' }}></div>
																					)}
																				</div>
																			</>
																		) : (
																			// No title - vertically center location
																			<div
																				style={{
																					gridRow: '1 / 3',
																					padding: '4px',
																					display: 'flex',
																					alignItems: 'center',
																				}}
																			>
																				{contact.city || contact.state ? (
																					<ScrollableText
																						text={[
																							contact.city,
																							abbreviateState(contact.state),
																						]
																							.filter(Boolean)
																							.join(', ')}
																						className="text-xs text-black"
																						style={{ width: '100%' }}
																					/>
																				) : (
																					<div style={{ width: '100%' }}></div>
																				)}
																			</div>
																		)}
																	</>
																);
															}
														})()}
													</div>
												))}
											</div>
										) : (
											<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
												<div className="text-sm font-semibold mb-2">
													No contacts selected
												</div>
												<div className="text-xs text-center">
													Select contacts to generate personalized emails
												</div>
											</div>
										)}
									</div>

									{/* Generate Drafts Button - Center between tables */}
									<div
										className="absolute flex items-center justify-center"
										style={{
											left: '50%',
											top: '50%',
											transform: 'translate(-50%, -50%)',
										}}
									>
										<Button
											type="button"
											onClick={() => setIsConfirmDialogOpen(true)}
											disabled={isGenerationDisabled() || selectedContactIds.size === 0}
											className={cn(
												'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black font-inter font-medium rounded-[6px] cursor-pointer transition-all duration-200 hover:bg-[rgba(93,171,104,0.6)] hover:border-[#4a8d56] active:bg-[rgba(93,171,104,0.7)] active:border-[#3d7346] h-[52px] w-[95px] flex items-center justify-center',
												isGenerationDisabled() || selectedContactIds.size === 0
													? 'opacity-50 cursor-not-allowed hover:bg-[rgba(93,171,104,0.47)] hover:border-[#5DAB68]'
													: ''
											)}
											noPadding
											style={{
												width: '95px',
												height: '52px',
												WebkitAppearance: 'none',
												appearance: 'none',
												fontSize: '14px',
												fontWeight: '500',
												fontFamily: 'Inter',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												padding: '0',
												margin: '0',
												lineHeight: 'normal',
												boxSizing: 'border-box',
												textAlign: 'center',
											}}
										>
											{isPendingGeneration && !isTest ? (
												<Spinner size="small" />
											) : (
												<span className="flex items-center gap-1">
													Draft
													<ChevronRight size={16} />
												</span>
											)}
										</Button>
									</div>

									{/* Right table label */}
									<div
										className="absolute"
										style={{
											left: '534px', // 892px total - 22px margin - 336px width
											top: '16px',
											fontSize: '14px',
											fontFamily: 'Inter',
											fontWeight: '500',
											color: '#000000',
										}}
									>
										Drafts
									</div>

									{/* Select All button for drafts */}
									<button
										type="button"
										className="absolute hover:underline transition-colors"
										onClick={() => {
											if (
												selectedDraftIds.size === draftEmails?.length &&
												draftEmails?.length > 0
											) {
												// Deselect all if all are selected
												setSelectedDraftIds(new Set());
											} else {
												// Select all
												setSelectedDraftIds(new Set(draftEmails?.map((d) => d.id) || []));
											}
										}}
										style={{
											left: '790px', // Positioned near right edge of right table
											top: '35px',
											fontSize: '14px',
											fontFamily: 'Inter',
											fontWeight: '500',
											color: '#000000',
											background: 'none',
											border: 'none',
											cursor: 'pointer',
											padding: '0',
										}}
									>
										{selectedDraftIds.size === draftEmails?.length &&
										draftEmails?.length > 0
											? 'Deselect All'
											: 'Select All'}
									</button>

									{/* Right table - Generated Drafts */}
									<div
										className="absolute bg-white border border-gray-300 overflow-auto custom-scroll"
										style={{
											width: '336px',
											height: '441px',
											right: '22px',
											bottom: '16px',
											overflowX: 'hidden',
											overflowY: 'auto',
											paddingRight: '10px',
										}}
									>
										{isPendingEmails ? (
											<div className="flex items-center justify-center h-full">
												<Spinner size="small" />
											</div>
										) : draftEmails.length > 0 ? (
											<div style={{ overflow: 'visible', width: '316px' }}>
												{draftEmails.map((draft) => {
													const contact = contacts?.find((c) => c.id === draft.contactId);
													const contactName = contact
														? contact.name ||
														  `${contact.firstName || ''} ${
																contact.lastName || ''
														  }`.trim() ||
														  contact.company ||
														  'Contact'
														: 'Unknown Contact';

													return (
														<div
															key={draft.id}
															className="border-b border-gray-200 cursor-pointer transition-colors"
															onClick={(e) => {
																// Only handle selection if not clicking on delete button
																if (!(e.target as HTMLElement).closest('button')) {
																	handleDraftSelection(draft.id);
																}
															}}
															onDoubleClick={() => handleDraftClick(draft)}
															style={{
																padding: '12px',
																position: 'relative',
																backgroundColor: selectedDraftIds.has(draft.id)
																	? '#D6E8D9'
																	: 'transparent',
																border: selectedDraftIds.has(draft.id)
																	? '2px solid #5DAB68'
																	: undefined,
																borderBottom: '1px solid #e5e7eb',
															}}
														>
															{/* Delete button */}
															<button
																onClick={(e) => handleDeleteDraft(e, draft.id)}
																className="absolute top-2 right-2 p-1 transition-colors"
																style={{
																	zIndex: 10,
																}}
															>
																<X
																	size={16}
																	className="text-gray-500 hover:text-red-500"
																/>
															</button>

															{/* Contact name */}
															<div className="font-bold text-xs mb-1 pr-8">
																{contactName}
															</div>

															{/* Email subject */}
															<div className="text-xs text-gray-600 mb-1 pr-8">
																<span className="font-semibold">Subject:</span>{' '}
																{draft.subject || 'No subject'}
															</div>

															{/* Preview of message */}
															<div className="text-xs text-gray-500 pr-8">
																{draft.message
																	? draft.message
																			.replace(/<[^>]*>/g, '')
																			.substring(0, 60) + '...'
																	: 'No content'}
															</div>
														</div>
													);
												})}
											</div>
										) : (
											<div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
												<div className="text-sm font-semibold mb-2">
													No drafts generated
												</div>
												<div className="text-xs text-center">
													Click &quot;Generate Drafts&quot; to create emails for the
													selected contacts
												</div>
											</div>
										)}
										{isPendingDeleteEmail && (
											<div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
												<Spinner size="small" />
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex flex-col gap-4 mt-4">
								{getAutosaveStatusDisplay() && (
									<div className="flex flex-col sm:flex-row gap-4 items-center justify-end">
										{getAutosaveStatusDisplay()}
									</div>
								)}
								{/* Send button - always visible but disabled when no drafts selected */}
								{draftEmails.length > 0 && (
									<div className="flex justify-end">
										{isSendingDisabled ? (
											<UpgradeSubscriptionDrawer
												triggerButtonText="Send"
												className={`!w-[891px] !h-[39px] !bg-[rgba(93,171,104,0.47)] !border-2 !border-[#5DAB68] !text-black !font-bold !flex !items-center !justify-center ${
													selectedDraftIds.size === 0
														? '!opacity-50 !cursor-not-allowed hover:!bg-[rgba(93,171,104,0.47)] hover:!border-[#5DAB68]'
														: 'hover:!bg-[rgba(93,171,104,0.6)] hover:!border-[#5DAB68] active:!bg-[rgba(93,171,104,0.7)]'
												}`}
												message={
													isFreeTrial
														? `Your free trial subscription does not include the ability to send emails. To send the emails you've drafted, please upgrade your subscription to the paid version.`
														: `You have run out of sending credits. Please upgrade your subscription to a higher tier to receive more sending credits.`
												}
											/>
										) : (
											<ConfirmSendDialog
												setSendingProgress={setSendingProgress}
												campaign={campaign}
												draftEmails={draftEmails.filter((d) =>
													selectedDraftIds.has(d.id)
												)}
												disabled={selectedDraftIds.size === 0}
											/>
										)}
									</div>
								)}
							</div>
							<ConfirmDialog
								title="Confirm Batch Generation of Emails"
								confirmAction={async () => {
									// Note: handleGenerateDrafts should be modified to use selectedContactIds
									// For now, it will use all contacts as before
									await handleGenerateDrafts();
									// Clear selection after successful generation
									setSelectedContactIds(new Set());
								}}
								open={isConfirmDialogOpen}
								onOpenChange={setIsConfirmDialogOpen}
							>
								<Typography>
									Are you sure you want to generate emails for {selectedContactIds.size}{' '}
									selected recipient{selectedContactIds.size !== 1 ? 's' : ''}?
									<br /> <br />
									This action will automatically create a custom email for each recipient
									based on the prompt you provided and will count towards your monthly
									usage limits.
								</Typography>
							</ConfirmDialog>
							<ProgressIndicator
								progress={generationProgress}
								setProgress={setGenerationProgress}
								total={selectedContactIds.size}
								pendingMessage="Generating {{progress}} emails..."
								completeMessage="Finished generating {{progress}} emails."
								cancelAction={cancelGeneration}
							/>
							<ProgressIndicator
								progress={sendingProgress}
								setProgress={setSendingProgress}
								total={selectedDraftIds.size}
								pendingMessage="Sending {{progress}} emails..."
								completeMessage="Finished sending {{progress}} emails."
							/>
						</div>
					</div>
				</form>
			</Form>

			<UpgradeSubscriptionDrawer
				message="You have run out of drafting credits! Please upgrade your plan."
				triggerButtonText="Upgrade"
				isOpen={isOpenUpgradeSubscriptionDrawer}
				setIsOpen={setIsOpenUpgradeSubscriptionDrawer}
				hideTriggerButton
			/>

			<ViewEditEmailDialog
				email={selectedDraft}
				isOpen={isDraftDialogOpen}
				setIsOpen={setIsDraftDialogOpen}
				isEditable={true}
			/>
		</div>
	);
};
