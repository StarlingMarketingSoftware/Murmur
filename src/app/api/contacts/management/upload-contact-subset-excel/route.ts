import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import { EmailVerificationStatus, UserRole } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

interface ExcelContactRow {
	email: string;
	company?: string;
	country?: string;
	createdAt?: string;
	phone?: string;
	state?: string;
	updatedAt?: string;
	website?: string;
	id?: string;
	contactListId?: string;
	address?: string;
	apolloPersonId?: string;
	city?: string;
	emailValidatedAt?: string;
	emailValidationStatus?: string;
	emailValidationSubStatus?: string;
	firstName?: string;
	headline?: string;
	lastName?: string;
	linkedInUrl?: string;
	photoUrl?: string;
	title?: string;
	metadata?: string;
	userId?: string;
	isPrivate?: string;
	hasVectorEmbedding?: string;
	userContactListCount?: string;
	manualDeselections?: string;
	companyFoundedYear?: string;
	companyIndustry?: string;
	companyKeywords?: string;
	companyLinkedInUrl?: string;
	companyPostalCode?: string;
	companyTechStack?: string;
	companyType?: string;
	lastResearchedDate?: string;
	latitude?: string;
	longitude?: string;
}

export const POST = async function POST(request: Request) {
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

		// Parse request body for configuration
		const body = await request.json();
		const maxContactsPerState = body.maxContactsPerState || 100000;
		const excelFileName = body.excelFileName || '2025-07-31ProductionContacts.xlsx';

		console.log(`Processing with max ${maxContactsPerState} contacts per state`);

		// Path to the Excel file
		const excelPath = path.join(process.cwd(), 'public', 'contactLists', excelFileName);
		const fileBuffer = fs.readFileSync(excelPath);

		// Parse the Excel file
		const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const rows = XLSX.utils.sheet_to_json(sheet) as ExcelContactRow[];
		console.log(`Parsed Excel file with ${rows.length} rows`);

		// Filter and limit contacts by state
		const stateCounts: Record<string, number> = {};
		const filteredRows: ExcelContactRow[] = [];

		for (const row of rows) {
			const state = row.state?.trim() || 'Unknown';

			if (!stateCounts[state]) {
				stateCounts[state] = 0;
			}

			if (stateCounts[state] < maxContactsPerState) {
				filteredRows.push(row);
				stateCounts[state]++;
			}
		}

		console.log(
			`Filtered to ${filteredRows.length} contacts (max ${maxContactsPerState} per state)`
		);
		console.log('State distribution:', stateCounts);

		const emails = filteredRows.map((row) => row.email);

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

		for (const row of filteredRows) {
			try {
				if (existingEmails.has(row.email)) continue;

				// Parse comma-separated fields into arrays
				const companyTechStack =
					typeof row.companyTechStack === 'string'
						? row.companyTechStack
								.split(',')
								.map((s: string) => s.trim())
								.filter(Boolean)
						: [];
				const companyKeywords =
					typeof row.companyKeywords === 'string'
						? row.companyKeywords
								.split(',')
								.map((s: string) => s.trim())
								.filter(Boolean)
						: [];

				// Parse emailValidationStatus, default to 'unknown' if not valid
				const emailValidationStatus = validStatuses.includes(
					row.emailValidationStatus as EmailVerificationStatus
				)
					? (row.emailValidationStatus as EmailVerificationStatus)
					: 'unknown';

				if (emailValidationStatus === 'unknown') {
					console.error('Email validation status is unknown', row.email);
					unknownEmailValidationStatus.push(row.email);
				}

				// Parse boolean fields
				const isPrivate = row.isPrivate === 'true' || row.isPrivate === '1';
				const hasVectorEmbedding =
					row.hasVectorEmbedding === 'true' || row.hasVectorEmbedding === '1';

				// Parse numeric fields
				const latitude = row.latitude ? parseFloat(row.latitude) : null;
				const longitude = row.longitude ? parseFloat(row.longitude) : null;
				const userContactListCount = row.userContactListCount
					? parseInt(row.userContactListCount)
					: 0;

				// Parse date fields
				const emailValidatedAt = row.emailValidatedAt
					? new Date(row.emailValidatedAt)
					: new Date();
				const lastResearchedDate = row.lastResearchedDate
					? new Date(row.lastResearchedDate)
					: null;

				newContacts.push({
					firstName: row.firstName ? String(row.firstName) : null,
					lastName: row.lastName ? String(row.lastName) : null,
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
					companyLinkedInUrl: row.companyLinkedInUrl
						? String(row.companyLinkedInUrl)
						: null,
					companyFoundedYear: row.companyFoundedYear
						? String(row.companyFoundedYear)
						: null,
					companyType: row.companyType ? String(row.companyType) : null,
					companyTechStack,
					companyPostalCode: row.companyPostalCode ? String(row.companyPostalCode) : null,
					companyKeywords,
					companyIndustry: row.companyIndustry ? String(row.companyIndustry) : null,
					emailValidationStatus,
					emailValidatedAt,
					isPrivate,
					hasVectorEmbedding,
					userContactListCount,
					manualDeselections: row.manualDeselections
						? Number(row.manualDeselections)
						: undefined,
					latitude,
					longitude,
					lastResearchedDate,
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
			stateDistribution: stateCounts,
			totalProcessed: filteredRows.length,
			maxContactsPerState,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
