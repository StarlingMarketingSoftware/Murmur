import { CampaignWithRelations, OptionWithLabel, TestDraftEmail } from '@/types';
import { DraftingTone } from '@prisma/client';
import { useState } from 'react';

export interface DraftingRightPanelProps {
	campaign: CampaignWithRelations;
}
type ActiveTab = 'settings' | 'test';

export interface ToneOption extends OptionWithLabel<DraftingTone> {
	description: string;
}

export const useDraftingRightPanel = (props: DraftingRightPanelProps) => {
	const { campaign } = props;

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
		subject: '',
		message: '',
		contactEmail: '',
	};

	return {
		campaign,
		activeTab,
		setActiveTab,
		modeOptions,
		toneOptions,
		draftEmail,
	};
};
