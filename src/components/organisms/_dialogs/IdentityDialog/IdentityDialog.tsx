import { FC, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IdentityDialogProps, useIdentityDialog } from './useIdentityDialog';
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { CreateIdentityPanel } from './CreateIdentityPanel/CreateIdentityPanel';
import { ExistingProfilesSection } from './ExistingProfilesSection';

// removed Typography usage for simplified header
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const IdentityDialog: FC<IdentityDialogProps> = (props) => {
	const router = useRouter();
	const [isContentReady, setIsContentReady] = useState(false);
	const {
		// title removed from header
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

	// Default to the Create tab when there are no identities
	useEffect(() => {
		if (!isPendingIdentities && (!identities || identities.length === 0)) {
			setShowCreatePanel(true);
		}
	}, [isPendingIdentities, identities, setShowCreatePanel]);

	// Left position of highlight box inside 652px container
	const highlightLeftPx = useMemo(() => (showCreatePanel ? 70 : 396), [showCreatePanel]);

	return (
		<Dialog
			open={open}
			onOpenChange={(open) => {
				onOpenChange(open);
			}}
		>
			{triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
			<DialogContent
				fullScreen
				disableEscapeKeyDown
				disableOutsideClick
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !max-w-none !max-h-screen !h-screen !w-full !rounded-none !border-0 !p-0 !overflow-hidden !z-[100000] data-[state=open]:!animate-none data-[state=closed]:!animate-none scrollbar-hide"
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
						paddingBottom: 0,
					}}
				>
					{/* Full screen header with back button - fixed position */}
					<div className="relative bg-background px-8 py-6 flex-shrink-0">
						{/* Back button - closes dialog if possible, otherwise navigates back */}
						{isContentReady && (
							<button
								onClick={() => {
									try {
										if (props.backButtonMode === 'historyBack') {
											router.back();
											return;
										}
										if (onOpenChange) {
											onOpenChange(false);
											return;
										}
									} catch {}
									router.back();
								}}
								className="absolute left-8 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border-0 rounded-lg text-gray-600/60 text-sm font-normal cursor-pointer transition-all duration-200 hover:bg-gray-100/50 hover:text-gray-900 active:scale-95 font-primary"
								aria-label="Back"
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
								<span>{props.backButtonText ?? 'Back'}</span>
							</button>
						)}

						<div className="text-center">
							<p
								className="mt-1"
								style={{
									fontFamily: 'Times New Roman, Times, serif',
									fontSize: '21px',
									color: '#000000',
								}}
							>
								create a new{' '}
								<span style={{ fontWeight: 700, color: '#5DAB68' }}>profile</span> or
								select an existing one
							</p>
						</div>
					</div>

					{/* Main content area - scrollable */}
					<div
						className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-50/30 scrollbar-hide identity-dialog-scroll-container"
						style={{
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
							WebkitOverflowScrolling: 'touch',
						}}
					>
						<div className="flex justify-center pt-6">
							<div className="w-full max-w-[1444px] px-0 mx-auto">
								{isPendingIdentities ? (
									<div className="h-full flex items-center justify-center" />
								) : (
									<div className="flex flex-col items-center">
										<Tabs
											value={showCreatePanel ? 'create' : 'select'}
											onValueChange={(val) => setShowCreatePanel(val === 'create')}
											className="w-full max-w-[1444px]"
										>
											<div className="flex justify-center mb-4">
												<TabsList
													className="relative !bg-transparent border border-black !shadow-none !p-0"
													style={{
														width: '652px',
														height: '50px',
														borderWidth: 2.45,
														borderRadius: '9.8px',
														borderStyle: 'solid',
														boxShadow: 'none',
													}}
												>
													{/* Moving highlight box */}
													<div
														className="absolute z-10 pointer-events-none"
														style={{
															left: `${highlightLeftPx}px`,
															top: '50%',
															transform: 'translateY(-50%)',
															width: '186px',
															height: '24px',
															borderRadius: '9.8px',
															border: '1.3px solid #000000',
															background: '#DADAFC',
															transition: 'left 0.25s ease-in-out',
															boxShadow: 'none',
														}}
													/>
													<TabsTrigger
														className="relative z-20 flex-1 !h-full font-secondary !text-[14px] sm:!text-[14px] font-medium !bg-transparent !border-0 hover:!bg-transparent focus-visible:!ring-0 focus-visible:!outline-0 !outline-none !ring-0 data-[state=active]:!bg-transparent data-[state=active]:!shadow-none data-[state=active]:!border-transparent text-black"
														style={{ boxShadow: 'none' }}
														value="create"
													>
														Create New Profile
													</TabsTrigger>
													<TabsTrigger
														className="relative z-20 flex-1 !h-full font-secondary !text-[14px] sm:!text-[14px] font-medium !bg-transparent !border-0 hover:!bg-transparent focus-visible:!ring-0 focus-visible:!outline-0 !outline-none !ring-0 data-[state=active]:!bg-transparent data-[state=active]:!shadow-none data-[state=active]:!border-transparent text-black"
														style={{ boxShadow: 'none' }}
														value="select"
													>
														Select Existing Profile
													</TabsTrigger>
												</TabsList>
											</div>

											<TabsContent value="select">
												<div className="flex justify-center">
													<ExistingProfilesSection
														identities={identities || []}
														form={form}
														showCreatePanel={false}
														setShowCreatePanel={setShowCreatePanel}
														handleAssignIdentity={handleAssignIdentity}
														isPendingAssignIdentity={isPendingAssignIdentity}
														selectedIdentity={selectedIdentity}
													/>
												</div>
											</TabsContent>

											<TabsContent value="create">
												<div className="flex justify-center">
													<CreateIdentityPanel
														setShowCreatePanel={setShowCreatePanel}
														isEdit={isEdit}
														selectedIdentity={isEdit ? selectedIdentity : undefined}
														showCreatePanel={true}
														setValue={setValue}
														onContinueWithIdentity={(id) => handleAssignIdentityById(id)}
													/>
												</div>
											</TabsContent>
										</Tabs>
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
