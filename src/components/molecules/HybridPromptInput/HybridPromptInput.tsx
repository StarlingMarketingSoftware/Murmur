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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/DraftingSection/useDraftingSection';
import { HybridBlock, DraftingTone } from '@prisma/client';
import { StepSlider } from '@/components/atoms/StepSlider/StepSlider';
import {
	BLOCKS,
	HybridPromptInputProps,
	useHybridPromptInput,
	BlockItem,
} from './useHybridPromptInput';
import { cn } from '@/utils';
import React, { useState, FC } from 'react';
import { TestPreviewPanel } from '../TestPreviewPanel/TestPreviewPanel';
import DragHandleIcon from '@/components/atoms/_svg/DragHandleIcon';

interface SortableAIBlockProps {
	block: (typeof BLOCKS)[number];
	id: string;
	fieldIndex: number;
	onRemove: (id: string) => void;
	trackFocusedField?: (
		fieldName: string,
		element: HTMLTextAreaElement | HTMLInputElement | null
	) => void;
	showTestPreview?: boolean;
	testMessage?: string | null;
}

interface BlockMenuItemProps {
	item: BlockItem;
	onClick: () => void;
}

const BlockMenuItem: FC<BlockMenuItemProps> = ({ item, onClick }) => {
	const getBackgroundColor = () => {
		if (item.value === HybridBlock.text) {
			return 'bg-primary/25 border-primary';
		} else if (item.value === 'hybrid_automation') {
			return 'bg-tertiary/25 border-tertiary';
		} else if (item.value === HybridBlock.full_automated) {
			return 'bg-secondary/25 border-secondary';
		}
		return '';
	};

	return (
		<DropdownMenuItem
			key={item.value}
			onClick={onClick}
			disabled={item.disabled}
			className="p-0 focus:bg-transparent hover:bg-transparent relative"
		>
			<div
				className={cn(
					'w-[275.23px] h-[51px] border-2 rounded-[8px] flex items-center justify-start pl-4 cursor-pointer font-bold relative z-10 m-0',
					getBackgroundColor()
				)}
			>
				{item.label}
				{item.showUsed && item.disabled && ` (Used)`}
			</div>
		</DropdownMenuItem>
	);
};

