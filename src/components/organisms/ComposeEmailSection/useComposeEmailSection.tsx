import { CampaignWithRelations } from '@/types';
import { useState } from 'react';

export interface ComposeEmailSectionProps {
	campaign: CampaignWithRelations;
}

type DraftingMode = 'ai' | 'hybrid' | 'handwritten';
type ModeOption = {
	value: DraftingMode;
	label: string;
};

const useComposeEmailSection = (props: ComposeEmailSectionProps) => {
	const { campaign } = props;
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);
	const [draftingMode, setDraftingMode] = useState<DraftingMode>('ai');

	const modeOptions: ModeOption[] = [
		{ value: 'ai', label: 'Full AI' },
		{ value: 'hybrid', label: 'Hybrid' },
		{ value: 'handwritten', label: 'Handwritten' },
	];

	return {
		isAiDraft,
		setIsAiDraft,
		campaign,
		draftingMode,
		setDraftingMode,
		modeOptions,
	};
};

export default useComposeEmailSection;
