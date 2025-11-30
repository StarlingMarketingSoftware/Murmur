import {
	FC,
	useMemo,
	useState,
	useRef,
	Fragment,
	useEffect,
	useLayoutEffect,
	useCallback,
	ReactNode,
} from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DraftingFormValues } from '../useDraftingSection';
import { Button } from '@/components/ui/button';
import { HybridBlock } from '@prisma/client';
import { cn } from '@/utils';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';

interface MiniEmailStructureProps {
	form: UseFormReturn<DraftingFormValues>;
	onDraft: () => void;
	isDraftDisabled: boolean;
	isPendingGeneration: boolean;
	generationProgress?: number;
	generationTotal?: number;
	onCancel?: () => void;
	/** When true, hides the floating top number/label chrome */
	hideTopChrome?: boolean;
	/** When true, hides the footer Draft/progress controls */
	hideFooter?: boolean;
	/** When true, use 100% width so parent can control width on mobile */
	fullWidthMobile?: boolean;
}

export const MiniEmailStructure: FC<MiniEmailStructureProps> = ({
	form,
	onDraft,
	isDraftDisabled,
	isPendingGeneration,
	generationProgress,
	generationTotal,
	onCancel,
	hideTopChrome,
	hideFooter,
	fullWidthMobile,
}) => {
	const watchedHybridBlocks = form.watch('hybridBlockPrompts');
	const hybridBlocks = useMemo(() => watchedHybridBlocks || [], [watchedHybridBlocks]);
	const isAiSubject = form.watch('isAiSubject');
	const signature = form.watch('signature') || '';

	// Track which blocks are expanded
	const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

	const buttonContainerRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

	// On mobile portrait in hybrid mode, add extra gap before the inline signature
	// only when the last rendered block is a core (not a trailing text block).
	const shouldUseLargeHybridSigGap = useMemo(() => {
		if (draftingMode !== 'hybrid') return false;
		const blocks = hybridBlocks || [];
		if (blocks.length === 0) return false;
		const last = blocks[blocks.length - 1];
		return last?.type !== 'text';
	}, [draftingMode, hybridBlocks]);

	// Simple breakpoint check for render-time style tweaks (mobile portrait)
	const isMobilePortrait =
		typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;

	// Treat short-height devices as mobile landscape for spacing tweaks
	const isMobileLandscape =
		typeof window !== 'undefined' && window.matchMedia('(max-height: 480px)').matches;

	const [addTextButtons, setAddTextButtons] = useState<
		Array<{ blockId: string; top: number; show: boolean }>
	>([]);
	const blockIds = useMemo(() => hybridBlocks.map((b) => b.id).join(','), [hybridBlocks]);

	// Calculate absolute Y positions for the +Text buttons relative to root and whether each should be shown
	const recomputeAddButtonPositions = useCallback(() => {
		const nextButtons: Array<{ blockId: string; top: number; show: boolean }> = [];
		if (draftingMode === 'hybrid' && rootRef.current) {
			const rootRect = rootRef.current.getBoundingClientRect();
			const hybridCoreBlocks = hybridBlocks.filter(
				(b) => b.type === 'introduction' || b.type === 'research' || b.type === 'action'
			);

			// Fixed offset for buttons below their blocks
			// Add a tiny bit more space on small screens to avoid visual crowding
			const isMobilePortrait =
				typeof window !== 'undefined' && window.matchMedia('(max-width: 480px)').matches;
			const buttonOffset = isMobilePortrait ? 4 : 2;

			const container = buttonContainerRef.current;
			const containerRect = container?.getBoundingClientRect();

			for (const block of hybridCoreBlocks) {
				const blockEl = blockRefs.current[block.id];
				if (!blockEl || !containerRect || !container) continue;

				// Compute Y relative to the scroll container to avoid drift
				// yWithinContainer: block's bottom inside the scroll area, plus fixed offset
				const yWithinContainer =
					blockEl.offsetTop + blockEl.offsetHeight + buttonOffset - container.scrollTop;
				// Convert container-relative Y to root-relative Y for absolute positioning
				const buttonTop = containerRect.top - rootRect.top + yWithinContainer;
				const indexInAll = hybridBlocks.findIndex((b) => b.id === block.id);
				const hasImmediateTextBlock = hybridBlocks[indexInAll + 1]?.type === 'text';
				nextButtons.push({
					blockId: block.id,
					top: buttonTop,
					show: !hasImmediateTextBlock,
				});
			}
		}
		setAddTextButtons(nextButtons);
	}, [draftingMode, hybridBlocks]);

	// Recompute when blocks change/expand/collapse
	useLayoutEffect(() => {
		recomputeAddButtonPositions();
	}, [recomputeAddButtonPositions]);

	// Keep positions in sync on scroll and resize to avoid drift/overlap
	useEffect(() => {
		const container = buttonContainerRef.current;
		if (!container) return;
		let rafId = 0 as number | 0;
		const schedule = () => {
			if (rafId) return;
			rafId = requestAnimationFrame(() => {
				rafId = 0;
				recomputeAddButtonPositions();
			});
		};

		container.addEventListener('scroll', schedule, {
			passive: true,
		} as AddEventListenerOptions);
		window.addEventListener('resize', schedule);

		// Observe size changes of container and blocks
		const ro = new ResizeObserver(() => schedule());
		ro.observe(container);
		Object.values(blockRefs.current).forEach((el) => {
			if (el) ro.observe(el);
		});

		// Initial run after listeners attach
		schedule();

		return () => {
			container.removeEventListener('scroll', schedule as EventListener);
			window.removeEventListener('resize', schedule);
			ro.disconnect();
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [recomputeAddButtonPositions, blockIds, draftingMode]);

	// Ensure the mini structure never appears empty by keeping at least one block present
	useEffect(() => {
		const currentBlocks = form.getValues('hybridBlockPrompts') || [];
		if (!currentBlocks || currentBlocks.length === 0) {
			form.setValue(
				'hybridBlockPrompts',
				[
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
				],
				{ shouldDirty: true }
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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

	const addHybridBlock = (type: HybridBlock) => {
		const blocks = [...(form.getValues('hybridBlockPrompts') || [])];
		// Avoid duplicates
		if (blocks.some((b) => b.type === type)) return;

		const orderedCore: HybridBlock[] = [
			'introduction' as HybridBlock,
			'research' as HybridBlock,
			'action' as HybridBlock,
		];
		const newCoreIndex = orderedCore.findIndex((t) => t === type);

		let insertIndex = -1;
		for (let i = 0; i < blocks.length; i++) {
			const existingType = blocks[i].type as HybridBlock;
			const existingCoreIdx = orderedCore.findIndex((t) => t === existingType);
			if (existingCoreIdx !== -1 && existingCoreIdx > newCoreIndex) {
				insertIndex = i;
				break;
			}
		}

		if (insertIndex === -1) {
			let lastCoreIndex = -1;
			for (let i = blocks.length - 1; i >= 0; i--) {
				const existingType = blocks[i].type as HybridBlock;
				const existingCoreIdx = orderedCore.findIndex((t) => t === existingType);
				if (existingCoreIdx !== -1) {
					lastCoreIndex = i;
					break;
				}
			}
			insertIndex = lastCoreIndex === -1 ? 0 : lastCoreIndex + 1;
		}

		const newBlock = { id: String(type), type, value: '' } as {
			id: string;
			type: HybridBlock;
			value: string;
		};
		blocks.splice(insertIndex, 0, newBlock);
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	// Only allow removing Intro if both Research and CTA are already removed
	const canRemoveHybridCore = (id: string): boolean => {
		const blocks = form.getValues('hybridBlockPrompts') || [];
		const target = blocks.find((b) => b.id === id);
		if (!target) return false;
		if (draftingMode !== 'hybrid') return true;
		if (target.type !== 'introduction') return true;
		const hasResearch = blocks.some((b) => b.type === 'research');
		const hasAction = blocks.some((b) => b.type === 'action');
		return !hasResearch && !hasAction;
	};

	const removeBlock = (id: string) => {
		const currentBlocks = form.getValues('hybridBlockPrompts') || [];
		const target = currentBlocks.find((b) => b.id === id);
		if (!target) return;
		if (draftingMode === 'hybrid' && target.type === 'introduction') {
			const allowed = canRemoveHybridCore(id);
			if (!allowed) return; // keep Intro until other cores are removed
		}
		const blocks = currentBlocks.filter((b) => b.id !== id);
		form.setValue('hybridBlockPrompts', blocks, { shouldDirty: true });
	};

	const updateSignature = (value: string) => {
		form.setValue('signature', value, { shouldDirty: true });
	};

	// Compact signature layout is used for the pinned mini version on the
	// left side of the campaign page (where footer + chrome are hidden).
	// There we want normal-sized controls, but a thinner, tighter signature.
	const isCompactSignature = hideFooter && hideTopChrome;

	return (
		<div
			ref={rootRef}
			style={{
				width: fullWidthMobile ? '100%' : '376px',
				height:
					isMobilePortrait || isMobileLandscape
						? 'auto'
						: isCompactSignature
						? '373px'
						: '474px',
				position: 'relative',
				overflow: 'visible',
			}}
		>
			{/* Centered number above block (hidden in mobile landscape) */}
			{!hideTopChrome && !isMobileLandscape && (
				<div
					data-drafting-top-number
					style={{
						position: 'absolute',
						top: '-26px',
						left: '50%',
						transform: 'translateX(-50%)',
						pointerEvents: 'none',
					}}
					className="text-[12px] font-inter font-medium text-black"
				>
					2
				</div>
			)}
			{/* Top-left text label */}
			{!hideTopChrome && !isMobileLandscape && (
				<div
					data-drafting-top-label
					style={{
						position: 'absolute',
						top: '-20px',
						left: '2px',
						pointerEvents: 'none',
					}}
					className="text-[12px] font-inter font-medium text-black"
				>
					Email Structure
				</div>
			)}
			{/* Container with header to match table sizing */}
			<div
				style={{
					width: '100%',
					height: isMobilePortrait || isMobileLandscape ? 'auto' : '100%',
					border: '3px solid #000000',
					borderRadius: '8px',
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					background: '#A6E2A8',
					overflow: 'visible',
					zIndex: 1,
				}}
			>
				{/* Content area - miniature, but interactive */}
				<div
					ref={buttonContainerRef}
					className={cn(
						'overflow-visible',
						isMobilePortrait || isMobileLandscape ? '' : 'flex-1'
					)}
				>
					<div className="px-0 pb-3 max-[480px]:pb-2">
						{/* Mode */}
						<div className="w-full bg-white pt-2 rounded-t-[5px] relative">
							{/* Inline step indicator for mobile landscape */}
							{isMobileLandscape && (
								<div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[12px] leading-none font-inter font-medium text-black">
									<span>2</span>
									<svg
										width="7"
										height="12"
										viewBox="0 0 7 12"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M6.53033 6.53033C6.82322 6.23744 6.82322 5.76256 6.53033 5.46967L1.75736 0.696699C1.46447 0.403806 0.989593 0.403806 0.696699 0.696699C0.403806 0.989593 0.403806 1.46447 0.696699 1.75736L4.93934 6L0.696699 10.2426C0.403806 10.5355 0.403806 11.0104 0.696699 11.3033C0.989593 11.5962 1.46447 11.5962 1.75736 11.3033L6.53033 6.53033ZM5 6V6.75H6V6V5.25H5V6Z"
											fill="#636363"
											fillOpacity="0.46"
										/>
									</svg>
								</div>
							)}
							<div className="flex items-center gap-4 mb-1 w-[95%] mx-auto">
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
								</div>
							</div>
							<div className="h-[2px] bg-black w-full mb-1" />
						</div>

						{/* Auto Subject */}
						<div className="mb-3 w-[95%] max-[480px]:w-[89.33vw] mx-auto">
							<div
								className={cn(
									'flex items-center h-[25px] rounded-[8px] border-2 border-black overflow-hidden',
									isAiSubject ? 'bg-[#E0E0E0]' : 'bg-white'
								)}
							>
								<div className="pl-2 flex items-center h-full shrink-0 w-[90px] bg-transparent">
									<span className="font-inter font-semibold text-[13px] max-[480px]:text-[11px] whitespace-nowrap text-black">
										{isAiSubject ? 'Auto Subject' : 'Subject'}
									</span>
								</div>
								<button
									type="button"
									aria-pressed={isAiSubject}
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
								</button>
								<div
									className={cn(
										'flex-grow h-full flex items-center px-2',
										'bg-transparent'
									)}
								>
									<input
										type="text"
										className={cn(
											'w-full text-[12px] leading-tight outline-none focus:outline-none bg-transparent max-[480px]:placeholder:text-[8px]',
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
						<div className="flex flex-col gap-[25px] max-[480px]:gap-[40px] overflow-visible">
							{(() => {
								// Renderers reused below
								const renderHybridCore = (b: {
									id: string;
									type: HybridBlock;
									value: string | null;
								}) => {
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
												ref={(el) => {
													blockRefs.current[b.id] = el;
												}}
												className={cn(
													'rounded-[8px] border-2 bg-[#DADAFC] overflow-hidden relative w-[95%] max-[480px]:w-[89.33vw] mx-auto',
													isExpanded ? 'h-[78px]' : 'h-[31px] max-[480px]:h-[24px]',
													!isExpanded && isMobileLandscape && 'h-[24px]'
												)}
												style={{ borderColor: strokeColor }}
											>
												<div className="w-full h-full flex flex-col">
													<div
														className={cn(
															'flex flex-row items-center flex-shrink-0',
															isExpanded ? 'h-[21px]' : 'h-[31px] max-[480px]:h-[24px]',
															!isExpanded && isMobileLandscape && 'h-[24px]'
														)}
													>
														<div
															className={cn(
																'flex-1 flex h-full px-3',
																isMobileLandscape ? 'items-center' : 'items-center'
															)}
														>
															<span className="font-inter text-[12px] leading-none font-semibold text-black">
																{blockLabel(b.type as HybridBlock)}
															</span>
															{blockHint(b.type as HybridBlock) && (
																<span className="text-[10px] leading-none italic text-[#5d5d5d] ml-2">
																	{blockHint(b.type as HybridBlock)}
																</span>
															)}
														</div>
														<div
															className={cn(
																'flex flex-row h-full',
																isMobileLandscape ? 'items-center' : 'items-stretch'
															)}
														>
															<div
																className={cn(
																	'border-l border-black',
																	isExpanded
																		? 'h-[21px]'
																		: 'h-[27px] max-[480px]:h-[20px]',
																	!isExpanded && isMobileLandscape && 'h-[20px]'
																)}
															/>
															<button
																type="button"
																onClick={() => {
																	setExpandedBlocks((prev) => {
																		const next = new Set(prev);
																		if (isExpanded) next.delete(b.id);
																		else next.add(b.id);
																		return next;
																	});
																}}
																className={cn(
																	'w-[75px] h-full flex items-center justify-center text-[11px] leading-none cursor-pointer appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none',
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
																	isExpanded
																		? 'h-[21px]'
																		: 'h-[27px] max-[480px]:h-[20px]',
																	!isExpanded && isMobileLandscape && 'h-[20px]'
																)}
															/>
															<button
																type="button"
																onClick={() => removeBlock(b.id)}
																className={cn(
																	'w-[30px] h-full flex items-center justify-center leading-none font-bold text-red-600 hover:bg-black/10 appearance-none border-0 outline-none focus:outline-none focus:ring-0 rounded-none select-none',
																	isMobileLandscape ? 'text-[16px]' : 'text-[18px]'
																)}
																aria-label="Remove block"
															>
																×
															</button>
														</div>
													</div>
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
										</Fragment>
									);
								};

								const renderGeneric = (b: {
									id: string;
									type: HybridBlock;
									value: string | null;
								}) => (
									<Fragment key={b.id}>
										<div
											className={cn(
												'rounded-[8px] border-2 bg-white px-2 py-1 relative w-[95%] max-[480px]:w-[89.33vw] mx-auto',
												b.type === 'full_automated' && 'mini-full-auto-card'
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
													<div className="relative">
														{!b.value && (
															<div className="absolute inset-0 pointer-events-none py-2 pr-2 text-[#505050] text-[12px] max-[480px]:text-[10px] mini-full-auto-placeholder">
																<div className="space-y-2">
																	<div>
																		<p>Type anything you wnat to include</p>
																	</div>
																</div>
															</div>
														)}
														<textarea
															className={cn(
																'border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 w-full max-w-full min-w-0',
																'h-[70px] py-2 pr-2 px-0 resize-none',
																'bg-white text-[12px] leading-[16px]',
																'mini-full-auto-textarea'
															)}
															placeholder=""
															value={b.value || ''}
															onChange={(e) => updateBlockValue(b.id, e.target.value)}
														/>
													</div>
												</div>
											) : (
												<textarea
													className="w-full mt-1 text-[11px] leading-[14px] rounded-[6px] p-1 resize-none h-[52px] outline-none focus:outline-none max-[480px]:placeholder:text-[8px]"
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

								if (draftingMode !== 'hybrid') {
									return hybridBlocks.map((b) =>
										b.type === 'introduction' ||
										b.type === 'research' ||
										b.type === 'action'
											? renderHybridCore(
													b as { id: string; type: HybridBlock; value: string | null }
											  )
											: renderGeneric(
													b as { id: string; type: HybridBlock; value: string | null }
											  )
									);
								}

								// Hybrid mode: keep three fixed core slots; render placeholder if missing.
								const slots: Array<'introduction' | 'research' | 'action'> = [
									'introduction',
									'research',
									'action',
								];
								type Block = { id: string; type: HybridBlock; value: string | null };
								const slotCore: Record<
									'introduction' | 'research' | 'action',
									Block | null
								> = { introduction: null, research: null, action: null };
								const slotExtras: Record<
									'introduction' | 'research' | 'action',
									Block[]
								> = { introduction: [], research: [], action: [] };

								let current: 'introduction' | 'research' | 'action' = 'introduction';
								for (const b of hybridBlocks) {
									if (
										b.type === 'introduction' ||
										b.type === 'research' ||
										b.type === 'action'
									) {
										slotCore[b.type] = b as Block;
										// Keep extras under the most recently seen core block
										current = b.type;
										continue;
									}
									// Treat everything else as extra content tied to the current slot (mostly text)
									slotExtras[current].push(b as Block);
								}

								const labelFor = (t: HybridBlock) =>
									t === 'introduction' ? 'Intro' : t === 'research' ? 'Research' : 'CTA';
								const colorFor = (t: HybridBlock) =>
									t === 'introduction'
										? '#6673FF'
										: t === 'research'
										? '#1010E7'
										: '#0E0E7F';

								const out: ReactNode[] = [];
								for (const slot of slots) {
									const core = slotCore[slot];
									if (core) out.push(renderHybridCore(core));
									else {
										out.push(
											<div
												key={`mini-ph-${slot}`}
												className={cn(
													'w-[95%] max-[480px]:w-[89.33vw] mx-auto h-[31px] max-[480px]:h-[24px] flex items-center justify-end',
													isMobileLandscape && 'h-[24px]'
												)}
											>
												<Button
													type="button"
													onClick={() => addHybridBlock(slot)}
													className="w-[76px] h-[26px] bg-white hover:bg-stone-100 active:bg-stone-200 border-2 rounded-[6px] !font-normal text-[10px] text-black inline-flex items-center justify-start gap-[4px] pl-[4px]"
													style={{ borderColor: colorFor(slot) }}
													title={`Add ${labelFor(slot)}`}
												>
													<TinyPlusIcon
														width="8px"
														height="8px"
														className="!w-[8px] !h-[8px]"
													/>
													<span className="font-inter font-medium text-[10px] text-[#0A0A0A]">
														{labelFor(slot)}
													</span>
												</Button>
											</div>
										);
									}
									for (const extra of slotExtras[slot]) out.push(renderGeneric(extra));
								}

								return out;
							})()}
						</div>
						{/* Mobile portrait/landscape: Signature inline spacing (extra in hybrid to avoid cutoff) */}
						<div
							className={cn(
								'max-[480px]:block hidden',
								shouldUseLargeHybridSigGap ? 'mt-8' : 'mt-2'
							)}
							style={{ display: isMobileLandscape ? 'block' : undefined }}
						>
							<div
								className="rounded-[8px] border-2 bg-white px-2 py-2 w-[95%] max-[480px]:w-[89.33vw] mx-auto"
								style={{ borderColor: '#969696' }}
							>
								<div className="font-inter text-[12px] font-semibold text-black mb-1 pl-1">
									Signature
								</div>
								<textarea
									className="w-full text-[12px] leading-[16px] rounded-[6px] pl-1 pr-1 pt-1 pb-1 resize-none outline-none focus:outline-none h-[48px] signature-textarea"
									value={signature}
									onChange={(e) => updateSignature(e.target.value)}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Signature - fixed at bottom (outside scroll) for non-mobile only */}
				<div
					className={cn(
						'px-0 pb-2 max-[480px]:hidden',
						isCompactSignature ? 'mt-1' : 'mt-3'
					)}
					style={{ display: isMobileLandscape ? 'none' : undefined }}
				>
					<div
						className="rounded-[8px] border-2 bg-white px-2 py-2 w-[95%] max-[480px]:w-[89.33vw] mx-auto"
						style={{ borderColor: '#969696' }}
					>
						<div className="font-inter text-[12px] font-semibold text-black mb-1 pl-1">
							Signature
						</div>
						<textarea
							className={cn(
								'w-full text-[12px] rounded-[6px] pl-1 pr-1 pt-1 pb-1 resize-none outline-none focus:outline-none max-[480px]:h-[40px] signature-textarea',
								isCompactSignature
									? hybridBlocks.some((b) => b.type === 'full_automated')
										? 'h-[28px]'
										: 'h-[36px]'
									: hybridBlocks.some((b) => b.type === 'full_automated')
									? 'h-[40px]'
									: 'h-[58px]'
							)}
							value={signature}
							onChange={(e) => updateSignature(e.target.value)}
						/>
					</div>
				</div>

				{/* Footer with Draft button */}
				{!hideFooter && (
					<div className="px-0 pb-3">
						<Button
							type="button"
							onClick={onDraft}
							disabled={isDraftDisabled}
							className={cn(
								'w-[95%] !h-[28px] mx-auto !rounded-[4px] border border-black bg-[#68C575] text-black font-inter font-medium text-[14px] flex items-center justify-center'
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
				)}
			</div>
			<div
				className="absolute top-0 left-[-18px] max-[480px]:-left-[10px] flex flex-col"
				style={{ pointerEvents: 'none', zIndex: 100 }}
			>
				{addTextButtons.map((btn, index) => {
					if (!btn.show) return null;
					const blockIndex = hybridBlocks.findIndex((b) => b.id === btn.blockId);
					if (blockIndex === -1) return null;
					return (
						<div
							key={`add-btn-${btn.blockId}-${index}`}
							style={{
								position: 'absolute',
								top: `${btn.top}px`,
								left: 0,
								pointerEvents: 'all',
							}}
						>
							<Button
								type="button"
								onClick={() => addTextBlockAt(blockIndex)}
								className={cn(
									'w-[52px] h-[20px] bg-white hover:bg-stone-100 active:bg-stone-200 border border-[#5DAB68] rounded-[4px] !font-normal text-[10px] text-black flex items-center justify-center gap-1'
								)}
								title="Text block"
							>
								<TinyPlusIcon width="5px" height="5px" className="!w-[8px] !h-[8px]" />
								<span className="font-secondary">Text</span>
							</Button>
						</div>
					);
				})}
			</div>
		</div>
	);
};
