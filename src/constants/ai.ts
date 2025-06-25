import { MistralToneAgentType } from '@/types';

const formattingInstructions = `
1. !IMPORTANT! Ensure that there is an empty paragraph tag, <p></p>, between each paragraph. Even after the first line, which is just a short greeting, there should be a <p></p> tag. This is for formatting purposes in rich text as well as for email clients.
2. Do not include a <p></p> tag before the first line of text. 
2. At the end of the first line (the short greeting), use a comma. For example: "Hi,"
3. Do not add any space or tab before the first letter of each paragraph.
4. Remove any new line characters. All new lines are accomplished with the <p></p> tag.`;

export const getMistralTonePrompt = (tone: MistralToneAgentType): string => {
	return `I will send an email message in RichText format. 

	Perform the following tasks to the subject and message:
	1. !IMPORTANT! ${MISTRAL_TONE_PROMPTS[tone]}
	2. Remove all text in brackets [] and recompose the email to make sense.
	3. Don't make up any websites and double check that the email is cogent.
	4. Don't pretend to be anyone or add any additional information that isn't factual.
	5. Don't include a signature.
	6. Make it more human.
	7. Use more bursts and less uniform.
	8. Always start with "Hi" and not "Hey".
	9. Don't say "here's the revised version" -- just provide the subject and message in JSON format.

${formattingInstructions}

Please return your response in JSON with the following format:
{
  "subject": "cleanedSubjectInPlainTextFormat",
  "message": "cleanedMessageInRichTextFormat"
}
`;
};

export const getMistralParagraphPrompt = (numberOfParagraphs: number): string => {
	return `I will send a message in RichText format. 

Perform the following task the text message:
1. ${MISTRAL_PARAGRAPH_PROMPTS[numberOfParagraphs]}

Here are directions about formatting:
${formattingInstructions}

Return the updated message in RichText format without any additional text or explanation.
`;
};

export const OPEN_AI_MODEL_OPTIONS = {
	o4mini: 'o4-mini-2025-04-16',
	gpt4: 'gpt-4-0613',
};

export const MISTRAL_PARAGRAPH_PROMPTS: Record<number, string> = {
	1: 'Make it one paragraph.',
	2: 'Make it two full-length paragraphs.',
	3: 'Make it three full-length paragraphs.',
	4: 'Make it four full-length paragraphs.',
	5: 'Make it five full-length paragraphs.',
};

export const MISTRAL_TONE_PROMPTS: Record<MistralToneAgentType, string> = {
	normal: 'Write it in a normal tone.',
	explanatory: 'Write it in an explanatory tone.',
	formal: 'Write it in a formal tone.',
	concise: 'Write it in a concise tone.',
	casual: 'Write it in a casual tone.',
};

export const MISTRAL_TONE_AGENT_KEYS = [
	'normal',
	'explanatory',
	'formal',
	'concise',
	'casual',
] as const;

export const MISTRAL_PARAGRAPH_AGENT_KEYS = [
	'paragraph1',
	'paragraph2',
	'paragraph3',
	'paragraph4',
	'paragraph5',
] as const;
