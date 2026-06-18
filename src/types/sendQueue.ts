import type { EmailStatus } from '@prisma/client';
import { ContactWithName } from '@/types/contact';

/**
 * One row of a campaign's persisted async send queue, shaped for the campaign
 * send-queue view (the left "Sending" list cards + the center read-only deck)
 * and the header "in send queue" count. The Email body/subject and the full
 * Contact are joined in by GET /api/campaigns/[id]/send-queue (EmailSendQueue
 * has no Prisma relations — the join is done in code).
 */
export interface SendQueueItemVM {
	queueId: number;
	emailId: number;
	contactId: number;
	/** Live statuses only — terminal rows are never returned. */
	status: 'pending' | 'processing';
	/** ISO instant the worker will attempt the send. */
	scheduledFor: string;
	/** ISO instant the user added this message to the send queue. */
	queuedAt: string;
	email: {
		subject: string | null;
		message: string | null;
		status: EmailStatus;
	};
	contact: ContactWithName;
}

export interface SendQueueResponse {
	items: SendQueueItemVM[];
	count: number;
}
