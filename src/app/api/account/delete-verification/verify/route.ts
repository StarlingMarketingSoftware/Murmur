import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	getUser,
	handleApiError,
} from '@/app/api/_utils';
import { withRateLimit } from '@/app/api/_utils/rateLimit';

const postVerifyDeletionCodeSchema = z.object({
	code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
});
export type PostVerifyDeletionCodeData = z.infer<typeof postVerifyDeletionCodeSchema>;
export type PostVerifyDeletionCodeResponse = { verified: true };

export async function POST(request: Request) {
	try {
		// Guess throttle in lieu of an attempts column: 10 tries/min against a
		// 10-minute code is an adequate ceiling without any schema churn.
		const limited = await withRateLimit(
			request,
			'mutation',
			'account-delete-verification-verify',
			{ user: [{ tokens: 10, window: '60 s' }] }
		);
		if (limited) return limited;

		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const data = await request.json();
		const validated = postVerifyDeletionCodeSchema.safeParse(data);
		if (!validated.success) {
			return apiBadRequest(validated.error);
		}

		const user = await getUser();
		if (!user?.email) {
			return apiNotFound('User record not found');
		}
		const email = user.email.toLowerCase();

		const record = await prisma.emailVerificationCode.findUnique({
			where: { email_code: { email, code: validated.data.code } },
		});
		if (!record || record.verified) {
			return apiBadRequest('Invalid verification code');
		}
		if (record.expiresAt < new Date()) {
			await prisma.emailVerificationCode.delete({ where: { id: record.id } });
			return apiBadRequest('Verification code has expired');
		}

		// Keep THIS row as server-side proof for the upcoming deletion endpoint
		// (which must re-check verified === true && expiresAt > now). Remove siblings.
		await prisma.emailVerificationCode.update({
			where: { id: record.id },
			data: { verified: true },
		});
		await prisma.emailVerificationCode.deleteMany({
			where: { email, id: { not: record.id } },
		});

		// TODO(unsubscribe): the actual cancellation/deletion endpoint comes after
		// this pass; it must re-check the verified, unexpired row before acting.

		return apiResponse<PostVerifyDeletionCodeResponse>({ verified: true });
	} catch (error) {
		return handleApiError(error);
	}
}
