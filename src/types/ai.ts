import { OPEN_AI_MODEL_OPTIONS } from '@/constants';

export type PerplexityModel = 'sonar' | 'sonar-pro';

export type OpenAiModel = keyof typeof OPEN_AI_MODEL_OPTIONS;

export type PerplexitySearchResult = {
	title: string;
	url: string;
	date: string | null;
	last_updated: string | null;
};

export type PerplexityMessage = {
	role: string;
	content: string;
};

export type PerplexityChoice = {
	index: number;
	finish_reason: string;
	message: PerplexityMessage;
	delta: PerplexityMessage;
};

export type PerplexityCompletionObject = {
	id: string;
	model: string;
	created: number;
	usage: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
		search_context_size: string;
	};
	citations: string[];
	search_results: PerplexitySearchResult[];
	object: string;
	choices: PerplexityChoice[];
};
