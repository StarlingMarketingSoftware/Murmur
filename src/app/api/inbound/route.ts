import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { projectVenueRepliesForUser } from '@/app/api/_utils/venueInboundProjection';
import { withRateLimit } from '@/app/api/_utils/rateLimit';
import { getValidatedParamsFromUrl } from '@/utils';
import { z } from 'zod';
import crypto from 'crypto';
import type { InboundEmailWithRelations } from '@/types';
import type { Prisma } from '@prisma/client';

const inboundEmailFilterSchema = z.object({
	campaignId: z.union([z.string(), z.number()]).optional(),
	contactId: z.union([z.string(), z.number()]).optional(),
});

export type InboundEmailFilterData = z.infer<typeof inboundEmailFilterSchema>;

type CampaignInboundScope = {
	contactIds: number[];
	contactEmails: string[];
};

const toPositiveInteger = (value: string | number): number | null => {
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isInteger(n) && n > 0 ? n : null;
};

const normalizeEmail = (value: string | null | undefined): string | null => {
	const email = value?.trim().toLowerCase();
	return email && email.includes('@') ? email : null;
};

const loadCampaignInboundScope = async (
	userId: string,
	campaignId: number
): Promise<CampaignInboundScope | null> => {
	const campaign = await prisma.campaign.findFirst({
		where: { id: campaignId, userId },
		select: {
			contacts: { select: { id: true, email: true } },
			userContactLists: {
				select: { contacts: { select: { id: true, email: true } } },
			},
			contactLists: {
				select: { contacts: { select: { id: true, email: true } } },
			},
		},
	});
	if (!campaign) return null;

	const contactIds = new Set<number>();
	const contactEmails = new Set<string>();
	const addContact = (contact: { id: number; email?: string | null }) => {
		contactIds.add(contact.id);
		const email = normalizeEmail(contact.email);
		if (email) contactEmails.add(email);
	};

	for (const contact of campaign.contacts) addContact(contact);
	for (const list of campaign.userContactLists) {
		for (const contact of list.contacts) addContact(contact);
	}
	for (const list of campaign.contactLists) {
		for (const contact of list.contacts) addContact(contact);
	}

	return {
		contactIds: [...contactIds],
		contactEmails: [...contactEmails],
	};
};

const buildCampaignInboundOr = (
	campaignId: number,
	scope: CampaignInboundScope
): Prisma.InboundEmailWhereInput[] => {
	const or: Prisma.InboundEmailWhereInput[] = [{ campaignId }];
	if (scope.contactIds.length > 0) {
		or.push({ campaignId: null, contactId: { in: scope.contactIds } });
	}
	if (scope.contactEmails.length > 0) {
		or.push({
			campaignId: null,
			contactId: null,
			sender: { in: scope.contactEmails },
		});
	}
	return or;
};

const filterProjectedVenueRows = (
	rows: InboundEmailWithRelations[],
	filters: { campaignId?: number; contactId?: number }
): InboundEmailWithRelations[] => {
	return rows.filter((row) => {
		if (filters.campaignId !== undefined) {
			const rowCampaignId =
				(row.campaign as { id?: number } | null | undefined)?.id ??
				(row.campaignId ?? undefined);
			if (rowCampaignId !== filters.campaignId) return false;
		}
		if (filters.contactId !== undefined) {
			const rowContactId =
				(row.contact as { id?: number } | null | undefined)?.id ??
				(row.contactId ?? undefined);
			if (rowContactId !== filters.contactId) return false;
		}
		return true;
	});
};

/**
 * GET handler for fetching inbound emails for the authenticated user
 * Supports optional filtering by campaignId and contactId
 */
