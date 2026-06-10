import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiNotFound,
	apiResponse,
	apiUnauthorized,
	handleApiError,
} from '@/app/api/_utils';
import { ApiRouteParams } from '@/types';

const patchContactNoteSchema = z.object({
	content: z.string().max(20000),
});
export type PatchContactNoteData = z.infer<typeof patchContactNoteSchema>;

export type GetContactNoteData = {
	contactId: number;
	content: string;
	updatedAt: string | null;
};

export async function GET(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const contactId = Number(id);
		if (!Number.isInteger(contactId)) {
			return apiBadRequest('Invalid contact id');
		}

		const note = await prisma.contactNote.findUnique({
			where: { userId_contactId: { userId, contactId } },
		});

		return apiResponse<GetContactNoteData>({
			contactId,
			content: note?.content ?? '',
			updatedAt: note?.updatedAt.toISOString() ?? null,
		});
	} catch (error) {
		return handleApiError(error);
	}
}

export async function PATCH(req: NextRequest, { params }: { params: ApiRouteParams }) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const { id } = await params;
		const contactId = Number(id);
		if (!Number.isInteger(contactId)) {
			return apiBadRequest('Invalid contact id');
		}

		const body = await req.json();
		const validatedData = patchContactNoteSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		// ContactNote has no FK; cheap existence check keeps orphan rows out.
		const contact = await prisma.contact.findUnique({
			where: { id: contactId },
			select: { id: true },
		});
		if (!contact) {
			return apiNotFound();
		}

		const note = await prisma.contactNote.upsert({
			where: { userId_contactId: { userId, contactId } },
			create: { userId, contactId, content: validatedData.data.content },
			update: { content: validatedData.data.content },
		});

		return apiResponse<GetContactNoteData>({
			contactId,
			content: note.content,
			updatedAt: note.updatedAt.toISOString(),
		});
	} catch (error) {
		return handleApiError(error);
	}
}
