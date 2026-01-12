import prisma from '@/lib/prisma';
import { z } from 'zod';
import { auth, clerkClient } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiServerError,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';
import { generateMurmurEmail, generateMurmurReplyToEmail } from '@/utils';
import { stripe } from '@/stripe/client';
import { Prisma } from '@prisma/client';

const patchUserSchema = z.object({
	firstName: z.string().optional(),
	lastName: z.string().optional(),
	aiDraftCredits: z.number().int().optional(),
	aiTestCredits: z.number().int().optional(),
	stripeCustomerId: z.string().optional().nullable(),
	stripeSubscriptionId: z.string().optional().nullable(),
	stripeSubscriptionStatus: z.string().optional().nullable(),
	stripePriceId: z.string().optional().nullable(),
	customDomain: z.string().optional().nullable(),
	draftCredits: z.number().optional(),
	sendingCredits: z.number().optional(),
	verificationCredits: z.number().optional(),
});
export type PatchUserData = z.infer<typeof patchUserSchema>;

export const GET = async function GET(
	req: NextRequest,
	{ params }: { params: ApiRouteParams }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;

		let user = await prisma.user.findUnique({ where: { clerkId: id } });

		// If the signed-in Clerk user doesn't exist locally yet (common right after sign-up),
		// create the user record on-demand so the app can proceed even if webhooks lag.
		if (!user && id === userId) {
			const clerk = await clerkClient();
			const clerkUser = await clerk.users.getUser(userId);
			const email =
				clerkUser.emailAddresses.find(
					(e) => e.id === clerkUser.primaryEmailAddressId
				)?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

			if (!email) {
				return apiServerError('No email address found for this user');
			}

			const firstName = clerkUser.firstName ?? null;
			const lastName = clerkUser.lastName ?? null;

			const stripeCustomer = await stripe.customers.create(
				{
					email,
					name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'User',
					metadata: { clerkId: userId },
				},
				{ idempotencyKey: `murmur-create-customer-${userId}` }
			);

			const murmurEmail = generateMurmurEmail(firstName, lastName);

			try {
				user = await prisma.$transaction(async (tx) => {
					const createdUser = await tx.user.create({
						data: {
							clerkId: userId,
							email,
							firstName,
							lastName,
							stripeCustomerId: stripeCustomer.id,
							murmurEmail,
						},
					});

					const replyToEmail = generateMurmurReplyToEmail(
						createdUser.firstName,
						createdUser.lastName,
						createdUser.id
					);

					return await tx.user.update({
						where: { id: createdUser.id },
						data: { replyToEmail },
					});
				});
			} catch (error) {
				// If another request (or the Clerk webhook) created the user concurrently, fetch and return it.
				if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
					const existingUser = await prisma.user.findUnique({ where: { clerkId: userId } });
					if (existingUser) {
						user = existingUser;
					} else {
						// Most common cause here is murmurEmail uniqueness collisions; fall back to a null murmurEmail.
						user = await prisma.$transaction(async (tx) => {
							const createdUser = await tx.user.create({
								data: {
									clerkId: userId,
									email,
									firstName,
									lastName,
									stripeCustomerId: stripeCustomer.id,
									murmurEmail: null,
								},
							});

							const replyToEmail = generateMurmurReplyToEmail(
								createdUser.firstName,
								createdUser.lastName,
								createdUser.id
							);

							return await tx.user.update({
								where: { id: createdUser.id },
								data: { replyToEmail },
							});
						});
					}
				}
				// If it's some other error, let handleApiError format it.
				if (!user) {
					throw error;
				}
			}
		}

		if (!user) {
			return apiNotFound('User not found');
		}

		return apiResponse(user);
	} catch (error) {
		return handleApiError(error);
	}
};

export const PATCH = async function PATCH(
	request: Request,
	{ params }: { params: ApiRouteParams }
) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;

		const data = await request.json();
		const validatedData = patchUserSchema.safeParse(data);

		if (!validatedData.success) {
			return apiBadRequest();
		}

		const updatedUser = await prisma.user.update({
			where: { clerkId: id },
			data: validatedData.data,
		});

		return apiResponse(updatedUser);
	} catch (error) {
		return handleApiError(error);
	}
};
