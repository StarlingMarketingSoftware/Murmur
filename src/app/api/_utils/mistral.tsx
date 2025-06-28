import { MistralAgentType } from '@/types';
import { Mistral } from '@mistralai/mistralai';

const MISTRAL_AGENT_IDS = {
	normal: process.env.MISTRAL_AGENT_ID,
	explanatory: process.env.MISTRAL_TONE_EXPLANATORY_AGENT_ID,
	formal: process.env.MISTRAL_TONE_FORMAL_AGENT_ID,
	concise: process.env.MISTRAL_TONE_CONCISE_AGENT_ID,
	casual: process.env.MISTRAL_TONE_CASUAL_AGENT_ID,
	paragraph1: process.env.MISTRAL_PARAGRAPH_1_AGENT_ID,
	paragraph2: process.env.MISTRAL_PARAGRAPH_2_AGENT_ID,
	paragraph3: process.env.MISTRAL_PARAGRAPH_3_AGENT_ID,
	paragraph4: process.env.MISTRAL_PARAGRAPH_4_AGENT_ID,
	paragraph5: process.env.MISTRAL_PARAGRAPH_5_AGENT_ID,
	hybrid: process.env.MISTRAL_HYBRID_AGENT_ID,
} as const;

export const fetchMistral = async (
	agentType: MistralAgentType,
	prompt: string,
	content: string
): Promise<string> => {
	const agentId = MISTRAL_AGENT_IDS[agentType];
	const apiKey = process.env.MISTRAL_API_KEY;

	if (!agentId || !apiKey) {
		throw new Error('Mistral environment variables are not set');
	}

	const mistral = new Mistral({
		apiKey,
	});

	const userMessage = `${prompt}\n\n${content}`;
	console.log({
		messages: [
			{
				content: userMessage,
				role: 'user',
			},
		],
		agentId,
	});

	const response = await mistral.agents.complete({
		messages: [
			{
				content: userMessage,
				role: 'user',
			},
		],
		agentId,
	});
	const message = response.choices[0].message.content?.toString();
	if (!message) {
		throw new Error('No message content received from Mistral Agent');
	}

	return message;
};
