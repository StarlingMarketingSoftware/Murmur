import { draftingFormSchema } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';
import { CampaignWithRelations, OptionWithLabel, TestDraftEmail } from '@/types';
import { DraftingMode, DraftingTone } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

type ActiveTab = 'settings' | 'test';

export interface ToneOption extends OptionWithLabel<DraftingTone> {
	description: string;
}
export interface DraftingRightPanelProps {
	campaign: CampaignWithRelations;
	handleTestPrompt: () => Promise<void>;
	isTest: boolean;
	draftingMode: DraftingMode;
	isGenerationDisabled: () => boolean;
}

export const useDraftingRightPanel = (props: DraftingRightPanelProps) => {
	const { campaign, handleTestPrompt, isTest, draftingMode, isGenerationDisabled } =
		props;
	const form = useFormContext<z.infer<typeof draftingFormSchema>>();
	const areSettingsDisabled = draftingMode !== 'ai';

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

	const draftEmail: TestDraftEmail = useMemo(
		() => ({
			subject: campaign.testSubject || '',
			message: campaign.testMessage || '',
			contactEmail: '',
		}),
		[campaign.testSubject, campaign.testMessage]
	);

	useEffect(() => {
		if (draftingMode !== 'ai') {
			setActiveTab('test');
		}
	}, [draftingMode]);

	const hasTestMessage = campaign.testMessage || campaign.testSubject;

	return {
		campaign,
		activeTab,
		setActiveTab,
		modeOptions,
		toneOptions,
		draftEmail,
		handleTestPrompt,
		isTest,
		form,
		areSettingsDisabled,
		isGenerationDisabled,
		draftingMode,
		hasTestMessage,
	};
};
