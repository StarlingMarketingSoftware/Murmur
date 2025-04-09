import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const response = await fetch('https://api.perplexity.ai/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
			},
			body: JSON.stringify(body),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error?.message || 'Failed to generate email');
		}

		return NextResponse.json(data);
	} catch (error) {
		console.error('Perplexity API error:', error);
		return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
	}
}
