import { FC } from 'react';
import { ContactsSelectionProps, useContactsSelection } from './useContactsSelection';
import { cn, getStateAbbreviation } from '@/utils';
import { ScrollableText } from '@/components/atoms/ScrollableText/ScrollableText';
import { DraftingTable } from '../DraftingTable/DraftingTable';

export const ContactsSelection: FC<ContactsSelectionProps> = (props) => {
	const {
		contacts,
		selectedContactIds,
		handleContactSelection,
		handleClick,
		areAllSelected,
		generationProgress,
		generationTotal,
	} = useContactsSelection(props);

	return (
		<DraftingTable
			handleClick={handleClick}
			areAllSelected={areAllSelected}
			hasData={contacts.length > 0}
			noDataMessage="No contacts selected"
			noDataDescription="Select contacts to generate personalized emails"
			isPending={false}
			title="Contacts"
			generationProgress={generationProgress}
			totalContacts={generationTotal ?? (selectedContactIds.size || contacts.length)}
			onCancel={props.cancelGeneration}
		>
			<div className="overflow-visible w-full">
				{contacts.map((contact) => (
					<div
						key={contact.id}
						className={cn(
							'border-b border-gray-200 cursor-pointer transition-colors grid grid-cols-2 grid-rows-[auto_auto] w-full overflow-visible py-1 select-none',
							selectedContactIds.has(contact.id)
								? 'bg-[#D6E8D9] border-2 border-primary'
								: ''
						)}
						onMouseDown={(e) => {
							// Prevent text selection on shift-click
							if (e.shiftKey) {
								e.preventDefault();
							}
						}}
						onClick={(e) => handleContactSelection(contact.id, e)}
					>
						{(() => {
							const fullName =
								contact.name ||
								`${contact.firstName || ''} ${contact.lastName || ''}`.trim();

							// Left column - Name and Company
							if (fullName) {
								// Has name - show name in top, company in bottom
								return (
									<>
										{/* Top Left - Name */}
										<div className="p-1 pl-3 flex items-start">
											<div className="font-bold text-xs w-full whitespace-normal break-words leading-4">
												{fullName}
											</div>
										</div>

										{/* Top Right - Title */}
										<div className="p-1 flex items-center overflow-visible">
											{contact.headline ? (
												<div className="h-5 rounded-[6px] px-2 flex items-center w-fit max-w-[calc(100%-8px)] bg-[#E8EFFF] border-1 border-black">
													<ScrollableText
														text={contact.headline}
														className="text-xs text-black"
													/>
												</div>
											) : (
												<div className="w-full" />
											)}
										</div>

										{/* Bottom Left - Company */}
										<div className="p-1 pl-3 flex items-start">
											<div className="text-xs text-black w-full whitespace-normal break-words leading-4">
												{contact.company || ''}
											</div>
										</div>

										{/* Bottom Right - Location */}
										<div className="p-1 flex items-center">
											{contact.city || contact.state ? (
												<ScrollableText
													text={[contact.city, getStateAbbreviation(contact.state)]
														.filter(Boolean)
														.join(', ')}
													className="text-xs text-black w-full"
												/>
											) : (
												<div className="w-full" />
											)}
										</div>
									</>
								);
							} else {
								// No name - vertically center company on left side
								return (
									<>
										{/* Left column - Company vertically centered */}
										<div className="row-span-2 p-1 pl-3 flex items-start">
											<div className="font-bold text-xs text-black w-full whitespace-normal break-words leading-4">
												{contact.company || 'Contact'}
											</div>
										</div>

										{/* Right column - Title or Location */}
										{contact.headline ? (
											<>
												{/* Top Right - Title */}
												<div className="p-1 flex items-center overflow-visible">
													<div className="h-[20.54px] rounded-[6.64px] px-2 flex items-center w-fit max-w-full bg-[#E8EFFF] border-[0.83px] border-black">
														<ScrollableText
															text={contact.headline}
															className="text-xs text-black"
														/>
													</div>
												</div>

												{/* Bottom Right - Location */}
												<div className="p-1 flex items-center">
													{contact.city || contact.state ? (
														<ScrollableText
															text={[contact.city, getStateAbbreviation(contact.state)]
																.filter(Boolean)
																.join(', ')}
															className="text-xs text-black w-full"
														/>
													) : (
														<div className="w-full"></div>
													)}
												</div>
											</>
										) : (
											// No title - vertically center location
											<div className="row-span-2 p-1 flex items-center">
												{contact.city || contact.state ? (
													<ScrollableText
														text={[contact.city, getStateAbbreviation(contact.state)]
															.filter(Boolean)
															.join(', ')}
														className="text-xs text-black w-full"
													/>
												) : (
													<div className="w-full"></div>
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
		</DraftingTable>
	);
};
