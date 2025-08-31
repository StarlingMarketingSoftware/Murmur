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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { HybridBlock } from '@prisma/client';
import {
	BLOCKS,
	HybridPromptInputProps,
	useHybridPromptInput,
	BlockItem,
} from './useHybridPromptInput';
import { cn } from '@/utils';
import React, { useState, FC, Fragment } from 'react';
import { TestPreviewPanel } from '../TestPreviewPanel/TestPreviewPanel';
import TinyPlusIcon from '@/components/atoms/_svg/TinyPlusIcon';
import { ParagraphSlider } from '@/components/atoms/ParagraphSlider/ParagraphSlider';
import { ToneSelector } from '../ToneSelector/ToneSelector';

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

	// Watch the field value to determine if text block is empty
	const fieldValue = form.watch(`hybridBlockPrompts.${fieldIndex}.value`);
	const isTextBlockEmpty = isTextBlock && !fieldValue;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'relative rounded-md p-0.5',
				isIntroductionBlock &&
					'bg-gradient-to-r from-[#C9C9FF] via-[#5E6399] to-[#C9C9FF]',
				isResearchBlock && 'bg-gradient-to-r from-[#4A4AD9] via-[#272773] to-[#4A4AD9]',
				isActionBlock && 'bg-gradient-to-r from-[#040488] via-[#020255] to-[#040488]',
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
					: isFullAutomatedBlock
					? showTestPreview && testMessage
						? 'w-[416px]'
						: 'w-[868px]'
					: 'w-full',
				!isIntroductionBlock &&
					!isResearchBlock &&
					!isActionBlock &&
					(isTextBlockEmpty
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
					isIntroductionBlock || isResearchBlock || isActionBlock
						? 'bg-background rounded-md h-full'
						: '',
					'relative'
				)}
			>
				{/* Drag handle */}
				<div
					{...attributes}
					{...listeners}
					className={cn(
						'absolute top-0 left-0 cursor-move z-[1]',
						isTextBlock ? 'h-[80px] w-8' : isCompactBlock ? 'h-[44px] w-8' : 'h-12',
						isFullAutomatedBlock
							? 'w-24'
							: !isCompactBlock && !isFullAutomatedBlock
							? 'w-full'
							: ''
					)}
				/>
				{/* Block content container */}
				<div
					className={cn(
						'flex items-center w-full',
						isCompactBlock ? 'p-2 h-full' : 'p-4'
					)}
				>
					<div className={cn('flex-grow min-w-0', isCompactBlock && 'flex items-center')}>
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
								{isTextBlock ? (
									<>
										<div className="flex flex-col justify-center w-[140px]">
											<span
												className={cn(
													'font-inter font-medium text-[17px] leading-[14px]',
													isTextBlockEmpty && 'text-[#A20000]'
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
												<input
													type="text"
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'flex-1 bg-white outline-none text-sm pl-6 pr-12',
														isTextBlockEmpty
															? 'placeholder:text-[#A20000]'
															: 'placeholder:text-gray-400'
													)}
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
													className="flex-1 bg-white outline-none text-sm placeholder:text-gray-400 pl-6 pr-12"
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
								<div
									className={cn(
										'mb-2 flex gap-2 min-h-7 items-center relative z-20',
										isFullAutomatedBlock && showTestPreview && testMessage && 'flex-wrap'
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
											className={cn('font-inter', isTextBlockEmpty && 'text-[#A20000]')}
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
										return (
											<>
												<Textarea
													placeholder={block.placeholder}
													onClick={(e) => e.stopPropagation()}
													className={cn(
														'border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 max-w-full min-w-0 bg-white',
														isFullAutomatedBlock ? 'h-[300px] px-0' : '',
														isTextBlockEmpty ? 'placeholder:text-[#A20000]' : ''
													)}
													{...fieldProps}
													onFocus={(e) => {
														trackFocusedField?.(
															`hybridBlockPrompts.${fieldIndex}.value`,
															e.target as HTMLTextAreaElement
														);
													}}
												/>
												{isFullAutomatedBlock && <ParagraphSlider />}
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
														className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
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

	const watchedBlocks = form.watch('hybridBlockPrompts') || [];
	const isHandwrittenMode =
		watchedBlocks.length > 0 && watchedBlocks.every((b) => b.type === HybridBlock.text);
	const hasBlocks = (form.watch('hybridBlockPrompts')?.length || 0) > 0;

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
							{/* Subject header inside the box */}
							<div className="px-3 pt-4 pb-0">
								<FormField
									control={form.control}
									name="subject"
									rules={{ required: form.watch('isAiSubject') }}
									render={({ field }) => (
										<FormItem>
											<div className="flex items-center justify-between mb-2">
												<div className="flex items-center gap-2">
													<FormLabel className="font-inter text-[16px]">
														Subject
													</FormLabel>
													<Separator orientation="vertical" className="!h-5" />
													<Switch
														checked={form.watch('isAiSubject')}
														disabled={isHandwrittenMode}
														onCheckedChange={(val: boolean) =>
															form.setValue('isAiSubject', val)
														}
														className="data-[state=checked]:!bg-[#5dab68] -translate-y-[2px]"
													/>
													<FormLabel className="font-inter text-[16px]">
														Automated Subject
													</FormLabel>
												</div>
												{hasBlocks && (
													<button
														type="button"
														onClick={handleClearAllInside}
														className="text-sm font-inter font-medium text-[#AFAFAF] hover:underline mr-[2px]"
													>
														Clear All
													</button>
												)}
											</div>
											<FormControl>
												<Input
													className="w-full h-[44px] bg-white"
													placeholder={
														form.watch('isAiSubject')
															? 'Automated subject...'
															: 'Enter subject...'
													}
													disabled={form.watch('isAiSubject')}
													{...field}
													onFocus={(e) =>
														!form.watch('isAiSubject') &&
														trackFocusedField?.('subject', e.target)
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="flex-1 flex flex-col">
								{/* Content area */}
								<div className="pt-[8px] pr-3 pb-3 pl-3 flex flex-col gap-4 items-center flex-1">
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
											const hasImmediateTextBlock =
												fields[index + 1]?.type === HybridBlock.text;

											return (
												<Fragment key={field.id}>
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
													{isHybridBlock && !hasImmediateTextBlock && (
														<div
															className={cn(
																'flex justify-end -mt-1',
																showTestPreview && testMessage ? 'w-[416px]' : 'w-[868px]'
															)}
														>
															<Button
																type="button"
																onClick={() => handleAddTextBlockAt(index)}
																className="w-[76px] h-[20px] bg-background hover:bg-primary/20 active:bg-primary/20 border border-primary rounded-[4px] !font-normal text-[10px] text-gray-600"
																title="Add text block"
															>
																<TinyPlusIcon
																	width="5px"
																	height="5px"
																	className="!w-[8px] !h-[8px]"
																/>
																<span className="font-secondary">Add text</span>
															</Button>
														</div>
													)}
												</Fragment>
											);
										})}
									</SortableContext>

									{/* Add Block Button */}
									<div className="w-full flex justify-center mt-2">
										<div style={{ position: 'relative' }}>
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
													sideOffset={32}
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
															{BLOCK_ITEMS.filter(
																(item) => item.position === 'bottom'
															).map((item) => (
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
															))}
														</DropdownMenuGroup>
													</div>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
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
															className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 mt-1 p-0 resize-none overflow-hidden bg-white"
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
										'h-[42px] bg-white border-2 border-primary text-black font-times font-bold rounded-[6px] cursor-pointer flex items-center justify-center font-primary transition-all hover:bg-primary/20 active:bg-primary/20',
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
