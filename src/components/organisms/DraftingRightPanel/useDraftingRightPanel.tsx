import { draftingFormSchema } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { CampaignWithRelations, OptionWithLabel, TestDraftEmail } from '@/types';
import { DraftingTone } from '@prisma/client';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';

type ActiveTab = 'settings' | 'test' | 'placeholders';

export interface ToneOption extends OptionWithLabel<DraftingTone> {
	description: string;
}
export interface DraftingRightPanelProps {
	campaign: CampaignWithRelations;
	handleTestPrompt: () => Promise<void>;
	isTest: boolean;
	isGenerationDisabled: () => boolean;
	hasFullAutomatedBlock?: boolean;
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
		hasFullAutomatedBlock,
		insertPlaceholder,
		activeTab,
		setActiveTab,
	} = props;
	const form = useFormContext<z.infer<typeof draftingFormSchema>>();
	const areSettingsDisabled = !hasFullAutomatedBlock;
	const showSettings = hasFullAutomatedBlock; // Only show settings when Full Automated block is present

	const modeOptions: OptionWithLabel<ActiveTab>[] = [
		{ value: 'settings', label: 'Settings' },
		{ value: 'test', label: 'Test' },
		{ value: 'placeholders', label: 'Placeholders' },
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

	const hasTestMessage = campaign.testMessage || campaign.testSubject;

	return {
		campaign,
		activeTab,
		setActiveTab: setActiveTab || (() => {}), // Use prop if provided, otherwise no-op
		modeOptions,
		toneOptions,
		draftEmail,
		handleTestPrompt,
		isTest,
		form,
		areSettingsDisabled,
		isGenerationDisabled,
		hasTestMessage,
		showSettings,
		insertPlaceholder,
	};
};
