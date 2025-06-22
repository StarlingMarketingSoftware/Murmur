'use client';

import PageHeading from '@/components/atoms/_text/PageHeading';
import { FC } from 'react';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CampaignNameProps, useCampaignName } from './useCampaignName';

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
								{' '}
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
								<PageHeading>{campaign.name}</PageHeading>
							</>
						)}
						<Button
							type="submit"
							className="absolute translate-x-full -right-3 bottom-2"
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
