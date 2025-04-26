import { ContactCSVFormat } from '@/constants/types';
import prisma from '../src/lib/prisma';
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'fs';
import * as path from 'path';

export async function getPublicFiles(directory: string = 'demoCsvs'): Promise<string[]> {
	try {
		const publicPath = path.join(process.cwd(), 'public', directory);
		const files = await fs.readdir(publicPath);
		return files;
	} catch (error) {
		console.error('Error reading public directory:', error);
		return [];
	}
}

// const readHardCodedContactLists = async () => {
// 	for (const contact of contactList) {
// 		await prisma.contact.upsert({
// 			where: {
// 				email_category: {
// 					email: contact.email,
// 					category: contact.category,
// 				},
// 			},
// 			update: {
// 				name: contact.name,
// 				category: contact.category,
// 				company: contact.company,
// 			},
// 			create: {
// 				name: contact.name,
// 				email: contact.email,
// 				category: contact.category,
// 				company: contact.company,
// 			},
// 		});
// 	}

// 	const categoryCounts = await prisma.contact.groupBy({
// 		by: ['category'],
// 		_count: {
// 			category: true,
// 		},
// 	});

// 	for (const category of categoryCounts) {
// 		await prisma.contactList.upsert({
// 			where: {
// 				category: category.category,
// 			},
// 			update: {
// 				count: category._count.category,
// 			},
// 			create: {
// 				category: category.category,
// 				count: category._count.category,
// 			},
// 		});
// 	}
// };

// async function processCSVFiles() {
// 	const csvPath = path.join(process.cwd(), 'public', 'demoCsvs');
// 	const fileNames = await getPublicFiles();

// 	for (const fileName of fileNames) {
// 		try {
// 			// Read and parse CSV file
// 			const filePath = path.join(csvPath, fileName);
// 			const fileContent = await fs.readFile(filePath, 'utf-8');
// 			const categoryName = fileName.substring(0, fileName.indexOf('.csv'));
// 			console.log('🚀 ~ processCSVFiles ~ categoryName:', categoryName);
// 			const records: ContactCSVFormat[] = parse(fileContent, {
// 				columns: true,
// 				skip_empty_lines: true,
// 			});

// 			// Create or update ContactList
// 			const newContactList = await prisma.contactList.upsert({
// 				where: { name: categoryName.toLowerCase() },
// 				create: {
// 					name: categoryName,
// 					count: records.length,
// 				},
// 				update: {
// 					name: categoryName,
// 					count: records.length,
// 				},
// 			});

// 			// Process each record
// 			for (const record of records) {
// 				await prisma.contact.upsert({
// 					where: {
// 						email_contactListId: {
// 							email: record['email'],
// 							contactListId: newContactList.id,
// 						},
// 					},
// 					create: {
// 						name: record.name,
// 						email: record.email,
// 						company: record.company,
// 						website: record.website,
// 						state: record.state,
// 						country: record.country,
// 						phone: record.phone,
// 						contactListId: newContactList.id,
// 					},
// 					update: {
// 						name: record.name,
// 						website: record.website,
// 						state: record.state,
// 						phone: record.phone,
// 					},
// 				});
// 			}

// 			console.log(`Processed ${records.length} contacts from ${fileName}`);
// 		} catch (error) {
// 			console.error(`Error processing ${fileName}:`, error);
// 		}
// 	}
// }

const generateCategoryName = (categoryName: string, secondaryIdentifier: string) => {
	return `${categoryName} ${secondaryIdentifier}`;
};

const importCSVWithSubcategories = async (
	relativeFilePath: string,
	categoryName: string
) => {
	const csvPath = path.join(process.cwd(), 'public', relativeFilePath);

	const filePath = path.join(csvPath);
	const fileContent = await fs.readFile(filePath, 'utf-8');

	const records: ContactCSVFormat[] = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
	});

	// create all categories first

	const categoryToCount: Record<string, number> = {};

	for (const record of records) {
		const finalCategoryName = generateCategoryName(categoryName, record.state);
		if (!categoryToCount[finalCategoryName]) {
			categoryToCount[finalCategoryName] = 0;
		}
		categoryToCount[finalCategoryName] += 1;
	}

	for (const categoryName of Object.keys(categoryToCount)) {
		await prisma.contactList.upsert({
			where: { name: categoryName.toLowerCase() },
			create: {
				name: categoryName,
				count: categoryToCount[categoryName],
			},
			update: {
				name: categoryName,
				count: categoryToCount[categoryName],
			},
		});
	}

	const allContactLists = await prisma.contactList.findMany({});

	for (const record of records) {
		const recordCategoryName = generateCategoryName(categoryName, record.state);
		const recordContactListId = allContactLists.find(
			(contactList) => contactList.name === recordCategoryName
		)?.id;

		if (!recordContactListId) {
			console.error(`Contact list not found for category: ${recordCategoryName}`);
			continue;
		}

		await prisma.contact.upsert({
			where: {
				email_contactListId: {
					email: record['email'],
					contactListId: recordContactListId,
				},
			},
			create: {
				name: record.name,
				email: record.email,
				company: record.company,
				website: record.website,
				state: record.state,
				country: record.country,
				phone: record.phone,
				contactListId: recordContactListId,
			},
			update: {
				name: record.name,
				company: record.company,
				website: record.website,
				state: record.state,
				country: record.country,
				phone: record.phone,
			},
		});
	}
};
async function main() {
	// importCSVWithSubcategories('demoCsvs/musicVenuesDemoReduced.csv', 'Music Venues');
	importCSVWithSubcategories('demoCsvs/testListWithRealEmails.csv', 'Test List');

	return;
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
