import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { Droppable } from '../DragAndDrop/Droppable';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { HybridBlock } from '@prisma/client';
import { HybridPromptInputProps, useHybridPromptInput } from './useHybridPromptInput';
import { cn } from '@/utils';
import React, {
	useState,
	FC,
	Fragment,
	useRef,
	useEffect,
	useMemo,
	useLayoutEffect,
} from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { TestPreviewPanel } from '../TestPreviewPanel/TestPreviewPanel';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';
import { ParagraphSlider } from '@/components/atoms/ParagraphSlider/ParagraphSlider';
import { ToneSelector } from '../ToneSelector/ToneSelector';
import { DraggableHighlight } from '../DragAndDrop/DraggableHighlight';
import DraggableBox from '@/app/murmur/campaign/[campaignId]/DraftingSection/EmailGeneration/DraggableBox';
interface SortableAIBlockProps {
	block: {
		value: HybridBlock;
		label: string;
		placeholder?: string;
		isCollapsed?: boolean;
	};
	id: string;
	fieldIndex: number;
	onRemove: (id: string) => void;
	onCollapse?: (id: string) => void;
	isCollapsed?: boolean;
	onExpand?: (id: string) => void;
	trackFocusedField?: (
		fieldName: string,
		element: HTMLTextAreaElement | HTMLInputElement | null
	) => void;
	showTestPreview?: boolean;
	testMessage?: string | null;
}

