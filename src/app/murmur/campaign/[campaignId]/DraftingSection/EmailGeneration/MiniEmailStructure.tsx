import { FC, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { Button } from '@/components/ui/button';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { HybridBlock } from '@prisma/client';
import { cn } from '@/utils';

interface MiniEmailStructureProps {
	form: UseFormReturn<DraftingFormValues>;
	onDraft: () => void;
	isDraftDisabled: boolean;
	isPendingGeneration: boolean;
}

export const MiniEmailStructure: FC<MiniEmailStructureProps> = ({
	form,
	onDraft,
	isDraftDisabled,
	isPendingGeneration,
}) => {
	const hybridBlocks = form.watch('hybridBlockPrompts') || [];
	const isAiSubject = form.watch('isAiSubject');
	const signature = form.watch('signature');

	const draftingMode = useMemo(() => {
		const hasFullAutomatedBlock = hybridBlocks?.some(
			(block) => block.type === 'full_automated'
		);
		if (hasFullAutomatedBlock) return 'ai';
		const isOnlyTextBlocks = hybridBlocks?.every((block) => block.type === 'text');
		if (isOnlyTextBlocks) return 'handwritten';
		return 'hybrid';
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hybridBlocks?.length, hybridBlocks?.map((b) => b.type).join(',')]);

	const blockLabel = (type: HybridBlock) => {
		switch (type) {
			case 'introduction':
				return 'Intro';
			case 'research':
				return 'Research';
			case 'action':
				return 'CTA';
			case 'text':
				return 'Text';
			case 'full_automated':
				return 'Auto Compose';
			default:
				return 'Block';
		}
	};

	return (
		<div style={{ width: '366px', height: '489px', position: 'relative' }}>
			{/* Container with header to match table sizing */}
			<div
				style={{
					width: '100%',
					height: '100%',
					border: '2px solid #ABABAB',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					background: 'white',
				}}
			>
				{/* Header */}
				<div
					style={{
						borderTopLeftRadius: '8px',
						borderTopRightRadius: '8px',
						borderBottom: '2px solid #ABABAB',
						padding: '12px 16px',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						height: '48px',
						backgroundColor: 'white',
					}}
				>
					<div style={{ transform: 'translateY(-6px)' }}>
						<div className="text-sm font-inter font-medium text-black">
							Email Structure
						</div>
					</div>
				</div>

				{/* Content area - miniature of the left composer */}
				<CustomScrollbar
					className="flex-1"
					thumbWidth={2}
					thumbColor="#000000"
					trackColor="transparent"
					offsetRight={-5}
				>
					<div className="p-3">
						{/* Mode */}
						<div className="flex items-center gap-4 mb-2">
							<span className="font-inter font-semibold text-[13px]">Mode</span>
							<div className="flex items-center gap-4">
								<span
									className={cn(
										'text-[11px] font-inter font-semibold',
										draftingMode === 'ai' ? 'text-black' : 'text-[#AFAFAF]'
									)}
								>
									Full Auto
								</span>
								<span
									className={cn(
										'text-[11px] font-inter font-semibold',
										draftingMode === 'hybrid' ? 'text-black' : 'text-[#AFAFAF]'
									)}
								>
									Hybrid
								</span>
								<span
									className={cn(
										'text-[11px] font-inter font-semibold',
										draftingMode === 'handwritten' ? 'text-black' : 'text-[#AFAFAF]'
									)}
								>
									Manual
								</span>
							</div>
						</div>

						<div className="h-[2px] bg-black -mx-3 mb-2" />

						{/* Auto Subject */}
						<div className="mb-2">
							<div className="flex items-center h-[28px] rounded-[8px] border-2 border-black overflow-hidden">
								<div className="pl-2 flex items-center h-full shrink-0 w-[90px] bg-white">
									<span className="font-inter font-semibold text-[13px] text-black">
										Subject
									</span>
								</div>
								<div
									className={cn(
										'relative h-full flex items-center text-[10px] font-inter font-normal shrink-0',
										isAiSubject
											? 'w-auto px-2 justify-center bg-[#5dab68] text-white'
											: 'w-[72px] px-2 justify-start text-black bg-[#DADAFC]'
									)}
								>
									{isAiSubject ? 'on' : 'Auto off'}
								</div>
								<div
									className={cn(
										'flex-grow h-full',
										isAiSubject ? 'bg-transparent' : 'bg-white'
									)}
								/>
							</div>
						</div>

						{/* Blocks list (read-only) */}
						<div className="flex flex-col gap-2">
							{hybridBlocks.map((b) => (
								<div
									key={b.id}
									className="rounded-[8px] border-2 border-black bg-white px-2 py-1"
								>
									<div className="flex items-center justify-between">
										<span className="font-inter text-[12px] font-semibold text-black">
											{blockLabel(b.type as HybridBlock)}
										</span>
										{b.type === 'research' && (
											<span className="text-[10px] italic text-[#5d5d5d]">Automated</span>
										)}
									</div>
									{b.type === 'text' && (
										<div className="text-[11px] text-[#5d5d5d] mt-1 truncate">
											{b.value || 'Text block'}
										</div>
									)}
								</div>
							))}
						</div>

						{/* Signature */}
						<div className="rounded-[8px] border-2 border-black bg-white px-2 py-2 mt-2">
							<div className="font-inter text-[12px] font-semibold text-black mb-1">
								Signature
							</div>
							<div className="whitespace-pre-wrap text-[12px] text-black">
								{signature}
							</div>
						</div>
					</div>
				</CustomScrollbar>

				{/* Footer with Draft button */}
				<div className="px-3 pb-3">
					<Button
						type="button"
						onClick={onDraft}
						disabled={isDraftDisabled}
						className={cn(
							'w-full h-[32px] font-bold flex items-center justify-center transition-all duration-200',
							isDraftDisabled
								? 'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black opacity-50 cursor-not-allowed'
								: 'bg-[rgba(93,171,104,0.47)] border-2 border-[#5DAB68] text-black hover:bg-[rgba(93,171,104,0.6)] hover:border-[#5DAB68] active:bg-[rgba(93,171,104,0.7)]'
						)}
					>
						{isPendingGeneration ? 'Drafting...' : 'Draft'}
					</Button>
				</div>
			</div>
		</div>
	);
};
