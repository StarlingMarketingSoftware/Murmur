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
import { cn } from '@/utils';
import SquareXIcon from '@/components/atoms/_svg/SquareX';

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
							<div className="w-full max-w-[1444px] px-0 mx-auto">
								{isPendingIdentities ? (
									<div className="h-full flex items-center justify-center"></div>
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
											<div className="grid grid-cols-1 w-full lg:grid-cols-[652px_651px] lg:gap-[141px] lg:w-[1444px] lg:mx-auto">
												{/* Existing Profiles Section */}
												<div
													className={cn(showCreatePanel ? 'opacity-25' : 'opacity-100')}
												>
													<Typography
														variant="h3"
														className="!text-[19px] !leading-[22px] font-medium text-black mb-4 font-secondary"
													>
														Select User Profile
													</Typography>
													<Form {...form}>
														<FormField
															control={form.control}
															name="identityId"
															render={({ field }) => (
																<FormItem>
																	<div className="box-border shrink-0 w-[653px] h-[327px] rounded-[9px] border-[2px] border-black overflow-hidden">
																		<div className="w-full h-full overflow-y-auto overflow-x-hidden">
																			<Table className="w-full !rounded-none">
																				<TableBody>
																					{identities.map((identity) => {
																						const isSelected =
																							field.value === identity.id.toString();
																						return (
																							<TableRow
																								key={identity.id}
																								onClick={() =>
																									field.onChange(identity.id.toString())
																								}
																								data-state={
																									isSelected ? 'selected' : undefined
																								}
																								className="border-0 border-b border-black last:border-b-0 hover:!bg-transparent"
																							>
																								<TableCell className="p-0">
																									<div className="w-full h-[117px] flex flex-col justify-center gap-0 pl-4">
																										<div className="font-primary font-normal text-[22px] text-black pl-1 mb-1">
																											{identity.name}
																										</div>
																										<div className="w-[267px] h-[23px] bg-[#E8EFFF] border-[0.91px] border-[#000000] rounded-[7.29px] flex items-center px-2 overflow-hidden">
																											<span className="font-secondary font-light text-[15.5px] text-[#000000] truncate">
																												{identity.email}
																											</span>
																										</div>
																										<div className="w-[267px] h-[23px] bg-[#E8EFFF] border-[0.91px] border-[#000000] rounded-[7.29px] flex items-center px-2 overflow-hidden mt-1">
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
													{!showCreatePanel && (
														<div className="mt-[17px]">
															<Button
																onClick={handleAssignIdentity}
																isLoading={isPendingAssignIdentity}
																className="w-[653px] h-[43px] rounded-[9px] border-1 text-black bg-[rgba(93,171,104,0.49)] border-[#5DAB68]"
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
															className="flex items-center gap-4 p-0 hover:bg-gray-50 cursor-pointer mb-4"
															onClick={() => setShowCreatePanel((prev) => !prev)}
														>
															<div className="flex items-center gap-2">
																<Typography
																	variant="h3"
																	className="!text-[18px] !leading-[22px] font-medium text-black font-secondary"
																>
																	Create New Profile
																</Typography>
															</div>
														</div>
														{/* Fixed create panel launcher box */}
														{!showCreatePanel && (
															<div className="w-[650.5px] h-[326.75px] bg-[#F8F8F8] rounded-none flex items-center justify-center mb-2">
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
																<button
																	type="button"
																	onClick={() => setShowCreatePanel(false)}
																	aria-label="Close create profile"
																	className="absolute -top-5 right-[8px] w-[13.05px] h-[13.05px] flex items-center justify-center rounded-none cursor-pointer bg-transparent"
																>
																	<SquareXIcon
																		width="13px"
																		height="13px"
																		pathClassName="stroke-black fill-black"
																	/>
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
