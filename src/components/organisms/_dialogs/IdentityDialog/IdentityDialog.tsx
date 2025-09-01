import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { IdentityDialogProps, useIdentityDialog } from './useIdentityDialog';
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { CreateIdentityPanel } from './CreateIdentityPanel/CreateIdentityPanel';
import { Button } from '@/components/ui/button';

import { urls } from '@/constants/urls';
import { Typography } from '@/components/ui/typography';

export const IdentityDialog: FC<IdentityDialogProps> = (props) => {
	const router = useRouter();
	const [isContentReady, setIsContentReady] = useState(false);
	const {
		title,
		open,
		onOpenChange,
		triggerButton,
		setShowCreatePanel,
		showCreatePanel,
		identities,
		form,
		isEdit,
		selectedIdentity,
		handleAssignIdentity,
		isPendingAssignIdentity,
		setValue,
		isPendingIdentities,
		handleAssignIdentityById,
	} = useIdentityDialog(props);

	// Ensure dialog content renders after page transition completes
	useEffect(() => {
		if (open) {
			setIsContentReady(true);
		} else {
			setIsContentReady(false);
		}
	}, [open]);

	useEffect(() => {
		const handleEsc = (event: KeyboardEvent) => {
			if (!showCreatePanel) return;
			if (event.key === 'Escape' || event.key === 'Esc') {
				event.preventDefault();
				event.stopPropagation();
				setShowCreatePanel(false);
			}
		};
		document.addEventListener('keydown', handleEsc);
		return () => {
			document.removeEventListener('keydown', handleEsc);
		};
	}, [showCreatePanel, setShowCreatePanel]);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				onOpenChange(open);
			}}
		>
			{triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
			<DialogContent
				disableEscapeKeyDown
				disableOutsideClick
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !max-w-none !max-h-screen !h-screen !w-full !rounded-none !border-0 !p-0 !overflow-hidden data-[state=open]:!animate-none data-[state=closed]:!animate-none"
				hideCloseButton={true}
			>
				<DialogTitle />
				{/* Immediate white background to prevent flash */}
				<div className="absolute inset-0 bg-background" style={{ zIndex: -1 }} />

				{/* Main content with fade animation */}
				<div
					className="flex flex-col h-screen w-full bg-background font-primary"
					style={{
						WebkitAnimation: isContentReady
							? 'dialog-smooth-in 0.3s ease-out forwards'
							: 'none',
						animation: isContentReady
							? 'dialog-smooth-in 0.3s ease-out forwards'
							: 'none',
						opacity: isContentReady ? 1 : 0,
					}}
				>
					{/* Full screen header with back button - fixed position */}
					<div className="relative bg-background px-8 py-6 flex-shrink-0">
						{/* Back button - always visible, goes to dashboard */}
						{isContentReady && (
							<button
								onClick={() => router.push(urls.murmur.dashboard.index)}
								className="absolute left-8 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-0 rounded-lg text-gray-600/60 text-sm font-normal cursor-pointer transition-all duration-200 hover:bg-gray-100/50 hover:text-gray-900 active:scale-95 font-primary"
								aria-label="Back to dashboard"
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									className="w-[18px] h-[18px]"
								>
									<path
										d="M12 16L6 10L12 4"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span>Back</span>
							</button>
						)}

						<div className="text-center">
							<Typography variant="h2" className="text-2xl font-semibold">
								{title}
							</Typography>
							<p className="mt-1 text-sm text-gray-500">
								{identities?.length === 0
									? 'Create your first profile to get started'
									: 'Create a new profile or select an existing one'}
							</p>
						</div>
					</div>

					{/* Main content area - scrollable */}
					<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50/30">
						<div className="flex justify-center py-6">
							<div className="w-full max-w-[1443.9px] px-0 mx-auto">
								{isPendingIdentities ? (
									<div className="h-full flex items-center justify-center">
										{/* Empty space during load - fade transition handles the visual feedback */}
									</div>
								) : (
									<div className="flex flex-col items-stretch justify-start">
										{/* Show create form centered when no profiles exist */}
										{!identities || identities.length === 0 ? (
											<div className="w-full max-w-md">
												<Typography
													variant="h3"
													className="text-xl font-semibold text-gray-900 mb-6 text-center"
												>
													Create Your First Profile
												</Typography>
												<CreateIdentityPanel
													setShowCreatePanel={setShowCreatePanel}
													isEdit={isEdit}
													selectedIdentity={isEdit ? selectedIdentity : undefined}
													showCreatePanel={true}
													setValue={setValue}
													onContinueWithIdentity={(id) => handleAssignIdentityById(id)}
												/>
											</div>
										) : (
											/* Show grid layout when profiles exist */
											<div className="grid grid-cols-1 w-full lg:grid-cols-[652.4px_650.5px] lg:gap-[141px] lg:w-[1443.9px] lg:mx-auto">
												{/* Existing Profiles Section */}
												<div style={{ opacity: showCreatePanel ? 0.26 : 1 }}>
													<Typography
														variant="h3"
														className="!text-[18.77px] !leading-[22.1px] font-medium text-[#000000] mb-2 font-secondary"
													>
														Select User Profile
													</Typography>
													<Form {...form}>
														<FormField
															control={form.control}
															name="identityId"
															render={({ field }) => (
																<FormItem>
																	<div
																		className="box-border shrink-0 w-[652.4px] h-[326.75px] rounded-[8.83px] border-[2.21px] border-[#000000] overflow-hidden"
																		onClick={() => {
																			if (showCreatePanel) setShowCreatePanel(false);
																		}}
																		style={{
																			cursor: showCreatePanel ? 'pointer' : undefined,
																		}}
																	>
																		<div className="w-full h-full overflow-y-auto overflow-x-hidden">
																			<Table className="w-full !rounded-none">
																				<TableBody>
																					{identities.map((identity) => {
																						const isSelected =
																							field.value === identity.id.toString();
																						return (
																							<TableRow
																								key={identity.id}
																								onClick={() => {
																									if (showCreatePanel) return;
																									field.onChange(identity.id.toString());
																								}}
																								data-state={
																									isSelected ? 'selected' : undefined
																								}
																								className="border-0 border-b border-[#000000] last:border-b-0 hover:!bg-transparent"
																							>
																								<TableCell className="p-0">
																									<div className="w-full h-[117.01px] flex flex-col justify-center gap-0 pl-4">
																										<div className="font-primary font-normal text-[21.5px] text-black pl-1 mb-1">
																											{identity.name}
																										</div>
																										<div className="w-[267.13px] h-[22.79px] bg-[#E8EFFF] border-[0.91px] border-[#000000] rounded-[7.29px] flex items-center px-2 overflow-hidden">
																											<span className="font-secondary font-light text-[15.5px] text-[#000000] truncate">
																												{identity.email}
																											</span>
																										</div>
																										<div className="w-[267.13px] h-[22.79px] bg-[#E8EFFF] border-[0.91px] border-[#000000] rounded-[7.29px] flex items-center px-2 overflow-hidden mt-1">
																											<span className="font-secondary font-light text-[15.5px] text-[#000000] truncate">
																												{identity.website || 'No website'}
																											</span>
																										</div>
																									</div>
																								</TableCell>
																							</TableRow>
																						);
																					})}
																				</TableBody>
																			</Table>
																		</div>
																	</div>
																</FormItem>
															)}
														/>
													</Form>
													{/* Continue button 17px below left box */}
													{!showCreatePanel && (
														<div className="mt-[17px]">
															<Button
																onClick={handleAssignIdentity}
																isLoading={isPendingAssignIdentity}
																className="w-[652.4px] h-[43.05px] rounded-[8.83px] border-[1.1px] text-black"
																style={{
																	backgroundColor: 'rgba(93,171,104,0.49)',
																	borderColor: '#5DAB68',
																}}
																disabled={!selectedIdentity}
															>
																Continue
															</Button>
														</div>
													)}
												</div>

												{/* Create New Profile Section */}
												<div>
													<div className="bg-background rounded-lg transition-all">
														<div
															className="flex items-center gap-4 p-0 cursor-pointer mb-2"
															onClick={() => setShowCreatePanel((prev) => !prev)}
														>
															<div className="flex items-center gap-2">
																<Typography
																	variant="h3"
																	className="!text-[18.77px] !leading-[22.1px] font-medium text-[#000000] font-secondary"
																>
																	Create New Profile
																</Typography>
															</div>
														</div>
														{/* Fixed create panel launcher box */}
														{!showCreatePanel && (
															<div
																className="w-[650.5px] h-[326.75px] bg-[#F8F8F8] rounded-none flex items-center justify-center mb-2 cursor-pointer"
																onClick={() => setShowCreatePanel(true)}
															>
																<button
																	type="button"
																	onClick={() => setShowCreatePanel(true)}
																	aria-label="Open create profile"
																	className="w-[28.7px] h-[28.7px] flex items-center justify-center cursor-pointer rounded-none"
																>
																	<svg
																		width="28.7"
																		height="28.7"
																		viewBox="0 0 16 16"
																		fill="none"
																		xmlns="http://www.w3.org/2000/svg"
																		className=""
																	>
																		<path
																			d="M8 2V14M2 8H14"
																			stroke="#000000"
																			strokeWidth="2"
																			strokeLinecap="square"
																			strokeLinejoin="miter"
																		/>
																	</svg>
																</button>
															</div>
														)}
														{showCreatePanel && (
															<div
																onClick={(e) => e.stopPropagation()}
																className="relative w-[651px]"
															>
																{/* Close (X) button positioned just above the top-right of the box */}
																<button
																	type="button"
																	onClick={() => setShowCreatePanel(false)}
																	aria-label="Close create profile"
																	className="absolute -top-5 right-[8px] w-[13.05px] h-[13.05px] flex items-center justify-center rounded-none cursor-pointer bg-transparent"
																>
																	<svg
																		width="13.05"
																		height="13.05"
																		viewBox="0 0 12 12"
																		fill="none"
																		xmlns="http://www.w3.org/2000/svg"
																	>
																		<path
																			d="M1 1L11 11M11 1L1 11"
																			stroke="#000000"
																			strokeWidth="2"
																			strokeLinecap="square"
																		/>
																	</svg>
																</button>
																<div className="p-0">
																	<CreateIdentityPanel
																		setShowCreatePanel={setShowCreatePanel}
																		isEdit={isEdit}
																		selectedIdentity={
																			isEdit ? selectedIdentity : undefined
																		}
																		showCreatePanel={true}
																		setValue={setValue}
																	/>
																</div>
															</div>
														)}
													</div>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
