import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
export async function POST(req: Request) {
	const SIGNING_SECRET = process.env.CLERK_SIGNING_SECRET;

	if (!SIGNING_SECRET) {
		throw new Error(
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
		return new Response('Error: Missing Svix headers', {
			status: 400,
		});
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
	} catch (err) {
		console.error('Error: Could not verify webhook:', err);
		return new Response('Error: Verification error', {
			status: 400,
		});
	}

	if (evt.type === 'user.created') {
		const { id, email_addresses, last_name, first_name } = evt.data;
		if (
			!id ||
			!email_addresses ||
			email_addresses.length === 0 ||
			!last_name ||
			!first_name
		) {
			return new Response('Error: Missing required fields', {
				status: 400,
			});
		}

		try {
			await prisma.user.create({
				data: {
					clerkId: id,
					email: evt.data.email_addresses[0].email_address,
					firstName: first_name,
					lastName: last_name,
				},
			});
		} catch (err) {
			console.error('Error: Could not verify webhook:', err);
			return new Response('Error: User creation error', {
				status: 500,
			});
		}
	} else if (evt.type === 'user.updated') {
		const { id, email_addresses, first_name, last_name } = evt.data;

		try {
			// Update user data in database
			await prisma.user.update({
				where: {
					clerkId: id,
				},
				data: {
					email: email_addresses[0].email_address,
					firstName: first_name,
					lastName: last_name,
				},
			});

			console.log(`User updated: ${id}`);
			return new Response('User updated successfully', { status: 200 });
		} catch (err) {
			console.error('Error: Could not update user:', err);
			return new Response('Error: User update error', {
				status: 500,
			});
		}
	} else if (evt.type === 'user.deleted') {
		const { id } = evt.data;

		try {
			// Delete user from database
			await prisma.user.delete({
				where: {
					clerkId: id,
				},
			});

			console.log(`User deleted: ${id}`);
			return new Response('User deleted successfully', { status: 200 });
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error: Could not delete user:', error);
				return new Response(error.message, {
					status: 500,
				});
			}
		}
	}

	return new Response('Webhook received', { status: 200 });
}
