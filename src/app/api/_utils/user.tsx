import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma, User } from '@prisma/client';
import { AccountType } from '@/constants/prismaEnums';
import { stripe } from '@/stripe/client';
import { generateMurmurEmail, generateMurmurReplyToEmail } from '@/utils';

// gets the currently logged in Clerk user, then fetches the local user
// if user is not authenticated, not found, or error, it returns null
export const getUser = async (): Promise<User | null> => {
	const { userId } = await auth();

	if (!userId) {
		return null;
	}

	try {
		const result = await prisma.user.findUnique({
			where: {
				clerkId: userId,
			},
		});

		return result;
	} catch (error) {
		console.error(error);
		return null;
	}
};

/**
 * Resolves a user's account type from Clerk metadata at creation time.
 * Defaults to `standard` so the normal signup flow is undisturbed; only an
 * explicit `accountType: 'venue'` (set by the venue signup) yields `venue`.
 */
export const resolveAccountType = (metadata: unknown): AccountType =>
	(metadata as { accountType?: unknown } | null | undefined)?.accountType ===
	AccountType.venue
		? AccountType.venue
		: AccountType.standard;

/**
 * On-demand provisioning fallback for when the Clerk `user.created` webhook
 * hasn't arrived yet (e.g. local dev without the ngrok tunnel, or webhook lag
 * right after sign-up). Fetches the Clerk user and creates the local User row
 * + Stripe customer idempotently. Safe to race the webhook: the Stripe customer
 * uses an idempotency key, and a P2002 from a concurrent insert re-fetches the
 * existing row. Throws on failure (callers route errors through handleApiError).
 * The return type is inferred so it carries the extended client's computed fields.
 */
export const provisionLocalUser = async (clerkUserId: string) => {
	const clerk = await clerkClient();
	const clerkUser = await clerk.users.getUser(clerkUserId);
	const email =
		clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
			?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

	if (!email) {
		throw new Error('No email address found for this user');
	}

	const firstName = clerkUser.firstName ?? null;
	const lastName = clerkUser.lastName ?? null;

	const stripeCustomer = await stripe.customers.create(
		{
			email,
			name: `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'User',
			metadata: { clerkId: clerkUserId },
		},
		{ idempotencyKey: `murmur-create-customer-${clerkUserId}` }
	);

	const createUser = (murmurEmail: string | null) =>
		prisma.$transaction(async (tx) => {
			const createdUser = await tx.user.create({
				data: {
					clerkId: clerkUserId,
					email,
					firstName,
					lastName,
					stripeCustomerId: stripeCustomer.id,
					murmurEmail,
					accountType: resolveAccountType(clerkUser.unsafeMetadata),
				},
			});

			// Reply-To must be unique and stable; use the DB `id` to guarantee uniqueness.
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

	try {
		return await createUser(generateMurmurEmail(firstName, lastName));
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			// Another request (or the Clerk webhook) created the user concurrently.
			const existingUser = await prisma.user.findUnique({
				where: { clerkId: clerkUserId },
			});
			if (existingUser) {
				return existingUser;
			}
			// Most common cause here is a murmurEmail uniqueness collision.
			return await createUser(null);
		}
		throw error;
	}
};
