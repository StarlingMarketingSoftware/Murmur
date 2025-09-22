import { FC } from 'react';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Form, FormField, FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
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
			<Typography
				variant="h3"
				className="!text-[18.77px] !leading-[22px] font-medium text-[#000000] mb-2 font-secondary"
			>
				Select Existing Profile
			</Typography>
			<Form {...form}>
				<FormField
					control={form.control}
					name="identityId"
					render={({ field }) => (
						<FormItem>
							<div
								className={cn(
									'box-border shrink-0 w-[652px] h-[326px] rounded-[8px] border-[2px] border-[#000000] overflow-hidden',
									showCreatePanel ? 'cursor-pointer' : 'cursor-default'
								)}
								onClick={() => {
									if (showCreatePanel) setShowCreatePanel(false);
								}}
							>
								<div className="w-full h-full overflow-y-auto overflow-x-hidden">
									<Table className="w-full !rounded-none">
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
	);
};
