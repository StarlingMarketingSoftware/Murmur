import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiResponse, apiServerError, handleApiError } from '@/app/api/_utils';
import crypto from 'crypto';

/**
 * Mailgun Inbound Email Webhook Handler
 * Receives emails forwarded by Mailgun and stores them in the database
 */
export async function POST(req: NextRequest) {
	try {
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
		let headers: Record<string, unknown> | null = null;
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
		let attachments: Record<string, unknown> | null = null;
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

		// Optional: Verify Mailgun signature (recommended for production)
		if (
			process.env.MAILGUN_WEBHOOK_SIGNING_KEY &&
			mailgunTimestamp &&
			mailgunToken &&
			mailgunSignature
		) {
			const isValid = verifyMailgunSignature(
				process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
				mailgunTimestamp,
				mailgunToken,
				mailgunSignature
			);

			if (!isValid) {
				console.error('Invalid Mailgun signature');
				return apiServerError('Invalid webhook signature');
			}
		}

		// Try to find associated user by recipient email (murmurEmail field)
		const recipientEmail = recipient.toLowerCase().split(',')[0].trim();
		const user = await prisma.user.findFirst({
			where: {
				murmurEmail: recipientEmail,
			},
		});

		// Try to find associated contact by sender email
		const senderEmail = extractEmailFromField(sender);
		let contact = null;
		if (senderEmail && user) {
			contact = await prisma.contact.findFirst({
				where: {
					email: senderEmail.toLowerCase(),
					userId: user.clerkId,
				},
			});
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
				recipient: recipientEmail,
				subject,
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
				contactId: contact?.id || null,
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
