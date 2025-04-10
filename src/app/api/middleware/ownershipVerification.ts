import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

type Resource = 'campaign' | 'contact' | 'email'; // add other resource types as needed

export async function verifyResourceOwnership<T>(
	resourceType: Resource,
	resourceId: number | string,
	include?: Record<string, boolean>
): Promise<T | null> {
	const { userId } = await auth();
	if (!userId) return null;

	const resourceId_parsed =
		typeof resourceId === 'string' ? parseInt(resourceId) : resourceId;

	// @ts-expect-error - prisma client provides dynamic access to models
	const resource = await prisma[resourceType].findUnique({
		where: {
			id: resourceId_parsed,
			userId: userId,
		},
		include,
	});

	return resource as T;
}

export function withResourceAuth(
	handler: (resource: any, ...args: any[]) => Promise<Response>,
	resourceType: string
) {
	return async (req: Request, context: { params: any }) => {
		const resourceId = context.params[`${resourceType}Id`];
		const resource = await verifyResourceOwnership(resourceType as Resource, resourceId);

		if (!resource) {
			return new NextResponse('Not authorized or resource not found', { status: 404 });
		}

		return handler(resource, req, context);
	};
}