const SortableAIBlock = ({
	block,
	id,
	fieldIndex,
	onRemove,
	isCollapsed = false,
	onExpand,
	trackFocusedField,
	showTestPreview,
	testMessage,
}: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	const form = useFormContext<DraftingFormValues>();
	// Track if the text field has been touched (user has interacted with it)
	const [hasBeenTouched, setHasBeenTouched] = useState(false);
	// Track if advanced mode is enabled for hybrid blocks
	const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(false);
	// When a block is opened (advanced), focus its input once
	const advancedInputRef = useRef<HTMLInputElement | null>(null);
	useEffect(() => {
		if (isAdvancedEnabled) {
			advancedInputRef.current?.focus();
		}
	}, [isAdvancedEnabled]);

	const style = {
		transform: CSS.Transform.toString(transform),
		WebkitTransform: CSS.Transform.toString(transform),
		transition,
		WebkitTransition: transition,
	};

	const isTextBlock = block.value === HybridBlock.text;
	const isFullAutomatedBlock = block.value === HybridBlock.full_automated;
	const isIntroductionBlock = block.value === HybridBlock.introduction;
	const isResearchBlock = block.value === HybridBlock.research;
	const isActionBlock = block.value === HybridBlock.action;
	const isHybridBlock = isIntroductionBlock || isResearchBlock || isActionBlock;
	const isCompactBlock =
		block.value === HybridBlock.introduction ||
		block.value === HybridBlock.research ||
		block.value === HybridBlock.action ||
		block.value === HybridBlock.text;

	// Watch the field value to determine if text block is empty
	const fieldValue = form.watch(`hybridBlockPrompts.${fieldIndex}.value`);
	const isTextBlockEmpty = isTextBlock && !fieldValue;
	// Only show red styling if the field has been touched and is empty
	const shouldShowRedStyling = isTextBlockEmpty && hasBeenTouched;

	// Mobile detection for conditional placeholder shortening
	const isMobile = useIsMobile();

	// Get the border color for the block
	const getBorderColor = () => {
		if (isIntroductionBlock) return '#6673FF';
		if (isResearchBlock) return '#1010E7';
		if (isActionBlock) return '#0E0E7F';
		return 'gray-300';
	};

	// If this is a collapsed hybrid block, show a collapsed button
	if (isCollapsed && isHybridBlock) {
		return (
			<div
				className={cn(
					'flex justify-end',
					showTestPreview
						? 'w-[426px] max-[480px]:w-[89.8vw]'
						: 'w-[93.7vw] max-w-[868px]'
				)}
			>
				<Button
					type="button"
					onClick={() => onExpand?.(id)}
					className="w-[76px] h-[30px] bg-background hover:bg-primary/20 active:bg-primary/20 border-2 rounded-[8px] !font-normal text-[10px] text-gray-600"
					style={{ borderColor: getBorderColor() }}
				>
					<span className="font-secondary">
						{isIntroductionBlock ? 'Intro' : isResearchBlock ? 'Research' : 'CTA'}
					</span>
				</Button>
			</div>
		);
	}

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-block-type={
				isFullAutomatedBlock
					? 'full'
					: isIntroductionBlock
					? 'introduction'
					: isResearchBlock
					? 'research'
					: isActionBlock
					? 'action'
					: isTextBlock
					? 'text'
					: 'other'
			}
			className={cn(
				'relative rounded-md overflow-hidden',
				isIntroductionBlock && 'border-2 border-[#6673FF] bg-background',
				isResearchBlock && 'border-2 border-[#1010E7] bg-background',
				isActionBlock && 'border-2 border-[#0E0E7F] bg-background',
				!isIntroductionBlock &&
					!isResearchBlock &&
					!isActionBlock &&
					'border-2 border-gray-300 bg-background',
				isTextBlock
					? showTestPreview
						? 'w-[426px] max-[480px]:w-[89.33vw] min-h-[44px]'
						: 'w-[89.33vw] max-w-[868px] min-h-[80px]'
					: isCompactBlock
					? showTestPreview
						? `w-[426px] max-[480px]:w-[89.33vw] ${
								isAdvancedEnabled ? 'h-[78px]' : 'h-[31px]'
						  }`
						: `w-[89.33vw] max-w-[868px] ${isAdvancedEnabled ? 'h-[78px]' : 'h-[31px]'}`
					: isFullAutomatedBlock
					? showTestPreview
						? 'w-[426px] max-[480px]:w-[89.33vw]'
						: 'w-[89.33vw] max-w-[868px]'
					: showTestPreview
					? 'w-[426px] max-[480px]:w-[89.33vw]'
					: 'w-[89.33vw] max-w-[868px]',
				!isIntroductionBlock &&
					!isResearchBlock &&
					!isActionBlock &&
					(shouldShowRedStyling
						? 'border-[#A20000]'
						: isTextBlock
						? 'border-primary'
						: 'border-secondary'),
				isDragging ? 'opacity-50 z-50 transform-gpu' : ''
			)}
		>
			{/* Inner content wrapper */}
			<div
				className={cn(
					(isIntroductionBlock || isResearchBlock || isActionBlock) &&
						!isAdvancedEnabled &&
						'bg-[#DADAFC] h-full',
					'relative'
				)}
			>
				{/* Drag handle */}
				<div
					{...attributes}
					{...listeners}
					data-drag-handle
					className={cn(
						'absolute top-0 left-0 cursor-move z-[1]',
						isTextBlock
							? showTestPreview
								? 'h-[44px] w-[80px]'
								: 'h-[80px] w-[172px]'
							: isCompactBlock
							? showTestPreview
								? `${isAdvancedEnabled ? 'h-[78px]' : 'h-[31px]'} w-[80px]`
								: `${isAdvancedEnabled ? 'h-[78px]' : 'h-[31px]'} w-[90px]`
							: 'h-12',
						isFullAutomatedBlock
							? 'w-[172px]'
							: !isCompactBlock && !isFullAutomatedBlock
							? 'w-full'
							: ''
					)}
				/>
				{/* Block content container */}
				<div
					className={cn(
						'flex items-center w-full',
						isCompactBlock
							? isAdvancedEnabled
								? 'p-0 h-full'
								: 'p-2 h-full'
							: isFullAutomatedBlock || isTextBlock
							? 'px-4 pt-2 pb-4'
							: 'p-4'
					)}
				>
					<div className={cn('flex-grow min-w-0', isCompactBlock && 'flex items-center')}>
						{isDragging && (
							<div className="absolute inset-0 rounded-md bg-background z-10 pointer-events-none" />
						)}
						<div
							className={cn(
								'absolute z-30',
								isCompactBlock
									? isTextBlock
										? 'right-1 top-0'
										: isAdvancedEnabled
										? 'right-1 top-[12.5px] -translate-y-1/2'
										: 'right-1 top-1/2 -translate-y-1/2'
									: isFullAutomatedBlock
									? 'right-1 top-0'
									: isTextBlock
									? 'right-3 top-2'
									: 'right-3 top-3'
							)}
						>
							{!isTextBlock && !isFullAutomatedBlock && !isCompactBlock && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setIsAdvancedEnabled(true);
									}}
									className="absolute top-0 bottom-0 right-14 w-[75px] flex items-center justify-center text-[12px] font-inter font-normal text-[#000000] cursor-pointer hover:bg-[#C4C4F5] active:bg-[#B0B0E8] transition-colors"
								>
									<span className="absolute left-0 h-full border-l border-[#000000]"></span>
									<span>Advanced</span>
									<span className="absolute right-0 h-full border-r border-[#000000]"></span>
								</button>
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className={cn(isCompactBlock && 'h-8 w-8')}
								onClick={(e) => {
									e.stopPropagation();
									onRemove(id);
								}}
							>
								<X className="h-[13px] w-[13px] text-destructive-dark" />
							</Button>
						</div>
						{isCompactBlock ? (
							// Compact blocks
							<div
								className={cn(
									'w-full h-full',
									isAdvancedEnabled
										? 'flex flex-col'
										: isTextBlock
										? 'flex items-start'
										: 'flex items-center'
								)}
							>
								{isTextBlock ? (
									<>
										<div className="flex flex-col justify-start w-[90px]">
											<span
												className={cn(
													'font-inter font-medium text-[17px] leading-[14px]',
													shouldShowRedStyling && 'text-[#A20000]'
												)}
											>
												Text
											</span>
										</div>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											return (
												<Textarea
													placeholder={
														isIntroductionBlock ? 'Automated Intro' : block.placeholder
													}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'flex-1 outline-none focus:outline-none text-sm border-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none overflow-hidden bg-transparent min-h-0 appearance-none rounded-none',
														(isIntroductionBlock || isResearchBlock || isActionBlock) &&
															'font-inter placeholder:italic placeholder:text-[#5d5d5d]',
														'pl-0',
														'pr-12'
													)}
													rows={1}
													{...fieldProps}
													onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
														const target = e.currentTarget;
														target.style.height = 'auto';
														target.style.height = target.scrollHeight + 'px';
													}}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLTextAreaElement
														);
													}}
													onBlur={(e) => {
														if (isTextBlock) {
															setHasBeenTouched(true);
														}
														fieldProps.onBlur(e);
													}}
													onChange={(e) => {
														if (isTextBlock && e.target.value) {
															setHasBeenTouched(true);
														}
														fieldProps.onChange(e);
													}}
												/>
											);
										})()}
									</>
								) : (
									// Compact blocks with "Hybrid"
									<>
										{isAdvancedEnabled &&
										(isIntroductionBlock || isResearchBlock || isActionBlock) ? (
											// Expanded layout with top section and input below
											<div className="w-full h-full flex flex-col bg-[#DADAFC]">
												{/* Top section - maintains original compact layout */}
												<div className="relative flex items-center h-[25px] px-2 bg-[#DADAFC]">
													<div className="flex flex-col justify-center w-[90px]">
														<span
															className={cn(
																'font-inter font-medium text-[17px] leading-[17px] text-[#000000]',
																isIntroductionBlock && '',
																isResearchBlock && '',
																isActionBlock && ''
															)}
														>
															{isIntroductionBlock
																? 'Intro'
																: isResearchBlock
																? 'Resarch'
																: isActionBlock
																? 'CTA'
																: (block as { label: string }).label}
														</span>
													</div>
													<div className="flex-1 min-w-0 flex items-center pl-0 pr-12 overflow-hidden">
														<span className="text-sm max-[480px]:text-[10px] font-inter italic text-[#5d5d5d] truncate">
															{isResearchBlock
																? isMobile
																	? 'Automatic Research'
																	: showTestPreview
																	? 'Automated Research'
																	: block.placeholder
																: block.placeholder}
														</span>
													</div>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															setIsAdvancedEnabled(false);
														}}
														className="absolute right-10 top-0 bottom-0 w-[75px] flex items-center justify-center text-[12px] font-inter font-normal text-white bg-[#5353AF] cursor-pointer hover:bg-[#4a4a9d] active:bg-[#42428c] transition-colors"
													>
														<span className="absolute left-0 h-full border-l border-black"></span>
														<span>Advanced</span>
														<span className="absolute right-0 h-full border-r border-black"></span>
													</button>
												</div>
												{/* Horizontal divider */}
												<div
													className="w-full border-b-2"
													style={{
														borderColor: isIntroductionBlock
															? '#6673FF'
															: isResearchBlock
															? '#1010E7'
															: isActionBlock
															? '#0E0E7F'
															: '#000000',
													}}
												/>
												{/* Input section below */}
												<div className="flex-1 flex items-end pb-2 pt-1 px-2 bg-white">
													<div className="w-[90px] flex-shrink-0" />
													<div className="flex-1 flex items-center pl-0 pr-12">
														{(() => {
															const fieldProps = form.register(
																`hybridBlockPrompts.${fieldIndex}.value`
															);
															return (
																<input
																	type="text"
																	placeholder=""
																	onClick={(e) => e.stopPropagation()}
																	className={cn(
																		'w-full outline-none text-sm',
																		'!bg-white',
																		'font-inter'
																	)}
																	style={{ backgroundColor: '#FFFFFF' }}
																	{...fieldProps}
																	ref={(el) => {
																		advancedInputRef.current = el;
																		fieldProps.ref(el);
																	}}
																	onFocus={(e) => {
																		trackFocusedField?.(
																			`hybridBlockPrompts.${fieldIndex}.value`,
																			e.target as HTMLInputElement
																		);
																		e.target.style.cursor = 'text';
																	}}
																	onBlur={(e) => {
																		fieldProps.onBlur(e);
																		e.target.style.cursor = '';
																	}}
																/>
															);
														})()}
													</div>
												</div>
											</div>
										) : (
											// Non-expanded compact layout
											<>
												<div className="flex flex-col justify-center w-[90px]">
													<span
														className={cn(
															'font-inter font-medium text-[17px] leading-[17px] text-[#000000]',
															isIntroductionBlock && '',
															isResearchBlock && '',
															isActionBlock && ''
														)}
													>
														{isIntroductionBlock
															? 'Intro'
															: isResearchBlock
															? 'Resarch'
															: isActionBlock
															? 'CTA'
															: (block as { label: string }).label}
													</span>
												</div>
												{(() => {
													const fieldProps = form.register(
														`hybridBlockPrompts.${fieldIndex}.value`
													);

													return (
														<>
															<input
																type="text"
																placeholder={
																	isResearchBlock
																		? isMobile
																			? 'Automatic Research'
																			: showTestPreview
																			? 'Automated Research'
																			: block.placeholder
																		: block.placeholder
																}
																onClick={(e) => e.stopPropagation()}
																disabled={
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																	!isAdvancedEnabled
																}
																className={cn(
																	'flex-1 outline-none text-sm max-[480px]:text-[10px] truncate min-w-0',
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? '!bg-[#DADAFC]'
																		: 'bg-white placeholder:text-gray-400',
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																		'font-inter placeholder:italic placeholder:text-[#5d5d5d] max-[480px]:placeholder:text-[10px]',
																	'pl-0',
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? 'pr-24'
																		: 'pr-12',
																	(isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock) &&
																		!isAdvancedEnabled &&
																		'cursor-default'
																)}
																style={
																	isIntroductionBlock || isResearchBlock || isActionBlock
																		? { backgroundColor: '#DADAFC' }
																		: undefined
																}
																{...fieldProps}
																ref={(el) => {
																	// Combine react-hook-form ref with our custom ref
																	fieldProps.ref(el);
																}}
																onFocus={(e) => {
																	trackFocusedField?.(
																		`hybridBlockPrompts.${fieldIndex}.value`,
																		e.target as HTMLInputElement
																	);
																	// Hide cursor when focused
																	if (
																		isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock
																	) {
																		e.target.style.cursor = 'text';
																	}
																}}
																onBlur={(e) => {
																	fieldProps.onBlur(e);
																	// Restore cursor when unfocused
																	if (
																		isIntroductionBlock ||
																		isResearchBlock ||
																		isActionBlock
																	) {
																		e.target.style.cursor = '';
																	}
																}}
															/>
															{(isIntroductionBlock ||
																isResearchBlock ||
																isActionBlock) &&
																!isAdvancedEnabled && (
																	<button
																		type="button"
																		onClick={(e) => {
																			e.stopPropagation();
																			setIsAdvancedEnabled(true);
																		}}
																		className="absolute right-10 top-0 bottom-0 w-[75px] flex items-center justify-center text-[12px] font-inter font-normal text-[#000000] cursor-pointer hover:bg-[#C4C4F5] active:bg-[#B0B0E8] transition-colors"
																	>
																		<span className="absolute left-0 h-full border-l border-[#000000]"></span>
																		<span>Advanced</span>
																		<span className="absolute right-0 h-full border-r border-[#000000]"></span>
																	</button>
																)}
														</>
													);
												})()}
											</>
										)}
									</>
								)}
							</div>
						) : (
							// Non-compact blocks
							<>
								{!isTextBlock && !isFullAutomatedBlock && <></>}
								<div
									className={cn(
										'flex gap-2 min-h-7 items-center relative z-20',
										isFullAutomatedBlock || isTextBlock ? 'mb-1' : 'mb-2',
										isFullAutomatedBlock && showTestPreview && testMessage && 'flex-wrap',
										// On mobile portrait, allow the header to wrap so the tone selector can move to a second row
										isFullAutomatedBlock && 'max-[480px]:flex-wrap max-[480px]:gap-y-1'
									)}
								>
									{!isTextBlock ? (
										<>
											<Typography
												variant="h4"
												className={cn(
													'font-inter',
													isIntroductionBlock && 'text-[#9D9DFF]',
													isResearchBlock && 'text-[#4A4AD9]',
													isActionBlock && 'text-[#040488]',
													isFullAutomatedBlock && 'font-semibold text-[17px]'
												)}
											>
												{isFullAutomatedBlock
													? 'Full Auto'
													: (block as { label: string }).label}
											</Typography>

											<ToneSelector isCompact={!!showTestPreview && !!testMessage} />
										</>
									) : (
										<Typography
											variant="h4"
											className={cn(
												'font-inter',
												shouldShowRedStyling && 'text-[#A20000]'
											)}
										>
											Text
										</Typography>
									)}
								</div>
								{isTextBlock || isFullAutomatedBlock ? (
									(() => {
										const fieldProps = form.register(
											`hybridBlockPrompts.${fieldIndex}.value`
										);
										const fieldValue = form.watch(
											`hybridBlockPrompts.${fieldIndex}.value`
										);
										const showCustomPlaceholder = isFullAutomatedBlock && !fieldValue;

										return (
											<>
												<div className={isFullAutomatedBlock ? 'relative' : ''}>
													{showCustomPlaceholder && (
														<div className="absolute inset-0 pointer-events-none py-2 pr-10 text-[#505050] text-base md:text-sm max-[480px]:text-[10px]">
															<div className="space-y-3">
																<div>
																	<p>Prompt Murmur here.</p>
																	<p>
																		Tell it what you want to say and it will compose
																		emails based on your instructions.
																	</p>
																</div>
																<div className="full-auto-placeholder-example">
																	<p>Ex.</p>
																	<p>
																		&ldquo;Compose a professional booking pitch email.
																		Include one or two facts about the venue, introduce my
																		band honestly, highlight our fit for their space, and
																		end with a straightforward next-steps question. Keep
																		tone warm, clear, and brief.&rdquo;
																	</p>
																</div>
															</div>
														</div>
													)}
													<Textarea
														placeholder={
															isFullAutomatedBlock
																? ''
																: 'placeholder' in block
																? (block as { placeholder?: string }).placeholder || ''
																: ''
														}
														onClick={(e) => e.stopPropagation()}
														className={cn(
															'border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 max-w-full min-w-0 max-[480px]:placeholder:text-[10px]',
															isIntroductionBlock
																? '!bg-[#DADAFC] [&]:!bg-[#DADAFC]'
																: 'bg-white',
															isFullAutomatedBlock
																? 'h-[195px] px-0 resize-none full-auto-textarea'
																: '',
															shouldShowRedStyling ? 'placeholder:text-[#A20000]' : '',
															(isIntroductionBlock || isResearchBlock || isActionBlock) &&
																'font-inter placeholder:italic placeholder:text-[#5d5d5d]'
														)}
														style={
															isIntroductionBlock
																? { backgroundColor: '#DADAFC' }
																: undefined
														}
														{...fieldProps}
														onFocus={(e) => {
															trackFocusedField?.(
																`hybridBlockPrompts.${fieldIndex}.value`,
																e.target as HTMLTextAreaElement
															);
														}}
														onBlur={(e) => {
															if (isTextBlock) {
																setHasBeenTouched(true);
															}
															fieldProps.onBlur(e);
														}}
														onChange={(e) => {
															if (isTextBlock && e.target.value) {
																setHasBeenTouched(true);
															}
															fieldProps.onChange(e);
														}}
													/>
												</div>
												{isFullAutomatedBlock && <ParagraphSlider />}
											</>
										);
									})()
								) : (
									// For other blocks, show input always but disabled until Advanced is clicked
									<>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											const isHybridBlock =
												isIntroductionBlock || isResearchBlock || isActionBlock;
											if (!isHybridBlock) return null;

											return (
												<Input
													placeholder={
														'placeholder' in block
															? isIntroductionBlock
																? 'Automated Intro'
																: (block as { placeholder?: string }).placeholder || ''
															: ''
													}
													onClick={(e) => e.stopPropagation()}
													disabled={!isAdvancedEnabled}
													className={cn(
														'border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
														'!bg-[#DADAFC] [&]:!bg-[#DADAFC]',
														'font-inter placeholder:italic placeholder:text-[#5d5d5d]',
														!isAdvancedEnabled && 'cursor-default'
													)}
													style={{ backgroundColor: '#DADAFC' }}
													{...fieldProps}
													ref={(el) => {
														// Combine react-hook-form ref with our custom ref
														fieldProps.ref(el);
													}}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLInputElement
														);
														// Set text cursor when focused
														e.target.style.cursor = 'text';
													}}
													onBlur={(e) => {
														fieldProps.onBlur(e);
														// Restore cursor when unfocused
														e.target.style.cursor = '';
													}}
												/>
											);
										})()}
									</>
								)}
							</>
						)}
					</div>
				</div>
				{/* End of Block content container */}
			</div>
		</div>
	);
};

