import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import crypto from 'crypto';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import prisma from '@/lib/prisma';

const postEmailVerificationCodeSchema = z.object({
	email: z.string().email(),
});

const patchEmailVerificationCodeSchema = z.object({
	email: z.string().email(),
	code: z.string().length(6),
});

export type PostEmailVerificationCodeData = z.infer<
	typeof postEmailVerificationCodeSchema
>;
export type PatchEmailVerificationCodeData = z.infer<
	typeof patchEmailVerificationCodeSchema
>;

// Generate and send verification code
export async function POST(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = postEmailVerificationCodeSchema.safeParse(data);
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
		const mailgun = new Mailgun(FormData);
		const mg = mailgun.client({
			username: 'api',
			key: process.env.MAILGUN_API_KEY || '',
		});
		const emailSubject = 'Your Murmur Verification Code';
		const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Murmur</title>
</head>
<body style="margin: 0; padding: 0; font-family: Times New Roman, sans-serif; background-color: #f4f4f4;">
    <!-- Preheader text -->
    <div style="display: none; max-height: 0; overflow: hidden;">
        Your Murmur email verification code: ${verificationCode}
    </div>
    
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <div style="margin-bottom: 30px;">
                                <h1 style="color: #333; font-size: 28px; margin: 0; font-weight: bold;">MURMUR</h1>
                            </div>
                            
                            <h2 style="color: #333; font-size: 24px; margin: 0 0 20px 0;">Email Verification</h2>
                            
                            <p style="color: #666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                                Thank you for registering your email! Please use the verification code below to confirm your email address.
                            </p>
                            
                            <div style="background-color: #f8f9fa; padding: 25px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #dee2e6;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #333; font-family: monospace;">${verificationCode}</span>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; margin: 20px 0;">
                                This code will expire in 10 minutes for security purposes.
                            </p>
                            
                            <p style="color: #999; font-size: 12px; margin: 30px 0 0 0;">
                                If you didn't request this verification, please ignore this email or contact our support team.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #dee2e6; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} Murmur. All rights reserved.<br>
                                This is an automated email, please do not reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

		const emailText = `
MURMUR - Email Verification

Thank you for signing up! Please use the verification code below to confirm your email address.

Your verification code: ${verificationCode}

This code will expire in 10 minutes for security purposes.

If you didn't request this verification, please ignore this email.

© ${new Date().getFullYear()} Murmur. All rights reserved.
`;

		await mg.messages.create('murmurmailbox.com', {
			from: 'Murmur Verification <postmaster@murmurmailbox.com>',
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
	}
}

// Verify the submitted code
export async function PATCH(request: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validatedData = patchEmailVerificationCodeSchema.safeParse(data);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const { email, code } = validatedData.data;

		const verificationRecord = await prisma.emailVerificationCode.findFirst({
			where: {
				email,
				code,
				verified: false,
			},
		});
		if (!verificationRecord) {
			return apiBadRequest('Invalid verification code');
		}

		if (verificationRecord.expiresAt < new Date()) {
			await prisma.emailVerificationCode.delete({
				where: { id: verificationRecord.id },
			});

			return apiNotFound('Verification code has expired');
		}

		const verificationCode = await prisma.emailVerificationCode.deleteMany({
			where: { email },
		});

		return apiResponse(verificationCode.count);
	} catch (error) {
		return handleApiError(error);
	}
}
