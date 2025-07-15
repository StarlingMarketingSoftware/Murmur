import { FC } from 'react';
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
import { ArrowDown, ChevronLeft } from 'lucide-react';
import Spinner from '@/components/ui/spinner';

export const IdentityDialog: FC<IdentityDialogProps> = (props) => {
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
				className="h-fit"
				hideCloseButton={!isClosable}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="text-sm text-muted-foreground">
						{showCreatePanel
							? 'Edit your campaign profile'
							: 'Select your campaign profile'}
					</DialogDescription>
					<Button
						className={twMerge(showCreatePanel ? 'absolute left-3 top-3' : 'hidden')}
						onClick={() => setShowCreatePanel(false)}
						variant="light"
					>
						<ChevronLeft />
						<span className="hidden sm:block">Go Back</span>
					</Button>
				</DialogHeader>
				{isPendingIdentities ? (
					<Spinner />
				) : (
					<div className="relative overflow-hidden h-fit">
						<div
							className={twMerge(
								'flex transition-transform duration-300 ease-in-out w-[200%]',
								showCreatePanel ? '-translate-x-[50.3%]' : 'translate-x-0'
							)}
						>
							<div className="w-1/2 flex-shrink-0 p-4">
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
														className="space-y-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
													>
														{identities?.map((identity) => (
															<div key={identity.id} className="flex items-center gap-3">
																<div className="flex flex-col gap-2">
																	<div className="flex gap-2">
																		<RadioGroupItem
																			value={identity.id.toString()}
																			id={`identity-${identity.id}`}
																		/>
																		<Label
																			className="font-primary font-bold"
																			htmlFor={`identity-${identity.id}`}
																		>
																			{identity.name}
																		</Label>
																	</div>
																	<Label
																		className="ml-6 font-bold"
																		htmlFor={`identity-${identity.id}`}
																	>
																		{identity.email}
																	</Label>
																	<Label
																		className={twMerge(
																			'ml-6',
																			!identity.website && '!text-muted italic'
																		)}
																		htmlFor={`identity-${identity.id}`}
																		onClick={() => {
																			setShowCreatePanel(true);
																			setIsEdit(true);
																		}}
																	>
																		{identity.website || 'No website'}
																	</Label>
																	<Label
																		className="ml-6 text-secondary underline cursor-pointer"
																		htmlFor={`identity-${identity.id}`}
																		onClick={() => {
																			setIsEdit(true);
																			setShowCreatePanel(true);
																		}}
																	>
																		Edit
																	</Label>
																</div>
															</div>
														))}
													</RadioGroup>
												</FormControl>
											</FormItem>
										)}
									/>
								</Form>
								<Button
									variant="secondary-outline"
									onClick={() => {
										setShowCreatePanel(true);
										setIsEdit(false);
									}}
								>
									Add a New Profile
								</Button>
							</div>
							<div className="w-1/2 flex-shrink-0 p-4">
								<CreateIdentityPanel
									setShowCreatePanel={setShowCreatePanel}
									isEdit={isEdit}
									selectedIdentity={selectedIdentity}
									showCreatePanel={showCreatePanel}
									setValue={setValue}
								/>
							</div>
						</div>
					</div>
				)}
				<DialogFooter>
					<Button
						isLoading={isPendingAssignIdentity}
						onClick={handleAssignIdentity}
						variant="primary-light"
						disabled={!selectedIdentity || showCreatePanel}
					>
						<ArrowDown /> Confirm and Continue
						<ArrowDown />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
