'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/app/api/_utils/unsubscribe';

export async function unsubscribeAction(formData: FormData): Promise<void> {
	const token = formData.get('token');
	if (typeof token !== 'string') redirect('/unsubscribe');

	const payload = verifyUnsubscribeToken(token);
	if (!payload) redirect('/unsubscribe');

	await prisma.emailSuppression.upsert({
		where: { email_userId: { email: payload.email, userId: payload.userId } },
		create: { email: payload.email, userId: payload.userId, reason: 'page' },
		update: {},
	});

	redirect(`/unsubscribe?token=${encodeURIComponent(token)}&done=1`);
}
