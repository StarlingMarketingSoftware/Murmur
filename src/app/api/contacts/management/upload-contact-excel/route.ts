import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { EmailVerificationStatus, UserRole } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

interface ExcelContactRow {
	firstname?: string;
	lastname?: string;
	company?: string;
	email: string;
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	website?: string;
	phone?: string;
	title?: string;
	headline?: string;
	linkedInUrl?: string;
	photoUrl?: string;
	metadata?: string;
	companylinkedinurl?: string;
	companyfounded?: string;
	companytype?: string;
	companytechstack?: string;
	companypostalcode?: string;
	companykeywords?: string;
	companyindustry?: string;
	emailvalidationstatus?: string;
}

export const GET = async function GET() {
	try {
		// const { userId } = await auth();
		// if (!userId) {
		// 	return apiUnauthorized();
		// }

		// const user = await prisma.user.findUnique({
		// 	where: { clerkId: userId },
		// });

		// if (user?.role !== UserRole.admin) {
		// 	return apiUnauthorized();
		// }

		// Path to the Excel file
		const excelPath = path.join(
			process.cwd(),
			'public',
			'contactLists',
			'V1 Database pt. 4_valid.xlsx'
		);
		const fileBuffer = fs.readFileSync(excelPath);

		// Parse the Excel file
		const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const rows = XLSX.utils.sheet_to_json(sheet) as ExcelContactRow[];
		console.log(`Parsed Excel file with ${rows.length} rows`);

		const emails = rows.map((row) => row.email);

		// Find existing emails in one query
		const existingContacts = await prisma.contact.findMany({
			where: { email: { in: emails } },
			select: { email: true },
		});

		console.log(`Found ${existingContacts.length} existing contacts`);
		const existingEmails = new Set(existingContacts.map((c) => c.email));

		const unknownEmailValidationStatus: string[] = [];
		const errorEmails: string[] = [];
		const newContacts = [];
		const validStatuses = Object.values(EmailVerificationStatus);

		for (const row of rows) {
			try {
				if (existingEmails.has(row.email)) continue;

				// Parse comma-separated fields into arrays
				const companyTechStack =
					typeof row.companytechstack === 'string'
						? row.companytechstack
								.split(',')
								.map((s: string) => s.trim())
								.filter(Boolean)
						: [];
				const companyKeywords =
					typeof row.companykeywords === 'string'
						? row.companykeywords
								.split(',')
								.map((s: string) => s.trim())
								.filter(Boolean)
						: [];

				// Parse emailValidationStatus, default to 'unknown' if not valid
				const emailValidationStatus = validStatuses.includes(
					row.emailvalidationstatus as EmailVerificationStatus
				)
					? (row.emailvalidationstatus as EmailVerificationStatus)
					: 'unknown';
				if (emailValidationStatus !== 'valid') {
					console.warn('Email validation status is not valid', row.email);
				}
				if (emailValidationStatus === 'unknown') {
					console.error('Email validation status is unknown', row.email);
					unknownEmailValidationStatus.push(row.email);
				}

				newContacts.push({
					firstName: row.firstname ? String(row.firstname) : null,
					lastName: row.lastname ? String(row.lastname) : null,
					company: row.company ? String(row.company) : null,
					email: String(row.email),
					address: row.address ? String(row.address) : null,
					city: row.city ? String(row.city) : null,
					state: row.state ? String(row.state) : null,
					country: row.country ? String(row.country) : null,
					website: row.website ? String(row.website) : null,
					phone: row.phone ? String(row.phone) : null,
					title: row.title ? String(row.title) : null,
					headline: row.headline ? String(row.headline) : null,
					linkedInUrl: row.linkedInUrl ? String(row.linkedInUrl) : null,
					photoUrl: row.photoUrl ? String(row.photoUrl) : null,
					metadata: row.metadata ? String(row.metadata) : null,
					companyLinkedInUrl: row.companylinkedinurl
						? String(row.companylinkedinurl)
						: null,
					companyFoundedYear: row.companyfounded ? String(row.companyfounded) : null,
					companyType: row.companytype ? String(row.companytype) : null,
					companyTechStack,
					companyPostalCode: row.companypostalcode ? String(row.companypostalcode) : null,
					companyKeywords,
					companyIndustry: row.companyindustry ? String(row.companyindustry) : null,
					emailValidationStatus,
					emailValidatedAt: new Date(),
				});
			} catch (error) {
				console.error('Error processing row', row.email, error);
				errorEmails.push(row.email);
				continue;
			}
		}

		let createdCount = 0;
		if (newContacts.length > 0) {
			console.log(`Creating ${newContacts.length} new contacts`);
			const result = await prisma.contact.createMany({
				data: newContacts,
				skipDuplicates: true, // extra safety
			});
			createdCount = result.count;
		}

		return apiResponse({
			created: createdCount,
			existingContactsEmails: Array.from(existingEmails),
			unknownEmailValidationStatus,
			errorEmails,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
