import { User, Contact } from '@prisma/client';
import prisma from '../src/lib/prisma';
import { read as readXLSX, utils as xlsxUtils } from 'xlsx';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getEmbeddingForContact } from './seed-data/contactEmbeddingsHelper';
import { initializeVectorDb, upsertContactToVectorDb } from '@/app/api/_utils/vectorDb';

export type ContactCSVFormat = {
	name: string;
	company: string;
	email: string;
	address: string;
	country: string;
	state: string;
	website: string;
	phone: string;
	title: string;
};

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

const generateCategoryName = (categoryName: string, secondaryIdentifier: string) => {
	return `${categoryName} ${secondaryIdentifier}`;
};

const importCSVWithSubcategories = async (
	relativeFilePath: string,
	categoryName: string
) => {
	const filePath = path.join(process.cwd(), 'public', relativeFilePath);

	const workbook = readXLSX(filePath);
	const sheetName = workbook.SheetNames[0];
	const worksheet = workbook.Sheets[sheetName];
	const records: ContactCSVFormat[] = xlsxUtils.sheet_to_json(worksheet);

	// create all categories first

	const categoryToCount: Record<string, number> = {};

	for (const record of records) {
		const finalCategoryName = generateCategoryName(categoryName, record.state);
		if (!categoryToCount[finalCategoryName]) {
			categoryToCount[finalCategoryName] = 0;
		}
		categoryToCount[finalCategoryName] += 1;
	}

	for (const record of records) {
		// const recordCategoryName = generateCategoryName(categoryName, record.state);
		const nameParts = record.name ? record.name.split(' ') : ['', ''];
		const firstName = nameParts[0] || '';
		const lastName = nameParts.slice(1).join(' ') || '';

		await prisma.contact.create({
			data: {
				firstName: firstName,
				lastName: lastName,
				email: record.email,
				company: record.company,
				website: record.website,
				state: record.state,
				country: record.country,
				phone: record.phone,
				emailValidationStatus: 'valid',
				hasVectorEmbedding: true,
				title: record.title,
				companyTechStack: [],
				companyKeywords: [],
			},
		});
	}
};

const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>[] = [
	{
		clerkId: 'user_2yfwTts2NJrPFiydjSimNx9HW4r',
		email: 'mcrawford5376@gmail.com',
		murmurEmail: 'michaelshingocrawford@1.murmurmailbox.com',
		replyToEmail: null,
		firstName: 'Michael Shingo',
		lastName: 'Crawford',
		role: 'admin',
		aiDraftCredits: 1000,
		aiTestCredits: 100,
		stripePromoCode: null,
		customDomain: '',
		stripeCustomerId: 'cus_SWKynJjTpn1Taw',
		stripeSubscriptionId: 'sub_1RbINU02Nskp21xSVq5hb7x6',
		stripePriceId: 'price_1RB9Uw02Nskp21xSrRxsLDT3',
		stripeSubscriptionStatus: 'active',
		draftCredits: 1000,
		sendingCredits: 1000,
		verificationCredits: 1000,
		lastCreditUpdate: new Date(),
	},
	{
		clerkId: 'user_2yfwfFMcWIho4NSUT25o8V1LYHu',
		email: 'michaelshingotokyo@gmail.com',
		murmurEmail: 'michaelshingocrawford@2.murmurmailbox.com',
		replyToEmail: null,
		firstName: 'Michael Shingo',
		lastName: 'Crawford',
		role: 'user',
		aiDraftCredits: 1000,
		aiTestCredits: 100,
		stripePromoCode: null,
		customDomain: '',

		stripeCustomerId: 'cus_SPE3wRaFWOtqDF',
		stripeSubscriptionId: 'sub_1RUPe302Nskp21xSWvvOiPGs',
		stripePriceId: 'price_1RB9Uw02Nskp21xSrRxsLDT3',
		stripeSubscriptionStatus: 'active',
		draftCredits: 1000,
		sendingCredits: 1000,
		verificationCredits: 1000,
		lastCreditUpdate: new Date(),
	},
	{
		clerkId: 'user_2yfwk3fV2eGnsat4Ph7GdSfpaQ5',
		email: 'shingoalert@gmail.com',
		murmurEmail: 'michaelshingo@3.murmurmailbox.com',
		replyToEmail: null,
		firstName: 'Michael',
		lastName: 'Shingo',
		role: 'user',
		customDomain: '',
		aiDraftCredits: 1000,
		aiTestCredits: 100,
		stripePromoCode: null,
		stripeCustomerId: 'cus_SWL0AB6nMvD5qb',
		stripeSubscriptionId: null,
		stripePriceId: null,
		stripeSubscriptionStatus: null,
		draftCredits: 1000,
		sendingCredits: 1000,
		verificationCredits: 1000,
		lastCreditUpdate: new Date(),
	},
];

const seedElasticsearchEmbeddings = async (contacts: Contact[]) => {
	// First, ensure the index exists
	await initializeVectorDb();

	// Insert embeddings for each contact
	for (const contact of contacts) {
		const embeddingData = getEmbeddingForContact(contact);

		if (!embeddingData) {
			console.warn(`No embedding found for contact ${contact.id}`);
			continue;
		}

		await upsertContactToVectorDb(contact, embeddingData.embedding);
	}
};

async function main() {
	/* Seed users */
	for (const user of userData) {
		await prisma.user.upsert({
			where: { clerkId: user.clerkId },
			update: user,
			create: user,
		});
	}

	/* Seed contacts */
	await importCSVWithSubcategories(
		'contactLists/2025-07-31ProductionContacts.xlsx',
		'Production Contacts'
	);

	/* Seed embeddings */
	const allContacts = await prisma.contact.findMany();
	await seedElasticsearchEmbeddings(allContacts);
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
