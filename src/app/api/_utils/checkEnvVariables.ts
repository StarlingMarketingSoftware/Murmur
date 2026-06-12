// Check for required environment variables and log warnings

const requiredEnvVars = {
	// Core AI Services
	PERPLEXITY_API_KEY: 'Perplexity API key (required for email content generation)',
	MISTRAL_API_KEY: 'Mistral API key (required for tone adjustment)',

	// Mistral Agent IDs
	MISTRAL_AGENT_ID: 'Mistral agent for normal tone',
	MISTRAL_TONE_EXPLANATORY_AGENT_ID: 'Mistral agent for explanatory tone',
	MISTRAL_TONE_FORMAL_AGENT_ID: 'Mistral agent for formal tone',
	MISTRAL_TONE_CONCISE_AGENT_ID: 'Mistral agent for concise tone',
	MISTRAL_TONE_CASUAL_AGENT_ID: 'Mistral agent for casual tone',
	MISTRAL_PARAGRAPH_1_AGENT_ID: 'Mistral agent for 1 paragraph formatting',
	MISTRAL_PARAGRAPH_2_AGENT_ID: 'Mistral agent for 2 paragraphs formatting',
	MISTRAL_PARAGRAPH_3_AGENT_ID: 'Mistral agent for 3 paragraphs formatting',
	MISTRAL_PARAGRAPH_4_AGENT_ID: 'Mistral agent for 4 paragraphs formatting',
	MISTRAL_PARAGRAPH_5_AGENT_ID: 'Mistral agent for 5 paragraphs formatting',
	MISTRAL_HYBRID_AGENT_ID: 'Mistral agent for hybrid mode',

	// Cloudflare R2 media storage (profile video/audio/photo uploads)
	R2_ACCOUNT_ID: 'Cloudflare R2 account id (media uploads)',
	R2_ACCESS_KEY_ID: 'Cloudflare R2 S3 access key id (media uploads)',
	R2_SECRET_ACCESS_KEY: 'Cloudflare R2 S3 secret access key (media uploads)',
	R2_BUCKET: 'Cloudflare R2 bucket name, e.g. murmur (media uploads)',
};

// Optional but strongly recommended: Upstash Redis powers API rate limiting.
// When unset, rate limiting is disabled (fail-open) — fine for local dev,
// but it MUST be configured in production to prevent cost-amplification abuse.
const optionalEnvVars = {
	UPSTASH_REDIS_REST_URL: 'Upstash Redis REST URL (API rate limiting)',
	UPSTASH_REDIS_REST_TOKEN: 'Upstash Redis REST token (API rate limiting)',
};

export function checkRequiredEnvVariables() {
	const missingVars: string[] = [];

	for (const [varName, description] of Object.entries(requiredEnvVars)) {
		if (!process.env[varName]) {
			missingVars.push(`  ❌ ${varName}: ${description}`);
		}
	}

	if (missingVars.length > 0) {
		console.warn(
			'⚠️  WARNING: Missing environment variables for Full AI email generation:'
		);
		console.warn(missingVars.join('\n'));
		console.warn('\n📚 See ENV_SETUP_GUIDE.md for setup instructions');
		console.warn(
			'🔧 Full AI email generation will not work properly without these variables\n'
		);
		return false;
	}

	return true;
}

export function checkOptionalEnvVariables() {
	const missing = Object.entries(optionalEnvVars)
		.filter(([varName]) => !process.env[varName])
		.map(([varName, description]) => `  ⚠️  ${varName}: ${description}`);

	if (missing.length > 0) {
		console.warn('⚠️  Optional environment variables not set:');
		console.warn(missing.join('\n'));
		console.warn(
			'🛡️  API rate limiting is DISABLED until UPSTASH_REDIS_REST_URL/TOKEN are set.\n'
		);
	}
}

// Only run the check in development mode and on the server side
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
	checkRequiredEnvVariables();
	checkOptionalEnvVariables();
}
