import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import Papa from 'papaparse';
import fs from 'fs/promises';
import path from 'path';
import { apiBadRequest, apiResponse, apiUnauthorized } from '@/app/api/_utils';
import { enrichApolloContacts, transformApolloContact } from '@/app/api/_utils';

import { ApolloPerson } from '@/types/apollo';
import { UserRole } from '@prisma/client';
import { ContactPartialWithRequiredEmail } from '@/types/contact';

const postApolloContactsTSVSchema = z.object({
	person_titles: z.array(z.string()).optional(),
	include_similar_titles: z.boolean().optional(),
	person_locations: z.array(z.string()).optional(),
	person_seniorities: z.array(z.string()).optional(),
	organization_locations: z.array(z.string()).optional(),
	contact_email_status: z.array(z.string()).optional(),
	organization_num_employees_ranges: z.array(z.array(z.number())).optional(),
	per_page: z.number().default(100),
	q_keywords: z.string().optional(),
});
export type PostApolloContactsTSVData = z.infer<typeof postApolloContactsTSVSchema>;

// Define the type for transformed contacts
type TransformedContact = ReturnType<typeof transformApolloContact>;

export async function POST(req: NextRequest): Promise<Response> {
	const apolloApiKey = process.env.APOLLO_API_KEY;
	if (!apolloApiKey) {
		console.error('Apollo API key not found');
		return apiBadRequest('Apollo API key not found');
	}

	const { userId } = await auth();
	if (!userId) {
		return apiUnauthorized();
	}

	const user = await prisma.user.findUnique({
		where: {
			clerkId: userId,
		},
	});

	if (user?.role !== UserRole.admin) {
		return apiUnauthorized();
	}

	const data = await req.json();
	const validatedData = postApolloContactsTSVSchema.safeParse(data);

	if (!validatedData.success) {
		return apiBadRequest(validatedData.error);
	}

	const fileName = `apolloContacts_${validatedData.data.person_titles?.join(
		'-'
	)}_in_${validatedData.data.person_locations?.join('_')}`;

	const completeContacts: TransformedContact[] = [];
	// const maxPage = 100000;
	let i = 1;

	while (i <= 1) {
		const requestBody = {
			...validatedData.data,
			page: i,
		};

		const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
			method: 'POST',
			headers: {
				accept: 'application/json',
				'Cache-Control': 'no-cache',
				'Content-Type': 'application/json',
				'x-api-key': apolloApiKey,
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			console.error('Apollo API error:', await response.text());
			return apiBadRequest('Apollo API error');
		}

		const data = await response.json();

		// filter out apollo ids that already exist
		const existingContacts = await prisma.contact.findMany({
			where: {
				apolloPersonId: {
					in: data.people?.map((person: ApolloPerson) => person.id) || [],
				},
			},
		});

		const filteredApolloContacts: ApolloPerson[] = (data.people || []).filter(
			(apolloPerson: ApolloPerson) =>
				!existingContacts.some((contact) => contact.apolloPersonId === apolloPerson.id)
		);

		const enrichedPeople = await enrichApolloContacts(filteredApolloContacts);
		const transformedContacts = enrichedPeople.map(transformApolloContact);

		completeContacts.push(...transformedContacts);

		await prisma.contact.createMany({
			data: transformedContacts,
		});

		await exportContactsToTSV(transformedContacts, fileName, i);

		console.log(
			`Apollo returned ${data.people?.length || 0} people out of ${
				data.pagination?.total_entries || 0
			} total stored in ${data.pagination?.total_pages} pages. Current page: ${i}`
		);
		// maxPage = data.pagination?.total_pages;
		i++;
	}

	await exportContactsToTSV(completeContacts, fileName, 0);
	return apiResponse({
		contacts: completeContacts,
		tsvUrl: `/exports/${fileName}.tsv`,
	});
}

const exportContactsToTSV = async (
	contacts: ContactPartialWithRequiredEmail[],
	fileName: string,
	currentPage: number
): Promise<void> => {
	const tsvData = contacts.map((contact: ContactPartialWithRequiredEmail) => ({
		firstname: contact.firstName || '',
		lastname: contact.lastName || '',
		company: contact.company || '',
		email: contact.email || '',
		address: contact.address || '',
		city: contact.city || '',
		state: contact.state || '',
		country: contact.country || '',
		website: '', // Not available in transformed contact
		phone: contact.phone || '',
		title: contact.title || '',
		headline: contact.headline || '',
		linkedinurl: contact.linkedInUrl || '',
		photourl: contact.photoUrl || '',
		metadata: `${contact.title || ''} at ${contact.company || ''}`,
	}));

	// Create TSV content
	const tsvContent = Papa.unparse(tsvData, {
		delimiter: '\t',
		header: true,
	});

	// Generate unique filename with timestamp
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `${timestamp}_${fileName}_${currentPage}.tsv`;
	const filepath = path.join(process.cwd(), 'public', 'exports', filename);

	await fs.mkdir(path.join(process.cwd(), 'public', 'exports'), { recursive: true });
	await fs.writeFile(filepath, tsvContent, 'utf-8');
	return;
};
