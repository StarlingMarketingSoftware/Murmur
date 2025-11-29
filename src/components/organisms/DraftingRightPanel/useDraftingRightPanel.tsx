import { CampaignWithRelations, OptionWithLabel, TestDraftEmail } from '@/types';
import { useMemo } from 'react';

type ActiveTab = 'test' | 'placeholders';
export interface DraftingRightPanelProps {
	campaign: CampaignWithRelations;
	handleTestPrompt: () => Promise<void>;
	isTest: boolean;
	isGenerationDisabled: () => boolean;
	insertPlaceholder?: (placeholder: string) => void;
	activeTab: ActiveTab;
	setActiveTab?: (tab: ActiveTab) => void;
}

export const useDraftingRightPanel = (props: DraftingRightPanelProps) => {
	const {
		campaign,
		handleTestPrompt,
		isTest,
		isGenerationDisabled,
		insertPlaceholder,
		activeTab,
		setActiveTab,
	} = props;

	const modeOptions: OptionWithLabel<ActiveTab>[] = [
		{ value: 'test', label: 'Test' },
		{ value: 'placeholders', label: 'Placeholders' },
	];

	const draftEmail: TestDraftEmail = useMemo(
		() => ({
			subject: campaign.testSubject || '',
			message: campaign.testMessage || '',
			contactEmail: '',
		}),
		[campaign.testSubject, campaign.testMessage]
	);

	const hasTestMessage = campaign.testMessage || campaign.testSubject;

	return {
		campaign,
		activeTab,
		setActiveTab: setActiveTab || (() => {}), // Use prop if provided, otherwise no-op
		modeOptions,
		draftEmail,
		handleTestPrompt,
		isTest,
		isGenerationDisabled,
		hasTestMessage,
		insertPlaceholder,
	};
};
