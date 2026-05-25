import { _fetch } from '@/utils';
import { CustomMutationOptions } from '@/types';
import { urls } from '@/constants/urls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
	CreateMediaUploadUrlData,
	CreateMediaUploadUrlResponse,
} from '@/app/api/media/upload-url/route';
import { MediaAssetDto } from '@/app/api/media/route';
import { UpdateMediaData } from '@/app/api/media/[id]/route';

export const MEDIA_QUERY_KEYS = {
	all: ['media-assets'] as const,
	list: (context?: string) =>
		[...MEDIA_QUERY_KEYS.all, 'list', context ?? 'all'] as const,
};

export const useGetMedia = (context?: string, options?: { enabled?: boolean }) => {
	return useQuery<MediaAssetDto[]>({
		queryKey: MEDIA_QUERY_KEYS.list(context),
		queryFn: async () => {
			const url = context
				? `${urls.api.media.index}?context=${encodeURIComponent(context)}`
				: urls.api.media.index;
			const response = await _fetch(url);
			if (!response.ok) {
				throw new Error('Failed to fetch media');
			}
			return response.json();
		},
		// Playback/poster URLs are short-lived presigned URLs, so keep this fresh.
		staleTime: 1000 * 30,
		enabled: options?.enabled,
	});
};

export const useRequestMediaUploadUrl = () => {
	return useMutation({
		mutationFn: async (data: CreateMediaUploadUrlData) => {
			const response = await _fetch(urls.api.media.uploadUrl.index, 'POST', data);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to start upload');
			}
			return response.json() as Promise<CreateMediaUploadUrlResponse>;
		},
	});
};

export const useUpdateMedia = (options: CustomMutationOptions = {}) => {
	const { suppressToasts = true, successMessage, errorMessage, onSuccess } = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, data }: { id: number; data: UpdateMediaData }) => {
			const response = await _fetch(urls.api.media.detail(id), 'PATCH', data);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to update media');
			}
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all });
			if (!suppressToasts) {
				toast.success(successMessage ?? 'Media updated');
			}
			onSuccess?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage ?? 'Failed to update media');
			}
		},
	});
};

export const useDeleteMedia = (options: CustomMutationOptions = {}) => {
	const {
		suppressToasts = false,
		successMessage = 'Removed',
		errorMessage = 'Failed to remove',
		onSuccess,
	} = options;
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number) => {
			const response = await _fetch(urls.api.media.detail(id), 'DELETE');
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to delete media');
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: MEDIA_QUERY_KEYS.all });
			if (!suppressToasts) {
				toast.success(successMessage);
			}
			onSuccess?.();
		},
		onError: () => {
			if (!suppressToasts) {
				toast.error(errorMessage);
			}
		},
	});
};
