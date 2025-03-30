import { useMutation } from '@tanstack/react-query';

export const useContacts = () => {
	const {
		data,
		isPending,
		mutate: fetchContacts,
	} = useMutation({
		mutationFn: async (categories: string[]) => {
			const response = await fetch('/api/contacts/get-by-category', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ categories }),
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	return { data, isPending, fetchContacts };
};
