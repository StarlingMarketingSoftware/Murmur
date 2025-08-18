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

# 🚨 FOUND THE PROBLEM: Missing `.env.local` File!

The **root cause** of your Full AI drafting mode not working is that you don't have a `.env.local` file in your project root directory. Without this file, the `PERPLEXITY_API_KEY` environment variable is undefined, causing the API calls to fail.

## 🔧 Complete Fix Instructions

### Step 1: Create the `.env.local` File

In your project root directory (`C:\Users\benja\OneDrive\Documents\GitHub\Murmur`), create a new file called `.env.local` with the following content:

```env
# ============================================
# REQUIRED: Core AI Services for Email Generation
# ============================================

# Perplexity AI Configuration (REQUIRED for Full AI mode)
PERPLEXITY_API_KEY=your_actual_perplexity_api_key_here

# Mistral AI Configuration (Optional but recommended for tone adjustments)
MISTRAL_API_KEY=your_mistral_api_key_here

# Mistral Agent IDs for Different Tones
MISTRAL_AGENT_ID=agent_id_for_normal_tone
MISTRAL_TONE_EXPLANATORY_AGENT_ID=agent_id_for_explanatory_tone
MISTRAL_TONE_FORMAL_AGENT_ID=agent_id_for_formal_tone
MISTRAL_TONE_CONCISE_AGENT_ID=agent_id_for_concise_tone
MISTRAL_TONE_CASUAL_AGENT_ID=agent_id_for_casual_tone

# Mistral Agent IDs for Paragraph Formatting
MISTRAL_PARAGRAPH_1_AGENT_ID=agent_id_for_1_paragraph
MISTRAL_PARAGRAPH_2_AGENT_ID=agent_id_for_2_paragraphs
MISTRAL_PARAGRAPH_3_AGENT_ID=agent_id_for_3_paragraphs
MISTRAL_PARAGRAPH_4_AGENT_ID=agent_id_for_4_paragraphs
MISTRAL_PARAGRAPH_5_AGENT_ID=agent_id_for_5_paragraphs

# Mistral Agent ID for Hybrid Mode
MISTRAL_HYBRID_AGENT_ID=agent_id_for_hybrid_mode

# ============================================
# Other Services (Add as needed)
# ============================================

# OpenAI (if used for embeddings)
# OPEN_AI_API_KEY=your_openai_api_key_here

# Elasticsearch (if using vector search)
# ELASTICSEARCH_URL=http://localhost:9200
# ELASTICSEARCH_API_KEY=your_elasticsearch_api_key_here
```

### Step 2: Get Your Perplexity API Key

1. Go to **https://www.perplexity.ai/settings/api**
2. Sign in or create an account
3. Generate an API key
4. Copy the key and replace `your_actual_perplexity_api_key_here` in the `.env.local` file

### Step 3: Verify the Perplexity Model

Looking at your code, you're using the model `'sonar'`. According to your type definitions, the valid models are:
- `'sonar'` - Standard model
- `'sonar-pro'` - Pro model with better performance

The `'sonar'` model should work fine. If you have access to the pro version, you can change it to `'sonar-pro'` for better results.

### Step 4: Restart Your Development Server

After creating the `.env.local` file:

```bash
<code_block_to_apply_changes_from>
```

### Step 5: Test Full AI Mode

1. Navigate to `http://localhost:3000/murmur/dashboard`
2. Create or access a campaign
3. In the drafting section, select **"Full AI"** mode
4. Enter a prompt and test the generation

## 🔍 Debugging Tips

### Check Console Logs
The code includes helpful debug logging. Open your browser's Developer Console (F12) and look for:
- `[Full AI] Starting generation for contact:`
- `[Full AI] Perplexity prompt length:`
- `[Full AI] Perplexity response length:`

### Common Issues and Solutions

1. **"Perplexity API request failed"**
   - Your API key is invalid or not set correctly
   - Check that the key is copied correctly without extra spaces

2. **"Failed to generate email content"**
   - The API key might not have sufficient credits
   - Check your Perplexity account balance

3. **Still not working?**
   - Verify the `.env.local` file is in the root directory (same level as `package.json`)
   - Make sure there are no typos in `PERPLEXITY_API_KEY`
   - Check that you've restarted the development server after adding the file

## 📝 About the System Prompt

The system prompt for Full AI mode (`PERPLEXITY_FULL_AI_PROMPT`) is correctly configured in your `src/constants/ai.ts` file. It includes:
- Proper greeting format handling
- Company research integration
- Call-to-action formatting
- CEO-style writing instructions
- Extensive rules to avoid common AI pitfalls

The prompt is designed to generate professional, personalized emails that feel human-written.

## ✅ Final Checklist

- [ ] Created `.env.local` file in project root
- [ ] Added `PERPLEXITY_API_KEY` with valid API key
- [ ] Restarted the development server
- [ ] Checked browser console for any error messages
- [ ] Verified API key has credits available

Once you complete these steps, Full AI mode should work perfectly! The issue was simply that the environment variable wasn't set because the `.env.local` file was missing.
