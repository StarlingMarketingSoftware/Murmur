import { apiBadRequest, apiForbidden, apiUnauthorized } from '@/app/api/_utils';
import { fetchOpenRouter } from '@/app/api/_utils/openrouter';
import { OPENROUTER_DRAFTING_MODELS, getRandomDraftingSystemPrompt } from '@/constants/ai';
import prisma from '@/lib/prisma';
import { stripEmailSignatureFromAiMessage } from '@/utils/email';
import { removeEmDashes, stringifyJsonSubset } from '@/utils/string';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const ALLOWED_OPENROUTER_DRAFTING_MODELS = new Set<string>(OPENROUTER_DRAFTING_MODELS);
const DEFAULT_OPENROUTER_DRAFTING_MODEL = OPENROUTER_DRAFTING_MODELS[0];
const DEFAULT_CONCURRENCY = 5;
const MAX_RETRIES = 5;
const HEARTBEAT_MS = 15000;

const packMetadataForPrompt = (metadata: string): string => {
	const normalized = metadata
		.replace(/\r\n?/g, '\n')
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
		.replace(/\t/g, ' ');

	const lines = normalized.split('\n');
	const dedupedLines: string[] = [];
	let previousLine: string | null = null;
	for (const rawLine of lines) {
		const cleanedLine = rawLine.replace(/ {2,}/g, ' ').replace(/[ \u00A0]+$/g, '');
		if (previousLine !== null && cleanedLine === previousLine) {
			continue;
		}
		dedupedLines.push(cleanedLine);
		previousLine = cleanedLine;
	}

	const text = dedupedLines.join('\n');
	const paragraphs = text.split(/\n{2,}/);
	const dedupedParagraphs: string[] = [];
	let previousParagraph: string | null = null;
	for (const paragraph of paragraphs) {
		if (previousParagraph !== null && paragraph === previousParagraph) {
			continue;
		}
		dedupedParagraphs.push(paragraph);
		previousParagraph = paragraph;
	}

	return dedupedParagraphs.join('\n\n').trim();
};

const contactSchema = z.object({
	id: z.number().int().positive(),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	company: z.string().nullable().optional(),
	address: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	state: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	website: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	metadata: z.any().optional(),
});

const identitySchema = z.object({
	name: z.string().min(1),
	bandName: z.string().nullable().optional(),
	genre: z.string().nullable().optional(),
	area: z.string().nullable().optional(),
	bio: z.string().nullable().optional(),
	website: z.string().nullable().optional(),
});

const postGenerateDraftsSchema = z
	.object({
		operationId: z.string().min(1),
		campaignId: z.number().int().positive(),
		prompt: z.string().min(1),
		bookingFor: z.string().optional(),
		identity: identitySchema,
		contactIds: z.array(z.number().int().positive()).min(1).optional(),
		contacts: z.array(contactSchema).min(1).optional(),
		models: z.array(z.string().min(1)).optional(),
		concurrency: z.number().int().min(1).max(20).optional(),
	})
	.superRefine((value, ctx) => {
		if (!value.contactIds?.length && !value.contacts?.length) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Must provide either contactIds or contacts',
				path: ['contactIds'],
			});
		}
	});

export const maxDuration = 120;

type ContactInput = z.infer<typeof contactSchema>;
type IdentityInput = z.infer<typeof identitySchema>;

type DraftEventPayload = {
	operationId: string;
	contactId: number;
	draftIndex: number;
	model: string;
	subject: string;
	message: string;
};

type ErrorEventPayload = {
	operationId: string;
	contactId: number;
	draftIndex: number;
	model: string;
	code: string;
	message: string;
	retryCount: number;
};

const isSlowModel = (model: string): boolean => {
	return (
		model.includes('gpt') ||
		model.includes('deepseek') ||
		model.includes('qwen') ||
		model.includes('claude') ||
		model.includes('235b') ||
		model.includes('70b') ||
		model.includes('gemini') ||
		model.includes('pro')
	);
};

const toSafeError = (error: unknown): Error & { code?: string; status?: number } => {
	if (error instanceof Error) return error as Error & { code?: string; status?: number };
	return new Error('Unknown error') as Error & { code?: string; status?: number };
};

const toErrorCode = (error: Error & { code?: string; status?: number }): string => {
	if (error.code) return error.code;
	if (typeof error.status === 'number') return `http_${error.status}`;
	if (error.name === 'AbortError') return 'timeout';
	return 'unknown';
};

