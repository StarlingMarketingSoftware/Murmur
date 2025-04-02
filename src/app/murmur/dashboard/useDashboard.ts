'use client';
import { urls } from '@/constants/urls';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const useDashboard = () => {};

const createCampaignSchema = z.object({
	name: z.string().min(1, { message: 'Campaign name is required.' }),
});

export const useCreateCampaignDialog = () => {
	const router = useRouter();
	const { push } = router;

	const form = useForm<z.infer<typeof createCampaignSchema>>({
		resolver: zodResolver(createCampaignSchema),
		defaultValues: {
			name: '',
		},
	});

	const { isPending, mutateAsync: createCampaign } = useMutation({
		mutationFn: async (createCampaignData: z.infer<typeof createCampaignSchema>) => {
			console.log('🚀 ~ mutationFn: ~ name:', createCampaignData);
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(createCampaignData),
			});
			if (!response.ok) {
				toast.error('Failed to create campaign. Please try again.');
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	const onSubmit = async () => {
		console.log(form.getValues());
		const campaign = await createCampaign(form.getValues());
		form.reset();
		toast.success('Campaign created successfully!');
		router.push(`${urls.murmur.campaign.path}/${campaign.id}`);
	};

	return { form, onSubmit, isPending };
};
