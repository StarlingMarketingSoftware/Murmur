# Environment Variables Configuration

This document describes the required and optional environment variables for the Murmur application.

## Required Environment Variables

### OpenAI Configuration
**Required for vector search functionality**
```
OPEN_AI_API_KEY=your_openai_api_key_here
```
- Get your API key from: https://platform.openai.com/api-keys
- Without this key, vector search will automatically fall back to substring search

### Database Configuration
```
DATABASE_URL=postgresql://user:password@localhost:5432/murmur
```
- PostgreSQL connection string
- Required for all database operations

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/murmur/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/murmur/dashboard
```
- Get from: https://dashboard.clerk.com
- Required for user authentication

## Optional Environment Variables

### Elasticsearch Configuration
```
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_API_KEY=optional_api_key
```
- Default is http://localhost:9200 for local development
- API key is optional for secured instances

### Stripe Configuration (for payments)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Email Services
```
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your_domain.com
```

### Additional AI Services
```
MISTRAL_API_KEY=your_mistral_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### Contact Enrichment
```
APOLLO_API_KEY=your_apollo_api_key
```

### Application URL
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Vector Search Troubleshooting

If you're experiencing 500 errors when searching contacts with vector search enabled:

1. **Check OpenAI API Key**: Ensure `OPEN_AI_API_KEY` is set in your environment variables
2. **Check Elasticsearch**: Ensure Elasticsearch is running and accessible at the configured URL
3. **Fallback Behavior**: Without OpenAI API key, the system will automatically fall back to substring search

## Setting Environment Variables

1. Create a `.env.local` file in the root directory
2. Copy the required variables from above
3. Fill in your actual values
4. Restart your development server

Note: Never commit `.env.local` or any file containing actual API keys to version control.
