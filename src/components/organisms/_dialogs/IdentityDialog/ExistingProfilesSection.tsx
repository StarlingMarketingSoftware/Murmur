import { FC, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/ui';
import { UseFormReturn } from 'react-hook-form';
import { Identity } from '@prisma/client';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ExistingProfilesSectionProps {
	identities: Identity[];
	form: UseFormReturn<{ identityId: string }>;
	showCreatePanel: boolean;
	setShowCreatePanel: (show: boolean) => void;
	handleAssignIdentity: () => void;
	isPendingAssignIdentity: boolean;
	selectedIdentity?: Identity;
}

export const ExistingProfilesSection: FC<ExistingProfilesSectionProps> = ({
	identities,
	form,
	showCreatePanel,
	setShowCreatePanel,
	handleAssignIdentity,
	isPendingAssignIdentity,
	selectedIdentity,
}) => {
	const isMobile = useIsMobile();
	const [isLandscape, setIsLandscape] = useState(false);

	useEffect(() => {
		const updateOrientation = () => {
			if (typeof window === 'undefined') return;
			setIsLandscape(window.innerWidth > window.innerHeight);
		};
		updateOrientation();
		window.addEventListener('resize', updateOrientation);
		window.addEventListener('orientationchange', updateOrientation);
		return () => {
			window.removeEventListener('resize', updateOrientation);
			window.removeEventListener('orientationchange', updateOrientation);
		};
	}, []);

	// 353px at an 852px landscape viewport => ~41.43vw
	const landscapeSectionWidth = '41.43vw';
	// Only reserve space in portrait (sticky CTA). In landscape/mobile, make it zero.
	const contentPaddingClass = isMobile
		? isLandscape
			? 'pb-0'
			: 'pb-[64px]'
		: 'pb-0 md:pb-[24px]';
	return (
		<div className={cn(showCreatePanel ? 'opacity-26' : 'opacity-100')}>
			<Form {...form}>
				<FormField
					control={form.control}
					name="identityId"
					render={({ field }) => (
						<FormItem>
							<div
								className={cn(
									'box-border shrink-0 w-[652px] h-[326px] rounded-[8px] border-[2px] border-[#000000] bg-[#EAF1FF]',
									showCreatePanel ? 'cursor-pointer' : 'cursor-default'
								)}
								style={{
									width:
										isMobile && isLandscape
											? `min(652px, ${landscapeSectionWidth})`
											: 'min(652px, 96vw)',
								}}
								onClick={() => {
									if (showCreatePanel) setShowCreatePanel(false);
								}}
							>
								<CustomScrollbar
									className="w-full h-full"
									contentClassName={cn('scrollbar-hide', contentPaddingClass)}
									disableOverflowClass
									thumbWidth={2}
									thumbColor="#000000"
									trackColor="transparent"
									offsetRight={-5}
								>
									<Table className="w-full !rounded-none !border-separate border-spacing-y-[10px] border-spacing-x-0">
										<TableBody>
											{identities.map((identity) => {
												const isSelected = field.value === identity.id.toString();
												return (
													<TableRow
														key={identity.id}
														onClick={() => {
															if (showCreatePanel) return;
															field.onChange(identity.id.toString());
														}}
														data-state={isSelected ? 'selected' : undefined}
														className="border-0 hover:!bg-transparent !bg-transparent odd:!bg-transparent even:!bg-transparent"
													>
														<TableCell className="p-0">
															<div
																className={cn(
																	'box-border mx-auto w-[calc(100%-16px)] min-w-[calc(100%-16px)] max-w-[calc(100%-16px)] md:w-[636px] md:min-w-[636px] md:max-w-[636px] h-[91px] min-h-[91px] max-h-[91px] shrink-0 rounded-[8px] border-[2px] border-[#000000] flex flex-col justify-center gap-0 px-4 transition-colors cursor-pointer',
																	isSelected
																		? 'bg-[#A6CFB0] hover:bg-[#94BF9E]'
																		: 'bg-white hover:bg-[#F5F5F5]'
																)}
																style={
																	isMobile && isLandscape
																		? {
																				width: 'min(636px, 40.35vw)',
																				minWidth: 'min(636px, 40.35vw)',
																				maxWidth: 'min(636px, 40.35vw)',
																		  }
																		: undefined
																}
															>
																<div
																	className="font-primary text-black pl-1"
																	style={{
																		fontSize: '22.79px',
																		fontWeight: 400,
																		lineHeight: 1.1,
																	}}
																>
																	{identity.name}
																</div>
																<div className="w-full md:w-[267.13px] flex items-center overflow-hidden pl-1">
																	<span
																		className="font-secondary font-normal text-[15.5px] text-[#000000] truncate"
																		style={{ lineHeight: 1.1 }}
																	>
																		{identity.email}
																	</span>
																</div>
																<div className="w-full md:w-[267.13px] flex items-center overflow-hidden pl-1">
																	<span
																		className="font-secondary font-normal text-[15.5px] text-[#000000] truncate"
																		style={{ lineHeight: 1.1 }}
																	>
																		{identity.website ? identity.website : ''}
																	</span>
																</div>
															</div>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</CustomScrollbar>
							</div>
						</FormItem>
					)}
				/>
			</Form>
			{!showCreatePanel && (
				<>
					{/* Desktop button (unchanged) */}
					<div
						className="-mt-[36px] hidden md:block"
						style={{ marginBottom: isMobile && isLandscape ? 4 : undefined }}
					>
						<Button
							onClick={handleAssignIdentity}
							isLoading={isPendingAssignIdentity}
							className="relative -top-[16px] z-10 w-[652px] h-[43.05px] rounded-[8.83px] border-[2px] text-white font-bold text-[18.77px] transition-colors hover:!bg-[#4C9E5C] active:!bg-[#428A51]"
							style={{
								width:
									isMobile && isLandscape
										? `min(652px, ${landscapeSectionWidth})`
										: 'min(652px, 96vw)',
								backgroundColor: '#5DAB68',
								borderColor: '#050505',
								color: '#FFFFFF',
								fontWeight: 700,
								fontSize: '18.77px',
								fontFamily: 'Times New Roman, Times, serif',
							}}
							disabled={!selectedIdentity}
						>
							Continue
						</Button>
					</div>

					{/* Mobile sticky button (portal) — disabled in landscape */}
					{isMobile && !isLandscape && typeof window !== 'undefined'
						? createPortal(
								<div
									className="mobile-sticky-cta"
									style={{
										zIndex: 100500,
										pointerEvents: 'auto',
									}}
									onClick={(e) => {
										e.stopPropagation();
									}}
								>
									<Button
										onClick={(e) => {
											e.stopPropagation();
											handleAssignIdentity();
										}}
										onPointerDown={(e) => {
											e.stopPropagation();
										}}
										isLoading={isPendingAssignIdentity}
										className="w-full h-[53px] min-h-[53px] !rounded-none !bg-[#5dab68] hover:!bg-[#4e9b5d] !text-white border border-[#050505] transition-colors !opacity-100 disabled:!opacity-100"
										disabled={!selectedIdentity}
										style={{
											pointerEvents: selectedIdentity ? 'auto' : 'none',
										}}
									>
										Continue
									</Button>
								</div>,
								document.body
						  )
						: null}
				</>
			)}
		</div>
	);
};
