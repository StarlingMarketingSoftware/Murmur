import { AiModel, Contact } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';

const ROLE_PROMPT = `Write a personalized email to {first_name} who works at {company}. If there is no recipient name provided, start the email with "Hello!"

Here is a template to follow:

1. "Hi {first_name},

I'm reaching out regarding how I could help {company}. [insert knowledge about the company in a way that feels anecdotal and not like you're reiterating their own sales pitches]

If you’re available next week…”
something like “Do you have any time next week? I'd love to hop on a call and go over everything…"

"I've been following Acme Corp's innovative work in sustainable packaging solutions, particularly your recent launch of biodegradable containers for the food industry. It's impressive how you're revolutionizing eco-friendly packaging without compromising on durability." as an example first paragraph tone is great.

the "I've been following" part can come somewhere in the middle of the paragraph. 

Overview:
1. make sure it's positive and friendly in tone
2. always word your email differently based on the text i've provided, making it as well-written as you can.
3. Make it oriented toward helping them rather than just selling or securing work for us


The third paragraph needs to prompt scheduling a phone call. Please talk politely about how we can work with them and ask if they have any time in the coming week.

Please really make sure the third paragraph is less forceful. It seems like it's assuming a phone call. be more humble in paragraph 3.

in Paragraph 3, try to keep the first sentence shorter and focus more on if they have availability this upcoming week to schedule a call.


Do not include a subject line or signature - just the body text.

Do not keep to too strict a formula, we want this to feel human.

Rules:
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
14. instead of "let me know your availability" try "When you have a chance, let me know if there's a good time that works for you"
15. stop using the word "amplify"
16. instead of "I believe we can contribute significantly" try "I'd love to speak and find how we could best help"
17. don't say "brief call" say "call" instead
18. Don't use the word "eager"
19. use "help" instead of "elevate"
20. Instead of "I noticed" try "I've been following
21. Avoid referencing specific numerical figures in the first paragraph like "80,000-150,000 patients annually." or "6,000 case victories"
22. Avoid the phrase "truly commendable"
23. avoid the word "innovative"
24. Vary sentence structure - mix short and long sentences for natural rhythm
25. Include minor conversational elements like "Actually," "In fact," or "Interestingly,"
26. Use specific examples rather than generic statements
27. Add subtle personality touches - slight enthusiasm, genuine curiosity
28. Reference current events or seasons when relevant (e.g., "With the new year approaching...")
29. Use contractions occasionally (I'd, we're, you'll) for warmth
30. Include one unique, memorable detail that shows genuine interest
31. Avoid robotic transitions - use natural connectors like "Speaking of which," or "On that note,"
32. Add slight imperfections - occasional parenthetical thoughts or em dashes
33. Reference shared experiences or common challenges in their industry
34. Use active voice and strong verbs to create energy
35. Include a subtle compliment that feels genuine, not forced
36. End with a specific, actionable next step rather than generic "let me know"

Write this how you think Jensen Huang would write an email. This should feel like it's written by a top CEO
	`;

const RESPONSE_FORMAT_INSTRUCTIONS = `Within the message, use an extra <p></p> to create line breaks between paragraphs as follows:
{subject: generatedSubject,message: <p>Hi Josh,</p><p></p><p>Paragraph 1 content</p><p></p><p>Paragraph 2 content</p><p></p><p>Paragraph 3 content</p>}`;

const MESSAGE_AND_SUBJECT_FORMAT = `Return the message and the subject line, without any signature or other text.`;

const PERPLEXITY_ENDPOINT = '/api/perplexity';

export type DraftEmailResponse = {
	message: string;
	subject: string;
};

interface DraftEmailParams {
	model: AiModel;
	generateSubject: boolean;
	recipient: Contact;
	prompt: string;
	signal?: AbortSignal;
}

export const usePerplexityDraftEmail = () => {
	const {
		data: dataDraftEmail,
		isPending: isPendingDraftEmail,
		mutate: draftEmail,
		mutateAsync: draftEmailAsync,
	} = useMutation({
		mutationFn: async (params: DraftEmailParams): Promise<string> => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);

			let response;

			try {
				response = await fetch(PERPLEXITY_ENDPOINT, {
					signal: params.signal,
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: params.model,
						messages: [
							{
								role: 'system',
								content: `${RESPONSE_FORMAT_INSTRUCTIONS}\n\nInstructions for email content:\n${ROLE_PROMPT}\n\nOutput format:\n${MESSAGE_AND_SUBJECT_FORMAT}`,
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
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error('Email generation cancelled.');
				}
				throw error;
			}

			clearTimeout(timeoutId);
			if (!response || !response.ok) {
				throw new Error('Failed to generate email.');
			}

			const data = await response.json();

			try {
				const jsonString: string = data.choices[0].message.content;
				return jsonString;
			} catch {
				throw new Error('Failed to parse AI response. Please try again.');
			}
		},
	});

	return {
		dataDraftEmail,
		isPendingDraftEmail,
		draftEmail,
		draftEmailAsync,
	};
};
