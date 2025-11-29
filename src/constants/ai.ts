import { MistralToneAgentType, PerplexityModel } from '@/types';

export const GEMINI_FULL_AI_PROMPT = `
INSTRUCTIONS FOR EMAIL CONTENT:

You are a musician. your goal is to get yourself booked for a show by writing an email. Do not make up any information about your own identity, as that will be provided to you. Furthermore, never compose a signature.
Speak in more of a conversational and relaxed tone.

Start with either "Hi Everyone at {company}" or if it's available in the data, "Hi {recipient_first_name},"

Then proceed to demonstate in a friendly and professional manner, demonstating that you know about the venue from information in {metadata} demonstating that you have deep knowledge of their establishment.
Aim to inclue 2 to 3 facts from {metadata} in your email. Be very specific with the facts you include.

Following that, ask if they have any time in the coming week to schedule a call to discuss the details of the show.

OUTPUT FORMAT:
Return ONLY the email body text, without any subject line, signature, or other text. Do not return JSON format - just the plain email body text.`;

export const GEMINI_HYBRID_PROMPT = `

You will be provided with an email template to follow that includes pre-written text that must remain in its original form, as well as placeholders that may include {{introduction}} {{research}} and {{call-to-action}}. Only fill in the placeholders, do not change the pre-written text. Each placeholder may have specific instructions attached to them.

!IMPORTANT! If an {{introduction}} placeholder is provided, follow these instructions for writing it. If it is not provided, ignore these instructions:
- Introduction paragraph begin exactly with the following greeting (no changes or variations): Hi {FIRST_NAME},
- After this greeting line, add exactly one blank line.
- Then, write a casual, friendly, authentic introduction paragraph of approximately 2–4 sentences. Clearly and genuinely introduce yourself in a general way, casually stating that you're reaching out simply to connect or say hello.
- Strictly follow these rules in the introduction paragraph:
	- Avoid all sales-style or networking language (no "synergies," "mutual benefit," "collaboration opportunities," etc.)
	- Never include placeholder text, square brackets ([ ]), or invented personal details; generically refer only to "my background," "my work," or "my professional field."
	- Never add specific or unrequested details about digital campaigns, marketing, or specific projects.
	- No preamble phrases like "here is an introduction..."
	- No closing statements or signatures included at any point.

!IMPORTANT!	If the {{research}} placeholder is included, use the following instructions to write it. If {{research}} is not included, ignore these instructions.
- Do a quick bit of research on the provided recipient.
- Then write one short, natural, casual paragraph (approximately 2–4 sentences) informally explaining, in your own words, what that company does. Vary your opening phrase naturally each time. For example, using phrases such as "I’m aware," "I know," "I’m impressed by," “I saw,” “I noticed,” or just start with a simple natural comment. Include one genuine, specific factor or detail if possible.
- Strictly follow these rules in the research contact paragraph:
	* Never copy or reword their exact marketing language or website content.
	* Never invent or fabricate information or details that aren't factually clear or provided.
	* Keep tone authentic, human, relaxed and entirely non-salesy.

!IMPORTANT! If {{call-to-action}} placeholder is included use the following instructions, if {{call-to-action}} placeholder is not included, ignore these instructions.
- Write a friendly, naturally conversational call-to-action paragraph that clearly, politely, and genuinely invites the recipient to schedule a phone call. This paragraph must sound casual, professional, and non-pushy, while clearly prompting them to respond.
	- ONLY if the {{call-to-action}} placeholder is provided, specifically include a sentence closely resembling:
		"If you have time this upcoming week, I'd love to schedule a phone call." Also explicitly ask the casual question:
		"What times would work best for you?" 
		DO NOT include this sentence if {{call-to-action}} placeholder is not provided.
	- Strictly follow these rules in the call-to-action paragraph:
		- Never begin with phrases such as "to wrap up," "here's a call to action," or "to finalize."
		- Do not add any greetings or closings ("thank you," "regards," etc.).
		- Never include artificially formal or awkward expressions like "this will help me ensure we connect at a time that suits you perfectly" or "I'll set it up accordingly."
		- Never use phrases like "I would appreciate it if" or "could you let."

	!IMPORTANT! Final mandatory check before submission:
	✅ The provided template that includes EXACT text as well as placeholders {{}} must be followed exactly. Make sure each placeholder corresponds to a paragraph in the generated email. Do not remove, add to, or modify any of the paragraphs with exact text. Only fill in the placeholders. Do not add any additional paragraphs for which there is no placeholder.
	✅ You have included no brackets "[ ]" or placeholder text. You have invented nothing.
	✅ Your text contains no preambles, no closing phrases or signatures.
	✅ Your tone throughout is casual, human, authentic, friendly, natural, and never sales-like or artificial. 
	If you do not exactly follow these instructions, your task will be immediately and fully rejected as incorrect. This is critical: review your response carefully before finalizing.
	`;

const MISTRAL_FORMATTING_INSTRUCTIONS = `
1. !IMPORTANT! Ensure that there is a line break character "\n" between each paragraph. Even after the first line, which is just a short greeting, there should be a line break character "\n". 
2. Do not include a line break before the first line of text. 
2. At the end of the first line (the short greeting), use a comma. For example: "Hi,"
3. Do not add any space or tab before the first letter of each paragraph.`;

