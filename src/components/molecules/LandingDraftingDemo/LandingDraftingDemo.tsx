'use client';

import React, { type FC, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { DEFAULT_FONT } from '@/constants/ui';
import { DraftingTone } from '@/constants/prismaEnums';
import { HybridPromptInput } from '@/components/molecules/HybridPromptInput/HybridPromptInput';
import { PromptSuggestionsBox } from '@/components/molecules/HybridPromptInput/PromptSuggestionsBox';
import { HybridBlock, type Identity } from '@prisma/client';
import type { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';

const DEMO_SUGGESTIONS = [
	'Add your EPK to help the venue understand who you are',
	'Add more information about what music your band plays',
	'Add one detail about your best live draw or notable past shows',
];

const INITIAL_CUSTOM_INSTRUCTIONS =
	'Help me write a short and concise booking pitch.\nWe play modern jazz with a bit of indie energy.\nKeep it warm, clear, and brief.';

export const LandingDraftingDemo: FC = () => {
	const router = useRouter();
	const [identity, setIdentity] = useState<Identity>(() => ({
		id: 0,
		name: 'Parker Jazz Trio',
		website: 'https://parkerjazztrio.com',
		email: 'parkerjazztrio@example.com',
		genre: 'Jazz',
		area: 'Brooklyn, NY',
		bandName: 'Parker Jazz Trio',
		bio: 'A modern jazz trio blending originals with adventurous standards. We keep sets tight, dynamic, and venue-friendly.',
		userId: 'demo',
		createdAt: new Date(),
		updatedAt: new Date(),
	}));

	// Local-only suggestions state (no DB/network).
	const [promptQualityScore, setPromptQualityScore] = useState<number | null>(75);
	const [promptQualityLabel, setPromptQualityLabel] = useState<string | null>('Good');
	const [promptSuggestions, setPromptSuggestions] = useState<string[]>(DEMO_SUGGESTIONS);
	const [isUpscalingPrompt, setIsUpscalingPrompt] = useState(false);
	const [previousPromptValue, setPreviousPromptValue] = useState<string | null>(null);
	const hasPreviousPrompt = previousPromptValue != null;

	// Layout specs for landing demo (px)
	const suggestionsSpec = {
		left: 43,
		top: 52,
		width: 338,
		height: 290,
	} as const;
	const hybridPromptInputSpec = {
		right: 90,
		top: 48,
		width: 416,
		height: 587,
	} as const;

	// HybridPromptInput is designed around a 499x703 desktop panel; scale it to fit 416x587.
	const HPI_BASE_WIDTH = 499;
	const HPI_BASE_HEIGHT = 703;
	const hpiScale = hybridPromptInputSpec.width / HPI_BASE_WIDTH;

	const form = useForm<DraftingFormValues>({
		defaultValues: {
			isAiSubject: true,
			subject: '',
			fullAiPrompt: '',
			bookingFor: 'Anytime',
			hybridPrompt: 'Generate a professional email based on the template below.',
			hybridAvailableBlocks: [
				HybridBlock.full_automated,
				HybridBlock.introduction,
				HybridBlock.research,
				HybridBlock.action,
				HybridBlock.text,
			],
			hybridBlockPrompts: [
				{
					id: 'full_automated',
					type: HybridBlock.full_automated,
					value: INITIAL_CUSTOM_INSTRUCTIONS,
				},
			],
			savedHybridBlocks: [],
			savedManualBlocks: [],
			handwrittenPrompt: '',
			font: DEFAULT_FONT,
			fontSize: 12,
			signatureId: undefined,
			signature: `Thank you,\n${identity.name}`,
			draftingTone: DraftingTone.normal,
			paragraphs: 0,
			powerMode: 'normal',
		},
		mode: 'onChange',
	});

	const getFullAutoPromptFieldName = useCallback(() => {
		const blocks = form.getValues('hybridBlockPrompts') || [];
		const idx = blocks.findIndex((b) => b.type === HybridBlock.full_automated);
		if (idx === -1) return null;
		return `hybridBlockPrompts.${idx}.value`;
	}, [form]);

	const handleGetSuggestions = useCallback(async () => {
		// Keep it “real” feeling without any backend calls.
		setPromptQualityScore(75);
		setPromptQualityLabel('Good');
		setPromptSuggestions(DEMO_SUGGESTIONS);
	}, []);

	const handleUpscalePrompt = useCallback(async () => {
		setIsUpscalingPrompt(true);
		router.push('/free-trial');
	}, [router]);

	const handleUndoUpscalePrompt = useCallback(() => {
		const fullAutoPromptFieldName = getFullAutoPromptFieldName();
		if (!fullAutoPromptFieldName) return;
		if (previousPromptValue == null) return;
		form.setValue(fullAutoPromptFieldName as any, previousPromptValue, { shouldDirty: true });
		setPreviousPromptValue(null);
	}, [form, getFullAutoPromptFieldName, previousPromptValue]);

	return (
		<div className="w-full h-full relative">
			{/* Suggestions box */}
			<div
				className="absolute"
				style={{
					left: suggestionsSpec.left,
					top: suggestionsSpec.top,
					width: suggestionsSpec.width,
					height: suggestionsSpec.height,
				}}
			>
				<PromptSuggestionsBox
					variant="landing"
					title="Suggestions"
					promptQualityScore={promptQualityScore}
					promptQualityLabel={promptQualityLabel}
					suggestions={promptSuggestions}
					isUpscalingPrompt={isUpscalingPrompt}
					hasPreviousPrompt={hasPreviousPrompt}
					onUpscalePrompt={handleUpscalePrompt}
					onUndoUpscalePrompt={handleUndoUpscalePrompt}
					style={{ width: '100%', height: '100%' }}
				/>
			</div>

			{/* HybridPromptInput */}
			<div
				className="absolute"
				style={{
					right: hybridPromptInputSpec.right,
					top: hybridPromptInputSpec.top,
					width: hybridPromptInputSpec.width,
					height: hybridPromptInputSpec.height,
				}}
			>
				<div
					style={{
						width: HPI_BASE_WIDTH,
						height: HPI_BASE_HEIGHT,
						transform: `scale(${hpiScale})`,
						transformOrigin: 'top left',
					}}
				>
					<Form {...form}>
						<HybridPromptInput
							defaultOpenFullAutoCustomInstructions
							useStaticDropdownPosition
							testMessage="Demo only"
							handleGenerateTestDrafts={() => {
								router.push('/free-trial');
							}}
							isGenerationDisabled={() => false}
							isPendingGeneration={false}
							isTest={false}
							hideDraftButton
							onGetSuggestions={handleGetSuggestions}
							onUpscalePrompt={handleUpscalePrompt}
							isUpscalingPrompt={isUpscalingPrompt}
							promptQualityScore={promptQualityScore}
							promptQualityLabel={promptQualityLabel}
							hasPreviousPrompt={hasPreviousPrompt}
							onUndoUpscalePrompt={handleUndoUpscalePrompt}
							identity={identity}
							onIdentityUpdate={(data) => {
								setIdentity((prev) => ({ ...prev, ...(data as any), updatedAt: new Date() }));
							}}
						/>
					</Form>
				</div>
			</div>
		</div>
	);
};

