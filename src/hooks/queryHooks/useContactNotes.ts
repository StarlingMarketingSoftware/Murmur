import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CustomMutationOptions } from '@/types';
import {
	GetContactNoteData,
	PatchContactNoteData,
} from '@/app/api/contacts/[id]/note/route';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';

const QUERY_KEYS = {
	all: ['contact-notes'] as const,
	detail: (contactId: number) => [...QUERY_KEYS.all, 'detail', contactId] as const,
} as const;

export const useGetContactNote = (contactId: number | null | undefined) => {
	return useQuery<GetContactNoteData>({
		queryKey: QUERY_KEYS.detail(contactId ?? -1),
		queryFn: async () => {
			const response = await _fetch(urls.api.contacts.note(contactId as number));
			if (!response.ok) {
				throw new Error('Failed to fetch contact note');
			}
			return response.json() as Promise<GetContactNoteData>;
		},
		enabled: Boolean(contactId),
		retry: false,
		refetchOnWindowFocus: false,
	});
};

interface UpsertContactNoteData extends PatchContactNoteData {
	contactId: number;
}

export const useUpsertContactNote = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = false, errorMessage = 'Failed to save note' } = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ contactId, content }: UpsertContactNoteData) => {
			const response = await _fetch(urls.api.contacts.note(contactId), 'PATCH', {
				content,
			});
			if (!response.ok) {
				throw new Error('Failed to save contact note');
			}
			return response.json() as Promise<GetContactNoteData>;
		},
		onSuccess: (data) => {
			// setQueryData (not invalidate) so an autosave round-trip never triggers
			// a refetch that could clobber in-progress typing.
			queryClient.setQueryData(QUERY_KEYS.detail(data.contactId), data);
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
