import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { IdentityDialogProps, useIdentityDialog } from './useIdentityDialog';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { CreateIdentityPanel } from './CreateIdentityPanel/CreateIdentityPanel';
import { twMerge } from 'tailwind-merge';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Spinner from '@/components/ui/spinner';
import { urls } from '@/constants/urls';

export const IdentityDialog: FC<IdentityDialogProps> = (props) => {
	const router = useRouter();
	const {
		title,
		open,
		onOpenChange,
		triggerButton,
		showCreatePanel,
		setShowCreatePanel,
		identities,
		form,
		isEdit,
		setIsEdit,
		selectedIdentity,
		isClosable,
		handleAssignIdentity,
		isPendingAssignIdentity,
		setValue,
		isPendingIdentities,
	} = useIdentityDialog(props);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				onOpenChange(open);
			}}
		>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent
				disableEscapeKeyDown
				disableOutsideClick
				className="!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !max-w-none !max-h-none !h-full !w-full !rounded-none !border-0 !p-0 overflow-hidden data-[state=open]:!animate-none data-[state=closed]:!animate-none"
				hideCloseButton={true}
			>
				{/* Immediate white background to prevent flash */}
				<div 
					className="absolute inset-0 bg-white"
					style={{ zIndex: -1 }}
				/>
				
				{/* Main content with fade animation */}
				<div 
					className="flex flex-col h-full w-full bg-white"
					style={{ 
						fontFamily: "'Times New Roman', Times, serif",
						WebkitAnimation: "dialog-smooth-in 0.3s ease-out forwards",
						animation: "dialog-smooth-in 0.3s ease-out forwards"
					}}
				>
					{/* Full screen header with back button */}
					<div className="relative bg-white px-8 py-6">
					{/* Back button - always visible, goes to dashboard */}
					<button 
						onClick={() => router.push(urls.murmur.dashboard.index)}
						className="absolute left-8 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-0 rounded-lg text-gray-600/60 text-sm font-normal cursor-pointer transition-all duration-200 hover:bg-gray-100/50 hover:text-gray-900 active:scale-95"
						style={{ fontFamily: "'Times New Roman', Times, serif" }}
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
					
					<div className="text-center">
						<h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
						<p className="mt-1 text-sm text-gray-500">
							{identities?.length === 0
								? 'Create your first profile to get started'
								: 'Create a new profile or select an existing one'}
						</p>
					</div>
				</div>
				
				{/* Main content area */}
				<div className="flex-1 flex items-center justify-center bg-gray-50/30">
					<div className="w-full max-w-6xl px-8">
						{isPendingIdentities ? (
							<div className="h-full flex items-center justify-center">
								{/* Empty space during load - fade transition handles the visual feedback */}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center">
								{/* Show create form centered when no profiles exist */}
								{(!identities || identities.length === 0) ? (
									<div className="w-full max-w-md">
										<h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
											Create Your First Profile
										</h3>
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
										{/* Create New Profile Section */}
										<div>
											<h3 className="text-lg font-semibold text-gray-900 mb-3">
												Create New Profile
											</h3>
											<div className="bg-white p-4 rounded-lg">
												<CreateIdentityPanel
													setShowCreatePanel={setShowCreatePanel}
													isEdit={isEdit}
													selectedIdentity={isEdit ? selectedIdentity : undefined}
													showCreatePanel={true}
													setValue={setValue}
												/>
											</div>
										</div>
										
										{/* Existing Profiles Section */}
										<div>
											<h3 className="text-xl font-semibold text-gray-900 mb-4">
												Select Existing Profile
											</h3>
											<Form {...form}>
											<FormField
												control={form.control}
												name="identityId"
												render={({ field }) => (
													<FormItem>
														<FormControl>
															<RadioGroup
																value={field.value}
																onValueChange={field.onChange}
																className="space-y-4"
															>
																{identities.map((identity) => (
																	<div 
																		key={identity.id} 
																		className="bg-white p-5 rounded-lg hover:bg-gray-50 transition-all"
																	>
																		<div className="flex items-start gap-4">
																			<RadioGroupItem
																				value={identity.id.toString()}
																				id={`identity-${identity.id}`}
																				className="mt-1"
																			/>
																			<div className="flex-1">
																				<Label
																					className="block text-lg font-semibold text-gray-900 mb-1 cursor-pointer"
																					htmlFor={`identity-${identity.id}`}
																				>
																					{identity.name}
																				</Label>
																				<Label
																					className="block text-sm font-medium text-gray-600 mb-1 cursor-pointer"
																					htmlFor={`identity-${identity.id}`}
																				>
																					{identity.email}
																				</Label>
																				<Label
																					className={twMerge(
																						'block text-sm text-gray-500 mb-3',
																						!identity.website && 'italic'
																					)}
																					htmlFor={`identity-${identity.id}`}
																				>
																					{identity.website || 'No website'}
																				</Label>
																				<button
																					type="button"
																					className="text-sm text-blue-600 hover:text-blue-700 underline"
																					onClick={() => {
																						setIsEdit(true);
																						// In edit mode, we'll replace the create form with edit form
																						setShowCreatePanel(true);
																					}}
																				>
																					Edit Profile
																				</button>
																			</div>
																		</div>
																	</div>
																))}
															</RadioGroup>
														</FormControl>
													</FormItem>
												)}
											/>
										</Form>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</div>
				
				{/* Footer with actions */}
				<div className="bg-white px-8 py-4">
					<div className="max-w-6xl mx-auto flex justify-center">
						{identities && identities.length > 0 && (
							<Button
								isLoading={isPendingAssignIdentity}
								onClick={handleAssignIdentity}
								variant="primary-light"
								disabled={!selectedIdentity}
								className="min-w-[200px]"
							>
								Continue
							</Button>
						)}
					</div>
				</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