export async function GET(req: NextRequest) {
	try {
		const limited = await withRateLimit(req, 'search-heavy', 'inbound');
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, inboundEmailFilterSchema);

		const { campaignId, contactId } = validatedFilters.data || {};
		const campaignIdNumber =
			campaignId === undefined ? undefined : toPositiveInteger(campaignId);
		const contactIdNumber =
			contactId === undefined ? undefined : toPositiveInteger(contactId);
		if (campaignIdNumber === null || contactIdNumber === null) {
			return apiBadRequest('Invalid inbound email filter');
		}

		const campaignScope =
			campaignIdNumber !== undefined
				? await loadCampaignInboundScope(userId, campaignIdNumber)
				: null;
		if (campaignIdNumber !== undefined && !campaignScope) {
			return apiResponse([]);
		}

		const inboundWhere: Prisma.InboundEmailWhereInput = {
			userId,
			...(contactIdNumber !== undefined ? { contactId: contactIdNumber } : {}),
			...(campaignIdNumber !== undefined && campaignScope
				? {
						OR: buildCampaignInboundOr(campaignIdNumber, campaignScope),
					}
				: {}),
		};

		// Real Mailgun inbound rows + venue→artist internal messages projected into the
		// same shape (venue replies live in Conversation/Message, not InboundEmail).
		const [inboundEmails, allVenueRows] = await Promise.all([
			prisma.inboundEmail.findMany({
				where: inboundWhere,
				include: {
					contact: true,
					campaign: true,
					originalEmail: true,
				},
				orderBy: {
					receivedAt: 'desc',
				},
			}),
			projectVenueRepliesForUser(userId),
		]);
		const venueRows = filterProjectedVenueRows(allVenueRows, {
			campaignId: campaignIdNumber,
			contactId: contactIdNumber,
		});

		const merged = [...inboundEmails, ...venueRows].sort(
			(a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
		);

		return apiResponse(merged);
	} catch (error) {
		return handleApiError(error);
	}
}

/**
 * Mailgun Inbound Email Webhook Handler
 * Receives emails forwarded by Mailgun and stores them in the database
 */
