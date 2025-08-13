# Environment Variables Setup Guide for Email Generation

## Problem: Full AI Email Generation Not Working

The Full AI email generation feature requires specific environment variables to be configured. Without these, the email generation will fail.

## Required Environment Variables

### 1. Perplexity AI Configuration
```env
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```
- Get your API key from: https://www.perplexity.ai/settings/api
- This is used for generating the initial email content

### 2. Mistral AI Configuration

#### API Key
```env
MISTRAL_API_KEY=your_mistral_api_key_here
```
- Get your API key from: https://console.mistral.ai/

#### Agent IDs
You need to create agents in your Mistral account for each tone and paragraph configuration:

##### Tone Agents
```env
MISTRAL_AGENT_ID=agent_id_for_normal_tone
MISTRAL_TONE_EXPLANATORY_AGENT_ID=agent_id_for_explanatory_tone
MISTRAL_TONE_FORMAL_AGENT_ID=agent_id_for_formal_tone
MISTRAL_TONE_CONCISE_AGENT_ID=agent_id_for_concise_tone
MISTRAL_TONE_CASUAL_AGENT_ID=agent_id_for_casual_tone
```

##### Paragraph Formatting Agents
```env
MISTRAL_PARAGRAPH_1_AGENT_ID=agent_id_for_1_paragraph
MISTRAL_PARAGRAPH_2_AGENT_ID=agent_id_for_2_paragraphs
MISTRAL_PARAGRAPH_3_AGENT_ID=agent_id_for_3_paragraphs
MISTRAL_PARAGRAPH_4_AGENT_ID=agent_id_for_4_paragraphs
MISTRAL_PARAGRAPH_5_AGENT_ID=agent_id_for_5_paragraphs
```

##### Hybrid Mode Agent
```env
MISTRAL_HYBRID_AGENT_ID=agent_id_for_hybrid_mode
```

## How to Set Up Mistral Agents

1. Go to https://console.mistral.ai/
2. Navigate to "Agents" section
3. Create a new agent for each tone/purpose
4. Configure each agent with the appropriate system prompt (see `src/constants/ai.ts` for the prompts)
5. Copy the agent ID and add it to your `.env.local` file

## Testing the Fix

1. Create a `.env.local` file in the project root
2. Add all the required environment variables listed above
3. Restart the development server: `npm run dev`
4. Navigate to the campaigns page
5. Select "Full AI" drafting mode
6. Enter a prompt and generate a test email

## Troubleshooting

If email generation still fails:
1. Check the browser console for error messages
2. Check the terminal running the dev server for API errors
3. Verify all environment variables are set correctly
4. Ensure your API keys have sufficient credits/quota

## Alternative: Using Only Perplexity (Fallback Mode)

If you don't have Mistral API access, the code now includes a fallback that will use only Perplexity for email generation. The emails won't have tone adjustments or paragraph formatting, but basic generation will work.
