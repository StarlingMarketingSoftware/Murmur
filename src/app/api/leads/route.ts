import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
	apiBadRequest,
	apiCreated,
	apiForbidden,
	apiResponse,
	apiUnauthorized,
	getIsAdmin,
	handleApiError,
} from '@/app/api/_utils';
import { getValidatedParamsFromUrl } from '@/utils';

const postLeadSchema = z.object({
	email: z.string().email().max(254),
});
const getLeadFilterSchema = z.object({
	email: z.string().email().optional(),
});

export type PostLeadData = z.infer<typeof postLeadSchema>;
export type LeadFilterData = z.infer<typeof getLeadFilterSchema>;

export async function GET(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		// Leads are marketing email captures with no per-user owner — admin-only.
		if (!(await getIsAdmin(userId))) {
			return apiForbidden();
		}

		const validatedFilters = getValidatedParamsFromUrl(req.url, getLeadFilterSchema);

		if (!validatedFilters.success) {
			return apiBadRequest(validatedFilters.error);
		}

		const { email } = validatedFilters.data;

		const leads = await prisma.lead.findMany({
			where: {
				email,
			},
			orderBy: {
				updatedAt: 'desc' as const,
			},
		});

		return apiResponse(leads);
	} catch (error) {
		return handleApiError(error);
	}
}

export async function POST(req: NextRequest) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}

		const body = await req.json();
		const validatedData = postLeadSchema.safeParse(body);
		if (!validatedData.success) {
			return apiBadRequest(validatedData.error);
		}

		const lead = await prisma.lead.create({
			data: validatedData.data,
		});

		return apiCreated(lead);
	} catch (error) {
		return handleApiError(error);
	}
}
