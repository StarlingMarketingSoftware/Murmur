import { capitalize, cn } from '@/utils';
import { DraftingTone } from '@prisma/client';
import { Plus, X } from 'lucide-react';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';

interface ToneSelectorProps {
	isCompact?: boolean;
}

export const ToneSelector: FC<ToneSelectorProps> = ({ isCompact = false }) => {
	const form = useFormContext();
	const [isToneExpanded, setIsToneExpanded] = useState(false);
	const watchedDraftingTone: DraftingTone = form.watch('draftingTone');

	const TONE_SELECTOR_OPTIONS = [
		{
			value: DraftingTone.normal,
			cn: 'bg-[#E8EFFF] hover:bg-[#d8e0f2]',
		},
		{
			value: DraftingTone.explanatory,
			cn: 'bg-[#F8E8FF] hover:bg-[#e8d8f2]',
		},
		{
			value: DraftingTone.formal,
			cn: 'bg-[#FFE8EC] hover:bg-[#f2d8dc]',
		},
		{
			value: DraftingTone.concise,
			cn: 'bg-[#FFF9E8] hover:bg-[#f2edd8]',
		},
		{
			value: DraftingTone.casual,
			cn: 'bg-[#E8FFF1] hover:bg-[#d8f2e1]',
		},
	];

	const selectedTone: DraftingTone = form.watch('draftingTone');

	const filteredToneSelectorOptions = isToneExpanded
		? TONE_SELECTOR_OPTIONS
		: TONE_SELECTOR_OPTIONS.filter((tone) => tone.value === selectedTone);

	return (
		<>
			<div
				className={cn(
					'flex gap-1 relative z-[100] pointer-events-auto',
					isCompact ? 'w-full flex-wrap' : 'items-center',
					// On very small screens, when expanded, move to its own row and wrap
					isToneExpanded &&
						'max-[480px]:basis-full max-[480px]:w-full max-[480px]:flex-wrap max-[480px]:mt-1'
				)}
			>
				{filteredToneSelectorOptions.map((tone) => (
					<button
						key={tone.value}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							const currentTone =
								(form.getValues('draftingTone') as DraftingTone) ??
								(form.watch('draftingTone') as DraftingTone);
							form.setValue('draftingTone', tone.value);
							if (currentTone !== tone.value) {
								setIsToneExpanded(false);
							}
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
						}}
						className={cn(
							'w-[85px] h-[20px] rounded-[8px] text-[13px] text-black font-light transition-all flex items-center justify-center font-inter cursor-pointer',
							'focus:outline-none focus:ring-0 active:outline-none',
							isToneExpanded ? 'pointer-events-auto' : 'pointer-events-none',
							tone.value === watchedDraftingTone && 'border border-black',
							tone.cn
						)}
					>
						{capitalize(tone.value)}
					</button>
				))}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						setIsToneExpanded((prev) => !prev);
					}}
					onMouseDown={(e) => {
						e.stopPropagation();
					}}
					className={cn(
						'w-[20px] h-[20px] rounded-[8px] bg-transparent flex items-center justify-center hover:bg-gray-100',
						isToneExpanded && 'ml-1'
					)}
				>
					{isToneExpanded ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
				</button>
			</div>
		</>
	);
};
