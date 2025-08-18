import { MistralAgentType } from '@/types';
import { Mistral } from '@mistralai/mistralai';
import './checkEnvVariables';

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

	if (!agentId) {
		console.error(`[Mistral] Agent ID not found for type: ${agentType}`);
		console.error('[Mistral] Available agent IDs:', Object.keys(MISTRAL_AGENT_IDS));
		throw new Error(`Mistral agent ID not configured for type: ${agentType}`);
	}
	
	if (!apiKey) {
		throw new Error('Mistral API key is not set');
	}

	const mistral = new Mistral({
		apiKey,
	});

	const userMessage = `${prompt}\n\n${content}`;
	console.log('[Mistral] Request details:', {
		agentType,
		agentId,
		promptLength: prompt.length,
		contentLength: content.length,
		messagePreview: userMessage.substring(0, 200)
	});

	let response;
	try {
		response = await mistral.agents.complete({
			messages: [
				{
					content: userMessage,
					role: 'user',
				},
			],
			agentId,
		});
	} catch (error) {
		console.error('[Mistral] API call failed:', error);
		if (error instanceof Error) {
			throw new Error(`Mistral API error: ${error.message}`);
		}
		throw new Error('Mistral API call failed');
	}
	
	if (!response || !response.choices || !response.choices[0]) {
		console.error('[Mistral] Invalid response structure:', response);
		throw new Error('Invalid response from Mistral Agent');
	}
	
	const message = response.choices[0].message?.content?.toString();
	if (!message) {
		console.error('[Mistral] No message content in response:', response.choices[0]);
		throw new Error('No message content received from Mistral Agent');
	}

	console.log('[Mistral] Response received, length:', message.length);
	console.log('[Mistral] Response preview:', message.substring(0, 200));
	return message;
};
