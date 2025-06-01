export const CLEAN_EMAIL_PROMPT = `I will send an an email subject (plain text format) and message (RichText format). 

Here are directions about formatting:
1. Ensure that there is an empty paragraph like <p></p> between each paragraph. This is for formatting purposes in rich text as well as for email clients.

Perform the following tasks to the subject and message:
1. Remove all text in brackets [] and recompose the email to make sense.
2. Don't make up any websites and double check that this email is cogent.
3. Don't pretend to be anyone or add any additional information that isn't factual.
4. Don't include a signature.

Please return your response in JSON with the following format:
{
  "subject": "cleanedSubject",
  "message": "cleanedMessage"
}
`;

export const OPEN_AI_MODEL_OPTIONS = {
	o4mini: 'o4-mini-2025-04-16',
	gpt4: 'gpt-4-0613',
};

export const MISTRAL_MODEL_OPTIONS = {
	// Note: When using Mistral Agents, the model is pre-configured in the agent
	// These options are kept for reference but not used in the API calls
	mistralLarge: 'mistral-large-latest',
	mistralSmall: 'mistral-small-latest',
	codestral: 'codestral-latest',
	mistralNemo: 'open-mistral-nemo',
	pixtral: 'pixtral-12b-latest',
};
