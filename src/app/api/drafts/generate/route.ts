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
const PARTIAL_PREVIEW_EMIT_MIN_INTERVAL_MS = 80;
const PARTIAL_PREVIEW_EMIT_MIN_CHARS = 24;

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
		firstContact: contactSchema.optional(),
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

type DraftPartialEventPayload = {
	operationId: string;
	contactId: number;
	draftIndex: number;
	model: string;
	message: string;
	subject?: string;
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

const extractPartialField = (response: string, field: 'subject' | 'message'): string | null => {
	const exact = extractField(response, field);
	if (exact) return exact;

	const normalized = normalizeGeminiResponse(response);
	const fieldRegex = new RegExp(`["']?${field}["']?\\s*:\\s*`, 'i');
	const fieldMatch = fieldRegex.exec(normalized);
	if (!fieldMatch || typeof fieldMatch.index !== 'number') return null;

	const valueStart = fieldMatch.index + fieldMatch[0].length;
	const remainder = normalized.slice(valueStart).trimStart();
	if (!remainder) return null;

	if (remainder.startsWith('"') || remainder.startsWith("'")) {
		const quote = remainder[0];
		let closingQuoteIndex = -1;
		let escaped = false;
		for (let index = 1; index < remainder.length; index++) {
			const ch = remainder[index];
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === '\\') {
				escaped = true;
				continue;
			}
			if (ch === quote) {
				closingQuoteIndex = index;
				break;
			}
		}
		const quotedValue =
			closingQuoteIndex >= 0 ? remainder.slice(1, closingQuoteIndex) : remainder.slice(1);
		const decodedQuotedValue = decodeGeminiValue(quotedValue);
		return decodedQuotedValue.length > 0 ? decodedQuotedValue : null;
	}

	const unquotedMatch = remainder.match(/^([^,\n\r{}]+)/);
	if (!unquotedMatch?.[1]) return null;
	const decodedUnquotedValue = decodeGeminiValue(unquotedMatch[1]);
	return decodedUnquotedValue.length > 0 ? decodedUnquotedValue : null;
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
		firstContact,
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

	const concurrencyFromEnv = Number(process.env.DRAFTS_GENERATE_CONCURRENCY || DEFAULT_CONCURRENCY);
	const concurrency = Math.max(
		1,
		Math.min(
			20,
			Number.isFinite(concurrencyFromEnv)
				? requestedConcurrency ?? concurrencyFromEnv
				: DEFAULT_CONCURRENCY
		)
	);
	const modelRotation = normalizeRequestedModels(models);

	const contacts = requestedContactIds;
	const headRequestedContactIds = contacts.slice(0, concurrency);
	const tailRequestedContactIds = contacts.slice(concurrency);
	const uniqueRequestedContactIds = Array.from(new Set(contacts));
	const uniqueHeadRequestedContactIds = Array.from(new Set(headRequestedContactIds));
	const uniqueTailRequestedContactIds = Array.from(new Set(tailRequestedContactIds));

	type ContactDbRow = {
		id: number;
		firstName: string | null;
		lastName: string | null;
		email: string | null;
		company: string | null;
		address: string | null;
		city: string | null;
		state: string | null;
		country: string | null;
		website: string | null;
		phone: string | null;
		metadata: unknown;
	};

	const useFirstContactFastPath = Boolean(firstContact);

	if (firstContact) {
		if (!contactIds?.length) {
			return apiBadRequest('firstContact requires contactIds');
		}
		if (!contactIds.includes(firstContact.id)) {
			return apiBadRequest('firstContact.id must appear in contactIds');
		}
		if (contacts[0] !== firstContact.id) {
			return apiBadRequest('firstContact must match the first requested contactId');
		}
	}

	let contactQueue: ContactInput[];
	let contactQueueRequestedIndexes: number[];

	let firstContactAuthorized: boolean | null = null;
	let resolveFirstContactAuthorization: ((authorized: boolean) => void) | null = null;
	const firstContactAuthorizationPromise: Promise<boolean> | null = useFirstContactFastPath
		? new Promise<boolean>((resolve) => {
				resolveFirstContactAuthorization = resolve;
		  })
		: null;
	let firstContactFinalized = false;

	let fetchAuthorizedContactsStartedAt: number | null = null;
	let authorizedContactsFromDbPromise: Promise<ContactDbRow[]> | null = null;

	if (useFirstContactFastPath && firstContact) {
		const firstContactFromClient: ContactInput = {
			id: firstContact.id,
			firstName: firstContact.firstName ?? null,
			lastName: firstContact.lastName ?? null,
			email: firstContact.email ?? null,
			company: firstContact.company ?? null,
			address: firstContact.address ?? null,
			city: firstContact.city ?? null,
			state: firstContact.state ?? null,
			country: firstContact.country ?? null,
			website: firstContact.website ?? null,
			phone: firstContact.phone ?? null,
			metadata: firstContact.metadata ?? null,
		};

		contactQueue = [firstContactFromClient];
		contactQueueRequestedIndexes = [0];

		fetchAuthorizedContactsStartedAt = performance.now();
		authorizedContactsFromDbPromise = prisma.contact.findMany({
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
	} else {
		const fetchContactsStartedAt = performance.now();
		const headContactsFromDb = await prisma.contact.findMany({
			where: {
				id: { in: uniqueHeadRequestedContactIds },
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
			requested: contacts.length,
			uniqueRequested: uniqueRequestedContactIds.length,
			headRequested: headRequestedContactIds.length,
			headUniqueRequested: uniqueHeadRequestedContactIds.length,
			authorizedFetched: headContactsFromDb.length,
			campaignId,
		});

		const authorizedHeadById = new Map<number, ContactInput>();
		for (const contact of headContactsFromDb) {
			authorizedHeadById.set(contact.id, {
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

		const missingHeadIds = uniqueHeadRequestedContactIds.filter((id) => !authorizedHeadById.has(id));
		if (missingHeadIds.length) {
			console.warn(`[Draft Stream][${operationId}] unauthorized/missing contacts requested`, {
				campaignId,
				requested: contacts.length,
				uniqueRequested: uniqueRequestedContactIds.length,
				headRequested: headRequestedContactIds.length,
				headUniqueRequested: uniqueHeadRequestedContactIds.length,
				missingCount: missingHeadIds.length,
				sampleMissingIds: missingHeadIds.slice(0, 10),
			});
			return apiForbidden('One or more contacts are not authorized for this campaign');
		}

		contactQueue = headRequestedContactIds.map((id) => authorizedHeadById.get(id)!);
		contactQueueRequestedIndexes = headRequestedContactIds.map((_, index) => index);
	}

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			const startedAt = Date.now();
			let firstDraftEmittedAt: number | null = null;
			let completed = 0;
			let succeeded = 0;
			let failed = 0;
			let cursor = 0;
			let allContactsFetched = useFirstContactFastPath ? false : tailRequestedContactIds.length === 0;
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
				if (useFirstContactFastPath && firstContactAuthorized === null) {
					firstContactAuthorized = false;
					resolveFirstContactAuthorization?.(false);
				}
			};

			if (request.signal.aborted) {
				onAbort();
			} else {
				request.signal.addEventListener('abort', onAbort, { once: true });
			}

			const heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);

			const processSingleContact = async (contact: ContactInput, index: number) => {
				const isFastFirstContact = useFirstContactFastPath && index === 0;
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
					if (isFastFirstContact && firstContactFinalized) {
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
						let streamedRawResponse = '';
						let pendingPreviewChars = 0;
						let lastPreviewEmitAt = 0;
						let lastPreviewMessage = '';
						let lastPreviewSubject = '';

						const emitPartialPreview = (force = false) => {
							if (isFastFirstContact && firstContactFinalized) {
								return;
							}
							const partialMessage = extractPartialField(streamedRawResponse, 'message');
							if (!partialMessage) return;

							const now = Date.now();
							if (
								!force &&
								pendingPreviewChars < PARTIAL_PREVIEW_EMIT_MIN_CHARS &&
								now - lastPreviewEmitAt < PARTIAL_PREVIEW_EMIT_MIN_INTERVAL_MS
							) {
								return;
							}

							const sanitizedMessage = removeEmDashes(partialMessage);
							if (!sanitizedMessage) return;

							const partialSubject = extractPartialField(streamedRawResponse, 'subject');
							const sanitizedSubject = partialSubject ? removeEmDashes(partialSubject) : '';
							if (
								!force &&
								sanitizedMessage === lastPreviewMessage &&
								sanitizedSubject === lastPreviewSubject
							) {
								pendingPreviewChars = 0;
								return;
							}

							lastPreviewMessage = sanitizedMessage;
							lastPreviewSubject = sanitizedSubject;
							lastPreviewEmitAt = now;
							pendingPreviewChars = 0;

							const partialPayload: DraftPartialEventPayload = {
								operationId,
								contactId: contact.id,
								draftIndex,
								model,
								message: sanitizedMessage,
							};
							if (sanitizedSubject) {
								partialPayload.subject = sanitizedSubject;
							}
							emit('draft_partial', partialPayload);
						};

						const response = await fetchOpenRouter(model, populatedSystemPrompt, userPrompt, {
							timeoutMs,
							signal: requestAbortController.signal,
							onToken: (token) => {
								streamedRawResponse += token;
								pendingPreviewChars += token.length;
								emitPartialPreview();
							},
						});
						streamedRawResponse = response;
						emitPartialPreview(true);

						const parsed = parseDraftResponse(response, identity);
						const draftPayload: DraftEventPayload = {
							operationId,
							contactId: contact.id,
							draftIndex,
							model,
							subject: parsed.subject,
							message: parsed.message,
						};
						if (isFastFirstContact) {
							if (firstContactAuthorizationPromise && firstContactAuthorized === null) {
								await firstContactAuthorizationPromise;
							}
							if (firstContactFinalized || firstContactAuthorized !== true) {
								return;
							}
						}
						succeeded++;
						completed++;
						if (isFastFirstContact) {
							firstContactFinalized = true;
						}
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
						if (!isFastFirstContact || !firstContactFinalized) {
							emit('error', errorPayload);
						}

						if (!isTransient || retryCount === MAX_RETRIES) {
							break;
						}
					}
				}

				if (!requestAbortController.signal.aborted) {
					if (isFastFirstContact && firstContactFinalized) {
						return;
					}
					failed++;
					completed++;
					if (isFastFirstContact) {
						firstContactFinalized = true;
					}
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
							while (
								!requestAbortController.signal.aborted &&
								currentIndex >= contactQueue.length
							) {
								if (allContactsFetched) {
									return;
								}
								await new Promise((resolve) => setTimeout(resolve, 50));
							}
							if (requestAbortController.signal.aborted) return;
							const contact = contactQueue[currentIndex];
							const requestedIndex =
								contactQueueRequestedIndexes[currentIndex] ?? currentIndex;
							if (!contact) {
								if (allContactsFetched) return;
								await new Promise((resolve) => setTimeout(resolve, 50));
								continue;
							}
							await processSingleContact(contact, requestedIndex);
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

			const fetchTailContacts = async () => {
				if (useFirstContactFastPath) {
					const authorizationFetchStartedAt = fetchAuthorizedContactsStartedAt ?? performance.now();
					try {
						if (!authorizedContactsFromDbPromise) {
							throw new Error('Missing authorization query promise');
						}
						const authorizedContactsFromDb = await authorizedContactsFromDbPromise;
						const authorizationFetchDurationMs =
							performance.now() - authorizationFetchStartedAt;

						const authorizedById = new Map<number, ContactInput>();
						for (const contact of authorizedContactsFromDb) {
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
								metadata: (contact.metadata as unknown) ?? null,
							});
						}

						const firstRequestedContactId = contacts[0];
						const isFirstContactAuthorized = authorizedById.has(firstRequestedContactId);
						if (firstContactAuthorized === null) {
							firstContactAuthorized = isFirstContactAuthorized;
							resolveFirstContactAuthorization?.(isFirstContactAuthorized);
						}

						console.log(`[Draft Stream][${operationId}] authorized contacts fetched`, {
							fetchContactsDurationMs: Math.round(authorizationFetchDurationMs),
							requested: contacts.length,
							uniqueRequested: uniqueRequestedContactIds.length,
							authorizedFetched: authorizedContactsFromDb.length,
							campaignId,
							firstContactFastPath: true,
						});

						if (requestAbortController.signal.aborted) {
							return;
						}

						if (!isFirstContactAuthorized) {
							console.warn(
								`[Draft Stream][${operationId}] firstContact unauthorized (fast-path)`,
								{
									contactId: firstRequestedContactId,
									campaignId,
								}
							);

							if (!firstContactFinalized) {
								firstContactFinalized = true;
								failed++;
								completed++;
								emit('error', {
									operationId,
									contactId: firstRequestedContactId,
									draftIndex: 1,
									model: modelRotation[0],
									code: 'unauthorized',
									message: 'Contact is not authorized for this campaign',
									retryCount: 0,
								} satisfies ErrorEventPayload);
								emitProgress();
							}
						}

						let authorizedQueued = 0;
						let unauthorizedQueued = 0;

						for (let requestedIndex = 1; requestedIndex < contacts.length; requestedIndex++) {
							const contactId = contacts[requestedIndex];
							const authorizedContact = authorizedById.get(contactId);
							if (authorizedContact) {
								contactQueue.push(authorizedContact);
								contactQueueRequestedIndexes.push(requestedIndex);
								authorizedQueued++;
								continue;
							}

							unauthorizedQueued++;
							failed++;
							completed++;
							emit('error', {
								operationId,
								contactId,
								draftIndex: requestedIndex + 1,
								model: modelRotation[requestedIndex % modelRotation.length],
								code: 'unauthorized',
								message: 'Contact is not authorized for this campaign',
								retryCount: 0,
							} satisfies ErrorEventPayload);
							emitProgress();
						}

						console.log(`[Draft Stream][${operationId}] remaining contacts queued`, {
							authorizedQueued,
							unauthorizedQueued,
							campaignId,
							firstContactFastPath: true,
						});
					} catch (error) {
						const authorizationFetchDurationMs = performance.now() - authorizationFetchStartedAt;
						const safeError = toSafeError(error);
						console.error(`[Draft Stream][${operationId}] failed to authorize contacts`, {
							error: safeError.message || 'Unknown error',
							code: toErrorCode(safeError),
							fetchContactsDurationMs: Math.round(authorizationFetchDurationMs),
							requested: contacts.length,
							uniqueRequested: uniqueRequestedContactIds.length,
							campaignId,
							firstContactFastPath: true,
						});

						if (firstContactAuthorized === null) {
							firstContactAuthorized = false;
							resolveFirstContactAuthorization?.(false);
						}

						if (requestAbortController.signal.aborted) {
							return;
						}

						const firstRequestedContactId = contacts[0];
						if (!firstContactFinalized) {
							firstContactFinalized = true;
							failed++;
							completed++;
							emit('error', {
								operationId,
								contactId: firstRequestedContactId,
								draftIndex: 1,
								model: modelRotation[0],
								code: 'contact_fetch_failed',
								message: 'Unable to fetch contact for draft generation',
								retryCount: 0,
							} satisfies ErrorEventPayload);
							emitProgress();
						}

						for (let requestedIndex = 1; requestedIndex < contacts.length; requestedIndex++) {
							const contactId = contacts[requestedIndex];
							failed++;
							completed++;
							emit('error', {
								operationId,
								contactId,
								draftIndex: requestedIndex + 1,
								model: modelRotation[requestedIndex % modelRotation.length],
								code: 'contact_fetch_failed',
								message: 'Unable to fetch contact for draft generation',
								retryCount: 0,
							} satisfies ErrorEventPayload);
							emitProgress();
						}
					} finally {
						allContactsFetched = true;
					}
					return;
				}

				if (!tailRequestedContactIds.length) {
					allContactsFetched = true;
					return;
				}

				const tailFetchStartedAt = performance.now();
				try {
					const tailContactsFromDb = await prisma.contact.findMany({
						where: {
							id: { in: uniqueTailRequestedContactIds },
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
					const tailFetchDurationMs = performance.now() - tailFetchStartedAt;

					if (requestAbortController.signal.aborted) {
						return;
					}

					const authorizedTailById = new Map<number, ContactInput>();
					for (const contact of tailContactsFromDb) {
						authorizedTailById.set(contact.id, {
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

					let authorizedTailCount = 0;
					let unauthorizedTailCount = 0;

					for (let tailOffset = 0; tailOffset < tailRequestedContactIds.length; tailOffset++) {
						const contactId = tailRequestedContactIds[tailOffset];
						const requestedIndex = headRequestedContactIds.length + tailOffset;
						const authorizedContact = authorizedTailById.get(contactId);
						if (authorizedContact) {
							contactQueue.push(authorizedContact);
							contactQueueRequestedIndexes.push(requestedIndex);
							authorizedTailCount++;
							continue;
						}

						unauthorizedTailCount++;
						failed++;
						completed++;
						emit('error', {
							operationId,
							contactId,
							draftIndex: requestedIndex + 1,
							model: modelRotation[requestedIndex % modelRotation.length],
							code: 'unauthorized',
							message: 'Contact is not authorized for this campaign',
							retryCount: 0,
						} satisfies ErrorEventPayload);
						emitProgress();
					}

					console.log(`[Draft Stream][${operationId}] tail contacts fetched`, {
						tailFetchDurationMs: Math.round(tailFetchDurationMs),
						requestedTail: tailRequestedContactIds.length,
						uniqueTailRequested: uniqueTailRequestedContactIds.length,
						authorizedTailContacts: authorizedTailCount,
						unauthorizedTailContacts: unauthorizedTailCount,
						campaignId,
					});
				} catch (error) {
					const tailFetchDurationMs = performance.now() - tailFetchStartedAt;
					const safeError = toSafeError(error);
					console.error(`[Draft Stream][${operationId}] failed to fetch tail contacts`, {
						error: safeError.message || 'Unknown error',
						code: toErrorCode(safeError),
						tailFetchDurationMs: Math.round(tailFetchDurationMs),
						requestedTail: tailRequestedContactIds.length,
						uniqueTailRequested: uniqueTailRequestedContactIds.length,
						campaignId,
					});

					if (requestAbortController.signal.aborted) {
						return;
					}

					for (let tailOffset = 0; tailOffset < tailRequestedContactIds.length; tailOffset++) {
						const contactId = tailRequestedContactIds[tailOffset];
						const requestedIndex = headRequestedContactIds.length + tailOffset;
						failed++;
						completed++;
						emit('error', {
							operationId,
							contactId,
							draftIndex: requestedIndex + 1,
							model: modelRotation[requestedIndex % modelRotation.length],
							code: 'contact_fetch_failed',
							message: 'Unable to fetch contact for draft generation',
							retryCount: 0,
						} satisfies ErrorEventPayload);
						emitProgress();
					}
				} finally {
					allContactsFetched = true;
				}
			};

			void fetchTailContacts();
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