export const HybridPromptInput: FC<HybridPromptInputProps> = (props) => {
	const {
		form,
		fields,
		handleDragEnd,
		handleRemoveBlock,
		getBlock,
		handleAddBlock,
		handleAddTextBlockAt,
		handleToggleCollapse,
		showTestPreview,
		setShowTestPreview,
		trackFocusedField,
		testMessage,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isPendingGeneration,
		isTest,
		contact,
		onGoToDrafting,
	} = useHybridPromptInput(props);

	const { compactLeftOnly } = props;

	// Track if the user has attempted to Test to control error styling
	const [hasAttemptedTest, setHasAttemptedTest] = useState(false);
	// Controls swap order between compressed drafting panel and test preview panel
	const [isPanelsReversed, setIsPanelsReversed] = useState(false);

	// Subject field red styling (manual mode): mirror text block behavior
	const subjectValue = form.watch('subject');
	const isManualSubject = !form.watch('isAiSubject');
	const [hasSubjectBeenTouched, setHasSubjectBeenTouched] = useState(false);
	const shouldShowSubjectRedStyling =
		isManualSubject &&
		hasSubjectBeenTouched &&
		(!subjectValue || subjectValue.trim() === '');

	const isHandwrittenMode =
		(form.getValues('hybridBlockPrompts')?.length || 0) > 0 &&
		form.getValues('hybridBlockPrompts').every((b) => b.type === HybridBlock.text);
	const hasBlocks = (form.getValues('hybridBlockPrompts')?.length || 0) > 0;

	// Check for empty text blocks
	const hasEmptyTextBlocks = form
		.getValues('hybridBlockPrompts')
		?.some(
			(block) =>
				block.type === HybridBlock.text && (!block.value || block.value.trim() === '')
		);

	// Determine if any empty text block has been touched (blurred) to align with per-block red logic
	// Access touchedFields to subscribe to touch updates
	const touchedFields = form.formState.touchedFields as unknown as {
		hybridBlockPrompts?: Array<{ value?: boolean }>;
	};
	const hasTouchedEmptyTextBlocks = form
		.getValues('hybridBlockPrompts')
		?.some((block: { type: HybridBlock; value: string }, index: number) => {
			if (block.type !== HybridBlock.text) return false;
			const isTouched = Boolean(touchedFields?.hybridBlockPrompts?.[index]?.value);
			const isEmpty = !block.value || block.value.trim() === '';
			return isTouched && isEmpty;
		});

	// Derive selected mode key for stable overlay updates
	const isFullSelected = form
		.getValues('hybridBlockPrompts')
		?.some((b) => b.type === HybridBlock.full_automated);
	const isManualSelected =
		(form.getValues('hybridBlockPrompts')?.length || 0) > 0 &&
		form.getValues('hybridBlockPrompts').every((b) => b.type === HybridBlock.text);
	const lastModeRef = useRef<'full' | 'hybrid' | 'manual' | null>(null);
	const [modeOverride, setModeOverride] = useState<'none' | null>(null);
	useEffect(() => {
		const blocks = form.getValues('hybridBlockPrompts') || [];
		if (isFullSelected) {
			lastModeRef.current = 'full';
			setModeOverride(null);
			return;
		}
		if (
			blocks.length === 0 &&
			(lastModeRef.current === 'full' ||
				lastModeRef.current === 'manual' ||
				lastModeRef.current === 'hybrid')
		) {
			setModeOverride('none');
		} else {
			setModeOverride(null);
			if (isManualSelected) lastModeRef.current = 'manual';
			else if (blocks.length > 0) lastModeRef.current = 'hybrid';
			else lastModeRef.current = null;
		}
	}, [isFullSelected, isManualSelected, fields, form]); // depends on fields length now
	const selectedModeKey = useMemo(
		() =>
			modeOverride === 'none'
				? 'none'
				: isFullSelected
				? 'full'
				: isManualSelected
				? 'manual'
				: 'hybrid',
		[modeOverride, isFullSelected, isManualSelected]
	);

	const switchToFull = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.length > 0 && current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedManualBlocks', current);
		} else if (
			current.length > 0 &&
			!current.some((b) => b.type === HybridBlock.full_automated)
		) {
			form.setValue('savedHybridBlocks', current);
		}
		form.setValue('hybridBlockPrompts', [
			{
				id: 'full_automated',
				type: HybridBlock.full_automated,
				value: form.getValues('fullAiPrompt') || '',
			},
		]);
		form.setValue('isAiSubject', true);
	};
	const switchToHybrid = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.some((b) => b.type === HybridBlock.full_automated)) {
			form.setValue(
				'fullAiPrompt',
				(current.find((b) => b.type === HybridBlock.full_automated)?.value as string) ||
					''
			);
		} else if (current.length > 0 && current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedManualBlocks', current);
		} else if (current.length > 0) {
			form.setValue('savedHybridBlocks', current);
		}
		const savedHybrid: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('savedHybridBlocks') || [];
		form.setValue(
			'hybridBlockPrompts',
			savedHybrid.length > 0
				? savedHybrid
				: [
						{
							id: 'introduction',
							type: HybridBlock.introduction,
							value: '',
						},
						{
							id: 'research',
							type: HybridBlock.research,
							value: '',
						},
						{ id: 'action', type: HybridBlock.action, value: '' },
				  ]
		);
		form.setValue('isAiSubject', true);
	};

	const switchToManual = () => {
		const current: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('hybridBlockPrompts') || [];
		if (current.some((b) => b.type === HybridBlock.full_automated)) {
			form.setValue(
				'fullAiPrompt',
				(current.find((b) => b.type === HybridBlock.full_automated)?.value as string) ||
					''
			);
		} else if (current.length > 0 && !current.every((b) => b.type === HybridBlock.text)) {
			form.setValue('savedHybridBlocks', current);
		}
		const savedManual: {
			id: string;
			type: HybridBlock;
			value: string;
		}[] = form.getValues('savedManualBlocks') || [];
		form.setValue(
			'hybridBlockPrompts',
			savedManual.length > 0
				? savedManual
				: [{ id: 'text-0', type: HybridBlock.text, value: '' }]
		);
		form.setValue('isAiSubject', false);
	};

	const handleClearAllInside = () => {
		form.setValue('hybridBlockPrompts', []);
		form.setValue('hybridAvailableBlocks', [
			HybridBlock.full_automated,
			HybridBlock.introduction,
			HybridBlock.research,
			HybridBlock.action,
			HybridBlock.text,
		]);
	};

	const modeContainerRef = useRef<HTMLDivElement>(null);
	const fullModeButtonRef = useRef<HTMLButtonElement>(null);
	const hybridModeButtonRef = useRef<HTMLButtonElement>(null);
	const manualModeButtonRef = useRef<HTMLButtonElement>(null);
	const mainContainerRef = useRef<HTMLDivElement>(null);
	const headerSectionRef = useRef<HTMLDivElement>(null);
	const modeDividerRef = useRef<HTMLDivElement>(null);
	const [overlayTopPx, setOverlayTopPx] = useState<number | null>(null);

	const [highlightStyle, setHighlightStyle] = useState({
		left: 0,
		width: 0,
		opacity: 0,
	});
	const [isInitialRender, setIsInitialRender] = useState(true);

	const dragBounds = useRef({ min: 0, max: 0 });

	useEffect(() => {
		if (selectedModeKey === 'none') {
			setHighlightStyle({
				left: 0,
				width: 0,
				opacity: 0,
			});
			if (isInitialRender) {
				setIsInitialRender(false);
			}
			return;
		}
		let targetButton;
		if (selectedModeKey === 'full') {
			targetButton = fullModeButtonRef.current;
		} else if (selectedModeKey === 'hybrid') {
			targetButton = hybridModeButtonRef.current;
		} else {
			targetButton = manualModeButtonRef.current;
		}

		if (targetButton) {
			const newLeft = targetButton.offsetLeft + targetButton.offsetWidth / 2 - 80.38 / 2;
			setHighlightStyle({
				left: newLeft,
				width: 80.38,
				opacity: 1,
			});
			if (isInitialRender) {
				setIsInitialRender(false);
			}
		}

		if (fullModeButtonRef.current && manualModeButtonRef.current) {
			const min =
				fullModeButtonRef.current.offsetLeft +
				fullModeButtonRef.current.offsetWidth / 2 -
				80.38 / 2;
			const max =
				manualModeButtonRef.current.offsetLeft +
				manualModeButtonRef.current.offsetWidth / 2 -
				80.38 / 2;
			dragBounds.current = { min, max };
		}
	}, [selectedModeKey, isInitialRender]);

	const restrictToHorizontalAxisAndBounds = ({
		transform,
	}: {
		transform: { x: number; y: number; scaleX: number; scaleY: number };
	}) => {
		const currentX = highlightStyle.left + transform.x;
		const { min, max } = dragBounds.current;

		if (min === 0 && max === 0) {
			return { ...transform, y: 0 };
		}

		const constrainedX = Math.max(min, Math.min(currentX, max));
		const newTransformX = constrainedX - highlightStyle.left;

		return {
			...transform,
			x: newTransformX,
			y: 0,
		};
	};

	const handleHighlightDragEnd = (event: { delta: { x: number } }) => {
		const finalX = highlightStyle.left + event.delta.x;

		const positions = [
			{
				mode: 'full',
				center:
					(fullModeButtonRef.current?.offsetLeft ?? 0) +
					(fullModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
			{
				mode: 'hybrid',
				center:
					(hybridModeButtonRef.current?.offsetLeft ?? 0) +
					(hybridModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
			{
				mode: 'manual',
				center:
					(manualModeButtonRef.current?.offsetLeft ?? 0) +
					(manualModeButtonRef.current?.offsetWidth ?? 0) / 2,
			},
		];

		const closest = positions.reduce((prev, curr) => {
			return Math.abs(curr.center - (finalX + 80.38 / 2)) <
				Math.abs(prev.center - (finalX + 80.38 / 2))
				? curr
				: prev;
		});

		if (closest.mode === 'full') {
			switchToFull();
		} else if (closest.mode === 'hybrid') {
			switchToHybrid();
		} else {
			switchToManual();
		}
	};

	const isMobile = useIsMobile();

	// Mobile-only: measure to start overlay exactly at the big divider line under Mode
	useLayoutEffect(() => {
		if (!isMobile || showTestPreview) {
			setOverlayTopPx(null);
			return;
		}
		const recalc = () => {
			const container = mainContainerRef.current;
			const headerSection = headerSectionRef.current;
			const divider = modeDividerRef.current;
			if (!container) return;
			const containerRect = container.getBoundingClientRect();
			// Account for the container's border so our absolutely positioned overlay,
			// which is positioned relative to the padding edge, starts exactly at the
			// visual divider line without leaving a gap on mobile.
			const borderTopWidth = container.clientTop || 0;
			let startBelow = 0;
			if (divider) {
				const dividerRect = divider.getBoundingClientRect();
				startBelow = dividerRect.bottom - containerRect.top;
			} else if (headerSection) {
				const headerRect = headerSection.getBoundingClientRect();
				startBelow = headerRect.bottom - containerRect.top;
			} else {
				return;
			}
			// Subtract the borderTop so the overlay's top aligns to the inside edge.
			// Using round avoids sub-pixel gaps on some DPRs.
			const nextTop = Math.max(0, Math.round(startBelow - borderTopWidth));
			setOverlayTopPx(nextTop);
		};
		recalc();
		window.addEventListener('resize', recalc);
		window.addEventListener('orientationchange', recalc);
		return () => {
			window.removeEventListener('resize', recalc);
			window.removeEventListener('orientationchange', recalc);
		};
	}, [isMobile, showTestPreview, fields.length, selectedModeKey]);
	return (
		<div
			className={cn(
				compactLeftOnly ? '' : 'flex justify-center',
				!showTestPreview && 'max-[480px]:pb-[60px]'
			)}
			data-hpi-root
		>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<Droppable id="droppable">
					<DraggableBox
						id="main-drafting"
						dragHandleSelector="[data-root-drag-handle]"
						enabled={isMobile === false && !showTestPreview}
						onDropOver={() => {}}
					>
						<div
							ref={mainContainerRef}
							className={`${
								compactLeftOnly
									? ''
									: 'w-[96.27vw] max-w-[892px] min-h-[686px] transition mb-4 flex mx-auto '
							}	${
								showTestPreview
									? 'flex-row gap-[40px] justify-center items-start'
									: compactLeftOnly
									? 'flex-col'
									: 'flex-col border-[3px] border-black rounded-md bg-white min-h-[686px]'
							}	relative overflow-visible`}
							data-hpi-container
						>
							{/* Mobile-only gradient background overlay starting under Mode divider */}
							{isMobile && !showTestPreview && overlayTopPx !== null && (
								<div
									style={{
										position: 'absolute',
										left: 0,
										right: 0,
										top: overlayTopPx,
										bottom: 0,
										background:
											'linear-gradient(to bottom, rgba(222,242,225,0.71) 0%, rgba(222,242,225,0.5) 40%, rgba(222,242,225,0.25) 80%, rgba(222,242,225,0.15) 100%)',
										pointerEvents: 'none',
										zIndex: 0,
										// Square off the top corners so the fill meets the border flush on mobile
										borderTopLeftRadius: 0,
										borderTopRightRadius: 0,
										// Preserve the container's rounded bottoms
										borderBottomLeftRadius: 'inherit',
										borderBottomRightRadius: 'inherit',
									}}
								/>
							)}
							{/* Left side - Content area (draggable when testing) */}
							<DraggableBox
								id="test-left-panel"
								dragHandleSelector="[data-left-drag-handle]"
								enabled={Boolean(showTestPreview)}
								onDropOver={(overId) => {
									if (overId === 'test-preview-panel') setIsPanelsReversed((p) => !p);
								}}
								className={cn(
									showTestPreview ? (isPanelsReversed ? 'order-2' : 'order-1') : '',
									// Hide the main drafting panel on mobile when Test Preview is open
									isMobile && showTestPreview && 'hidden',
									'relative z-10'
								)}
							>
								<div
									className={cn(
										`flex flex-col`,
										showTestPreview
											? 'w-[457px] shrink-0 h-[644px] pt-[10px] px-[18px] pb-[18px] border-[2px] border-black rounded-[8px] bg-white'
											: compactLeftOnly
											? 'w-[350px]'
											: 'w-full min-h-0 pt-[10px] px-0 pb-0 flex-1',
										'relative z-10'
									)}
									data-hpi-left-panel
								>
									{/* Removed explicit drag bar; header below acts as the drag handle */}
									{/* Subject header inside the box */}
									<div
										ref={headerSectionRef}
										className={cn(
											'pt-0 pb-0',
											showTestPreview && '-mx-[18px] px-[18px] rounded-t-[8px]'
										)}
									>
										<div
											className={cn(
												'h-[36px] flex items-center relative z-20',
												showTestPreview
													? 'w-[426px] max-[480px]:w-[89.8vw] mx-auto pl-[8px] max-[480px]:pl-[6px]'
													: 'w-[93.7vw] max-w-[868px] mx-auto pl-[8px] max-[480px]:pl-[6px]'
											)}
											data-left-drag-handle
											data-root-drag-handle
										>
											<span
												className={cn(
													'font-inter font-semibold text-[17px] mr-[56px] max-[480px]:mr-[22px] text-black'
												)}
											>
												Mode
											</span>
											<div
												ref={modeContainerRef}
												className="relative flex items-center gap-[67px] max-[480px]:gap-0 max-[480px]:justify-between max-[480px]:w-[230px] max-[480px]:ml-[2px]"
											>
												<DndContext
													onDragEnd={handleHighlightDragEnd}
													modifiers={[restrictToHorizontalAxisAndBounds]}
												>
													{selectedModeKey !== 'none' && (
														<DraggableHighlight
															style={highlightStyle}
															isInitialRender={isInitialRender}
															mode={selectedModeKey as 'full' | 'hybrid' | 'manual'}
														/>
													)}
												</DndContext>
												<Button
													ref={fullModeButtonRef}
													variant="ghost"
													type="button"
													className={cn(
														'!p-0 h-fit !m-0 text-[11.7px] font-inter font-semibold bg-transparent z-20',
														selectedModeKey !== 'none' &&
															form
																.getValues('hybridBlockPrompts')
																?.some((b) => b.type === HybridBlock.full_automated)
															? 'text-black'
															: 'text-[#AFAFAF] hover:text-[#8F8F8F]'
													)}
													onClick={switchToFull}
												>
													Full Auto
												</Button>
												<Button
													ref={hybridModeButtonRef}
													variant="ghost"
													type="button"
													className={cn(
														'!p-0 h-fit !m-0 text-[11.7px] font-inter font-semibold bg-transparent z-20',
														selectedModeKey !== 'none' &&
															!form
																.getValues('hybridBlockPrompts')
																?.some((b) => b.type === HybridBlock.full_automated) &&
															!form
																.getValues('hybridBlockPrompts')
																?.every((b) => b.type === HybridBlock.text)
															? 'text-black'
															: 'text-[#AFAFAF] hover:text-[#8F8F8F]'
													)}
													onClick={switchToHybrid}
												>
													Hybrid
												</Button>
												<Button
													ref={manualModeButtonRef}
													variant="ghost"
													type="button"
													className={cn(
														'!p-0 h-fit !m-0 text-[11.7px] font-inter font-semibold bg-transparent z-20',
														selectedModeKey !== 'none' &&
															(form.getValues('hybridBlockPrompts')?.length || 0) > 0 &&
															form
																.getValues('hybridBlockPrompts')
																?.every((b) => b.type === HybridBlock.text)
															? 'text-black'
															: 'text-[#AFAFAF] hover:text-[#8F8F8F]'
													)}
													onClick={switchToManual}
												>
													Manual
												</Button>
											</div>
										</div>
										{compactLeftOnly ? null : (
											<>
												{showTestPreview && (
													<div className="h-[2px] bg-black -mx-[18px]" />
												)}
												<div
													ref={modeDividerRef}
													className={cn('h-[2px] bg-black', showTestPreview && 'hidden')}
												/>
												{showTestPreview && <div className="h-2" />}
											</>
										)}
										<div className="flex flex-col items-center">
											<FormField
												control={form.control}
												name="subject"
												rules={{ required: form.watch('isAiSubject') }}
												render={({ field }) => (
													<FormItem
														className={cn(
															showTestPreview
																? 'w-[426px] max-[480px]:w-[89.33vw]'
																: 'w-[89.33vw] max-w-[868px]'
														)}
													>
														<div
															className={cn(
																'flex items-center',
																showTestPreview
																	? 'justify-end pr-[24px] mt-1 mb-1'
																	: 'justify-end mb-2 pr-5'
															)}
														>
															<div className="flex items-center gap-2"></div>
															{hasBlocks && (
																<button
																	type="button"
																	onClick={handleClearAllInside}
																	className={cn(
																		showTestPreview ? 'text-xs' : 'text-sm',
																		'font-inter font-medium text-[#AFAFAF] hover:underline',
																		showTestPreview ? 'mr-[12px]' : 'relative top-[4px]',
																		// Hide on mobile portrait
																		'max-[480px]:hidden'
																	)}
																>
																	Clear All
																</button>
															)}
														</div>
														<FormControl>
															<div
																className={cn(
																	'flex items-center h-[31px] max-[480px]:h-[24px] rounded-[8px] border-2 border-black overflow-hidden subject-bar',
																	form.watch('isAiSubject') ? 'bg-[#F1F1F1]' : 'bg-white'
																)}
															>
																<div
																	className={cn(
																		'pl-2 flex items-center h-full shrink-0 w-[120px]',
																		'bg-white'
																	)}
																>
																	<span className="font-inter font-semibold text-[17px] max-[480px]:text-[12px] whitespace-nowrap text-black">
																		{form.watch('isAiSubject')
																			? 'Auto Subject'
																			: 'Subject'}
																	</span>
																</div>

																<button
																	type="button"
																	onClick={() => {
																		if (!isHandwrittenMode) {
																			const newValue = !form.watch('isAiSubject');
																			form.setValue('isAiSubject', newValue);
																			if (newValue) {
																				form.setValue('subject', '');
																			}
																		}
																	}}
																	disabled={isHandwrittenMode}
																	className={cn(
																		'relative h-full flex items-center text-[12px] font-inter font-normal transition-colors shrink-0',
																		form.watch('isAiSubject')
																			? 'w-auto px-3 justify-center bg-[#5dab68] text-white'
																			: 'w-[100px] px-2 justify-center text-black bg-[#DADAFC] hover:bg-[#C4C4F5] active:bg-[#B0B0E8] -translate-x-[30px]',
																		isHandwrittenMode && 'opacity-50 cursor-not-allowed'
																	)}
																>
																	<span className="absolute left-0 h-full border-l border-black"></span>
																	<span>
																		{form.watch('isAiSubject') ? 'on' : 'Auto off'}
																	</span>
																	<span className="absolute right-0 h-full border-r border-black"></span>
																</button>

																<div className={cn('flex-grow h-full', 'bg-white')}>
																	<Input
																		{...field}
																		className={cn(
																			'w-full h-full !bg-transparent pl-4 pr-3 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 max-[480px]:placeholder:text-[10px] max-[480px]:!transition-none max-[480px]:!duration-0',
																			form.watch('isAiSubject')
																				? '!text-[#969696] placeholder:!text-[#969696]'
																				: shouldShowSubjectRedStyling
																				? '!text-[#A20000] placeholder:!text-[#A20000]'
																				: '!text-black placeholder:!text-black',
																			!form.watch('isAiSubject') && 'max-[480px]:pl-2'
																		)}
																		placeholder={
																			form.watch('isAiSubject')
																				? 'Automated Subject Line'
																				: 'Write your subject here. *required'
																		}
																		disabled={form.watch('isAiSubject')}
																		onFocus={(e) =>
																			!form.watch('isAiSubject') &&
																			trackFocusedField?.('subject', e.target)
																		}
																		onBlur={() => {
																			if (!form.watch('isAiSubject')) {
																				setHasSubjectBeenTouched(true);
																			}
																			field.onBlur();
																		}}
																		onChange={(e) => {
																			if (!form.watch('isAiSubject') && e.target.value) {
																				setHasSubjectBeenTouched(true);
																			}
																			field.onChange(e);
																		}}
																	/>
																</div>
															</div>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									</div>
									<div className="flex-1 flex flex-col" data-hpi-content>
										{/* Content area */}
										<div className="pt-[16px] pr-3 pb-3 pl-3 flex flex-col gap-4 items-center flex-1">
											{fields.length === 0 && (
												<span className="text-gray-300 font-primary text-[12px]">
													Add blocks here to build your prompt...
												</span>
											)}
											<SortableContext
												items={fields.map((f) => f.id)}
												strategy={verticalListSortingStrategy}
											>
												{(() => {
													const orderedHybridTypes = [
														HybridBlock.introduction,
														HybridBlock.research,
														HybridBlock.action,
													];
													const presentHybridTypes = new Set(
														fields
															.filter(
																(f) =>
																	f.type === HybridBlock.introduction ||
																	f.type === HybridBlock.research ||
																	f.type === HybridBlock.action
															)
															.map((f) => f.type)
													);

													const shouldShowPlaceholders = selectedModeKey === 'hybrid';
													const missingHybridTypes = shouldShowPlaceholders
														? orderedHybridTypes.filter((t) => !presentHybridTypes.has(t))
														: [];

													const inserted = new Set<string>();
													const augmented: Array<
														| {
																kind: 'field';
																field: (typeof fields)[number];
																index: number;
														  }
														| { kind: 'placeholder'; blockType: HybridBlock; key: string }
													> = [];

													for (let index = 0; index < fields.length; index++) {
														const field = fields[index];
														if (
															field.type === HybridBlock.introduction ||
															field.type === HybridBlock.research ||
															field.type === HybridBlock.action
														) {
															const currentIdx = orderedHybridTypes.indexOf(field.type);
															for (let i = 0; i < currentIdx; i++) {
																const t = orderedHybridTypes[i];
																if (
																	missingHybridTypes.includes(t) &&
																	!inserted.has(`ph-${t}`)
																) {
																	augmented.push({
																		kind: 'placeholder',
																		blockType: t,
																		key: `ph-${t}-${index}`,
																	});
																	inserted.add(`ph-${t}`);
																}
															}
														}
														augmented.push({ kind: 'field', field, index });
													}

													for (const t of orderedHybridTypes) {
														if (
															missingHybridTypes.includes(t) &&
															!inserted.has(`ph-${t}`)
														) {
															augmented.push({
																kind: 'placeholder',
																blockType: t,
																key: `ph-${t}-end`,
															});
															inserted.add(`ph-${t}`);
														}
													}

													const renderHybridPlaceholder = (type: HybridBlock) => {
														if (selectedModeKey !== 'hybrid') return null;
														const label =
															type === HybridBlock.introduction
																? 'Intro'
																: type === HybridBlock.research
																? 'Research'
																: 'CTA';
														const borderColor =
															type === HybridBlock.introduction
																? '#6673FF'
																: type === HybridBlock.research
																? '#1010E7'
																: '#0E0E7F';
														return (
															<div
																className={cn(
																	'flex justify-end',
																	showTestPreview
																		? 'w-[426px] max-[480px]:w-[89.8vw]'
																		: 'w-[93.7vw] max-w-[868px]'
																)}
															>
																<Button
																	type="button"
																	onClick={() => handleAddBlock(getBlock(type))}
																	font="secondary"
																	className="w-[76px] h-[30px] bg-background hover:bg-primary/20 active:bg-primary/20 border-2 rounded-[8px] !font-normal text-[10px] text-gray-600 inline-flex items-center justify-start gap-[4px] pl-[4px]"
																	style={{ borderColor }}
																	title={`Add ${label}`}
																>
																	<TinyPlusIcon
																		width="8px"
																		height="8px"
																		className="!w-[8px] !h-[8px]"
																	/>
																	<span className="font-inter font-medium text-[10px] text-[#0A0A0A]">
																		{label}
																	</span>
																</Button>
															</div>
														);
													};

													return augmented.map((item) => {
														if (item.kind === 'placeholder') {
															return (
																<Fragment key={item.key}>
																	{renderHybridPlaceholder(item.blockType)}
																</Fragment>
															);
														}

														const field = item.field;
														const index = item.index;
														const isHybridBlock =
															field.type === HybridBlock.introduction ||
															field.type === HybridBlock.research ||
															field.type === HybridBlock.action;
														const hasImmediateTextBlock =
															fields[index + 1]?.type === HybridBlock.text;

														return (
															<Fragment key={field.id}>
																<div className={cn(index === 0 && '-mt-2')}>
																	<SortableAIBlock
																		id={field.id}
																		fieldIndex={index}
																		block={getBlock(field.type)}
																		onRemove={handleRemoveBlock}
																		onCollapse={handleToggleCollapse}
																		onExpand={handleToggleCollapse}
																		isCollapsed={field.isCollapsed}
																		trackFocusedField={trackFocusedField}
																		showTestPreview={showTestPreview}
																		testMessage={testMessage}
																	/>
																</div>
																{/* Plus button under hybrid blocks */}
																{isHybridBlock && !hasImmediateTextBlock && (
																	<div
																		className={cn(
																			'flex relative z-30',
																			showTestPreview
																				? 'justify-start w-full'
																				: 'justify-end -mr-[102px] w-[93.7vw] max-w-[868px] max-[480px]:-mr-[4.4vw]'
																		)}
																		style={{ transform: 'translateY(-12px)' }}
																	>
																		<Button
																			type="button"
																			onClick={() => handleAddTextBlockAt(index)}
																			className={cn(
																				'w-[52px] h-[20px] bg-background hover:bg-stone-100 active:bg-stone-200 border border-primary rounded-[4px] !font-normal text-[10px] text-gray-600 max-[480px]:translate-x-[15px]',
																				showTestPreview &&
																					'absolute left-0 -translate-x-[calc(100%+5px)]'
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
																)}
															</Fragment>
														);
													});
												})()}
											</SortableContext>
										</div>
									</div>

									{/* In Test Preview, keep Signature inside the left panel so it doesn't float */}
									{showTestPreview && (
										<div className={cn('px-3 pb-0 pt-0 flex justify-center mt-auto')}>
											<FormField
												control={form.control}
												name="signature"
												render={({ field }) => (
													<FormItem className="mb-[9px]">
														<div
															className={cn(
																`min-h-[57px] border-2 border-gray-400 rounded-md bg-white px-4 py-2`,
																showTestPreview
																	? 'w-[426px] max-[480px]:w-[89.33vw]'
																	: 'w-[89.33vw] max-w-[868px]'
															)}
														>
															<FormLabel className="text-base font-semibold font-secondary">
																Signature
															</FormLabel>
															<FormControl>
																<Textarea
																	placeholder="Enter your signature..."
																	className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden bg-white signature-textarea"
																	style={{
																		fontFamily: form.watch('font') || 'Arial',
																	}}
																	onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
																		const target = e.currentTarget;
																		target.style.height = 'auto';
																		target.style.height = target.scrollHeight + 'px';
																	}}
																	{...field}
																/>
															</FormControl>
														</div>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>
									)}
								</div>
							</DraggableBox>

							{/* Bottom-anchored footer with Signature and Test */}
							{!showTestPreview && (
								<div className="flex flex-col items-center px-3 mt-auto" data-hpi-footer>
									{/* Signature Block - always visible; positioned above Test with fixed gap */}
									<FormField
										control={form.control}
										name="signature"
										render={({ field }) => (
											<FormItem
												className={cn(
													!showTestPreview && !compactLeftOnly ? 'mb-[23px]' : 'mb-[9px]'
												)}
											>
												<div
													className={cn(
														`min-h-[57px] border-2 border-gray-400 rounded-md bg-white px-4 py-2`,
														showTestPreview
															? 'w-[426px] max-[480px]:w-[89.33vw]'
															: 'w-[89.33vw] max-w-[868px]'
													)}
													data-hpi-signature-card
												>
													<FormLabel className="text-base font-semibold font-secondary">
														Signature
													</FormLabel>
													<FormControl>
														<Textarea
															placeholder="Enter your signature..."
															className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden bg-white signature-textarea"
															style={{
																fontFamily: form.watch('font') || 'Arial',
															}}
															onInput={(e: React.FormEvent<HTMLTextAreaElement>) => {
																const target = e.currentTarget;
																target.style.height = 'auto';
																target.style.height = target.scrollHeight + 'px';
															}}
															{...field}
														/>
													</FormControl>
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* Test button and notices (hidden in compact mode) */}
									{compactLeftOnly ? null : (
										<>
											<div
												className={cn(
													'w-full',
													showTestPreview && 'hidden',
													'max-[480px]:hidden'
												)}
											>
												<div className="flex justify-center mb-4 w-full">
													<Button
														type="button"
														onClick={() => {
															setShowTestPreview?.(true);
															handleGenerateTestDrafts?.();
															setHasAttemptedTest(true);
														}}
														disabled={isGenerationDisabled?.()}
														className={cn(
															'h-[42px] bg-white border-2 border-primary text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary transition-all hover:bg-primary/20 active:bg-primary/20',
															showTestPreview
																? 'w-[426px] max-[480px]:w-[89.8vw]'
																: 'w-[93.7vw] max-w-[868px]',
															isGenerationDisabled?.()
																? 'opacity-50 cursor-not-allowed'
																: 'opacity-100'
														)}
													>
														{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
													</Button>
												</div>
												{hasEmptyTextBlocks && (
													<div
														className={cn(
															hasTouchedEmptyTextBlocks || hasAttemptedTest
																? 'text-destructive'
																: 'text-black',
															'text-sm font-medium -mt-2 mb-2',
															showTestPreview
																? 'w-[426px] max-[480px]:w-[89.8vw]'
																: 'w-[93.7vw] max-w-[868px]'
														)}
													>
														Fill in all text blocks in order to compose an email.
													</div>
												)}
											</div>

											{/* Mobile sticky Test button at page bottom */}
											{!showTestPreview && (
												<div className="hidden max-[480px]:block mobile-sticky-test-button">
													<div className="fixed bottom-0 left-0 right-0 z-40">
														<div className="flex w-full">
															<Button
																type="button"
																onClick={() => {
																	setShowTestPreview?.(true);
																	handleGenerateTestDrafts?.();
																	setHasAttemptedTest(true);
																}}
																disabled={isGenerationDisabled?.()}
																className={cn(
																	'h-[53px] flex-1 rounded-none bg-[#5DAB68] text-white font-times font-bold cursor-pointer flex items-center justify-center font-primary border-2 border-black border-r-0',
																	isGenerationDisabled?.()
																		? 'opacity-50 cursor-not-allowed'
																		: 'opacity-100'
																)}
															>
																{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
															</Button>
															<button
																type="button"
																onClick={() => onGoToDrafting?.()}
																className="h-[53px] w-[92px] bg-[#EEEEEE] text-black font-inter text-[16px] leading-none border-2 border-[#626262] rounded-none flex-shrink-0 border-l-[#626262]"
															>
																<span className="block">Go to</span>
																<span className="block">Drafting</span>
															</button>
														</div>
													</div>
												</div>
											)}
										</>
									)}
								</div>
							)}

							{compactLeftOnly
								? null
								: showTestPreview && (
										<div
											className={cn(
												'w-[461px] max-[480px]:w-[96.27vw] shrink-0',
												isPanelsReversed ? 'order-1' : 'order-2'
											)}
										>
											<DraggableBox
												id="test-preview-panel"
												dragHandleSelector="[data-test-preview-header]"
												enabled={Boolean(showTestPreview)}
												onDropOver={(overId) => {
													if (overId === 'test-left-panel')
														setIsPanelsReversed((p) => !p);
												}}
											>
												<TestPreviewPanel
													setShowTestPreview={setShowTestPreview}
													testMessage={testMessage || ''}
													isLoading={Boolean(isTest)}
													onTest={() => {
														setShowTestPreview?.(true);
														handleGenerateTestDrafts?.();
														setHasAttemptedTest(true);
													}}
													isDisabled={isGenerationDisabled?.()}
													isTesting={Boolean(isTest)}
													contact={contact}
												/>
											</DraggableBox>
											{/* Mobile sticky footer with Back to Testing and Go to Drafting */}
											<div className="hidden max-[480px]:block">
												<div className="fixed bottom-0 left-0 right-0 z-40">
													<div className="flex w-full">
														<Button
															type="button"
															onClick={() => setShowTestPreview?.(false)}
															className={cn(
																'h-[53px] flex-1 rounded-none bg-[#5DAB68] text-white font-times font-bold cursor-pointer flex items-center justify-center font-primary border-2 border-black border-r-0'
															)}
														>
															Back to Testing
														</Button>
														<button
															type="button"
															onClick={() => onGoToDrafting?.()}
															className="h-[53px] w-[92px] bg-[#EEEEEE] text-black font-inter text-[16px] leading-none border-2 border-[#626262] rounded-none flex-shrink-0 border-l-[#626262]"
														>
															<span className="block">Go to</span>
															<span className="block">Drafting</span>
														</button>
													</div>
												</div>
											</div>
										</div>
								  )}
						</div>
					</DraggableBox>
				</Droppable>
			</DndContext>
		</div>
	);
};
