import prisma from '../src/lib/prisma';
import { extraContacts } from './seedData/extraContacts';
import { lawyerContacts } from './seedData/lawyerContacts';
import { musicContacts } from './seedData/musicContacts';

const contactList = [...lawyerContacts, ...musicContacts, ...extraContacts];

async function main() {
	for (const contact of contactList) {
		await prisma.contact.upsert({
			where: {
				email_category: {
					email: contact.email,
					category: contact.category,
				},
			},
			update: {
				name: contact.name,
				category: contact.category,
				company: contact.company,
			},
			create: {
				name: contact.name,
				email: contact.email,
				category: contact.category,
				company: contact.company,
			},
		});
	}

	const categoryCounts = await prisma.contact.groupBy({
		by: ['category'],
		_count: {
			category: true,
		},
	});

	for (const category of categoryCounts) {
		await prisma.contactList.upsert({
			where: {
				category: category.category,
			},
			update: {
				count: category._count.category,
			},
			create: {
				category: category.category,
				count: category._count.category,
			},
		});
	}
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