export async function POST(req: NextRequest) {
	try {
		// Public webhook (no Clerk session) — cap by IP to blunt forged-payload floods.
		// Mailgun delivers all users' inbound mail from a small shared IP pool, so this
		// needs the same generous circuit-breaker as the Clerk/Stripe webhooks.
		const limited = await withRateLimit(req, 'public-unauth', 'inbound-webhook', {
			ip: [{ tokens: 600, window: '60 s' }],
		});
		if (limited) return limited;

		// Mailgun sends data as multipart/form-data or application/x-www-form-urlencoded
		const formData = await req.formData();

		// Convert FormData to a plain object for logging and processing
		const data: Record<string, string | File> = {};
		formData.forEach((value, key) => {
			data[key] = value;
		});

		// Console log the incoming data for debugging
		console.log('=== MAILGUN INBOUND EMAIL DATA ===');
		console.log('Timestamp:', new Date().toISOString());
		console.log('Raw data keys:', Object.keys(data));
		console.log(
			'Full data:',
			JSON.stringify(
				data,
				(key, value) => {
					// Handle File objects in JSON stringify
					if (value instanceof File) {
						return `[File: ${value.name}, ${value.size} bytes]`;
					}
					return value;
				},
				2
			)
		);
		console.log('=================================');

		// Extract Mailgun fields
		const messageId =
			(formData.get('Message-Id') as string) ||
			(formData.get('message-id') as string) ||
			'';
		const sender =
			(formData.get('sender') as string) || (formData.get('from') as string) || '';
		const recipient =
			(formData.get('recipient') as string) || (formData.get('To') as string) || '';
		const subject =
			(formData.get('subject') as string) || (formData.get('Subject') as string) || null;
		const bodyPlain = (formData.get('body-plain') as string) || null;
		const bodyHtml = (formData.get('body-html') as string) || null;
		const strippedText = (formData.get('stripped-text') as string) || null;
		const strippedSignature = (formData.get('stripped-signature') as string) || null;

		// Mailgun verification fields
		const mailgunTimestamp = formData.get('timestamp') as string;
		const mailgunToken = formData.get('token') as string;
		const mailgunSignature = formData.get('signature') as string;

		// Parse headers if available
		let headers: Record<string, unknown> = {};
		const messageHeaders = formData.get('message-headers') as string;
		if (messageHeaders) {
			try {
				headers = JSON.parse(messageHeaders);
			} catch (e) {
				console.error('Failed to parse message headers:', e);
				headers = { raw: messageHeaders };
			}
		}

		// Parse attachments info if available
		let attachments: Record<string, unknown> = {};
		const attachmentCount = formData.get('attachment-count') as string;
		if (attachmentCount && parseInt(attachmentCount) > 0) {
			attachments = {
				count: parseInt(attachmentCount),
				// Note: Actual attachment files would need to be handled separately
			};
		}

		// Extract sender name from the "from" field (format: "Name <email@example.com>")
		let senderName: string | null = null;
		const fromField = (formData.get('from') as string) || sender;
		if (fromField) {
			const nameMatch = fromField.match(/^"?([^"<]+)"?\s*</);
			if (nameMatch) {
				senderName = nameMatch[1].trim();
			}
		}

		// Verify the Mailgun signature BEFORE any DB work. This webhook is publicly
		// reachable (it carries no Clerk session), so the signature is the ONLY thing
		// authenticating the sender — fail closed if it is missing, invalid, or the
		// signing key is not configured, otherwise anyone could inject forged replies.
		const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
		if (!signingKey) {
			console.error(
				'[inbound] MAILGUN_WEBHOOK_SIGNING_KEY is not set — rejecting inbound webhook.'
			);
			return apiServerError('Inbound webhook is not configured');
		}
		if (
			!mailgunTimestamp ||
			!mailgunToken ||
			!mailgunSignature ||
			!verifyMailgunSignature(signingKey, mailgunTimestamp, mailgunToken, mailgunSignature)
		) {
			console.error('Invalid or missing Mailgun signature');
			return apiUnauthorized('Invalid webhook signature');
		}

		// Resolve the owning user. A reply can land on ANY of the addresses we hand out
		// (murmurEmail, replyToEmail, or a configured customDomain), the recipient can
		// arrive in `recipient`/`To` with a display name and/or alongside other
		// addresses, mail clients vary the casing, and Mailgun routes can append a
		// `+tag`. Earlier we matched a single lowercased `recipient` exactly against
		// `murmurEmail`/`replyToEmail`, so any of those variations left `userId` null —
		// and a null-user inbound row never surfaces in ANYONE's feed (the symptom:
		// replies silently missing from the strategy box AND the campaign inbox). Build
		// the full candidate set and match case-insensitively, with and without the
		// plus-tag, against every address we own.
		const recipientCandidates = collectRecipientCandidates(formData, recipient);
		const recipientDomainCandidates = [
			...new Set(
				recipientCandidates
					.map((email) => email.split('@')[1]?.trim().toLowerCase())
					.filter((domain): domain is string => Boolean(domain))
			),
		];
		const primaryRecipientEmail =
			recipientCandidates[0] ||
			extractEmailFromField(recipient) ||
			recipient.toLowerCase().split(',')[0].trim();
		const user = recipientCandidates.length
			? await prisma.user.findFirst({
					where: {
						OR: [
							...recipientCandidates.flatMap((email) => [
								{ murmurEmail: { equals: email, mode: 'insensitive' as const } },
								{ replyToEmail: { equals: email, mode: 'insensitive' as const } },
								{ customDomain: { equals: email, mode: 'insensitive' as const } },
							]),
							...recipientDomainCandidates.map((domain) => ({
								customDomain: { equals: domain, mode: 'insensitive' as const },
							})),
						],
					},
				})
			: null;

		// Try to find associated contact by sender email. Match case-insensitively and
		// allow global (userId null) contacts, preferring the user's own row — replies
		// from a contact we never explicitly imported under this user would otherwise
		// link to nothing and drop out of contact-scoped inbox views.
		const senderEmail = extractEmailFromField(sender) || extractEmailFromField(fromField);
		let contact = null;
		if (senderEmail && user) {
			contact = await prisma.contact.findFirst({
				where: {
					email: { equals: senderEmail, mode: 'insensitive' },
					OR: [{ userId: user.clerkId }, { userId: null }],
				},
				orderBy: [{ userId: 'desc' }, { updatedAt: 'desc' }],
			});
		}

		// Threading headers — persisted so the reply can be matched back to the
		// outreach it answers (and so future correlation has the raw data).
		const headerMap = buildHeaderMap(headers);
		const inReplyTo =
			(formData.get('In-Reply-To') as string) ||
			(formData.get('in-reply-to') as string) ||
			headerMap['in-reply-to'] ||
			null;
		const references =
			(formData.get('References') as string) ||
			(formData.get('references') as string) ||
			headerMap['references'] ||
			null;

		// Auto-associate the reply with the campaign/email it answers. This is the
		// core fix: the webhook previously left `campaignId` null, so real Mailgun
		// replies never appeared in any per-campaign view (campaign overview's
		// "new-message" status, the drafting inbox, the campaign-table "new" count)
		// unless a human manually re-assigned each one. We resolve it automatically:
		//   1. Deterministic Message-ID threading: our queued cold sends stamp
		//      `<murmur-queue-<queueId>@…>`, so an `In-Reply-To`/`References` carrying
		//      that id maps straight back to the originating Email (and its campaign).
		//   2. Fallback by contact history: a reply from a contact we emailed is
		//      attributed to that contact's most-recent outreach campaign.
		let resolvedCampaignId: number | null = null;
		let resolvedOriginalEmailId: number | null = null;
		let resolvedContactId: number | null = contact?.id ?? null;

		if (user) {
			const queueIds = parseMurmurQueueIds([inReplyTo, references, messageId]);
			if (queueIds.length > 0) {
				const queueRow = await prisma.emailSendQueue.findFirst({
					where: { id: { in: queueIds }, userId: user.clerkId },
					orderBy: { id: 'desc' },
					select: { emailId: true },
				});
				if (queueRow) {
					const originEmail = await prisma.email.findFirst({
						where: { id: queueRow.emailId, userId: user.clerkId },
						select: { id: true, campaignId: true, contactId: true },
					});
					if (originEmail) {
						resolvedOriginalEmailId = originEmail.id;
						resolvedCampaignId = originEmail.campaignId;
						if (resolvedContactId == null) resolvedContactId = originEmail.contactId;
					}
				}
			}

			// Fallback: attribute the reply to the contact's most-recent outreach.
			if (resolvedCampaignId == null && resolvedContactId != null) {
				const lastEmail = await prisma.email.findFirst({
					where: { contactId: resolvedContactId, userId: user.clerkId },
					orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
					select: { id: true, campaignId: true },
				});
				if (lastEmail) {
					resolvedCampaignId = lastEmail.campaignId;
					if (resolvedOriginalEmailId == null) resolvedOriginalEmailId = lastEmail.id;
				}
			}
		}

		// Clean the message ID (remove angle brackets if present)
		const cleanMessageId =
			messageId.replace(/^<|>$/g, '') ||
			`mailgun-${Date.now()}-${Math.random().toString(36).slice(2)}`;

		// Save the inbound email to the database
		const inboundEmail = await prisma.inboundEmail.create({
			data: {
				messageId: cleanMessageId,
				sender: senderEmail || sender,
				senderName,
				recipient: primaryRecipientEmail,
				subject,
				inReplyTo,
				references,
				bodyPlain,
				bodyHtml,
				strippedText,
				strippedSignature,
				messageHeaders: headers,
				attachments,
				timestamp: mailgunTimestamp ? parseInt(mailgunTimestamp) : null,
				token: mailgunToken,
				signature: mailgunSignature,
				userId: user?.clerkId || null,
				contactId: resolvedContactId,
				campaignId: resolvedCampaignId,
				originalEmailId: resolvedOriginalEmailId,
				receivedAt: mailgunTimestamp
					? new Date(parseInt(mailgunTimestamp) * 1000)
					: new Date(),
			},
		});

		console.log('Inbound email saved successfully:', {
			id: inboundEmail.id,
			messageId: inboundEmail.messageId,
			sender: inboundEmail.sender,
			recipient: inboundEmail.recipient,
			subject: inboundEmail.subject,
			userId: inboundEmail.userId,
			contactId: inboundEmail.contactId,
			campaignId: inboundEmail.campaignId,
			originalEmailId: inboundEmail.originalEmailId,
		});

		// Return 200 OK to acknowledge receipt to Mailgun
		return apiResponse({
			success: true,
			message: 'Inbound email received and stored',
			id: inboundEmail.id,
		});
	} catch (error) {
		console.error('Error processing inbound email:', error);
		return handleApiError(error);
	}
}

