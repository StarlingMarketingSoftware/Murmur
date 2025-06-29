import { MISTRAL_TONE_AGENT_KEYS } from '@/constants';

export type ApiRouteParams = Promise<{ id: string }>;

export interface CustomQueryOptions {
	filters?: Record<string, string | number | number[]>;
	enabled?: boolean;
}

export interface CustomMutationOptions {
	suppressToasts?: boolean;
	successMessage?: string;
	errorMessage?: string;
	onSuccess?: () => void;
}

export type MistralToneAgentType = (typeof MISTRAL_TONE_AGENT_KEYS)[number];
export type MistralParagraphAgentType = (typeof MISTRAL_TONE_AGENT_KEYS)[number];
export type MistralAgentType = MistralToneAgentType | MistralParagraphAgentType;
