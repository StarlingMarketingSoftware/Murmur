import { CampaignWithRelations, OptionWithLabel, TestDraftEmail } from '@/types';
import { DraftingTone } from '@prisma/client';
import { useState } from 'react';

type ActiveTab = 'settings' | 'test';

export interface ToneOption extends OptionWithLabel<DraftingTone> {
	description: string;
}
export interface DraftingRightPanelProps {
	campaign: CampaignWithRelations;
	handleTestPrompt: () => Promise<void>;
	isTest: boolean;
}

export const useDraftingRightPanel = (props: DraftingRightPanelProps) => {
	const { campaign, handleTestPrompt, isTest } = props;

	const [activeTab, setActiveTab] = useState<ActiveTab>('settings');

	const modeOptions: OptionWithLabel<ActiveTab>[] = [
		{ value: 'settings', label: 'Settings' },
		{ value: 'test', label: 'Test' },
	];

	const toneOptions: ToneOption[] = [
		{
			value: DraftingTone.normal,
			label: 'Normal',
			description: 'A standard professional tone',
		},
		{
			value: DraftingTone.explanatory,
			label: 'Explanatory',
			description: 'Give more details in your email',
		},
		{
			value: DraftingTone.formal,
			label: 'Formal',
			description: 'For organizations and businesses',
		},
		{
			value: DraftingTone.concise,
			label: 'Concise',
			description: 'Keep your email short and to-the-point',
		},
		{
			value: DraftingTone.casual,
			label: 'Casual',
			description: 'For everyday emails',
		},
	];

	const draftEmail: TestDraftEmail = {
		subject: campaign.testSubject || '',
		message: campaign.testMessage || '',
		contactEmail: '',
	};

	return {
		campaign,
		activeTab,
		setActiveTab,
		modeOptions,
		toneOptions,
		draftEmail,
		handleTestPrompt,
		isTest,
	};
};
