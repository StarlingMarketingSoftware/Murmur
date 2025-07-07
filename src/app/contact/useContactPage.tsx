'use client';
import { FAQ } from '@/types';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useSendMailgunMessage } from '@/hooks/queryHooks/useMailgun';
import { useEffect, useState } from 'react';

export const FAQS: FAQ[] = [
	{
		question: 'What are the monthly message quotas per subscription level?',
		answer:
			'Message allocation varies by subscription tier. The mid-level plan includes 500 messages monthly, with higher and lower tiers available based on volume requirements.',
	},
	{
		question: 'How does the AI personalization engine operate?',
		answer:
			'Multiple AI models perform automated web crawling and data extraction on target organizations. This multi-model approach generates contextual data that increases engagement metrics.',
	},
	{
		question: 'What’s the contact discovery rate per search query?',
		answer:
			' Each search operation returns approximately 110 validated contacts. The system has no hard limits on search frequency, allowing continuous discovery operations.',
	},
	{
		question: 'What deliverability mechanisms prevent spam classification?',
		answer:
			'Advanced deliverability infrastructure includes authentication protocols, reputation management systems, and content optimization algorithms that maintain inbox placement rates.',
	},
	{
		question: 'How does the contact validation system work?',
		answer:
			'Automated verification processes check each discovered address through multiple validation layers, removing invalid entries before database inclusion.',
	},
	{
		question: 'What machine learning models power the platform?',
		answer:
			'The system employs multiple specialized models for different tasks: entity recognition, relevance scoring, and content generation, working together for comprehensive results.',
	},
	{
		question: 'How does the search algorithm identify relevant contacts?',
		answer:
			'Machine learning analyzes organizational data to match user-defined criteria, returning contacts based on relevance scoring and verification status.',
	},
	{
		question: 'What data sources feed the personalization system?',
		answer:
			'Web scraping engines aggregate publicly available information from multiple sources, processing this data through AI models for actionable insights.',
	},
	{
		question: 'How is sending reputation maintained?',
		answer:
			'Automated monitoring systems track engagement metrics, bounce rates, and spam reports, adjusting sending patterns to preserve domain reputation.',
	},
	{
		question: "What's the technical architecture behind contact verification?",
		answer:
			'Multi-stage validation includes syntax checking, domain verification, and mailbox existence testing through specialized verification services.',
	},
	{
		question: 'How does the platform scale for high-volume users?',
		answer:
			'Cloud-based infrastructure automatically scales processing capacity based on demand, ensuring consistent performance across all subscription tiers.',
	},
	{
		question: 'What rate limiting applies to searches and message sending?',
		answer:
			'While no hard limits exist for search operations, the system implements intelligent throttling to maintain platform stability and data quality.',
	},
];

export const useContactPage = () => {
	const contactFormSchema = z.object({
		name: z.string().min(1, { message: 'Name is required.' }),
		email: z.string().email({ message: 'Invalid email address.' }),
		subject: z.string().min(1, { message: 'Subject is required.' }),
		message: z.string().min(1, { message: 'Message is required.' }),
	});

	const form = useForm<z.infer<typeof contactFormSchema>>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			name: '',
			email: '',
			subject: '',
			message: '',
		},
	});

	const { isPending, mutate } = useSendMailgunMessage({
		onSuccess: () => {
			form.reset();
		},
	});

	const onSubmit = (values: z.infer<typeof contactFormSchema>) => {
		const emailBody: string = `<p>Name: ${values.name}</p><p></p><p>Email: ${values.email}</p><p></p><p>Message: ${values.message}</p>`;

		mutate({
			recipientEmail: process.env.NEXT_PUBLIC_CONTACT_FORM_RECIPIENT!,
			...values,
			senderEmail: values.email,
			senderName: `Murmur Inquiry from ${values.name}`,
			message: emailBody,
		});
	};

	const [hash, setHash] = useState('');

	useEffect(() => {
		const hashValue = window.location.hash.replace('#', '');
		setHash(hashValue);

		// Optional: Listen for hash changes
		const handleHashChange = () => {
			setHash(window.location.hash.replace('#', ''));
		};

		window.addEventListener('hashchange', handleHashChange);
		return () => window.removeEventListener('hashchange', handleHashChange);
	}, []);

	useEffect(() => {
		if (hash) {
			const element = document.getElementById(hash);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}, [hash]);

	return {
		isPending,
		onSubmit,
		form,
	};
};
