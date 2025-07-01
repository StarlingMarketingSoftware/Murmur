import { NextResponse } from 'next/server';
import { initializeVectorDb } from '../../_utils/vectorDb';

export async function POST() {
	try {
		await initializeVectorDb();
		return NextResponse.json({ message: 'Vector database initialized successfully' });
	} catch (error) {
		console.error('Error initializing vector database:', error);
		return NextResponse.json(
			{ error: 'Failed to initialize vector database' },
			{ status: 500 }
		);
	}
}
