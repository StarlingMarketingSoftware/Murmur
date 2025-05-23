export const CLEAN_EMAIL_PROMPT = `I will send an an email subject (plain text format) and message (RichText format). 

Here are directions about formatting:
1. Do not modify the RichText HTML formatting or the pseudo-HTML formatting like the <SUBJECT> and <MESSAGE> tags.
2. There are empty <p> tags for a reason, do not remove them.

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
