import { useCreateCampaign } from '@/hooks/queryHooks/useCampaigns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';

const createCampaignSchema = z.object({
	name: z.string().min(1, { message: 'Campaign name is required.' }),
});

export const useCreateCampaignDialog = () => {
	const [open, setOpen] = useState(false);
	const router = useRouter();

	const form = useForm<z.infer<typeof createCampaignSchema>>({
		resolver: zodResolver(createCampaignSchema),
		defaultValues: {
			name: '',
		},
	});

	const { mutateAsync: createCampaign, isPending } = useCreateCampaign();

	const onSubmit = async (values: z.infer<typeof createCampaignSchema>) => {
		const res = await createCampaign(values);
		if (res) {
			form.reset();
			setOpen(false);
			// Navigate to the newly created campaign
			router.push(`${urls.murmur.campaign.detail(res.id)}?silent=1`);
		}
	};

	return { form, onSubmit, isPending, open, setOpen };
};
