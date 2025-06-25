'use client';

import { FC } from 'react';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CampaignNameProps, useCampaignName } from './useCampaignName';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/utils';

export const CampaignName: FC<CampaignNameProps> = (props) => {
	const { campaign, isPendingEditCampaign, isEdit, form, onSubmit } =
		useCampaignName(props);

	return (
		<>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<div className="m-0 relative mx-auto w-fit">
						{isEdit ? (
							<div className="mx-auto w-fit relative">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="">
											<FormControl>
												<Input
													className="!text-[63px] !h-fit mt-[17px] mb-8 font-primary text-center !w-fit !min-w-0"
													variant="light"
													rounded={false}
													{...field}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						) : (
							<>
								<Typography className="!text-[63px] text-center h-fit w-fit mt-[20px] mb-8">
									{campaign.name}
								</Typography>
							</>
						)}
						<Button
							type="submit"
							className={cn(
								'absolute translate-x-full -right-3 ',
								isEdit ? 'bottom-0' : 'bottom-5'
							)}
							isLoading={isPendingEditCampaign}
							variant="action-link"
						>
							{isEdit ? 'Save' : 'Edit'}
						</Button>
					</div>
				</form>
			</Form>
		</>
	);
};
