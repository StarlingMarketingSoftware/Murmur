import { FC, useMemo, useState, useRef, Fragment, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { Button } from '@/components/ui/button';
import { HybridBlock } from '@prisma/client';
import { cn } from '@/utils';
import { ParagraphSlider } from '@/components/atoms/ParagraphSlider/ParagraphSlider';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';
import { ToneSelector } from '@/components/molecules/ToneSelector/ToneSelector';

interface MiniEmailStructureProps {
	form: UseFormReturn<DraftingFormValues>;
	onDraft: () => void;
	isDraftDisabled: boolean;
	isPendingGeneration: boolean;
	generationProgress?: number;
	generationTotal?: number;
	onCancel?: () => void;
}

export const MiniEmailStructure: FC<MiniEmailStructureProps> = ({
	form,
	onDraft,
	isDraftDisabled,
	isPendingGeneration,
	generationProgress,
	generationTotal,
	onCancel,
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

	// Ensure the mini structure never appears empty by keeping at least one block present
	useEffect(() => {
		const currentBlocks = form.getValues('hybridBlockPrompts') || [];
		if (!currentBlocks || currentBlocks.length === 0) {
			form.setValue(
				'hybridBlockPrompts',
				[
					{
						id: `text_${Date.now()}`,
						type: 'text' as HybridBlock,
						value: '',
					},
				],
				{ shouldDirty: true }
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hybridBlocks?.length]);

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
				return 'Full Auto';
			default:
				return 'Block';
		}
	};

	// Subtitle hint shown next to hybrid block labels
	const blockHint = (type: HybridBlock) => {
		if (type === 'introduction') return 'Automated Intro';
		if (type === 'research') return 'Automated';
		if (type === 'action') return 'Automated Call to Action';
		return null;
	};

	const setMode = (mode: 'ai' | 'hybrid' | 'handwritten') => {
		const current = form.getValues('hybridBlockPrompts') || [];
		const byType = new Map<HybridBlock, string>();
		current.forEach((b) => byType.set(b.type as HybridBlock, b.value || ''));

		if (mode === 'ai') {
			// Save current blocks for return later
			if (current.length > 0 && current.every((b) => b.type === 'text')) {
				form.setValue('savedManualBlocks', current);
			} else if (
				current.length > 0 &&
				!current.some((b) => b.type === 'full_automated')
			) {
				form.setValue('savedHybridBlocks', current);
			}

			// Switch to Full Auto using stored fullAiPrompt if available
			const fullAiPrompt = (form.getValues('fullAiPrompt') as string) || '';
			form.setValue(
				'hybridBlockPrompts',
				[
					{
						id: 'full_automated',
						type: 'full_automated' as HybridBlock,
						value: fullAiPrompt,
					},
				],
				{ shouldDirty: true }
			);
			form.setValue('isAiSubject', true, { shouldDirty: true });
			return;
		}

		if (mode === 'handwritten') {
			// Save current content for return later
			if (current.some((b) => b.type === 'full_automated')) {
				form.setValue(
					'fullAiPrompt',
					(byType.get('full_automated' as HybridBlock) as string) || ''
				);
			} else if (current.length > 0 && !current.every((b) => b.type === 'text')) {
				form.setValue('savedHybridBlocks', current);
			}

			// Switch to Manual (text-only) using saved manual blocks if any
			const savedManual =
				(form.getValues('savedManualBlocks') as Array<{
					id: string;
					type: HybridBlock;
					value: string;
				}>) || [];
			form.setValue(
				'hybridBlockPrompts',
				savedManual.length > 0
					? savedManual
					: [{ id: `text_${Date.now()}`, type: 'text' as HybridBlock, value: '' }],
				{ shouldDirty: true }
			);
			form.setValue('isAiSubject', false, { shouldDirty: true });
			return;
		}

		// mode === 'hybrid'
		if (current.some((b) => b.type === 'full_automated')) {
			form.setValue(
				'fullAiPrompt',
				(byType.get('full_automated' as HybridBlock) as string) || ''
			);
		} else if (current.length > 0 && current.every((b) => b.type === 'text')) {
			form.setValue('savedManualBlocks', current);
		} else if (current.length > 0) {
			form.setValue('savedHybridBlocks', current);
		}

		const savedHybrid =
			(form.getValues('savedHybridBlocks') as Array<{
				id: string;
				type: HybridBlock;
				value: string;
			}>) || [];
		const blocks =
			savedHybrid.length > 0
				? savedHybrid
				: [
						{
							id: 'introduction',
							type: 'introduction' as HybridBlock,
							value: '',
						},
						{
							id: 'research',
							type: 'research' as HybridBlock,
							value: '',
						},
						{ id: 'action', type: 'action' as HybridBlock, value: '' },
				  ];
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
		form.setValue('isAiSubject', true, { shouldDirty: true });
	};

	// Selected mode highlight (mirror main selector)
	const modeContainerRef = useRef<HTMLDivElement>(null);
	const aiButtonRef = useRef<HTMLButtonElement>(null);
	const hybridButtonRef = useRef<HTMLButtonElement>(null);
	const handwrittenButtonRef = useRef<HTMLButtonElement>(null);
	const [highlightStyle, setHighlightStyle] = useState<{ left: number; opacity: number }>(
		{ left: 0, opacity: 0 }
	);

	useEffect(() => {
		let target: HTMLButtonElement | null = null;
		if (draftingMode === 'ai') target = aiButtonRef.current;
		else if (draftingMode === 'hybrid') target = hybridButtonRef.current;
		else target = handwrittenButtonRef.current;
		if (target) {
			const newLeft = target.offsetLeft + target.offsetWidth / 2 - 80.38 / 2;
			setHighlightStyle({ left: newLeft, opacity: 1 });
		} else {
			setHighlightStyle({ left: 0, opacity: 0 });
		}
	}, [draftingMode]);

	const getModeBackgroundColor = () => {
		if (draftingMode === 'hybrid') return 'rgba(74, 74, 217, 0.31)';
		if (draftingMode === 'handwritten') return 'rgba(109, 171, 104, 0.47)';
		return '#DAE6FE';
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

	const addTextBlockAt = (index: number) => {
		const newText = {
			id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			type: 'text' as HybridBlock,
			value: '',
		};
		const blocks = [...(form.getValues('hybridBlockPrompts') || [])];
		blocks.splice(index + 1, 0, newText);
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
		<div
			style={{
				width: '376px',
				height: '474px',
				position: 'relative',
				overflow: 'visible',
			}}
		>
			{/* Container with header to match table sizing */}
			<div
				style={{
					width: '100%',
					minHeight: '100%',
					border: '3px solid #000000',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					background: '#DEF2E1',
					overflow: 'visible',
				}}
			>
				{/* Content area - miniature, but interactive */}
				<div className="flex-1 overflow-visible">
					<div className="px-0 pb-3">
						{/* Mode */}
						<div className="w-full bg-white pt-2 rounded-t-[5px]">
							<div className="flex items-center gap-4 mb-1 w-[357px] mx-auto">
								<span className="font-inter font-semibold text-[13px]">Mode</span>
								<div ref={modeContainerRef} className="relative flex items-center gap-6">
									<div
										className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
										style={{
											left: highlightStyle.left,
											transition: 'left 0.25s ease-in-out, opacity 0.2s ease-in-out',
											opacity: highlightStyle.opacity,
										}}
									>
										<div
											style={{
												width: '80.38px',
												height: '17px',
												backgroundColor: getModeBackgroundColor(),
												border: '1.3px solid #000000',
												borderRadius: '8px',
											}}
										/>
									</div>
									<button
										ref={aiButtonRef}
										type="button"
										className={cn(
											'text-[11px] font-inter font-semibold px-3 py-0.5 rounded-md cursor-pointer text-center relative z-20',
											draftingMode === 'ai'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => setMode('ai')}
									>
										Full Auto
									</button>
									<button
										ref={hybridButtonRef}
										type="button"
										className={cn(
											'text-[11px] font-inter font-semibold px-3 py-0.5 rounded-md cursor-pointer text-center relative z-20',
											draftingMode === 'hybrid'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => setMode('hybrid')}
									>
										Hybrid
									</button>
									<button
										ref={handwrittenButtonRef}
										type="button"
										className={cn(
											'text-[11px] font-inter font-semibold px-3 py-0.5 rounded-md cursor-pointer text-center relative z-20',
											draftingMode === 'handwritten'
												? 'text-black'
												: 'text-[#6B6B6B] hover:text-black'
										)}
										onClick={() => setMode('handwritten')}
									>
										Manual
									</button>
								</div>
							</div>
							<div className="h-[2px] bg-black w-full mb-1" />
						</div>

						{/* Auto Subject */}
						<div className="mb-3 w-[357px] mx-auto">
							<div
								className={cn(
									'flex items-center h-[25px] rounded-[8px] border-2 border-black overflow-hidden',
									isAiSubject ? 'bg-[#E0E0E0]' : 'bg-white'
								)}
							>
								<div className="pl-2 flex items-center h-full shrink-0 w-[90px] bg-transparent">
									<span className="font-inter font-semibold text-[13px] text-black">
										{isAiSubject ? 'Auto Subject' : 'Subject'}
									</span>
								</div>
								<div
									className={cn(
										'relative h-full flex items-center text-[10px] font-inter font-normal shrink-0',
										isAiSubject
											? 'w-auto px-2 justify-center bg-[#5dab68] text-white cursor-pointer'
											: 'w-[80px] px-2 justify-center text-black bg-[#DADAFC] cursor-pointer -translate-x-[16px]'
									)}
									onClick={toggleSubject}
								>
									<span className="absolute left-0 h-full border-l border-black"></span>
									{isAiSubject ? 'on' : 'Auto off'}
									<span className="absolute right-0 h-full border-r border-black"></span>
								</div>
								<div
									className={cn(
										'flex-grow h-full flex items-center px-2',
										'bg-transparent'
									)}
								>
									<input
										type="text"
										className={cn(
											'w-full text-[12px] leading-tight outline-none focus:outline-none bg-transparent',
											isAiSubject
												? 'text-[#6B6B6B] italic cursor-not-allowed'
												: 'text-black'
										)}
										placeholder={
											isAiSubject ? 'Automated Subject Line' : 'Type subject...'
										}
										disabled={isAiSubject}
										value={form.watch('subject') || ''}
										onChange={(e) =>
											form.setValue('subject', e.target.value, { shouldDirty: true })
										}
									/>
								</div>
							</div>
						</div>

						{/* Blocks list - overflow visible to show buttons outside */}
						<div className="flex flex-col gap-2 overflow-visible">
							{hybridBlocks.map((b, i) => {
								const isHybridCore =
									b.type === 'introduction' ||
									b.type === 'research' ||
									b.type === 'action';

								if (draftingMode === 'hybrid' && isHybridCore) {
									const isExpanded = expandedBlocks.has(b.id);
									const strokeColor =
										b.type === 'introduction'
											? '#6673FF'
											: b.type === 'research'
											? '#1010E7'
											: '#0E0E7F';
									return (
										<Fragment key={b.id}>
											<div
												className={cn(
													'rounded-[8px] border-2 bg-[#DADAFC] overflow-visible relative w-[357px] mx-auto',
													isExpanded ? 'h-[78px]' : 'h-[31px]'
												)}
												style={{ borderColor: strokeColor }}
											>
												<div className="w-full h-full flex flex-col">
													{/* Top Row */}
													<div
														className={cn(
															'flex flex-row items-center flex-shrink-0',
															isExpanded ? 'h-[21px]' : 'h-[31px]'
														)}
													>
														<div className="flex-1 flex h-full items-center px-3">
															<span className="font-inter text-[12px] leading-none font-semibold text-black">
																{blockLabel(b.type as HybridBlock)}
															</span>
															{blockHint(b.type as HybridBlock) && (
																<span className="text-[10px] leading-none italic text-[#5d5d5d] ml-2">
																	{blockHint(b.type as HybridBlock)}
																</span>
															)}
														</div>
														<div className="flex flex-row h-full items-stretch">
															<div
																className={cn(
																	'border-l border-black',
																	isExpanded ? 'h-[21px]' : 'h-[27px]'
																)}
															/>
															<button
																type="button"
																onClick={() => {
																	setExpandedBlocks((prev) => {
																		const next = new Set(prev);
																		if (isExpanded) {
																			next.delete(b.id);
																		} else {
																			next.add(b.id);
																		}
																		return next;
																	});
																}}
																className={cn(
																	'w-[75px] h-full flex items-center justify-center text-[11px] cursor-pointer appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none',
																	isExpanded
																		? 'text-white bg-[#5353AF] hover:bg-[#4a4a9d]'
																		: 'text-black/80 hover:bg-black/5'
																)}
															>
																Advanced
															</button>
															<div
																className={cn(
																	'border-l border-black',
																	isExpanded ? 'h-[21px]' : 'h-[27px]'
																)}
															/>
															<button
																type="button"
																onClick={() => removeBlock(b.id)}
																className="w-[30px] h-full flex items-center justify-center text-[18px] font-bold text-red-600 hover:bg-black/10 appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none"
																aria-label="Remove block"
															>
																×
															</button>
														</div>
													</div>
													{/* Bottom content - only show when expanded */}
													{isExpanded && (
														<div className="flex-1 flex flex-col min-h-0">
															<div
																className="h-[2px] w-full"
																style={{ backgroundColor: strokeColor }}
															/>
															<div className="flex-1 px-3 py-1 flex items-center bg-white">
																<textarea
																	className="w-full bg-white text-[11px] outline-none focus:outline-none placeholder:italic placeholder:text-[#5d5d5d] resize-none leading-tight"
																	placeholder="Type here to specify further, i.e 'I am ... and I lead ...'"
																	value={b.value || ''}
																	onChange={(e) => updateBlockValue(b.id, e.target.value)}
																	tabIndex={isExpanded ? 0 : -1}
																	rows={2}
																/>
															</div>
														</div>
													)}
												</div>
											</div>

											{/* Plus button for hybrid blocks - positioned outside the box */}
											{(() => {
												const nextBlock = hybridBlocks[i + 1];
												if (nextBlock?.type === 'text') return null;

												return (
													<div
														className="flex justify-end"
														style={{
															marginTop: '3px',
															marginBottom: '-3px',
															marginRight: '-28px',
															position: 'relative',
															zIndex: 50,
														}}
													>
														<Button
															type="button"
															onClick={() => addTextBlockAt(i)}
															className={cn(
																'w-[52px] h-[20px] bg-white hover:bg-stone-100 active:bg-stone-200 border border-[#5DAB68] rounded-[4px] !font-normal text-[10px] text-black flex items-center justify-center gap-1'
															)}
															title="Text block"
														>
															<TinyPlusIcon
																width="5px"
																height="5px"
																className="!w-[8px] !h-[8px]"
															/>
															<span className="font-secondary">Text</span>
														</Button>
													</div>
												);
											})()}
										</Fragment>
									);
								}

								return (
									<Fragment key={b.id}>
										<div
											className={cn(
												'rounded-[8px] border-2 bg-white px-2 py-1 relative w-[357px] mx-auto'
											)}
											style={{
												borderColor:
													(draftingMode === 'handwritten' || draftingMode === 'hybrid') &&
													b.type === 'text'
														? '#53A25D'
														: b.type === 'full_automated'
														? '#51A2E4'
														: '#000000',
											}}
										>
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<span
														className={cn(
															'font-inter text-[12px] font-semibold text-black',
															b.type === 'full_automated' && 'whitespace-nowrap'
														)}
													>
														{blockLabel(b.type as HybridBlock)}
													</span>
												</div>
												<div className="flex items-center gap-2">
													{blockHint(b.type as HybridBlock) && (
														<span className="text-[10px] italic text-[#5d5d5d]">
															{blockHint(b.type as HybridBlock)}
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
												<div className="mt-1">
													<div className="mb-1">
														<ToneSelector isCompact />
													</div>
													<div className="relative">
														{!b.value && (
															<div className="absolute inset-0 pointer-events-none py-2 pr-2 text-[#505050] text-[12px]">
																<div className="space-y-2">
																	<div>
																		<p>Prompt Murmur here.</p>
																		<p>
																			Tell it what you want to say and it will compose
																			emails based on your instructions.
																		</p>
																	</div>
																</div>
															</div>
														)}
														<textarea
															className={cn(
																'border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full max-w-full min-w-0',
																'h-[120px] py-2 pr-2 px-0 resize-none',
																'bg-white text-[12px] leading-[16px]'
															)}
															placeholder=""
															value={b.value || ''}
															onChange={(e) => updateBlockValue(b.id, e.target.value)}
														/>
													</div>
													<div className="pl-2">
														<ParagraphSlider />
													</div>
												</div>
											) : (
												<textarea
													className="w-full mt-1 text-[11px] leading-[14px] rounded-[6px] p-1 resize-none h-[52px] outline-none focus:outline-none"
													placeholder={
														b.type === 'text'
															? 'Write the exact text you want in your email here. *required'
															: 'Type here to specify further, e.g., "I am ... and I lead ..."'
													}
													value={b.value || ''}
													onChange={(e) => updateBlockValue(b.id, e.target.value)}
												/>
											)}
										</div>
									</Fragment>
								);
							})}
						</div>
					</div>
				</div>

				{/* Signature - fixed at bottom (outside scroll) */}
				<div className="px-0 pb-2">
					<div
						className="rounded-[8px] border-2 bg-white px-2 py-2 w-[357px] mx-auto"
						style={{ borderColor: '#969696' }}
					>
						<div className="font-inter text-[12px] font-semibold text-black mb-1 pl-1">
							Signature
						</div>
						<textarea
							className="w-full text-[12px] rounded-[6px] pl-1 pr-1 pt-1 pb-1 resize-none h-[58px] outline-none focus:outline-none"
							value={signature}
							onChange={(e) => updateSignature(e.target.value)}
						/>
					</div>
				</div>

				{/* Footer with Draft button */}
				<div className="px-0 pb-3">
					<Button
						type="button"
						onClick={onDraft}
						disabled={isDraftDisabled}
						className={cn(
							'w-[357px] !h-[28px] mx-auto !rounded-[4px] border border-black bg-[#68C575] text-black font-inter font-medium text-[14px] flex items-center justify-center'
						)}
					>
						{isPendingGeneration ? 'Drafting...' : 'Draft'}
					</Button>
					{typeof generationProgress === 'number' &&
						generationProgress >= 0 &&
						(generationTotal || 0) > 0 && (
							<div className="mt-2">
								<div className="flex items-center gap-3">
									<div className="text-xs font-inter text-gray-600 flex-none">
										{generationProgress >= (generationTotal || 0)
											? `Drafted ${Math.min(
													generationProgress,
													generationTotal || 0
											  )}/${generationTotal}`
											: `Drafting ${generationProgress}/${generationTotal}`}
									</div>
									<div className="flex-1 h-[7px] bg-[rgba(93,171,104,0.49)] border-0 relative">
										<div
											className="h-full bg-[#5DAB68] transition-all duration-300 ease-out absolute top-0 left-0"
											style={{
												width: `${Math.min(
													generationTotal && generationTotal > 0
														? (generationProgress / generationTotal) * 100
														: 0,
													100
												)}%`,
											}}
										/>
									</div>
									{onCancel && (
										<button
											type="button"
											onClick={onCancel}
											className="ml-2 p-0 h-auto w-auto bg-transparent border-0 text-black hover:text-red-600 transition-colors cursor-pointer"
											aria-label="Cancel drafting"
										>
											×
										</button>
									)}
								</div>
							</div>
						)}
				</div>
			</div>
		</div>
	);
};
