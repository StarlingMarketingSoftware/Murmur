import prisma from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import {
	apiBadRequest,
	apiForbidden,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	getIsAdmin,
	handleApiError,
	provisionLocalUser,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

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

// Fields a non-admin may update on their OWN row. Everything else (Stripe ids,
// custom domain) is server/webhook-managed or admin-only.
const SELF_PATCHABLE_FIELDS = new Set<string>([
	'firstName',
	'lastName',
	'draftCredits',
	'sendingCredits',
	'verificationCredits',
	'aiDraftCredits',
	'aiTestCredits',
	'stripeSubscriptionStatus',
]);

// Demo-trial activation is the one legitimate self-increase (useDemo.tsx sends
// exactly these values); everything else must be a decrement.
const TRIAL_AI_DRAFT_CREDITS_CAP = 500;
const TRIAL_AI_TEST_CREDITS_CAP = 50;

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

		// Users may only read their own row; the admin user-detail page reads others.
		if (id !== userId && !(await getIsAdmin(userId))) {
			return apiForbidden();
		}

		let user = await prisma.user.findUnique({ where: { clerkId: id } });

		// If the signed-in Clerk user doesn't exist locally yet (common right after sign-up),
		// create the user record on-demand so the app can proceed even if webhooks lag.
		if (!user && id === userId) {
			user = await provisionLocalUser(userId);
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

		const caller = await prisma.user.findUnique({
			where: { clerkId: userId },
			select: {
				role: true,
				draftCredits: true,
				sendingCredits: true,
				verificationCredits: true,
				aiDraftCredits: true,
				aiTestCredits: true,
			},
		});
		if (!caller) {
			return apiUnauthorized();
		}

		if (caller.role !== UserRole.admin) {
			// Non-admins may only update their own row.
			if (id !== userId) {
				return apiForbidden();
			}

			const updates = validatedData.data;
			const disallowedFields = Object.keys(updates).filter(
				(field) => !SELF_PATCHABLE_FIELDS.has(field)
			);
			if (disallowedFields.length > 0) {
				return apiBadRequest(
					`Cannot update field(s): ${disallowedFields.join(', ')}`
				);
			}

			// Credits are decremented client-side after drafting/sending; a self-update
			// must never increase them (caller === target here).
			const decrementOnlyFields = [
				'draftCredits',
				'sendingCredits',
				'verificationCredits',
			] as const;
			for (const field of decrementOnlyFields) {
				const next = updates[field];
				if (next !== undefined && (next < 0 || next > caller[field])) {
					return apiBadRequest(`Invalid ${field} value`);
				}
			}

			// Demo-trial activation may set these up to the trial amounts; otherwise
			// they may only decrease.
			if (
				updates.aiDraftCredits !== undefined &&
				(updates.aiDraftCredits < 0 ||
					updates.aiDraftCredits >
						Math.max(caller.aiDraftCredits, TRIAL_AI_DRAFT_CREDITS_CAP))
			) {
				return apiBadRequest('Invalid aiDraftCredits value');
			}
			if (
				updates.aiTestCredits !== undefined &&
				(updates.aiTestCredits < 0 ||
					updates.aiTestCredits >
						Math.max(caller.aiTestCredits, TRIAL_AI_TEST_CREDITS_CAP))
			) {
				return apiBadRequest('Invalid aiTestCredits value');
			}

			// Subscription status is Stripe-webhook-managed; the demo trial is the one
			// self-service exception.
			if (
				updates.stripeSubscriptionStatus !== undefined &&
				updates.stripeSubscriptionStatus !== 'trialing'
			) {
				return apiBadRequest('Invalid stripeSubscriptionStatus value');
			}
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
