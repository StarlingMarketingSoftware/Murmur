import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { stripe } from '@/stripe/client';
import {
	apiAccepted,
	apiBadRequest,
	apiNoContent,
	apiResponse,
	apiServerError,
	handleApiError,
} from '@/app/api/_utils';
import { generateMurmurEmail, generateMurmurReplyToEmail } from '@/utils';

export async function POST(req: Request) {
	const SIGNING_SECRET = process.env.CLERK_SIGNING_SECRET;

	if (!SIGNING_SECRET) {
		return apiServerError(
			'Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env'
		);
	}

	// Create new Svix instance with secret
	const wh = new Webhook(SIGNING_SECRET);

	// Get headers
	const headerPayload = await headers();
	const svix_id = headerPayload.get('svix-id');
	const svix_timestamp = headerPayload.get('svix-timestamp');
	const svix_signature = headerPayload.get('svix-signature');

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return apiBadRequest('Error: Missing Svix headers');
	}

	// Get body
	const payload = await req.json();
	const body = JSON.stringify(payload);
	let evt: WebhookEvent;

	// Verify payload with headers
	try {
		evt = wh.verify(body, {
			'svix-id': svix_id,
			'svix-timestamp': svix_timestamp,
			'svix-signature': svix_signature,
		}) as WebhookEvent;
	} catch {
		return apiServerError('Error: Svix verification error');
	}

	if (evt.type === 'user.created') {
		const { id, email_addresses, last_name, first_name } = evt.data;
		if (!id || !email_addresses || email_addresses.length === 0) {
			return apiBadRequest('Error: Missing required fields');
		}

		// If the user was already created locally (e.g. by an on-demand provisioning flow),
		// don't attempt to recreate them (or create a duplicate Stripe customer).
		const existingUser = await prisma.user.findUnique({ where: { clerkId: id } });
		if (existingUser) {
			return apiAccepted('Webhook received');
		}

		const email = evt.data.email_addresses[0].email_address;
		const murmurEmail = generateMurmurEmail(first_name ?? null, last_name ?? null);
		const stripeCustomer = await stripe.customers.create({
			email: email,
			name: `${first_name ?? ''} ${last_name ?? ''}`.trim() || 'User',
		});
		try {
			await prisma.$transaction(async (tx) => {
				const createdUser = await tx.user.create({
					data: {
						clerkId: id,
						stripeCustomerId: stripeCustomer.id,
						email: email,
						firstName: first_name ?? null,
						lastName: last_name ?? null,
						murmurEmail,
					},
				});

				// Reply-To must be unique and stable; use the DB `id` to guarantee uniqueness.
				const replyToEmail = generateMurmurReplyToEmail(
					createdUser.firstName,
					createdUser.lastName,
					createdUser.id
				);
				await tx.user.update({
					where: { id: createdUser.id },
					data: { replyToEmail },
				});
			});
		} catch (error) {
			return handleApiError(error);
		}
	} else if (evt.type === 'user.updated') {
		const { id, email_addresses, first_name, last_name } = evt.data;

		try {
			const updatedUser = await prisma.user.update({
				where: {
					clerkId: id,
				},
				data: {
					email: email_addresses[0].email_address,
					firstName: first_name,
					lastName: last_name,
				},
			});

			// Regenerate murmurEmail if name changed
			const newMurmurEmail = generateMurmurEmail(first_name, last_name);
			if (updatedUser.murmurEmail !== newMurmurEmail) {
				await prisma.user.update({
					where: { id: updatedUser.id },
					data: { murmurEmail: newMurmurEmail },
				});
			}

			// Backfill replyToEmail if it was never set (do NOT rotate once set).
			if (!updatedUser.replyToEmail) {
				const replyToEmail = generateMurmurReplyToEmail(
					first_name ?? null,
					last_name ?? null,
					updatedUser.id
				);
				await prisma.user.update({
					where: { id: updatedUser.id },
					data: { replyToEmail },
				});
			}

			return apiResponse(updatedUser);
		} catch (error) {
			return handleApiError(error);
		}
	} else if (evt.type === 'user.deleted') {
		const { id } = evt.data;

		try {
			await prisma.user.delete({
				where: {
					clerkId: id,
				},
			});

			return apiNoContent();
		} catch (error) {
			return handleApiError(error);
		}
	}
	return apiAccepted('Webhook received');
}
