import { cn } from '@/utils';
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

	const selectedTone =
		(form.watch('draftingTone') as DraftingTone) || DraftingTone.normal;

	return (
		<>
			{!isToneExpanded &&
				(() => {
					const selectedTone =
						(form.watch('draftingTone') as DraftingTone) || DraftingTone.normal;

					const selectedLabel =
						selectedTone === DraftingTone.normal
							? 'Normal'
							: selectedTone === DraftingTone.explanatory
							? 'Explanatory'
							: selectedTone === DraftingTone.formal
							? 'Formal'
							: selectedTone === DraftingTone.concise
							? 'Concise'
							: 'Casual';
					return (
						<div className="flex gap-1 relative z-[100] pointer-events-auto items-center">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onMouseDown={(e) => {
									e.stopPropagation();
								}}
								className={cn(
									'w-[85px] h-[20px] rounded-[8px] text-[13px] font-light transition-all flex items-center justify-center font-inter cursor-default',
									selectedTone === DraftingTone.normal
										? 'bg-[#E8EFFF] text-black border border-black'
										: selectedTone === DraftingTone.explanatory
										? 'bg-[#F8E8FF] text-black border border-black'
										: selectedTone === DraftingTone.formal
										? 'bg-[#FFE8EC] text-black border border-black'
										: selectedTone === DraftingTone.concise
										? 'bg-[#FFF9E8] text-black border border-black'
										: 'bg-[#E8FFF1] text-black border border-black'
								)}
							>
								{selectedLabel}
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
									setIsToneExpanded(true);
								}}
								onMouseDown={(e) => {
									e.stopPropagation();
								}}
								className="w-[20px] h-[20px] rounded-[8px] bg-transparent flex items-center justify-center hover:bg-gray-100"
							>
								<Plus className="h-3 w-3" />
							</button>
						</div>
					);
				})()}
			{isToneExpanded && (
				<div
					className={cn(
						'flex gap-1 relative z-[100] pointer-events-auto',
						isCompact ? 'w-full flex-wrap' : 'items-center'
					)}
				>
					{[
						{ value: DraftingTone.normal, label: 'Normal' },
						{ value: DraftingTone.explanatory, label: 'Explanatory' },
						{ value: DraftingTone.formal, label: 'Formal' },
						{ value: DraftingTone.concise, label: 'Concise' },
						{ value: DraftingTone.casual, label: 'Casual' },
					].map((tone) => (
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
								'w-[85px] h-[20px] rounded-[8px] text-[13px] font-light transition-all flex items-center justify-center font-inter cursor-pointer',
								'focus:outline-none focus:ring-0 active:outline-none',
								tone.value === DraftingTone.normal
									? form.watch('draftingTone') === tone.value
										? 'bg-[#E8EFFF] text-black border border-black active:bg-[#E8EFFF]'
										: 'bg-[#E8EFFF] text-black hover:bg-[#d8e0f2] active:bg-[#d8e0f2]'
									: tone.value === DraftingTone.explanatory
									? form.watch('draftingTone') === tone.value
										? 'bg-[#F8E8FF] text-black border border-black active:bg-[#F8E8FF]'
										: 'bg-[#F8E8FF] text-black hover:bg-[#e8d8f2] active:bg-[#e8d8f2]'
									: tone.value === DraftingTone.formal
									? form.watch('draftingTone') === tone.value
										? 'bg-[#FFE8EC] text-black border border-black active:bg-[#FFE8EC]'
										: 'bg-[#FFE8EC] text-black hover:bg-[#f2d8dc] active:bg-[#f2d8dc]'
									: tone.value === DraftingTone.concise
									? form.watch('draftingTone') === tone.value
										? 'bg-[#FFF9E8] text-black border border-black active:bg-[#FFF9E8]'
										: 'bg-[#FFF9E8] text-black hover:bg-[#f2edd8] active:bg-[#f2edd8]'
									: tone.value === DraftingTone.casual
									? form.watch('draftingTone') === tone.value
										? 'bg-[#E8FFF1] text-black border border-black active:bg-[#E8FFF1]'
										: 'bg-[#E8FFF1] text-black hover:bg-[#d8f2e1] active:bg-[#d8f2e1]'
									: 'bg-gray-200 text-black hover:bg-gray-300 active:bg-gray-300'
							)}
						>
							{tone.label}
						</button>
					))}
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							setIsToneExpanded(false);
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
						}}
						className="w-[20px] h-[20px] rounded-[8px] bg-transparent flex items-center justify-center ml-1 hover:bg-gray-100"
					>
						<X className="h-3 w-3" />
					</button>
				</div>
			)}
		</>
	);
};
