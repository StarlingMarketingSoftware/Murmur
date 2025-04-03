import { Draft } from '@/constants/types';
import { AiModel, Contact } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { json } from 'stream/consumers';

const rolePrompt = `Write a personalized email to {first_name} who works at {company}. If there is no recipient name provided, start the email with "Hello!"

Here are some templates:

1. "Hi {first_name},

I'm reaching out again regarding an interest in how I could help {company}. [insert knowledge about the company in a way that feels anecdotal and not like you're reiterating their own sales pitches]

I'm a local business owner

If you’re available next week…”
something like “Do you have any time next week? Id love to hop on a call and go over everything…"

"I've been following Acme Corp's innovative work in sustainable packaging solutions, particularly your recent launch of biodegradable containers for the food industry. It's impressive how you're revolutionizing eco-friendly packaging without compromising on durability." as an example first paragraph tone is great.


Overview:
1. make sure it's positive and friendly in tone
2. always word your email differently based on the text i've provided, making it as well-written as you can.
3. Make it oriented toward helping them rather than just selling or securing work for us


The third paragraph needs to prompt scheduling a phone call. Please talke politely about how we can work with them and ask if they have any time in the coming week.

Please really make sure the third paragraph is less forceful. It seems like it's assuming a phone call. be more humble in paragraph 3.

in Paragraph 3, try to keep the first sentence shorter and focus more on if they have availability this upcoming week to schedule a call.


Do not include a subject line or signature - just the body text.

Notes:
0. No passive sentences, only active sentences
1.Don't include "hope you're doing well"
2. keep it very succinct
3. Start with "Hi" instead of "Hey"
4. make it formal and professional
5. Remove "As a" in the second paragraph. "I have" or "we are" are better alternatives.
6. Make it feel ever more assertive and confident.
7. Make sure the third paragraph is asking to schedule a phone call rather than declaring. closer to "Let me know when you're available to schedule a phone call?" for example
8. Avoid phrases like "potential synergies"
9. Avoid phrases like "amplify your message" For example "Contribute" and "help" are good alternatives
10. Avoid phrases like "potential collaboration" For example try i"how we can help"
11. Avoid "Amplify your sustainability message"
12. Avoid "Potential opportunities"
13. In the third paragraph the key work is "help"
14. instead of "let me know your availability" try "When you have a change, let me know if there's a good time that works for you"
15. stop using the word "amplify"
16. instead of "I believe we can contribute significantly" try "I'd love to speak and find how we could best help"
17. don't say "brief call" say "call" instead
18. Don't use the word "eager"
19. use "help" instead of "elevate"
20. Instead of "I noticed" try "I've been following
21. Avoid referencing specific numerical figures in the first paragraph like "80,000-150,000 patients annually." or "6,000 case victories"
22. Avoid the phrase "truly commendable"
23. avoid the word "innovative"

Write this how you think Jensen Huang would write an email. This should feel like it's written by a top CEO
	`;

const jsonFormatInstructions = `IMPORTANT: Please return valid JSON format and nothing else. DO NOT use double quotes ("") inside any of the fields. I should be able to take your response and use it directly in JSON.parse() in JavaScript. For linebreaks in "message", use linebreak characters instead of raw line breaks. Use the following format: 
{
  "contactEmail": "name@web.com",
  "subject": "generatedSubject",
  "message": "Hi Josh,\n\nI came across...", 
}`;

const messageOnlyFormat = `Return the message only, without any subject line, signature, or other text.`;

const messageAndSubjectFormat = `Return the message and the subject line, without any signature or other text.`;

// const batchMessageOnlyFormat = `I will provide a json that contains information about each recipient. Return the message only, without any subject line, signature, or other text. Please return a list of messages corresponding to each recipient.`;

// const batchMessageAndSubjectFormat = `I will provide a json that contains information about each recipient. Return the message and the subject line, without any signature or other text. Please format the response into a list of JSON strings with the keys "recipient", "subject", and "message".`;

const perplexityEndpoint = 'https://api.perplexity.ai/chat/completions';

const safeParseAIResponse = (response: string): Draft => {
	try {
		// 1. Find the JSON object using regex
		const jsonRegex = /{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/g;
		const matches = response.match(jsonRegex);

		if (!matches?.length) {
			throw new Error('No valid JSON found in response');
		}

		// 2. Try to parse each match until we find valid JSON
		for (const match of matches) {
			try {
				// 3. Clean the string before parsing
				const cleaned = match
					.replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
					.replace(/[\r\t]/g, '') // Remove newlines, carriage returns, tabs
					.replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas

				const parsed = JSON.parse(cleaned) as Draft;

				// 4. Validate the parsed object has required fields
				if (parsed.contactEmail && parsed.subject && parsed.message) {
					return parsed;
				}
			} catch (e) {
				continue; // Try next match if this one fails
			}
		}

		throw new Error('No valid JSON structure found');
	} catch (error) {
		console.error('Parse error:', error);
		throw new Error('Failed to parse AI response');
	}
};

export const usePerplexityDraftEmail = () => {
	interface DraftEmailParams {
		model: AiModel;
		generateSubject: boolean;
		recipient: Contact;
		prompt: string;
	}

	const {
		data: dataDraftEmail,
		isPending: isPendingDraftEmail,
		mutate: draftEmail,
		mutateAsync: draftEmailAsync,
	} = useMutation({
		mutationFn: async (params: DraftEmailParams): Promise<Draft> => {
			const response = await fetch(perplexityEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY}`,
				},
				body: JSON.stringify({
					model: params.model,
					messages: [
						{
							role: 'system',
							content: `${rolePrompt} ${
								params.generateSubject ? messageAndSubjectFormat : messageOnlyFormat
							} 
							${jsonFormatInstructions}`,
						},
						{
							role: 'user',
							content: `${params.prompt}
							Recipient: ${JSON.stringify(params.recipient)}
							`,
						},
					],
				}),
			});
			if (!response.ok) {
				throw new Error('Failed to generate email');
			}

			const data = await response.json();
			try {
				const jsonString = data.choices[0].message.content;
				const beginningIndex = jsonString.indexOf('{');
				const endIndex = jsonString.lastIndexOf('}') + 1;
				const jsonStringTrimmed = jsonString.slice(beginningIndex, endIndex).trim();
				console.log('jsonStringTrimmed:');
				console.log(jsonStringTrimmed);
				console.log(typeof jsonStringTrimmed);
				const parsedDraft = safeParseAIResponse(jsonStringTrimmed);

				if (!parsedDraft.contactEmail || !parsedDraft.subject || !parsedDraft.message) {
					throw new Error('Invalid draft format returned from AI. Please try again.');
				}

				return parsedDraft;
			} catch (error) {
				console.error('Failed to parse AI response:', error);
				throw new Error('Failed to parse AI response. Please try again.');
			}
		},
		onError: (error) => {
			toast.error(error.message);
		},
		onSuccess: () => {},
	});

	interface BatchDraftEmailParams {
		model: AiModel;
		generateSubject: boolean;
		recipients: Contact[];
		prompt: string;
	}

	const {
		data: dataBatchDraftEmail,
		isPending: isPendingBatchDraftEmail,
		mutate: batchDraftEmails,
	} = useMutation({
		mutationFn: async (params: BatchDraftEmailParams) => {
			console.log(params);
			// map the contacts to only get the essential data?
			// for each batch, add to the current redux state of "draftedEmails".
		},
	});

	return {
		dataDraftEmail,
		isPendingDraftEmail,
		draftEmail,
		draftEmailAsync,
		dataBatchDraftEmail,
		isPendingBatchDraftEmail,
		batchDraftEmails,
	};
};
