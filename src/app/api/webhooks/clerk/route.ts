import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export async function POST(req: Request) {
  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);
  
  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get('svix-id') || '';
  const svix_timestamp = headersList.get('svix-timestamp') || '';
  const svix_signature = headersList.get('svix-signature') || '';

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error: Missing svix headers', { status: 400 });
  }

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error verifying webhook', { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get the primary email
    const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);

    if (!primaryEmail) {
      return new NextResponse('Error: No primary email found', { status: 400 });
    }

    try {
      // Create a new user in the database
      await prisma.user.create({
        data: {
          clerkId: id,
          email: primaryEmail.email_address,
          name: first_name && last_name ? `${first_name} ${last_name}` : undefined,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error creating user in database:', error);
      return new NextResponse('Error creating user in database', { status: 500 });
    }
  }

  // Return a 200 response for other event types
  return NextResponse.json({ success: true });
} 