const SortableAIBlock = ({
	block,
	id,
	fieldIndex,
	onRemove,
	trackFocusedField,
	showTestPreview,
	testMessage,
}: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	const form = useFormContext<DraftingFormValues>();
	const [isEdit, setIsEdit] = useState(
		form.getValues(`hybridBlockPrompts.${fieldIndex}.value`) !== ''
	);

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
	const isCompactBlock =
		block.value === HybridBlock.introduction ||
		block.value === HybridBlock.research ||
		block.value === HybridBlock.action ||
		block.value === HybridBlock.text;

	return (
		<div
			ref={setNodeRef}
			style={{
				...style,
				...(isIntroductionBlock
					? {
							background:
								'linear-gradient(to right, #C9C9FF 0%, #5E6399 46%, #C9C9FF 100%)',
							padding: '2px',
					  }
					: isResearchBlock
					? {
							background:
								'linear-gradient(to right, #4A4AD9 0%, #272773 57%, #4A4AD9 100%)',
							padding: '2px',
					  }
					: isActionBlock
					? {
							background:
								'linear-gradient(to right, #040488 0%, #020255 50%, #040488 100%)',
							padding: '2px',
					  }
					: {}),
			}}
			className={cn(
				'relative rounded-md',
				isIntroductionBlock || isResearchBlock || isActionBlock
					? ''
					: 'border-2 border-gray-300 bg-background',
				isTextBlock
					? showTestPreview && testMessage
						? 'w-[416px] h-[80px]'
						: 'w-[868px] h-[80px]'
					: isCompactBlock
					? showTestPreview && testMessage
						? 'w-[416px] h-[44px]'
						: 'w-[868px] h-[44px]'
					: 'w-full',
				!isIntroductionBlock &&
					!isResearchBlock &&
					!isActionBlock &&
					(isTextBlock ? 'border-primary' : 'border-secondary'),
				isDragging ? 'opacity-50 z-50 transform-gpu' : ''
			)}
		>
			{/* Inner content wrapper for gradient border effect on introduction, research and action blocks */}
			<div
				className={cn(
					isIntroductionBlock || isResearchBlock || isActionBlock
						? 'bg-background rounded-md h-full'
						: '',
					'relative'
				)}
			>
				{/* Drag handle - only on the left side to avoid interfering with buttons */}
				<div
					{...attributes}
					{...listeners}
					className={cn(
						'absolute top-0 left-0 cursor-move z-[1]',
						isTextBlock ? 'h-[80px] w-8' : isCompactBlock ? 'h-[44px] w-8' : 'h-12',
						isFullAutomatedBlock ? 'w-24' : !isCompactBlock ? 'w-full' : '' // Limit width for Full Automated block and compact blocks
					)}
				/>
				<div className={cn('flex items-center', isCompactBlock ? 'p-2 h-full' : 'p-4')}>
					<div className={cn('flex-grow', isCompactBlock && 'flex items-center')}>
						{isDragging && (
							<div className="absolute inset-0 rounded-md bg-background z-10 pointer-events-none" />
						)}
						<div
							className={cn(
								'absolute z-30',
								isCompactBlock ? 'right-2 top-1/2 -translate-y-1/2' : 'right-3 top-3'
							)}
						>
							{!isTextBlock && !isFullAutomatedBlock && !isCompactBlock && (
								<Button
									type="button"
									className="mr-1"
									variant="action-link"
									onClick={(e) => {
										e.stopPropagation();
										setIsEdit(!isEdit);
									}}
								>
									{isEdit ? 'Cancel' : 'Edit'}
								</Button>
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
							<div className="flex items-center w-full h-full">
								<div className="flex items-center text-gray-300 mr-2 ml-1">
									<DragHandleIcon
										width="4px"
										height="10px"
										pathClassName="stroke-gray-300"
									/>
								</div>
								{isTextBlock ? (
									<>
										<div className="flex flex-col justify-center w-[140px]">
											<span className="font-inter font-medium text-[17px] leading-[14px]">
												Manual Text
											</span>
										</div>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											return (
												<input
													type="text"
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 pl-6 pr-12"
													{...fieldProps}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLInputElement
														);
													}}
												/>
											);
										})()}
									</>
								) : (
									// Compact blocks with "Hybrid"
									<>
										<div className="flex flex-col justify-center w-[140px]">
											<span className="font-inter font-medium text-[17px] leading-[14px]">
												Hybrid
											</span>
											<span
												className={cn(
													'font-inter font-normal text-xs leading-[14px] mt-1',
													isIntroductionBlock && 'text-[#9D9DFF]',
													isResearchBlock && 'text-[#4A4AD9]',
													isActionBlock && 'text-[#040488]'
												)}
											>
												{block.label}
											</span>
										</div>
										{(() => {
											const fieldProps = form.register(
												`hybridBlockPrompts.${fieldIndex}.value`
											);
											return (
												<input
													type="text"
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 pl-6 pr-12"
													{...fieldProps}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLInputElement
														);
													}}
												/>
											);
										})()}
									</>
								)}
							</div>
						) : (
							// Non-compact blocks
							<>
								{!isTextBlock && !isFullAutomatedBlock && (
									<span className="font-inter font-medium text-[17px] mb-2 block">
										Hybrid
									</span>
								)}
								<div className="mb-2 flex gap-2 min-h-7 items-center relative z-20">
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
											{isFullAutomatedBlock && (
												<div className="flex gap-1 relative z-[100] pointer-events-auto">
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
																form.setValue('draftingTone', tone.value);
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
												</div>
											)}
										</>
									) : (
										<Typography variant="h4" className="font-inter">
											Manual Text
										</Typography>
									)}
								</div>
								{isTextBlock || isFullAutomatedBlock ? (
									(() => {
										const fieldProps = form.register(
											`hybridBlockPrompts.${fieldIndex}.value`
										);
										return (
											<>
												<Textarea
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
														isFullAutomatedBlock ? 'h-[300px] px-0' : ''
													)}
													{...fieldProps}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLTextAreaElement
														);
													}}
												/>
												{/* Paragraph slider for Full Auto block only */}
												{isFullAutomatedBlock && (
													<div className="mt-4 flex justify-start px-4">
														<div className="flex items-start gap-4">
															<span className="text-[10px] text-black font-inter font-normal relative top-[-7px]">
																Auto Paragraphs
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
																					onValueChange={(value) =>
																						field.onChange(value[0])
																					}
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
												)}
											</>
										);
									})()
								) : (
									// For other blocks, show input only when in edit mode
									<>
										{isEdit &&
											(() => {
												const fieldProps = form.register(
													`hybridBlockPrompts.${fieldIndex}.value`
												);
												return (
													<Input
														placeholder={
															'placeholder' in block
																? (block as (typeof BLOCKS)[number]).placeholder
																: ''
														}
														onClick={(e) => e.stopPropagation()}
														className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
														{...fieldProps}
														onFocus={(e) => {
															trackFocusedField?.(
																`hybridBlockPrompts.${fieldIndex}.value`,
																e.target as HTMLInputElement
															);
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
		handleAddHybridAutomation,
		handleAddTextBlockAt,
		showTestPreview,
		setShowTestPreview,
		BLOCK_ITEMS,
		trackFocusedField,
		testMessage,
		handleGenerateTestDrafts,
		isGenerationDisabled,
		isPendingGeneration,
		isTest,
	} = useHybridPromptInput(props);

	return (
		<div>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<Droppable id="droppable">
					<div
						className={`w-[892px] min-h-[530px] border-[3px] border-black rounded-md bg-gray-50 transition mb-4 flex ${
							showTestPreview && testMessage ? 'flex-row' : 'flex-col'
						} relative`}
					>
						{/* Left side - Content area */}
						<div
							className={cn(
								`flex flex-col min-h-[530px]`,
								showTestPreview && testMessage ? 'w-1/2' : 'w-full'
							)}
						>
							<div className="flex-1 flex flex-col">
								{/* Content area */}
								<div className="p-3 flex flex-col gap-4 items-center flex-1">
									{fields.length === 0 && (
										<span className="text-gray-300 font-primary text-[12px]">
											Add blocks here to build your prompt...
										</span>
									)}
									<SortableContext
										items={fields.map((f) => f.id)}
										strategy={verticalListSortingStrategy}
									>
										{fields.map((field, index) => {
											const isHybridBlock =
												field.type === HybridBlock.introduction ||
												field.type === HybridBlock.research ||
												field.type === HybridBlock.action;

											return (
												<React.Fragment key={field.id}>
													<SortableAIBlock
														id={field.id}
														fieldIndex={index}
														block={getBlock(field.type)}
														onRemove={handleRemoveBlock}
														trackFocusedField={trackFocusedField}
														showTestPreview={showTestPreview}
														testMessage={testMessage}
													/>
													{/* Plus button under hybrid blocks */}
													{isHybridBlock && (
														<div
															className={cn(
																'flex justify-end -mt-1',
																showTestPreview && testMessage ? 'w-[416px]' : 'w-[868px]'
															)}
														>
															<button
																type="button"
																onClick={() => handleAddTextBlockAt(index)}
																className="w-[76px] h-[20px] bg-white hover:bg-[rgba(93,171,104,0.15)] active:bg-[rgba(93,171,104,0.25)] border border-[#5DAB68] rounded-[3.59px] flex items-center justify-center gap-[6px] transition-colors duration-200"
																title="Add text block"
																style={{
																	borderWidth: '1px',
																	borderColor: '#5DAB68',
																	borderRadius: '3.59px',
																}}
															>
																<svg
																	width="8"
																	height="8"
																	viewBox="0 0 8 8"
																	fill="none"
																	xmlns="http://www.w3.org/2000/svg"
																	className="flex-shrink-0"
																>
																	<path
																		d="M4 1V7M1 4H7"
																		stroke="black"
																		strokeWidth="1.5"
																		strokeLinecap="square"
																		strokeLinejoin="miter"
																	/>
																</svg>
																<span className="font-inter text-[10px] text-[#838383] leading-none">
																	Add text
																</span>
															</button>
														</div>
													)}
												</React.Fragment>
											);
										})}
									</SortableContext>

									{/* Add Block Button */}
									<div className="w-full flex justify-center mt-2">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-12 w-12 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
												>
													<Plus className="h-8 w-8" strokeWidth={3} />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent
												className="w-[275.23px] h-[190px] !overflow-hidden !border-0"
												align="center"
												side="bottom"
												avoidCollisions={false}
											>
												<div className="relative flex flex-col justify-between h-full">
													{/* Vertical lines that extend from hybrid block's side borders */}
													<div className="absolute top-[6px] bottom-[6px] left-0 w-[2px] bg-[#51A2E4] z-0" />
													<div className="absolute top-[6px] bottom-[6px] right-0 w-[2px] bg-[#51A2E4] z-0" />

													<DropdownMenuGroup className="p-0 relative">
														{BLOCK_ITEMS.filter((item) => item.position === 'top').map(
															(item) => (
																<BlockMenuItem
																	key={item.value}
																	item={item}
																	onClick={() => {
																		if (item.value === 'hybrid_automation') {
																			handleAddHybridAutomation();
																		} else if (item.value === HybridBlock.text) {
																			handleAddBlock(getBlock(HybridBlock.text));
																		} else {
																			handleAddBlock(
																				BLOCKS.find((b) => b.value === item.value)!
																			);
																		}
																	}}
																/>
															)
														)}
													</DropdownMenuGroup>
													<div className="flex items-center justify-start pl-4 font-normal relative z-10">
														<span>or</span>
													</div>
													<DropdownMenuGroup className="p-0 relative">
														{BLOCK_ITEMS.filter((item) => item.position === 'bottom').map(
															(item) => (
																<BlockMenuItem
																	key={item.value}
																	item={item}
																	onClick={() => {
																		if (item.value === 'hybrid_automation') {
																			handleAddHybridAutomation();
																		} else if (item.value === HybridBlock.text) {
																			handleAddBlock(getBlock(HybridBlock.text));
																		} else {
																			handleAddBlock(
																				BLOCKS.find((b) => b.value === item.value)!
																			);
																		}
																	}}
																/>
															)
														)}
													</DropdownMenuGroup>
												</div>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>

								{/*  Signature Block */}
								<div className="px-3 pb-0 mt-auto flex justify-center">
									<FormField
										control={form.control}
										name="signature"
										render={({ field }) => (
											<FormItem>
												<div
													className={cn(
														`min-h-[57px] border-2 border-gray-400 rounded-md bg-background px-4 py-2`,
														showTestPreview && testMessage ? 'w-[416px]' : 'w-[868px]'
													)}
												>
													<FormLabel className="text-base font-semibold font-secondary">
														Signature
													</FormLabel>
													<FormControl>
														<Textarea
															placeholder="Enter your signature..."
															className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden"
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
							</div>

							{/* Test Button - Fixed position below signature, centered */}
							<div className="flex justify-center -mt-2 mb-4 px-3">
								<Button
									type="button"
									onClick={handleGenerateTestDrafts}
									disabled={isGenerationDisabled?.()}
									className={cn(
										'h-[42px] bg-white border-2 border-primary text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary transition-all hover:bg-[rgba(93,171,104,0.15)] active:bg-[rgba(93,171,104,0.20)]',
										showTestPreview && testMessage ? 'w-[416px]' : 'w-[868px]',
										isGenerationDisabled?.()
											? 'opacity-50 cursor-not-allowed'
											: 'opacity-100'
									)}
								>
									{isPendingGeneration && isTest ? 'Testing...' : 'Test'}
								</Button>
							</div>
						</div>

						{showTestPreview && testMessage && (
							<TestPreviewPanel
								setShowTestPreview={setShowTestPreview}
								testMessage={testMessage}
							/>
						)}
					</div>
				</Droppable>
			</DndContext>
		</div>
	);
};
