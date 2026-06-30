import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { EmailStatus, Prisma, SendQueueStatus, Status } from '@prisma/client';

import prisma from '@/lib/prisma';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';

const mergeBodySchema = z.object({
	targetCampaignId: z.number().int().positive(),
});

// The singleton client is $extends-ed, so its interactive transaction client is not
// assignable to the base Prisma.TransactionClient — derive the structural type instead.
type PrismaTx = Omit<
	typeof prisma,
	'$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const getCampaignContactsCount = (tx: PrismaTx, campaignId: number) =>
	tx.contact.count({
		where: {
			OR: [
				{ campaigns: { some: { id: campaignId } } },
				{ userContactLists: { some: { campaigns: { some: { id: campaignId } } } } },
				{ contactList: { campaigns: { some: { id: campaignId } } } },
			],
		},
	});

// Best-effort audit row mirroring the campaign PATCH path. Raw insert so a missing
// migration (or absent table) never blocks the merge.
const safeInsertCampaignContactEvent = async (args: {
	campaignId: number;
	addedCount: number;
	totalContacts: number;
}) => {
	try {
		await prisma.$executeRaw(Prisma.sql`
			INSERT INTO "CampaignContactEvent" (
				"campaignId",
				"createdAt",
				"addedCount",
				"totalContacts",
				"source"
			)
			VALUES (
				${args.campaignId},
				${new Date()},
				${args.addedCount},
				${args.totalContacts},
				${'campaign.merge'}
			)
		`);
	} catch {
		// Best-effort only.
	}
};

/**
 * Restore an archived (soft-deleted) campaign by MERGING all of its data into an
 * existing active campaign. Imports the archived campaign's contacts, drafts, sent
 * emails, and inbox (inbound) replies into the target, then disposes of the now-empty
 * source by flipping it to `archived` (the unused Status value) — which removes it from
 * BOTH the active and ARCHIVE lists. Disposal is intentionally NOT a hard delete: an
 * inbound reply that races in mid-merge stays attached & recoverable instead of being
 * cascade-deleted (Email) or SetNull'd (InboundEmail).
 *
 * No schema change is required — everything is achieved by reassigning existing
 * foreign keys / connecting existing m2m relations.
 */
