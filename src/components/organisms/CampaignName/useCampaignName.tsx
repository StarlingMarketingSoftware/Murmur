import { useEditCampaign } from '@/hooks/queryHooks/useCampaigns';
import { zodResolver } from '@hookform/resolvers/zod';
import { Campaign } from '@prisma/client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

export interface CampaignNameProps {
	campaign: Campaign;
}

const campaignNameFormSchema = z.object({
	name: z.string().min(1),
});

export const useCampaignName = (props: CampaignNameProps) => {
	const { campaign } = props;
	const [isEdit, setIsEdit] = useState(false);

	const form = useForm<z.infer<typeof campaignNameFormSchema>>({
		resolver: zodResolver(campaignNameFormSchema),
		defaultValues: {
			name: campaign.name,
		},
	});

	const { mutate: editCampaign, isPending: isPendingEditCampaign } = useEditCampaign({
		suppressToasts: true,
		onSuccess: () => {
			setIsEdit(false);
		},
	});

	const onSubmit = (data: z.infer<typeof campaignNameFormSchema>) => {
		if (isEdit) {
			editCampaign({
				id: campaign.id,
				data: {
					name: data.name,
				},
			});
		} else {
			setIsEdit(true);
		}
	};

	return { onSubmit, campaign, isPendingEditCampaign, isEdit, form, setIsEdit };
};
