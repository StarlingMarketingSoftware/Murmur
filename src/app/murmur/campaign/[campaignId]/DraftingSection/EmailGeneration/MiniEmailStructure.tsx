import { FC, useMemo, useState } from 'react';
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
	const signature = form.watch('signature') || '';

	// Track which blocks are expanded
	const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

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

	const setMode = (mode: 'ai' | 'hybrid' | 'handwritten') => {
		const current = form.getValues('hybridBlockPrompts') || [];
		const byType = new Map<HybridBlock, string>();
		current.forEach((b) => byType.set(b.type as HybridBlock, b.value || ''));

		if (mode === 'ai') {
			const value = byType.get('full_automated' as HybridBlock) || '';
			form.setValue(
				'hybridBlockPrompts',
				[{ id: 'full_automated', type: 'full_automated' as HybridBlock, value }],
				{ shouldDirty: true }
			);
			return;
		}

		if (mode === 'handwritten') {
			const existingTextBlocks = current.filter((b) => b.type === 'text');
			const blocks =
				existingTextBlocks.length > 0
					? existingTextBlocks
					: [{ id: `text_${Date.now()}`, type: 'text' as HybridBlock, value: '' }];
			form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
			return;
		}

		const blocks = [
			{
				id: 'introduction',
				type: 'introduction' as HybridBlock,
				value: byType.get('introduction' as HybridBlock) || '',
			},
			{
				id: 'research',
				type: 'research' as HybridBlock,
				value: byType.get('research' as HybridBlock) || '',
			},
			{
				id: 'action',
				type: 'action' as HybridBlock,
				value: byType.get('action' as HybridBlock) || '',
			},
		];
		const texts = current.filter((b) => b.type === 'text');
		form.setValue('hybridBlockPrompts', [...blocks, ...texts], { shouldDirty: true });
	};

	const toggleSubject = () => {
		form.setValue('isAiSubject', !isAiSubject, { shouldDirty: true });
	};

	const updateBlockValue = (id: string, value: string) => {
		const blocks = (form.getValues('hybridBlockPrompts') || []).map((b) =>
			b.id === id ? { ...b, value } : b
		);
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	const addTextBlock = () => {
		const newBlock = {
			id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
			type: 'text' as HybridBlock,
			value: '',
		};
		const blocks = [...(form.getValues('hybridBlockPrompts') || []), newBlock];
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	const removeBlock = (id: string) => {
		const blocks = (form.getValues('hybridBlockPrompts') || []).filter(
			(b) => b.id !== id
		);
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	const updateSignature = (value: string) => {
		form.setValue('signature', value, { shouldDirty: true });
	};

	return (
		<div style={{ width: '376px', height: '474px', position: 'relative' }}>
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

				{/* Content area - miniature, but interactive */}
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
							<div className="flex items-center gap-2">
								<button
									type="button"
									className={cn(
										'text-[11px] font-inter font-semibold px-2 py-0.5 rounded cursor-pointer',
										draftingMode === 'ai'
											? 'text-black bg-[#EDEDED]'
											: 'text-[#6B6B6B] hover:text-black hover:bg-[#F3F3F3]'
									)}
									onClick={() => setMode('ai')}
								>
									Full Auto
								</button>
								<button
									type="button"
									className={cn(
										'text-[11px] font-inter font-semibold px-2 py-0.5 rounded cursor-pointer',
										draftingMode === 'hybrid'
											? 'text-black bg-[#EDEDED]'
											: 'text-[#6B6B6B] hover:text-black hover:bg-[#F3F3F3]'
									)}
									onClick={() => setMode('hybrid')}
								>
									Hybrid
								</button>
								<button
									type="button"
									className={cn(
										'text-[11px] font-inter font-semibold px-2 py-0.5 rounded cursor-pointer',
										draftingMode === 'handwritten'
											? 'text-black bg-[#EDEDED]'
											: 'text-[#6B6B6B] hover:text-black hover:bg-[#F3F3F3]'
									)}
									onClick={() => setMode('handwritten')}
								>
									Manual
								</button>
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
											? 'w-auto px-2 justify-center bg-[#5dab68] text-white cursor-pointer'
											: 'w-[72px] px-2 justify-start text-black bg-[#DADAFC] cursor-pointer'
									)}
									onClick={toggleSubject}
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

						{/* Blocks list */}
						<div className="flex flex-col gap-2">
							{hybridBlocks.map((b) => {
								const isHybridCore =
									b.type === 'introduction' ||
									b.type === 'research' ||
									b.type === 'action';

								if (draftingMode === 'hybrid' && isHybridCore) {
									const isExpanded = expandedBlocks.has(b.id);
									return (
										<div key={b.id} className="flex justify-center">
											<div
												className={cn(
													'w-[359px] rounded-[8px] border-2 border-black bg-[#DADAFC] transition-all duration-200',
													isExpanded ? 'h-[78px]' : 'h-[31px]'
												)}
											>
												{isExpanded ? (
													// Expanded state
													<div className="w-full h-full flex flex-col bg-[#DADAFC]">
														{/* Top section - maintains original compact layout */}
														<div className="relative flex items-center h-[25px] px-3 bg-[#DADAFC]">
															<span className="font-inter text-[12px] font-semibold text-black">
																{blockLabel(b.type as HybridBlock)}
															</span>
															<div className="absolute right-3 flex items-center gap-2">
																{b.type === 'research' && (
																	<span className="text-[10px] italic text-[#5d5d5d] mr-2">
																		Automated
																	</span>
																)}
																<button
																	type="button"
																	onClick={() => {
																		setExpandedBlocks((prev) => {
																			const next = new Set(prev);
																			next.delete(b.id);
																			return next;
																		});
																	}}
																	className="text-[11px] text-white bg-[#5353AF] px-2 py-0.5 rounded cursor-pointer hover:bg-[#4a4a9d]"
																>
																	Advanced
																</button>
															</div>
														</div>
														{/* Divider at 21px from top */}
														<div className="h-[1px] bg-black mx-3" />
														{/* Input section */}
														<div className="flex-1 px-3 py-1.5">
															<input
																type="text"
																className="w-full h-full bg-[#DADAFC] text-[11px] outline-none placeholder:italic placeholder:text-[#5d5d5d]"
																placeholder="Type here to specify further, i.e 'I am ... and I lead ...'"
																value={b.value || ''}
																onChange={(e) => updateBlockValue(b.id, e.target.value)}
															/>
														</div>
													</div>
												) : (
													// Collapsed state
													<div className="flex items-center justify-between px-3 h-full">
														<span className="font-inter text-[12px] font-semibold text-black">
															{blockLabel(b.type as HybridBlock)}
														</span>
														<div className="flex items-center gap-2">
															{b.type === 'research' && (
																<span className="text-[10px] italic text-[#5d5d5d]">
																	Automated
																</span>
															)}
															<button
																type="button"
																onClick={() => {
																	setExpandedBlocks((prev) => {
																		const next = new Set(prev);
																		next.add(b.id);
																		return next;
																	});
																}}
																className="text-[11px] text-black/60 hover:text-black cursor-pointer"
															>
																Advanced
															</button>
														</div>
													</div>
												)}
											</div>
										</div>
									);
								}

								return (
									<div
										key={b.id}
										className="rounded-[8px] border-2 border-black bg-white px-2 py-1"
									>
										<div className="flex items-center justify-between">
											<span className="font-inter text-[12px] font-semibold text-black">
												{blockLabel(b.type as HybridBlock)}
											</span>
											<div className="flex items-center gap-2">
												{b.type === 'research' && (
													<span className="text-[10px] italic text-[#5d5d5d]">
														Automated
													</span>
												)}
												{b.type !== 'full_automated' && (
													<button
														type="button"
														className="text-[12px] text-[#b30000] hover:text-red-600"
														onClick={() => removeBlock(b.id)}
														aria-label="Remove block"
													>
														×
													</button>
												)}
											</div>
										</div>

										{b.type === 'full_automated' ? (
											<textarea
												className="w-full mt-1 text-[11px] leading-[14px] border border-[#DADADA] rounded-[6px] p-1 resize-none h-[68px]"
												placeholder="Describe what to compose automatically (goal, tone, details)"
												value={b.value || ''}
												onChange={(e) => updateBlockValue(b.id, e.target.value)}
											/>
										) : (
											<textarea
												className="w-full mt-1 text-[11px] leading-[14px] border border-[#DADADA] rounded-[6px] p-1 resize-none h-[52px]"
												placeholder={
													b.type === 'text'
														? 'Text block content...'
														: 'Type here to specify further, e.g., "I am ... and I lead ..."'
												}
												value={b.value || ''}
												onChange={(e) => updateBlockValue(b.id, e.target.value)}
											/>
										)}
									</div>
								);
							})}
							<div className="flex justify-end">
								<button
									type="button"
									onClick={addTextBlock}
									className="text-[11px] text-[#2b6cb0] hover:underline"
								>
									+ Text
								</button>
							</div>
						</div>

						{/* Signature */}
						<div className="rounded-[8px] border-2 border-black bg-white px-2 py-2 mt-2">
							<div className="font-inter text-[12px] font-semibold text-black mb-1">
								Signature
							</div>
							<textarea
								className="w-full text-[12px] border border-[#DADADA] rounded-[6px] p-1 resize-none h-[58px]"
								value={signature}
								onChange={(e) => updateSignature(e.target.value)}
							/>
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
