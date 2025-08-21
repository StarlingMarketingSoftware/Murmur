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

	// console.log('✅ All required environment variables are configured');
	return true;
}

// Only run the check in development mode and on the server side
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
	checkRequiredEnvVariables();
}
