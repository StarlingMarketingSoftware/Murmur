import { Mistral } from '@mistralai/mistralai';

export const fetchMistral = async (prompt: string, content: string): Promise<string> => {
	const agentId = process.env.MISTRAL_AGENT_ID;
	const apiKey = process.env.MISTRAL_API_KEY;
	if (!agentId || !apiKey) {
		throw new Error('Mistral environment variables are not set');
	}
	const mistral = new Mistral({
		apiKey,
	});

	const userMessage = `${prompt}\n\n${content}`;

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