export const getMistralTonePrompt = (tone: MistralToneAgentType): string => {
	return `I will send an email message in plain text format. 

	Perform the following tasks to the message:
	1. !IMPORTANT! ${MISTRAL_TONE_PROMPTS[tone]}
	2. Generate a subject line for the email.
	3. Remove all text in brackets [] and recompose the email to make sense.
	4. Don't make up any websites and double check that the email is cogent.
	5. Don't pretend to be anyone or add any additional information that isn't factual.
	6. Don't include a signature.
	7. Make it more human.
	8. Use more bursts and less uniform.
	9. Always start with "Hi" and the person's name (if it's provided) and not "Hey".
	10. Don't say "here's the revised version" -- just provide the subject and message in JSON format.
	11. If the email greeting includes a person's name, keep it there. DO NOT remove it.

${MISTRAL_FORMATTING_INSTRUCTIONS}

Please return your response in JSON with the following format. Do not include any other text or explanation. Your response should be a valid JSON object that can be parsed by JSON.parse() in Javascript:
{
  "subject": "cleanedSubjectInPlainTextFormat",
  "message": "cleanedMessageInPlainTextFormat"
}
`;
};

export const getMistralHybridPrompt = (
	emailTemplate: string,
	blockPrompts: string
): string => {
	return `

I will provide an email that was generated from a template that includes pre-written text that is specified in {{text}} blocks as well as AI placeholders that may include {{introduction}} {{research}} and {{call-to-action}}. When you revise the email, only revise the sections generated from the placeholders. DO NOT change the content specified in the {{text}} blocks. Each placeholder may have specific instructions attached to them. Each text block will have exact text associated with it.Please make sure to follow the instructions for each placeholder, and keep the exact text for each text block.

!IMPORTANT! When you've composed the email do another check to make sure that the exact text in the {{text}} blocks is not changed from the given template. If any of the {{text}} blocks are changed, please revert that section to the original text in the template.

	Perform the following tasks to the email:
	1. !IMPORTANT! Do not add any placeholders that are not specified in the template. For example, if the template does not include section for {{research}}, do not add content related to researching the contact. Do not add any content that is not specified in the template.
	2. If there is a greeting at the beginning of the email like "Hello!" "Hi ~~" or "こんにちは", keep it as it is. DO NOT remove the new line character after the greeting if there is one. Also do not remove any special characters if they are there. Simply put, DO NOT change it.
	3. Generate a subject line for the email.
	4. Remove all text in brackets [] and recompose the email to make sense.
	5. Don't make up any websites and double check that the email is cogent.
	6. Don't pretend to be anyone or add any additional information that isn't factual.
	7. Don't include a signature.
	8. Make it more human.
	8. Use more bursts and less uniform.
	10. Don't say "here's the revised version" -- just provide the subject and message in JSON format.
	11. If the email greeting includes a person's name, keep it there. DO NOT remove it.
	12. Do not modify the order of the template. If the template has {{introduction}}, {{text0}}, then {{call-to-action}}, do not put {{text0}} after {{call-to-action}} or any reordering of that sort.

	Formatting Instructions:
1. !IMPORTANT! Ensure that there is a line break character "\n" between each paragraph.
2. If there is an existing line break between lines of text, DO NOT remove it. Please follow the format of the email template exactly.

Please return your response in JSON with the following format. Do not include any other text or explanation. Your response should be a valid JSON object that can be parsed by JSON.parse() in Javascript:
{
  "subject": "cleanedSubjectInPlainTextFormat",
  "message": "cleanedMessageInPlainTextFormat"
}

## EMAIL TEMPLATE ##
${emailTemplate}

${blockPrompts}
`;
};

export const getMistralParagraphPrompt = (numberOfParagraphs: number): string => {
	return `I will send a message in plain text format, including the line break character "\n". 

Perform the following task the text message:
1. ${MISTRAL_PARAGRAPH_PROMPTS[numberOfParagraphs]}

Here are directions about formatting:
${MISTRAL_FORMATTING_INSTRUCTIONS}

Return the updated message in plain text format, using the line break character "\n", without any additional text or explanation.
`;
};

export const OPEN_AI_MODEL_OPTIONS = {
	o4mini: 'o4-mini-2025-04-16',
	gpt4: 'gpt-4-0613',
	gpt4nano: 'gpt-4.1-nano-2025-04-14',
};

export const GEMINI_MODEL_OPTIONS = {
	gemini2Flash: 'gemini-2.0-flash',
	gemini25Pro: 'gemini-2.5-pro-preview-05-06',
	gemini3Pro: 'gemini-3-pro-preview',
} as const;

export type GeminiModel =
	(typeof GEMINI_MODEL_OPTIONS)[keyof typeof GEMINI_MODEL_OPTIONS];

export const PERPLEXITY_MODEL_OPTIONS: Record<string, PerplexityModel> = {
	sonar: 'sonar',
	sonar_pro: 'sonar-pro',
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

export const MISTRAL_HYBRID_AGENT_KEYS = ['hybrid'] as const;