export async function POST(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const limited = await withRateLimit(req, 'mutation', 'campaigns-merge');
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const sourceId = Number(id);
		if (!Number.isFinite(sourceId)) {
			return apiBadRequest('Invalid campaign id');
		}

		let body;
		try {
			body = await req.json();
		} catch {
			return apiBadRequest('Invalid or missing request body');
		}

		const validated = mergeBodySchema.safeParse(body);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}
		const { targetCampaignId } = validated.data;

		if (targetCampaignId === sourceId) {
			return apiBadRequest('Cannot merge a folder into itself');
		}

		const result = await prisma.$transaction(
			async (tx) => {
				// 1. Validate ownership + states (both must belong to the caller).
				const source = await tx.campaign.findFirst({
					where: { id: sourceId, userId },
					select: { id: true, name: true, status: true },
				});
				if (!source) return { error: 'not_found' as const };
				if (source.status !== Status.deleted) {
					return { error: 'source_not_archived' as const };
				}

				const target = await tx.campaign.findFirst({
					where: { id: targetCampaignId, userId },
					select: { id: true, status: true },
				});
				if (!target) return { error: 'target_not_found' as const };
				if (target.status !== Status.active) {
					return { error: 'target_not_active' as const };
				}

				// 2. Defensive: restore any stray scheduled source emails to draft so they
				//    move cleanly (archive already cancels queued sends, so normally none).
				await tx.email.updateMany({
					where: { campaignId: sourceId, status: EmailStatus.scheduled },
					data: { status: EmailStatus.draft },
				});

				// 3. Draft dedup — preserve the app's one-draft-per-(campaign,contact)
				//    invariant. Mirror the single-email move precedent (emails/[id] PATCH):
				//    on a per-contact collision the SOURCE draft wins (overwrites target),
				//    and source-internal duplicates collapse to the newest.
				const [sourceDrafts, targetDrafts] = await Promise.all([
					tx.email.findMany({
						where: { campaignId: sourceId, status: EmailStatus.draft },
						orderBy: { createdAt: 'desc' },
						select: { id: true, contactId: true, subject: true, message: true },
					}),
					tx.email.findMany({
						where: { campaignId: targetCampaignId, status: EmailStatus.draft },
						select: { id: true, contactId: true },
					}),
				]);

				const targetDraftIdByContact = new Map<number, number>();
				for (const draft of targetDrafts) {
					targetDraftIdByContact.set(draft.contactId, draft.id);
				}

				// Newest source draft per contact wins; older source dupes are deleted.
				const winningSourceByContact = new Map<
					number,
					{ id: number; subject: string; message: string }
				>();
				const sourceDraftIdsToDelete: number[] = [];
				for (const draft of sourceDrafts) {
					if (winningSourceByContact.has(draft.contactId)) {
						sourceDraftIdsToDelete.push(draft.id);
						continue;
					}
					winningSourceByContact.set(draft.contactId, {
						id: draft.id,
						subject: draft.subject,
						message: draft.message,
					});
				}

				// For contacts the target already drafts: overwrite the target draft with
				// the source content, then delete the (now-redundant) source draft.
				for (const [contactId, winner] of winningSourceByContact) {
					const targetDraftId = targetDraftIdByContact.get(contactId);
					if (typeof targetDraftId === 'number') {
						await tx.email.update({
							where: { id: targetDraftId },
							data: { subject: winner.subject, message: winner.message },
						});
						sourceDraftIdsToDelete.push(winner.id);
					}
				}

				if (sourceDraftIdsToDelete.length > 0) {
					await tx.email.deleteMany({
						where: { id: { in: sourceDraftIdsToDelete } },
					});
				}

				// 4. Move every remaining source email (non-conflicting drafts + all
				//    sent/failed) to the target. No Email unique constraint, so this never
				//    collides; multiple sent emails per contact are normal history.
				await tx.email.updateMany({
					where: { campaignId: sourceId },
					data: { campaignId: targetCampaignId },
				});

				// 5. Move inbox (inbound) replies.
				await tx.inboundEmail.updateMany({
					where: { campaignId: sourceId },
					data: { campaignId: targetCampaignId },
				});

				// 6. Move contact-event history.
				await tx.campaignContactEvent.updateMany({
					where: { campaignId: sourceId },
					data: { campaignId: targetCampaignId },
				});

				// 7. Repoint only TERMINAL send-queue rows (never pending/processing — a
				//    live worker run owns those). campaignId is a scalar (no FK), so it does
				//    not move automatically with the emails.
				await tx.emailSendQueue.updateMany({
					where: {
						campaignId: sourceId,
						status: {
							in: [
								SendQueueStatus.sent,
								SendQueueStatus.failed,
								SendQueueStatus.canceled,
							],
						},
					},
					data: { campaignId: targetCampaignId },
				});

				// 8. Connect the source's contact relations to the target. Connecting the
				//    lists carries their contacts along (the campaign reads contacts via all
				//    three relations), so we only need the small id sets — never enumerate
				//    every individual contact.
				const preTargetContactCount = await getCampaignContactsCount(
					tx,
					targetCampaignId
				);
				const sourceRelations = await tx.campaign.findUnique({
					where: { id: sourceId },
					select: {
						contacts: { select: { id: true } },
						contactLists: { select: { id: true } },
						userContactLists: { select: { id: true } },
					},
				});

				if (sourceRelations) {
					await tx.campaign.update({
						where: { id: targetCampaignId },
						data: {
							contacts: {
								connect: sourceRelations.contacts.map((c) => ({ id: c.id })),
							},
							contactLists: {
								connect: sourceRelations.contactLists.map((l) => ({ id: l.id })),
							},
							userContactLists: {
								connect: sourceRelations.userContactLists.map((l) => ({
									id: l.id,
								})),
							},
						},
					});
				}

				// 9. Dispose of the now-empty source: flip to `archived` so it disappears
				//    from both lists, and tombstone the name so the original is reusable.
				await tx.campaign.update({
					where: { id: sourceId },
					data: {
						status: Status.archived,
						name: `${source.name} (merged → ${targetCampaignId})`,
					},
				});

				const totalContacts = await getCampaignContactsCount(tx, targetCampaignId);
				const addedCount = Math.max(0, totalContacts - preTargetContactCount);

				return { ok: true as const, targetCampaignId, totalContacts, addedCount };
			},
			{ timeout: 30_000 }
		);

		if ('error' in result) {
			switch (result.error) {
				case 'not_found':
				case 'target_not_found':
					return apiNotFound();
				case 'source_not_archived':
					return apiBadRequest('Only archived folders can be merged');
				case 'target_not_active':
					return apiBadRequest('Target folder is not active');
				default:
					return apiBadRequest('Unable to merge folder');
			}
		}

		// Best-effort audit row (outside the tx so a failure never rolls the merge back).
		if (result.addedCount > 0) {
			await safeInsertCampaignContactEvent({
				campaignId: result.targetCampaignId,
				addedCount: result.addedCount,
				totalContacts: result.totalContacts,
			});
		}

		return apiResponse({ ok: true, targetCampaignId: result.targetCampaignId });
	} catch (error) {
		return handleApiError(error);
	}
}