const isTransientFailure = (error: Error & { code?: string; status?: number }): boolean => {
	if (error.code === 'timeout' || error.code === 'network' || error.code === 'rate_limited') {
		return true;
	}
	if (typeof error.status === 'number') {
		return error.status === 429 || error.status >= 500;
	}
	const message = (error.message || '').toLowerCase();
	return (
		message.includes('timeout') ||
		message.includes('timed out') ||
		message.includes('network') ||
		message.includes('fetch failed') ||
		message.includes('429') ||
		message.includes('rate limit')
	);
};

const normalizeRequestedModels = (requested?: string[]): string[] => {
	if (!requested || requested.length === 0) {
		return [...OPENROUTER_DRAFTING_MODELS];
	}
	const deduped = Array.from(new Set(requested));
	const allowlisted = deduped.filter((model) => ALLOWED_OPENROUTER_DRAFTING_MODELS.has(model));
	if (allowlisted.length > 0) {
		return allowlisted;
	}
	return [DEFAULT_OPENROUTER_DRAFTING_MODEL];
};

const buildUserPrompt = ({
	contact,
	prompt,
	identity,
	bookingFor,
}: {
	contact: ContactInput;
	prompt: string;
	identity: IdentityInput;
	bookingFor?: string;
}): string => {
	const senderProfile = {
		name: identity.name,
		bandName: identity.bandName ?? undefined,
		genre: identity.genre ?? undefined,
		area: identity.area ?? undefined,
		bio: identity.bio ?? undefined,
		website: identity.website ?? undefined,
	};
	const bookingForNormalized = (bookingFor ?? '').trim();
	const bookingForContext =
		bookingForNormalized && bookingForNormalized !== 'Anytime'
			? `\n\nBooking For:\n${bookingForNormalized}`
			: '';
	return `Sender information (user profile):\n${stringifyJsonSubset(senderProfile, [
		'name',
		'bandName',
		'genre',
		'area',
		'bio',
		'website',
	])}\n\nRecipient information:\n${stringifyJsonSubset(contact, [
		'lastName',
		'firstName',
		'email',
		'company',
		'address',
		'city',
		'state',
		'country',
		'website',
		'phone',
		'metadata',
	])}${bookingForContext}\n\nUser Goal:\n${prompt}`;
};

const decodeGeminiValue = (value: string) =>
	value
		.replace(/\\n/g, '\n')
		.replace(/\\r/g, '')
		.replace(/\\t/g, '\t')
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, '\\')
		.trim();

const normalizeGeminiResponse = (text: string) =>
	text
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/[‐‑‒–—―]/g, '-');

const extractField = (response: string, field: 'subject' | 'message'): string | null => {
	const normalized = normalizeGeminiResponse(response);
	const flags = field === 'message' ? 'is' : 'i';
	const quotedRegex = new RegExp(`${field}["']?\\s*:\\s*(["'])([\\s\\S]*?)\\1`, flags);
	const quotedMatch = normalized.match(quotedRegex);
	if (quotedMatch?.[2]) return decodeGeminiValue(quotedMatch[2]);

	const unquotedRegex = new RegExp(`${field}["']?\\s*:\\s*([^,\\n\\r{}]+)`, 'i');
	const unquotedMatch = normalized.match(unquotedRegex);
	if (unquotedMatch?.[1]) return decodeGeminiValue(unquotedMatch[1]);

	return null;
};

const parseDraftResponse = (rawResponse: string, identity: IdentityInput) => {
	let subject: string | null = null;
	let message: string | null = null;

	try {
		let cleanedResponse = rawResponse
			.replace(/^```(?:json)?\s*/i, '')
			.replace(/\s*```$/i, '')
			.replace(/,(\s*[}\]])/g, '$1');
		const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
		if (jsonMatch) cleanedResponse = jsonMatch[0];
		const parsed = JSON.parse(cleanedResponse) as { subject?: string; message?: string };
		subject = parsed.subject ?? null;
		message = parsed.message ?? null;
	} catch {
		subject = extractField(rawResponse, 'subject');
		message = extractField(rawResponse, 'message') ?? rawResponse;
	}

	if (!subject || !message) {
		throw new Error('Prompt parsing failed');
	}

	const cleanedSubject = removeEmDashes(subject);
	const cleanedMessage = stripEmailSignatureFromAiMessage(removeEmDashes(message), {
		senderName: identity.name,
		senderBandName: identity.bandName ?? null,
	});

	if (!cleanedSubject || !cleanedMessage) {
		throw new Error('Prompt parsing failed');
	}

	return {
		subject: cleanedSubject,
		message: cleanedMessage,
	};
};

