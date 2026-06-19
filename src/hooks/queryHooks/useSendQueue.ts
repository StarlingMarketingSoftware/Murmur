import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { _fetch } from '@/utils';
import { urls } from '@/constants/urls';
import { EMAIL_QUERY_KEYS } from '@/hooks/queryHooks/useEmails';
import type { SendQueueResponse } from '@/types/sendQueue';

export const SEND_QUEUE_QUERY_KEYS = {
	all: ['sendQueue'] as const,
	list: (campaignId: number) => [...SEND_QUEUE_QUERY_KEYS.all, 'list', campaignId] as const,
} as const;

const SEND_QUEUE_REFETCH_INTERVAL_MS = 15_000;

export const fetchSendQueue = async (campaignId: number): Promise<SendQueueResponse> => {
	const response = await _fetch(urls.api.campaigns.sendQueue.index(campaignId));
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || 'Failed to fetch send queue');
	}
	return response.json() as Promise<SendQueueResponse>;
};

/**
 * Reads a campaign's persisted send queue (pending/processing rows) — drives the
 * header "in send queue" count and the send-queue view. Disabled for invalid ids.
 */
export const useSendQueue = (campaignId: number, options?: { enabled?: boolean }) => {
	const query = useQuery({
		queryKey: SEND_QUEUE_QUERY_KEYS.list(campaignId),
		queryFn: () => fetchSendQueue(campaignId),
		enabled: (options?.enabled ?? true) && Number.isFinite(campaignId) && campaignId > 0,
		refetchInterval: (query) => {
			const data = query.state.data as SendQueueResponse | undefined;
			return (data?.count ?? 0) > 0 ? SEND_QUEUE_REFETCH_INTERVAL_MS : false;
		},
	});
	return {
		items: query.data?.items ?? [],
		count: query.data?.count ?? 0,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		refetch: query.refetch,
	};
};

export interface EnqueueEmailsResult {
	scheduledCount: number;
	dayCount: number;
	firstSendAt: string | null;
	lastSendAt: string | null;
	skippedNoCredits: number;
}

/**
 * Enqueues draft emails into the async send queue (POST /api/emails/schedule).
 * Shared by all campaign send handlers so the post-enqueue cache invalidation
 * (queue count/view + emails list so scheduled emails leave Drafts + campaign
 * aggregate) lives in ONE place and the handlers can't drift.
 */
export const useEnqueueEmails = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (vars: {
			campaignId: number;
			emailIds: number[];
		}): Promise<EnqueueEmailsResult> => {
			const response = await _fetch(urls.api.emails.schedule, 'POST', vars);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to add messages to the sending queue');
			}
			return response.json() as Promise<EnqueueEmailsResult>;
		},
		onSuccess: (_result, vars) => {
			queryClient.invalidateQueries({
				queryKey: SEND_QUEUE_QUERY_KEYS.list(vars.campaignId),
			});
			// Scheduled emails are filtered out of the Drafts tab (which keys on
			// status === draft), so refreshing the emails list drops them.
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.list() });
			queryClient.invalidateQueries({ queryKey: ['campaign', vars.campaignId] });
		},
	});
};

export const useCancelSendQueueItem = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (vars: { campaignId: number; queueId: number }) => {
			const response = await _fetch(
				urls.api.campaigns.sendQueue.detail(vars.campaignId, vars.queueId),
				'DELETE'
			);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Failed to cancel queued send');
			}
		},
		onSuccess: (_result, vars) => {
			queryClient.invalidateQueries({
				queryKey: SEND_QUEUE_QUERY_KEYS.list(vars.campaignId),
			});
			queryClient.invalidateQueries({ queryKey: EMAIL_QUERY_KEYS.list() });
			queryClient.invalidateQueries({ queryKey: ['campaign', vars.campaignId] });
			toast.success('Removed from send queue');
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to cancel queued send');
		},
	});
};
