import { FC } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/ui';
import { UseFormReturn } from 'react-hook-form';
import { Identity } from '@prisma/client';

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
								onClick={() => {
									if (showCreatePanel) setShowCreatePanel(false);
								}}
							>
								<CustomScrollbar
									className="w-full h-full"
									contentClassName="scrollbar-hide pb-[24px]"
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
																	'box-border mx-auto w-[636px] min-w-[636px] max-w-[636px] h-[91px] min-h-[91px] max-h-[91px] shrink-0 rounded-[8px] border-[2px] border-[#000000] flex flex-col justify-center gap-0 px-4',
																	isSelected ? 'bg-[#A6CFB0]' : 'bg-white'
																)}
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
																<div className="w-[267.13px] flex items-center overflow-hidden pl-1">
																	<span
																		className="font-secondary font-normal text-[15.5px] text-[#000000] truncate"
																		style={{ lineHeight: 1.1 }}
																	>
																		{identity.email}
																	</span>
																</div>
																<div className="w-[267.13px] flex items-center overflow-hidden pl-1">
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
				<div className="-mt-[36px]">
					<Button
						onClick={handleAssignIdentity}
						isLoading={isPendingAssignIdentity}
						className="relative -top-[16px] z-10 w-[652.4px] h-[43.05px] rounded-[8.83px] border-[2px] text-white font-bold text-[18.77px]"
						style={{
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
			)}
		</div>
	);
};
