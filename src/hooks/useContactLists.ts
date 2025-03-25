import { ContactList } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';

export const useContactLists = () => {
	const { data, isPending } = useQuery<ContactList[]>({
		queryKey: ['contact-list'],
		queryFn: async () => {
			const response = await fetch(`/api/contact-list/`);
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message);
			}
			return await response.json();
		},
	});

	return { data, isPending };
};
