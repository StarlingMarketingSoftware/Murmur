import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	apiBadRequest,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	getZeroBounceFileStatus,
	handleApiError,
	processZeroBounceResults,
	verifyEmailsWithZeroBounce,
} from '@/app/api/_utils';
import { z } from 'zod';

const postContactVerificationRequestSchema = z.object({
	query: z.string().optional(),
	limit: z.coerce.number().optional(),
	onlyUnverified: z.coerce.boolean().optional().default(false),
	notVerifiedSince: z.coerce.date().optional(),
});
const patchContactVerificationRequestSchema = z.object({
	fileId: z.string(),
});

export type PostContactVerificationRequestData = z.infer<
	typeof postContactVerificationRequestSchema
>;
export type PatchContactVerificationRequestData = z.infer<
	typeof patchContactVerificationRequestSchema
>;

const generateWhereClause = (
	data: PostContactVerificationRequestData
): Prisma.ContactWhereInput => {
	const { query, onlyUnverified, notVerifiedSince } = data;
	const whereClause: Prisma.ContactWhereInput = {};
	if (query) {
		whereClause.email = {
			equals: query,
			mode: 'insensitive',
		};
	}
	if (onlyUnverified) {
		whereClause.emailValidationStatus = 'unknown';
	}
	if (notVerifiedSince) {
		whereClause.emailValidatedAt = {
			lt: notVerifiedSince,
		};
	}

	return whereClause;
};

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const contactVerificationRequests = await prisma.contactVerificationRequest.findMany({
			orderBy: {
				createdAt: 'desc',
			},
		});

		return apiResponse(contactVerificationRequests);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = postContactVerificationRequestSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { limit } = validatedData.data;

		const user = await prisma.user.findUniqueOrThrow({
			where: {
				clerkId: userId,
			},
			select: {
				role: true,
			},
		});
		if (user.role !== 'admin') {
			return apiUnauthorized('Admin permission required');
		}

		const contacts = await prisma.contact.findMany({
			where: generateWhereClause(validatedData.data),
			...(limit && { take: limit }),
		});

		const zeroBounceFileId = await verifyEmailsWithZeroBounce(contacts);
		if (!zeroBounceFileId) {
			return apiServerError(
				'Invalid return from verifyEmailsWithZeroBounce: ZeroBounce verification failed for all contacts.'
			);
		}

		await prisma.contactVerificationRequest.create({
			data: {
				...validatedData.data,
				fileId: zeroBounceFileId,
				estimatedTimeOfCompletion: new Date(Date.now() + contacts.length * 1000),
			},
		});

		return apiResponse({
			fileId: zeroBounceFileId,
			estimatedTimeInSeconds: contacts.length,
			message: `Verification started successfully. Please check back in approximately ${contacts.length} seconds for results.`,
		});
	} catch (error) {
		return handleApiError(error);
	}
}

export async function PATCH(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = patchContactVerificationRequestSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { fileId } = validatedData.data;

		const user = await prisma.user.findUniqueOrThrow({
			where: {
				clerkId: userId,
			},
			select: {
				role: true,
			},
		});
		if (user.role !== 'admin') {
			return apiUnauthorized('Admin permission required');
		}

		const isVerificationComplete = await getZeroBounceFileStatus(fileId);

		if (!isVerificationComplete) {
			return apiResponse({
				status: 'processing',
				message: 'Verification is still in progress. Please wait for completion.',
			});
		}

		const contactVerificationRequest = await prisma.contactVerificationRequest.findUnique(
			{
				where: { fileId },
			}
		);

		if (!contactVerificationRequest) {
			return apiBadRequest('No verification request found for the provided file ID.');
		}

		const { query, limit, onlyUnverified, notVerifiedSince } = contactVerificationRequest;

		const contacts = await prisma.contact.findMany({
			where: generateWhereClause({
				query: query || '',
				onlyUnverified: onlyUnverified || false,
				notVerifiedSince: notVerifiedSince || undefined,
			}),
			...(limit && { take: limit }),
		});

		const verifiedContacts = await processZeroBounceResults(fileId, contacts);

		for (const contact of verifiedContacts) {
			try {
				await prisma.contact.update({
					where: { id: contact.id },
					data: {
						emailValidationStatus: contact.emailValidationStatus,
						emailValidationSubStatus: contact.emailValidationSubStatus,
						emailValidatedAt: contact.emailValidatedAt,
					},
				});
				console.log(
					`Contact ${contact.id} updated successfully. Status: ${contact.emailValidationStatus}`
				);
			} catch (error) {
				console.error(`Failed to update contact ${contact.id}:`, error);
			}
		}

		await prisma.contactVerificationRequest.update({
			where: {
				fileId,
			},
			data: {
				status: 'completed',
			},
		});

		return apiResponse({
			message: 'Verification completed for all contacts ',
		});
	} catch (error) {
		return handleApiError(error);
	}
}
