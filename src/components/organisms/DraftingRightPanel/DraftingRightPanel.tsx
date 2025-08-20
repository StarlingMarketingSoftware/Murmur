import { FC } from 'react';
import { DraftingRightPanelProps, useDraftingRightPanel } from './useDraftingRightPanel';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
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
		toneOptions,
		draftEmail,
		handleTestPrompt,
		isTest,
		areSettingsDisabled,
		form,
		isGenerationDisabled,
		hasTestMessage,
		showSettings,
		insertPlaceholder,
	} = useDraftingRightPanel(props);

	return (
		<div className="flex flex-col">
			<div className="w-[559px] h-[530px] border border-black rounded-lg overflow-y-auto">
				{activeTab === 'settings' && showSettings && (
					<div className="p-4">
						<div className="mx-auto w-fit mt-2">
							<Typography variant="h3" bold className="text-[22px]">
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
						<div className="max-w-56 mx-auto mt-4">
							<Typography variant="h3" bold className="text-[22px]">
								Paragraphs
							</Typography>
							<Typography className="!text-[10px] mt-0.5" color="light">
								Select the number of paragraphs you want to generate automatically in your email
							</Typography>
							<FormField
								control={form.control}
								name="paragraphs"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<StepSlider
												disabled={areSettingsDisabled}
												className="mt-3"
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
					</div>
				)}
				{activeTab === 'test' && (
					<div className="grid gap-4 p-6 relative">
						<div
												className={twMerge(
						!hasTestMessage
							? 'absolute w-full h-full top-0 left-0 backdrop-blur-sm z-10'
							: 'hidden'
					)}
					style={{
						WebkitBackdropFilter: 'blur(4px)',
						backdropFilter: 'blur(4px)'
					}}
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
								placeholder="Hello, this is a message for a test email. This is where your automated message will go once you test your prompt. Best regards."
								value={draftEmail.message}
								disabled={isTest}
							/>
						</div>

					</div>
				)}

				{activeTab === 'placeholders' && (
					<div className="p-4">
						<div className="grid grid-cols-2 gap-2">
							{[
								{ placeholder: '{{firstName}}', label: 'First Name' },
								{ placeholder: '{{lastName}}', label: 'Last Name' },
								{ placeholder: '{{company}}', label: 'Company' },
								{ placeholder: '{{email}}', label: 'Email' },
								{ placeholder: '{{phone}}', label: 'Phone' },
								{ placeholder: '{{address}}', label: 'Address' },
								{ placeholder: '{{city}}', label: 'City' },
								{ placeholder: '{{state}}', label: 'State' },
								{ placeholder: '{{country}}', label: 'Country' },
								{ placeholder: '{{website}}', label: 'Website' },
								{ placeholder: '{{senderName}}', label: 'Your Name' },
								{ placeholder: '{{senderWebsite}}', label: 'Your Website' },
							].map(({ placeholder, label }) => (
								<div
									key={placeholder}
									className="flex flex-col gap-0.5 p-2 border rounded-md cursor-pointer hover:bg-accent transition-colors select-none"
									onClick={(e) => {
										e.stopPropagation();
										if (insertPlaceholder) {
											// Use requestAnimationFrame for Safari compatibility
											requestAnimationFrame(() => {
												insertPlaceholder(placeholder);
											});
										}
									}}
									tabIndex={0}
									role="button"
									aria-label={`Insert ${label} placeholder`}
								>
									<code className="text-xs font-mono text-primary">{placeholder}</code>
									<Typography className="text-[10px] text-muted">{label}</Typography>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
			<div className="flex justify-center mt-4">
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
					className="!w-[558px] !h-[51px] !rounded-[8px] !bg-[#5DAB68]/20 !border !border-[#5DAB68] hover:!bg-[#5DAB68]/30"
				>
					Test Your Prompt
				</Button>
			</div>
		</div>
	);
};
