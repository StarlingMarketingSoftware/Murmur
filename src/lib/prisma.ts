import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prismaBase = globalForPrisma.prisma || new PrismaClient();

const prisma = prismaBase.$extends({
	result: {
		contact: {
			name: {
				needs: { firstName: true, lastName: true },
				compute(contact) {
					const firstName = contact.firstName || '';
					const lastName = contact.lastName || '';

					if (!firstName && !lastName) {
						return null;
					}

					return `${firstName} ${lastName}`.trim();
				},
			},
		},
		user: {
			name: {
				// Also add for User model if needed
				needs: { firstName: true, lastName: true },
				compute(user) {
					const firstName = user.firstName || '';
					const lastName = user.lastName || '';

					if (!firstName && !lastName) {
						return null;
					}

					return `${firstName} ${lastName}`.trim();
				},
			},
		},
	},
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaBase;

export default prisma;
