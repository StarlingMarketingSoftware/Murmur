import { FC } from 'react';
import { DraftingRightPanelProps, useDraftingRightPanel } from './useDraftingRightPanel';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { FlaskConicalIcon } from 'lucide-react';
import { StepSlider } from '@/components/atoms/StepSlider/StepSlider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { BlockSelect } from '@/components/atoms/BlockSelect/BlockSelect';
import { twMerge } from 'tailwind-merge';

export const DraftingRightPanel: FC<DraftingRightPanelProps> = (props) => {
	const {
		activeTab,
		setActiveTab,
		modeOptions,
		toneOptions,
		draftEmail,
		handleTestPrompt,
		isTest,
		areSettingsDisabled,
		form,
		isGenerationDisabled,
		draftingMode,
		hasTestMessage,
		showSettings,
	} = useDraftingRightPanel(props);

	return (
		<div className="flex flex-col gap-4 mt-6 p-5">
			{showSettings && (
				<BlockTabs
					activeValue={activeTab}
					onValueChange={setActiveTab}
					options={modeOptions}
				/>
			)}
			<div>
				{activeTab === 'settings' && (
					<>
						<Typography variant="h3" bold className="text-[28px] text-center mt-5">
							AI Prompt Settings
						</Typography>

						<div className="mx-auto w-fit mt-16">
							<Typography variant="h3" bold className="text-[26px]">
								Tone
							</Typography>
							<FormField
								control={form.control}
								name="draftingTone"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<BlockSelect
												options={toneOptions}
												value={field.value}
												onChange={field.onChange}
												disabled={areSettingsDisabled}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
						<div className="max-w-56 mx-auto mt-8">
							<Typography variant="h3" bold className="text-[26px] mt-8">
								Paragraphs
							</Typography>
							<Typography className="!text-[12px] mt-2" color="light">
								Select the number of paragraphs you want the AI to generate in your email
							</Typography>
							<FormField
								control={form.control}
								name="paragraphs"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<StepSlider
												disabled={areSettingsDisabled}
												className="mt-6"
												value={[field.value]}
												onValueChange={(value) => field.onChange(value[0])}
												max={5}
												step={1}
												min={0}
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
					</>
				)}
				{activeTab === 'test' && (
					<div className="grid gap-4 py-4 relative p-4">
						<div
							className={twMerge(
								!hasTestMessage
									? 'absolute w-full h-full top-0 left-0 backdrop-blur-xs z-10'
									: 'hidden'
							)}
						/>

						<div className="grid gap-2">
							<Label htmlFor="subject">Subject</Label>
							<Input
								id="subject"
								value={draftEmail.subject}
								readOnly
								placeholder="Subject for test email"
								disabled={isTest}
								className="col-span-3 !cursor-text !pointer-events-auto"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="message">Message</Label>
							<RichTextEditor
								className="!h-full grow overflow-y-auto"
								isEdit={false}
								hideMenuBar
								placeholder="Hello, this is a message for a test email. This is where your AI generated message will go once you test your prompt. Best regards."
								value={draftEmail.message}
								disabled={isTest}
							/>
						</div>
						<div
							className={twMerge(
								hasTestMessage && 'flex justify-center mt-8',
								!hasTestMessage &&
									'absolute top-1/2 left-1/2 -translate-x-1/2 z-20 -translate-y-1/2'
							)}
						>
							<Button
								isLoading={isTest}
								type="button"
								bold
								variant="primary-light"
								disabled={isGenerationDisabled()}
								onClick={() => {
									handleTestPrompt();
									setActiveTab('test');
								}}
							>
								<FlaskConicalIcon /> Test Your Prompt
							</Button>
						</div>
					</div>
				)}

				{activeTab === 'settings' && (
					<div className="flex justify-center mt-8">
						<Button
							isLoading={isTest}
							type="button"
							bold
							variant="primary-light"
							disabled={isGenerationDisabled()}
							onClick={() => {
								handleTestPrompt();
								setActiveTab('test');
							}}
						>
							<FlaskConicalIcon /> Test Your Prompt
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};
