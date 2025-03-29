import { AiModel, Draft } from '@/constants/types';
import { setCompletedDrafts } from '@/lib/redux/features/murmur/murmurSlice';
import { useAppDispatch } from '@/lib/redux/hooks';
import { Contact } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

const rolePrompt = `You are a personal assistant who writes highly personalized, authentic-sounding emails.
	1. Sound natural and conversational
	2. Reference something specific about {company} that shows knowledge of their business
	3. Be 3-4 short paragraphs (not too lengthy)
	4. Include a clear call to action
	5. Use a friendly, professional tone
	`;

const jsonFormatInstructions = `IMPORTANT: Please return valid JSON format and nothing else. I should be able to take your response and use it directly in JSON.parse() in JavaScript. For linebreaks in "message", use linebreak characters instead of raw line breaks. Use the following format: 
{
  "contactEmail": "name@web.com",
  "subject": "generatedSubject",
  "message": "Hi Recipient,\n\nI came across...", 
}`;

const messageOnlyFormat = `Return the message only, without any subject line, signature, or other text.`;

const messageAndSubjectFormat = `Return the message and the subject line, without any signature or other text.`;

const batchMessageOnlyFormat = `I will provide a json that contains information about each recipient. Return the message only, without any subject line, signature, or other text. Please return a list of messages corresponding to each recipient.`;

const batchMessageAndSubjectFormat = `I will provide a json that contains information about each recipient. Return the message and the subject line, without any signature or other text. Please format the response into a list of JSON strings with the keys "recipient", "subject", and "message".`;

const perplexityEndpoint = 'https://api.perplexity.ai/chat/completions';

export const usePerplexityDraftEmail = () => {
	const dispatch = useAppDispatch();

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
				const jsonString = data.choices[0].message.content
					.replace(/`/g, '') // Remove all backticks
					.replace(/^```json\s*/, '') // Remove leading ```json and any whitespace
					.replace(/^json\s*/, '') // Remove leading 'json' and any whitespace
					.replace(/```$/, '') // Remove trailing ```
					.replace(/^\s*{\s*/, '{') // Clean up leading spaces before first bracket
					.trim();

				console.log('🚀 ~ mutationFn: ~ jsonString:', jsonString);

				const parsedDraft = JSON.parse(jsonString) as Draft;

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
		onSuccess: (data) => {
			// Handle successful response
		},
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
			// map the contacts to only get the essential data?
			// for each batch, add to the current redux state of "draftedEmails".
		},
	});

	return {
		dataDraftEmail,
		isPendingDraftEmail,
		draftEmail,
		dataBatchDraftEmail,
		isPendingBatchDraftEmail,
		batchDraftEmails,
	};
};
