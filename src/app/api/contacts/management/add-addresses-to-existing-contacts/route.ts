import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { apiResponse, apiUnauthorized, handleApiError } from '@/app/api/_utils';
import Papa from 'papaparse';

export const GET = async function GET(request: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return apiUnauthorized();
		}
		const user = await prisma.user.findUnique({
			where: { clerkId: userId },
		});

		if (user?.role !== 'admin') {
			return apiUnauthorized('Only admins can access this route');
		}

		// Read the TSV file via HTTP so it works on Vercel
		const fileUrl = new URL(
			`/contactLists/musicVenuesEmailAndAddressOnly.tsv`,
			request.url
		);
		const resp = await fetch(fileUrl);
		if (!resp.ok) {
			throw new Error(`Failed to fetch TSV from ${fileUrl.toString()}`);
		}
		const tsvContent = await resp.text();

		// Parse the TSV file
		const parsed = Papa.parse(tsvContent, {
			header: true,
			delimiter: '\t',
			skipEmptyLines: true,
		});

		const rows = parsed.data as { email: string; address: string }[];

		let updatedCount = 0;
		const updateResults = [];
		for (let i = rows.length - 1; i >= 0; i--) {
			const row = rows[i];
			console.log(`Processing row ${i + 1} of ${rows.length} ${row.email}`);
			if (!row.email || !row.address) {
				console.log(`Skipping row: ${row.email} - ${row.address}`);
				continue;
			}

			const contacts = await prisma.contact.findMany({
				where: { email: row.email, address: null },
			});

			console.log(`found ${contacts.length} contacts, rows: ${row.email}`);

			for (const contact of contacts) {
				if (!contact.id || !row.address || row.address === '') {
					continue;
				}
				console.log('updating contact', contact.email);
				await prisma.contact.update({
					where: { id: contact.id },
					data: { address: row.address },
				});
				updatedCount++;
				updateResults.push({ email: row.email, address: row.address });
			}
		}

		return apiResponse({
			message: `Updated ${updatedCount} contacts with addresses from TSV`,
			updated: updateResults,
		});
	} catch (error) {
		return handleApiError(error);
	}
};
