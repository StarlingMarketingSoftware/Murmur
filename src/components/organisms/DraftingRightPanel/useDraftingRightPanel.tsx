import { CampaignWithRelations, OptionWithLabel, TestDraftEmail } from '@/types';
import { useState } from 'react';

export interface DraftingRightPanelProps {
	campaign: CampaignWithRelations;
}
type ActiveTab = 'settings' | 'test';
type Tone = 'normal' | 'explanatory' | 'formal' | 'concise' | 'casual';

export interface ToneOption extends OptionWithLabel<Tone> {
	description: string;
}

export const useDraftingRightPanel = (props: DraftingRightPanelProps) => {
	const { campaign } = props;

	const [activeTab, setActiveTab] = useState<ActiveTab>('settings');
	const [selectedTone, setSelectedTone] = useState<Tone>('normal');

	const modeOptions: OptionWithLabel<ActiveTab>[] = [
		{ value: 'settings', label: 'Settings' },
		{ value: 'test', label: 'Test' },
	];

	const toneOptions: ToneOption[] = [
		{
			value: 'normal',
			label: 'Normal',
			description: 'A standard professional tone',
		},
		{
			value: 'explanatory',
			label: 'Explanatory',
			description: 'Give more details in your email',
		},
		{
			value: 'formal',
			label: 'Formal',
			description: 'For organizations and businesses',
		},
		{
			value: 'concise',
			label: 'Concise',
			description: 'Keep your email short and to-the-point',
		},
		{
			value: 'casual',
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
		selectedTone,
		setSelectedTone,
		draftEmail,
	};
};
