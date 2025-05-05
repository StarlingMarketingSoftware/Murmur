import { CampaignWithRelations } from '@/constants/types';
import { useState } from 'react';

export interface ComposeEmailSectionProps {
	campaign: CampaignWithRelations;
}

const useComposeEmailSection = (props: ComposeEmailSectionProps) => {
	const [isAiDraft, setIsAiDraft] = useState<boolean>(true);

	return {
		isAiDraft,
		setIsAiDraft,
		...props,
	};
};

export default useComposeEmailSection;
