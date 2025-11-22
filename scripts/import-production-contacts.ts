import { read as readXLSX, utils as xlsxUtils } from 'xlsx';
import * as path from 'path';
import { promises as fs } from 'fs';
import prisma from '../src/lib/prisma';
import { EmailVerificationStatus } from '@prisma/client';

export type ProductionContactRow = {
	firstName?: string;
	lastName?: string;
	email?: string;
	company?: string;
	title?: string;
	city?: string;
	state?: string;
	country?: string;
	address?: string;
	phone?: string;
	website?: string;
	headline?: string;
	linkedInUrl?: string;
	photoUrl?: string;
	metadata?: string;
	companyLinkedInUrl?: string;
	companyFoundedYear?: string;
	companyType?: string;
	companyIndustry?: string;
	companyPostalCode?: string;

	// Allow for any additional Excel columns that might exist
	[key: string]: string | undefined;
};

async function importProductionContacts() {
	const filePath = path.join(
		process.cwd(),
		'public',
		'contactLists',
		'2025-11-21Contacts.xlsx'
	);

	console.log('Reading production contacts from:', filePath);

	try {
		// Read the Excel file
		const fileBuffer = await fs.readFile(filePath);
		const workbook = readXLSX(fileBuffer);
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];
		const data = xlsxUtils.sheet_to_json(worksheet) as ProductionContactRow[];

		console.log(`Found ${data.length} contacts in the Excel file`);

		// Process contacts in batches to avoid overwhelming the database
		const batchSize = 100;
		let created = 0;
		let updated = 0;
		let skipped = 0;

		for (let i = 0; i < data.length; i += batchSize) {
			const batch = data.slice(i, i + batchSize);

			for (const row of batch) {
				const contactData = {
					firstName: row.firstName || row['First Name'] || null,
					lastName: row.lastName || row['Last Name'] || null,
					email: row.email || row.Email || '',
					company: row.company || row.Company || null,
					title: row.title || row.Title || null,
					city: row.city || row.City || null,
					state: row.state || row.State || null,
					country: row.country || row.Country || null,
					address: row.address || row.Address || null,
					phone: row.phone || row.Phone || null,
					website: row.website || row.Website || null,
					headline: row.headline || row.Headline || null,
					linkedInUrl: row.linkedInUrl || row.LinkedIn || null,
					photoUrl: row.photoUrl || null,
					metadata: row.metadata || null,
					companyLinkedInUrl: row.companyLinkedInUrl || null,
					companyFoundedYear: row.companyFoundedYear || null,
					companyType: row.companyType || null,
					companyIndustry: row.companyIndustry || null,
					companyPostalCode: row.companyPostalCode || null,
					emailValidationStatus: EmailVerificationStatus.valid,
					hasVectorEmbedding: true,
				};

				// Skip if no email
				if (!contactData.email) {
					console.log('Skipping contact without email');
					skipped++;
					continue;
				}

				try {
					// Check if contact exists by email (with no contactListId, which means null)
					const existingContact = await prisma.contact.findFirst({
						where: {
							email: contactData.email,
							contactListId: null,
						},
					});

					if (existingContact) {
						// Update existing contact
						await prisma.contact.update({
							where: { id: existingContact.id },
							data: {
								...contactData,
								updatedAt: new Date(),
							},
						});
						updated++;
					} else {
						// Create new contact
						await prisma.contact.create({
							data: {
								...contactData,
								createdAt: new Date(),
								updatedAt: new Date(),
							},
						});
						created++;
					}
				} catch (error) {
					console.error(`Error importing contact ${contactData.email}:`, error);
					skipped++;
				}
			}

			console.log(
				`Processed ${Math.min(i + batchSize, data.length)} / ${data.length} contacts...`
			);
		}

		console.log(`\nImport completed!`);
		console.log(`Created: ${created}`);
		console.log(`Updated: ${updated}`);
		console.log(`Skipped: ${skipped}`);
	} catch (error) {
		console.error('Error importing production contacts:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

// Run the import
importProductionContacts().catch(console.error);
