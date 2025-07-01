import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarContacts } from '../../_utils/vectorDb';

export async function POST(req: NextRequest) {
	try {
		const { query, limit } = await req.json();

		if (!query) {
			return NextResponse.json({ error: 'Query text is required' }, { status: 400 });
		}

		const results = await searchSimilarContacts(query, limit);
		return NextResponse.json(results);
	} catch (error) {
		console.error('Error searching contacts:', error);
		return NextResponse.json({ error: 'Failed to search contacts' }, { status: 500 });
	}
}
