import { NextResponse } from 'next/server';
import { mailOptions, transporter } from './nodemailerFunctions';
import { contactFormSchema } from '@/app/contact/page';

// Define the same schema for server-side validation

export async function POST(request: Request) {
	try {
		// Get the form data from the request
		const body = await request.json();

		// Validate the data
		const result = contactFormSchema.safeParse(body);

		if (!result.success) {
			// Return validation errors
			return NextResponse.json(
				{ error: result.error.flatten().fieldErrors },
				{ status: 400 }
			);
		}

		const { name, email, subject, message } = result.data;

		const emailBody: string = `Name: ${name}\n\nEmail: ${email}\n\nMessage: ${message}`;

		await transporter.sendMail({
			...mailOptions,
			subject,
			text: emailBody,
		});

		return NextResponse.json(
			{ success: true, message: 'Contact form submitted successfully' },
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error processing contact form:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