const createSseEvent = (event: string, payload: object): string =>
	`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

export async function POST(request: NextRequest) {
	const requestReceivedAt = performance.now();

	const { userId } = await auth();
	if (!userId) {
		return apiUnauthorized();
	}

	let parsedBody: z.SafeParseReturnType<
		unknown,
		z.infer<typeof postGenerateDraftsSchema>
	>;
	let parseDurationMs: number | null = null;
	try {
		const parseStartedAt = performance.now();
		const body = await request.json();
		parseDurationMs = performance.now() - parseStartedAt;
		parsedBody = postGenerateDraftsSchema.safeParse(body);
	} catch {
		return apiBadRequest('Invalid JSON body');
	}

	if (parseDurationMs !== null) {
		if (parsedBody.success) {
			console.log(`[Draft Stream][${parsedBody.data.operationId}] parsed request body`, {
				parseDurationMs: Math.round(parseDurationMs),
				campaignId: parsedBody.data.campaignId,
				contactIdsCount: parsedBody.data.contactIds?.length ?? 0,
				legacyContactsCount: parsedBody.data.contacts?.length ?? 0,
			});
		} else {
			console.log('[Draft Stream] parsed request body (invalid)', {
				parseDurationMs: Math.round(parseDurationMs),
			});
		}
	}

	if (!parsedBody.success) {
		return apiBadRequest(parsedBody.error);
	}

	const {
		operationId,
		campaignId,
		contactIds,
		contacts: legacyContacts,
		concurrency: requestedConcurrency,
		identity,
		prompt,
		bookingFor,
		models,
	} = parsedBody.data;

	const requestedContactIds =
		(contactIds?.length ? contactIds : legacyContacts?.map((contact) => contact.id)) ?? [];

	if (!requestedContactIds.length) {
		return apiBadRequest('Must provide at least one contact ID');
	}

	const fetchContactsStartedAt = performance.now();
	const uniqueRequestedContactIds = Array.from(new Set(requestedContactIds));
	const contactsFromDb = await prisma.contact.findMany({
		where: {
			id: { in: uniqueRequestedContactIds },
			userId,
			userContactLists: {
				some: {
					campaigns: {
						some: {
							id: campaignId,
							userId,
						},
					},
				},
			},
		},
		select: {
			id: true,
			firstName: true,
			lastName: true,
			email: true,
			company: true,
			address: true,
			city: true,
			state: true,
			country: true,
			website: true,
			phone: true,
			metadata: true,
		},
	});
	const fetchContactsDurationMs = performance.now() - fetchContactsStartedAt;

	console.log(`[Draft Stream][${operationId}] fetched contacts`, {
		fetchContactsDurationMs: Math.round(fetchContactsDurationMs),
		requested: requestedContactIds.length,
		uniqueRequested: uniqueRequestedContactIds.length,
		authorizedFetched: contactsFromDb.length,
		campaignId,
	});

	const authorizedById = new Map<number, ContactInput>();
	for (const contact of contactsFromDb) {
		authorizedById.set(contact.id, {
			id: contact.id,
			firstName: contact.firstName ?? null,
			lastName: contact.lastName ?? null,
			email: contact.email ?? null,
			company: contact.company ?? null,
			address: contact.address ?? null,
			city: contact.city ?? null,
			state: contact.state ?? null,
			country: contact.country ?? null,
			website: contact.website ?? null,
			phone: contact.phone ?? null,
			metadata: contact.metadata ?? null,
		});
	}

	const missingIds = uniqueRequestedContactIds.filter((id) => !authorizedById.has(id));
	if (missingIds.length) {
		console.warn(`[Draft Stream][${operationId}] unauthorized/missing contacts requested`, {
			campaignId,
			requested: requestedContactIds.length,
			uniqueRequested: uniqueRequestedContactIds.length,
			missingCount: missingIds.length,
			sampleMissingIds: missingIds.slice(0, 10),
		});
		return apiForbidden('One or more contacts are not authorized for this campaign');
	}

	const contacts: ContactInput[] = requestedContactIds.map((id) => authorizedById.get(id)!);

	const concurrencyFromEnv = Number(process.env.DRAFTS_GENERATE_CONCURRENCY || DEFAULT_CONCURRENCY);
	const concurrency = Math.max(
		1,
		Math.min(20, Number.isFinite(concurrencyFromEnv) ? requestedConcurrency ?? concurrencyFromEnv : DEFAULT_CONCURRENCY)
	);
	const modelRotation = normalizeRequestedModels(models);

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			const startedAt = Date.now();
			let firstDraftEmittedAt: number | null = null;
			let completed = 0;
			let succeeded = 0;
			let failed = 0;
			let cursor = 0;
			let closed = false;
			const requestAbortController = new AbortController();

			const closeStream = () => {
				if (closed) return;
				closed = true;
				controller.close();
			};

			const emit = (event: string, payload: object) => {
				if (closed) return;
				controller.enqueue(encoder.encode(createSseEvent(event, payload)));
				if (event === 'draft' && firstDraftEmittedAt === null) {
					firstDraftEmittedAt = performance.now();
					console.log(`[Draft Stream][${operationId}] first draft emitted`, {
						timeToFirstDraftMs: Math.round(firstDraftEmittedAt - requestReceivedAt),
						campaignId,
					});
				}
			};

			const emitProgress = () => {
				emit('progress', {
					operationId,
					completed,
					total: contacts.length,
					succeeded,
					failed,
				});
			};

			const sendHeartbeat = () => {
				if (closed) return;
				controller.enqueue(encoder.encode(': heartbeat\n\n'));
			};

			const onAbort = () => {
				requestAbortController.abort();
			};

			if (request.signal.aborted) {
				onAbort();
			} else {
				request.signal.addEventListener('abort', onAbort, { once: true });
			}

			const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);

			const processSingleContact = async (contact: ContactInput, index: number) => {
				const draftIndex = index + 1;
				const contactForPrompt: ContactInput =
					typeof contact.metadata === 'string'
						? { ...contact, metadata: packMetadataForPrompt(contact.metadata) }
						: contact;
				let lastError: Error & { code?: string; status?: number } | null = null;

				for (let retryCount = 0; retryCount <= MAX_RETRIES; retryCount++) {
					if (requestAbortController.signal.aborted) {
						return;
					}
					if (retryCount > 0) {
						const backoffMs = Math.pow(2, retryCount - 1) * 1000;
						await new Promise((resolve) => setTimeout(resolve, backoffMs));
					}

					const model = modelRotation[(index + retryCount) % modelRotation.length];
					const { prompt: selectedPrompt } = getRandomDraftingSystemPrompt();
					const populatedSystemPrompt = selectedPrompt
						.replace('{recipient_first_name}', contact.firstName || '')
						.replace('{company}', contact.company || '');
					const userPrompt = buildUserPrompt({
						contact: contactForPrompt,
						identity,
						prompt,
						bookingFor,
					});

					try {
						const timeoutMs = isSlowModel(model) ? 110000 : 45000;
						const response = await fetchOpenRouter(model, populatedSystemPrompt, userPrompt, {
							timeoutMs,
							signal: requestAbortController.signal,
						});
						const parsed = parseDraftResponse(response, identity);
						const draftPayload: DraftEventPayload = {
							operationId,
							contactId: contact.id,
							draftIndex,
							model,
							subject: parsed.subject,
							message: parsed.message,
						};
						succeeded++;
						completed++;
						emit('draft', draftPayload);
						emitProgress();
						return;
					} catch (error) {
						lastError = toSafeError(error);
						const code = toErrorCode(lastError);
						const isTransient = isTransientFailure(lastError);
						const errorPayload: ErrorEventPayload = {
							operationId,
							contactId: contact.id,
							draftIndex,
							model,
							code,
							message: lastError.message || 'Unknown error',
							retryCount,
						};
						emit('error', errorPayload);

						if (!isTransient || retryCount === MAX_RETRIES) {
							break;
						}
					}
				}

				if (!requestAbortController.signal.aborted) {
					failed++;
					completed++;
					emitProgress();
				}

				if (lastError) {
					console.warn(
						`[Draft Stream][${operationId}] contactId=${contact.id} failed after retries`,
						{
							error: lastError.message,
							campaignId,
						}
					);
				}
			};

			const run = async () => {
				try {
					const workerCount = Math.min(concurrency, contacts.length);
					const workers = Array.from({ length: workerCount }, async () => {
						while (!requestAbortController.signal.aborted) {
							const currentIndex = cursor++;
							if (currentIndex >= contacts.length) return;
							await processSingleContact(contacts[currentIndex], currentIndex);
						}
					});
					await Promise.all(workers);
				} finally {
					clearInterval(heartbeatTimer);
					request.signal.removeEventListener('abort', onAbort);
					emit('done', {
						operationId,
						total: contacts.length,
						succeeded,
						failed,
						durationMs: Date.now() - startedAt,
					});
					closeStream();
				}
			};

			void run();
		},
		cancel() {
			// no-op; request signal handles cancellation.
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
		},
	});
}
