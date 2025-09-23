import { FormControl, FormField, FormItem } from '@/components/ui/form';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';
import { StepSlider } from '../StepSlider/StepSlider';

export const ParagraphSlider: FC = () => {
	const form = useFormContext();
	return (
		<div className="mt-4 flex justify-start -ml-10">
			<div className="flex items-start gap-4">
				<span className="text-[10px] text-black font-inter font-normal relative top-[-7px] block w-[140px] text-right whitespace-nowrap shrink-0">
					{(() => {
						const selectedParagraphCount = form.watch('paragraphs') ?? 0;
						if (selectedParagraphCount === 0) return 'Auto Paragraphs';
						const paragraphLabels = [
							'One Paragraph',
							'Two Paragraphs',
							'Three Paragraphs',
							'Four Paragraphs',
							'Five Paragraphs',
						];
						const clampedIndex = Math.min(Math.max(selectedParagraphCount, 1), 5) - 1;
						return paragraphLabels[clampedIndex];
					})()}
				</span>
				<div className="w-[189px]">
					<FormField
						control={form.control}
						name="paragraphs"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<StepSlider
										value={[field.value]}
										onValueChange={(value) => field.onChange(value[0])}
										max={5}
										step={1}
										min={0}
										showStepIndicators={true}
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>
			</div>
		</div>
	);
};
