'use client';

import { FC } from 'react';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CampaignNameProps, useCampaignName } from './useCampaignName';
import { Typography } from '@/components/ui/typography';

export const CampaignName: FC<CampaignNameProps> = (props) => {
	const { campaign, isEdit, form, onSubmit, setIsEdit } = useCampaignName(props);

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
													className="!text-[46px] leading-none !h-fit mt-0 mb-0 text-center !w-fit !min-w-0 !bg-transparent !border-0 !px-0 !py-0 !shadow-none focus:!ring-0 focus-visible:!ring-0 focus:!shadow-none focus:!border-0"
													style={{ fontFamily: 'Times New Roman' }}
													variant="light"
													rounded={false}
													autoFocus
													name={field.name}
													value={field.value}
													onChange={field.onChange}
													ref={field.ref}
													onBlur={() => {
														field.onBlur();
														form.handleSubmit(onSubmit)();
													}}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															form.handleSubmit(onSubmit)();
														} else if (e.key === 'Escape') {
															form.reset({ name: campaign.name });
															setIsEdit(false);
														}
													}}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						) : (
							<>
								<Typography
									className="!text-[46px] leading-none text-center h-fit w-fit mt-0 mb-0 cursor-text select-text"
									style={{ fontFamily: 'Times New Roman' }}
									onClick={() => setIsEdit(true)}
									title="Click to edit"
								>
									{campaign.name}
								</Typography>
							</>
						)}
					</div>
				</form>
			</Form>
		</>
	);
};
