import { AiModel } from '@prisma/client';

export type AiType = 'perplexity' | 'openai';

export type AiSelectValues = {
	name: string;
	value: AiModel;
	type: AiType;
};
