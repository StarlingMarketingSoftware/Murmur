import { useMutation } from '@tanstack/react-query';

export const useCampaigns = () => {
	const {
		data,
		isPending,
		mutate: fetchContacts,
	} = useMutation({
		mutationFn: async (campaign: { name: string }) => {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ campaign }),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	return { data, isPending, fetchContacts };
};