/**
 * Verify Mailgun webhook signature
 */
function verifyMailgunSignature(
	signingKey: string,
	timestamp: string,
	token: string,
	signature: string
): boolean {
	const encodedToken = crypto
		.createHmac('sha256', signingKey)
		.update(timestamp + token)
		.digest('hex');

	return encodedToken === signature;
}

/**
 * Extract email address from a "Name <email>" format string
 */
function extractEmailFromField(field: string): string | null {
	if (!field) return null;

	// Try to extract email from "Name <email@example.com>" format
	const emailMatch = field.match(/<([^>]+)>/);
	if (emailMatch) {
		return emailMatch[1].toLowerCase();
	}

	// If no angle brackets, assume the whole string is an email
	if (field.includes('@')) {
		return field.toLowerCase().trim();
	}

	return null;
}

/**
 * Strip a plus-tag from the local part: `name+tag@host` → `name@host`. Mailgun
 * routes can append a `+tag` to the recipient we handed out; the un-tagged form is
 * what we stored on the user, so we match against BOTH.
 */
function stripPlusTag(email: string): string | null {
	const at = email.indexOf('@');
	if (at <= 0) return null;
	const local = email.slice(0, at);
	const domain = email.slice(at + 1);
	const plus = local.indexOf('+');
	if (plus < 0) return null;
	const baseLocal = local.slice(0, plus);
	if (!baseLocal) return null;
	return `${baseLocal}@${domain}`;
}

