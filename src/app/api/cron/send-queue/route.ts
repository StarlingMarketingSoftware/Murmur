// Vercel cron (every 5 min, UTC). Drains the EmailSendQueue: sweeps stuck rows,
// then claims due rows and dispatches them via Mailgun inside the 11am–8pm ET
// window. ALWAYS returns 200 (even on error) so a failure can't trigger a Vercel
// retry/overlap — correctness comes from the status-guarded claim, not the schedule.

import { NextRequest } from 'next/server';
import { apiResponse, apiUnauthorized, apiServerError } from '@/app/api/_utils';
import { runSendQueueTick } from '@/app/api/_utils/sendQueue/worker';

export async function GET(req: NextRequest) {
	const cronSecret = process.env.CRON_SECRET;
	if (!cronSecret) {
		console.error('[send-queue] CRON_SECRET not set');
		return apiServerError('CRON_SECRET environment variable is not set');
	}
	if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
		console.error('[send-queue] unauthorized');
		return apiUnauthorized();
	}

	// Kill-switch: deploy the worker dormant, or freeze draining, without redeploying.
	if (process.env.SEND_QUEUE_WORKER_ENABLED !== 'true') {
		return apiResponse({ ok: true, disabled: true });
	}

	try {
		const startedAt = Date.now();
		const r = await runSendQueueTick();
		// Per-tick structured heartbeat (Vercel cron dashboard + log drain visibility).
		console.log(
			`[send-queue] tick ok offHours=${r.offHours} claimed=${r.claimed} sent=${r.sent} ` +
				`failed=${r.failed} canceled=${r.canceled} swept=${r.swept} requeued=${r.requeued} ` +
				`elapsedMs=${Date.now() - startedAt}`,
		);
		return apiResponse({ ok: true, ...r });
	} catch (error) {
		// Swallow + 200: never let a thrown error become a retried/overlapping cron run.
		console.error('[send-queue] tick error', error);
		return apiResponse({ ok: false, error: String(error) });
	}
}
