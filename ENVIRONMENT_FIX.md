# 🚨 FIX FOR 500 INTERNAL SERVER ERRORS

## The Problem
Your API is returning 500 errors because **required environment variables are missing**. The contact search feature requires the `OPEN_AI_API_KEY` to parse location information from search queries like "music venues new york city".

## Quick Fix Instructions

### Step 1: Create the `.env.local` file

Create a new file called `.env.local` in your project root directory (same level as `package.json`) with this content:

```env
# MINIMUM REQUIRED FOR CONTACT SEARCH TO WORK
OPEN_AI_API_KEY=your_actual_openai_api_key_here

# Add your other existing environment variables below if you have them
```

### Step 2: Get your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)
5. Replace `your_actual_openai_api_key_here` in the `.env.local` file with your actual key

### Step 3: Restart your development server

```bash
# Stop the server (Ctrl+C) and restart it
npm run dev
```

### Step 4: Test the search again

The search should now work without 500 errors!

## What was happening?

1. When you search for "music venues new york city", the API tries to use OpenAI to parse the location ("new york city") from the rest of the query ("music venues")
2. Without the `OPEN_AI_API_KEY`, this fails and causes a 500 error
3. The API was returning plain text "Internal Server Error" instead of JSON, causing the "Unexpected token 'I'" error

## Additional Environment Variables (Optional)

If you want ALL features to work, you may also need:

```env
# For Full AI email generation
PERPLEXITY_API_KEY=your_perplexity_key

# For Mistral tone adjustments
MISTRAL_API_KEY=your_mistral_key

# Database (you probably already have this)
DATABASE_URL=your_database_url

# Authentication (you probably already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Stripe payments (if using)
STRIPE_SECRET_KEY=your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Verifying the Fix

After restarting, check your server console. You should see:
```
--- DEBUG: API Key from env (OPEN_AI_API_KEY): Exists
```

Instead of:
```
--- DEBUG: API Key from env (OPEN_AI_API_KEY): MISSING!
```

## Still Having Issues?

1. Make sure the `.env.local` file is in the root directory
2. Check that there are no typos in `OPEN_AI_API_KEY`
3. Ensure your OpenAI API key has credits available
4. Check the server console for more detailed error messages (we added better logging)

## Security Note

**NEVER commit the `.env.local` file to Git!** It should already be in `.gitignore`, but double-check to make sure your API keys stay private.
