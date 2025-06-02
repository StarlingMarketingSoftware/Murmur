import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import crypto from 'crypto';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import {
	apiBadRequest,
	apiResponse,
	apiUnauthorized,
	handleApiError,
	apiNotFound,
} from '@/app/api/_utils';
import prisma from '@/lib/prisma';

// Schema for sending verification code
const sendVerificationSchema = z.object({
	email: z.string().email(),
});

// Schema for verifying code
const verifyCodeSchema = z.object({
	email: z.string().email(),
	code: z.string().length(6),
});

export type SendVerificationData = z.infer<typeof sendVerificationSchema>;
export type VerifyCodeData = z.infer<typeof verifyCodeSchema>;

// Generate and send verification code
export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = sendVerificationSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { email } = validatedData.data;

		const verificationCode = crypto.randomInt(100000, 999999).toString();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

		await prisma.emailVerificationCode.deleteMany({
			where: { email },
		});

		await prisma.emailVerificationCode.create({
			data: {
				email,
				code: verificationCode,
				expiresAt,
			},
		});

		// Send email via Mailgun
		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});

		const emailSubject = 'Verify Your Email Address';
		const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${verificationCode}</span>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
      </div>
    `;

		const emailText = `
      Email Verification
      
      Your verification code is: ${verificationCode}
      
      This code will expire in 10 minutes.
      
      If you didn't request this verification, please ignore this email.
    `;

		await mg.messages.create('murmurmailbox.com', {
			from: 'Murmur Verification <postmaster@murmurpro.com>',
			to: [email],
			subject: emailSubject,
			html: emailHtml,
			text: emailText,
		});

		return apiResponse({
			success: true,
			message: 'Verification code sent successfully',
		});
	} catch (error) {
		return handleApiError(error);
	} finally {
		await prisma.$disconnect();
	}
}

// Verify the submitted code
export async function PUT(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = verifyCodeSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { email, code } = validatedData.data;

		// Find the verification code
		const verificationRecord = await prisma.emailVerificationCode.findFirst({
			where: {
				email,
				code,
				verified: false,
			},
		});
		console.log('🚀 ~ PUT ~ verificationRecord:', verificationRecord);

		if (!verificationRecord) {
			return apiBadRequest('Invalid verification code');
		}

		// Check if code has expired
		if (verificationRecord.expiresAt < new Date()) {
			// Delete expired code
			await prisma.emailVerificationCode.delete({
				where: { id: verificationRecord.id },
			});

			return apiBadRequest('Verification code has expired');
		}

		// Mark code as verified
		await prisma.emailVerificationCode.update({
			where: { id: verificationRecord.id },
			data: { verified: true },
		});

		// Clean up all verification codes for this email
		await prisma.emailVerificationCode.deleteMany({
			where: { email },
		});

		return apiResponse({
			verified: true,
			message: 'Email verified successfully',
		});
	} catch (error) {
		return handleApiError(error);
	} finally {
		await prisma.$disconnect();
	}
}