/**
 * Build the full set of recipient addresses a reply might have landed on. Mailgun
 * can surface the recipient under several keys (`recipient`, `To`, `to`), each may
 * carry a display name, list multiple comma-separated addresses, vary in casing, or
 * include a `+tag`. We normalize all of them (lowercased, de-duped, plus-tag also
 * stripped) so the user lookup matches regardless of which variation arrived.
 */
function collectRecipientCandidates(
	formData: FormData,
	recipient: string
): string[] {
	const raw: string[] = [];
	const keys = ['recipient', 'To', 'to', 'X-Envelope-To', 'Delivered-To'];
	for (const key of keys) {
		const value = formData.get(key);
		if (typeof value === 'string' && value) raw.push(value);
	}
	if (recipient) raw.push(recipient);

	const out = new Set<string>();
	for (const value of raw) {
		for (const part of value.split(',')) {
			const email = extractEmailFromField(part.trim());
			if (!email) continue;
			out.add(email);
			const base = stripPlusTag(email);
			if (base) out.add(base);
		}
	}
	return [...out];
}

/**
 * Flatten Mailgun's parsed `message-headers` (an array of [name, value] pairs, or
 * an object) into a lowercased-key lookup so we can read In-Reply-To / References
 * even when they only arrive inside the headers blob.
 */
function buildHeaderMap(headers: Record<string, unknown>): Record<string, string> {
	const map: Record<string, string> = {};
	const add = (name: unknown, value: unknown) => {
		if (typeof name !== 'string') return;
		if (typeof value !== 'string') return;
		map[name.toLowerCase()] = value;
	};
	if (Array.isArray(headers)) {
		for (const entry of headers as unknown[]) {
			if (Array.isArray(entry) && entry.length >= 2) add(entry[0], entry[1]);
		}
	} else if (headers && typeof headers === 'object') {
		for (const [name, value] of Object.entries(headers)) add(name, value);
	}
	return map;
}

/**
 * Pull the queue ids out of any `<murmur-queue-<id>@…>` Message-IDs present in the
 * supplied header values. Our deterministic outbound Message-ID for cold sends is
 * `<murmur-queue-<queueId>@murmurmailbox.com>`, so a reply's In-Reply-To/References
 * lets us thread straight back to the originating queue row → Email → campaign.
 */
function parseMurmurQueueIds(values: Array<string | null | undefined>): number[] {
	const ids = new Set<number>();
	const re = /murmur-queue-(\d+)@/gi;
	for (const value of values) {
		if (!value) continue;
		let match: RegExpExecArray | null;
		re.lastIndex = 0;
		while ((match = re.exec(value)) !== null) {
			const id = Number(match[1]);
			if (Number.isInteger(id) && id > 0) ids.add(id);
		}
	}
	return [...ids];
}
