import { FC } from 'react';
import {
	DraftingRightPanelProps,
	ToneOption,
	useDraftingRightPanel,
} from './useDraftingRightPanel';
import { BlockTabs } from '@/components/atoms/BlockTabs/BlockTabs';
import { Typography } from '@/components/ui/typography';
import { twMerge } from 'tailwind-merge';
import { Button } from '@/components/ui/button';
import { FlaskConicalIcon } from 'lucide-react';
import { StepSlider } from '@/components/atoms/StepSlider/StepSlider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/molecules/RichTextEditor/RichTextEditor';
import { RecipientAddressLockableInput } from '@/components/atoms/RecipientAddressLockableInput/RecipientAddressLockableInput';
import { FormField, FormItem, FormControl } from '@/components/ui/form';
import { useFormContext } from 'react-hook-form';

export const DraftingRightPanel: FC<DraftingRightPanelProps> = (props) => {
	const { activeTab, setActiveTab, modeOptions, toneOptions, draftEmail } =
		useDraftingRightPanel(props);

	const form = useFormContext();

	return (
		<div className="flex flex-col gap-4 mt-6 p-5">
			<BlockTabs
				activeValue={activeTab}
				onValueChange={setActiveTab}
				options={modeOptions}
			/>
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
								name="tone"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<div className="grid grid-cols-2 gap-3 mt-2 w-fit">
												{toneOptions.map((tone: ToneOption) => (
													<div
														key={tone.value}
														className={twMerge(
															'w-[194px] h-[78px] border-2 p-1 col-span-1 transition',
															tone.value === field.value
																? ' bg-gradient-to-br from-background to-primary/30 pointer-events-none border-primary'
																: 'cursor-pointer hover:bg-primary/10 border-border'
														)}
														onClick={() => field.onChange(tone.value)}
													>
														<Typography
															variant="h4"
															className="text-[20px]"
															font="secondary"
														>
															{tone.label}
														</Typography>
														<Typography className="text-[12px]">
															{tone.description}
														</Typography>
													</div>
												))}
											</div>
										</FormControl>
									</FormItem>
								)}
							/>
						</div>
						<div className="max-w-56 mx-auto mt-8">
							<Typography variant="h3" bold className="text-[26px] mt-8">
								Paragraphs
							</Typography>
							<Typography className="text-[12px] mt-2" color="light">
								Select the number of paragraphs you want the AI to generate in your email
							</Typography>
							<FormField
								control={form.control}
								name="paragraphs"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<StepSlider
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
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="email">Recipient</Label>
							<div className="relative">
								<RecipientAddressLockableInput
									email={draftEmail.contactEmail}
									overrideTierShowEmail
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="subject">Subject</Label>
							<Input
								id="subject"
								defaultValue={draftEmail.subject}
								readOnly
								className="col-span-3 !cursor-text !pointer-events-auto"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="message">Message</Label>
							<RichTextEditor
								className="!h-full grow max-h-[200px] overflow-y-auto"
								isEdit={false}
								hideMenuBar
								value={draftEmail.message}
							/>
						</div>
					</div>
				)}
				<div className="flex justify-center mt-8">
					<Button variant="primary-light">
						<FlaskConicalIcon /> Test Your Prompt
					</Button>
				</div>
			</div>
		</div>
	);
};
