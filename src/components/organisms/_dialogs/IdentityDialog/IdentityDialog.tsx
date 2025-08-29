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
import { cn } from '@/utils';
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
	} = useIdentityDialog(props);

	// Ensure dialog content renders after page transition completes
	useEffect(() => {
		if (open) {
			setIsContentReady(true);
		} else {
			setIsContentReady(false);
		}
	}, [open]);

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
					<div className="flex-1 min-h-0 overflow-y-auto bg-gray-50/30">
						<div className="flex justify-start py-6">
							<div className="w-full max-w-6xl px-8 mx-auto">
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
												/>
											</div>
										) : (
											/* Show grid layout when profiles exist */
											<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
												{/* Existing Profiles Section */}
												<div className="-ml-8">
													<Typography
														variant="h3"
														className="!text-[18.77px] !leading-[22.1px] font-medium text-[#000000] mb-4 font-secondary"
													>
														Select User Profile
													</Typography>
													<Form {...form}>
														<FormField
															control={form.control}
															name="identityId"
															render={({ field }) => (
																<FormItem>
																	<div className="box-border shrink-0 w-[520px] h-[326.75px] rounded-[8.83px] border-[2.21px] border-[#000000] overflow-hidden">
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
																								className="!border-0 !border-t-0 hover:!bg-transparent"
																							>
																								<TableCell className="p-0">
																									<div className="w-full h-[117.01px] flex flex-col justify-center gap-0 pl-4">
																										<div className="font-medium text-black">
																											{identity.name}
																										</div>
																										<div className="text-gray-700">
																											{identity.email}
																										</div>
																										<div
																											className={cn(
																												'text-gray-500',
																												!identity.website &&
																													'italic text-gray-500'
																											)}
																										>
																											{identity.website || 'No website'}
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
																	className="!text-[18.77px] !leading-[22.1px] font-medium text-[#000000] font-secondary"
																>
																	Create New Profile
																</Typography>
																<svg
																	width="16"
																	height="16"
																	viewBox="0 0 16 16"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																	className={cn(
																		'transform transition-transform duration-200',
																		showCreatePanel ? 'rotate-45' : ''
																	)}
																>
																	<path
																		d="M8 2V14M2 8H14"
																		stroke="currentColor"
																		strokeWidth="2"
																		strokeLinecap="round"
																		strokeLinejoin="round"
																	/>
																</svg>
															</div>
														</div>
														<div
															className={cn(
																'overflow-hidden transition-all duration-200',
																showCreatePanel
																	? 'max-h-[500px] border-t border-gray-100'
																	: 'max-h-0'
															)}
															onClick={(e) => e.stopPropagation()}
														>
															<div className="p-4 pt-3">
																<CreateIdentityPanel
																	setShowCreatePanel={setShowCreatePanel}
																	isEdit={isEdit}
																	selectedIdentity={isEdit ? selectedIdentity : undefined}
																	showCreatePanel={true}
																	setValue={setValue}
																/>
															</div>
														</div>
													</div>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="bg-background px-8 py-4 flex-shrink-0 border-t border-gray-200">
						<div className="max-w-6xl mx-auto flex justify-center">
							<Button
								isLoading={isPendingAssignIdentity}
								onClick={handleAssignIdentity}
								variant="primary-light"
								disabled={!selectedIdentity}
								className="min-w-[200px]"
							>
								Continue
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
