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
	const isCompactBlock =
		block.value === HybridBlock.introduction ||
		block.value === HybridBlock.research ||
		block.value === HybridBlock.action ||
		block.value === HybridBlock.text;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'relative border-2 border-gray-300 rounded-md bg-background',
				isTextBlock
					? 'w-[864px] h-[80px]'
					: isCompactBlock
					? 'w-[864px] h-[44px]'
					: 'w-full',
				isTextBlock ? 'border-primary' : 'border-secondary',
				isDragging ? 'opacity-50 z-50 transform-gpu' : ''
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
										<span className="font-inter font-normal text-xs leading-[14px] mt-1">
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
										<Typography variant="h4" className="font-inter">
											{block.label}
										</Typography>
										{isFullAutomatedBlock && (
											<div className="flex gap-1 relative z-[100] pointer-events-auto">
												{[
													{ value: DraftingTone.normal, label: 'Normal' },
													{ value: DraftingTone.explanatory, label: 'Explain' },
													{ value: DraftingTone.formal, label: 'Formal' },
													{ value: DraftingTone.concise, label: 'Concise' },
													{ value: DraftingTone.casual, label: 'Casual' },
												].map((tone) => (
													<Button
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
															'w-[53px] h-[15px] rounded-[8px] text-[10px] font-medium transition-all flex items-center justify-center font-secondary cursor-pointer',
															form.watch('draftingTone') === tone.value
																? 'bg-black text-white shadow-sm'
																: 'bg-gray-200 text-gray-600 hover:bg-gray-300'
														)}
													>
														{tone.label}
													</Button>
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
		showTestPreview,
		setShowTestPreview,
		BLOCK_ITEMS,
		trackFocusedField,
		testMessage,
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
								<div className="p-3 flex flex-col gap-3 items-start flex-1">
									{fields.length === 0 && (
										<span className="text-gray-300 font-primary text-[12px]">
											Add blocks here to build your prompt...
										</span>
									)}
									<SortableContext
										items={fields.map((f) => f.id)}
										strategy={verticalListSortingStrategy}
									>
										{fields.map((field, index) => (
											<SortableAIBlock
												key={field.id}
												id={field.id}
												fieldIndex={index}
												block={getBlock(field.type)}
												onRemove={handleRemoveBlock}
												trackFocusedField={trackFocusedField}
											/>
										))}
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
								<div className="px-3 pb-3 mt-auto">
									<FormField
										control={form.control}
										name="signature"
										render={({ field }) => (
											<FormItem>
												<div
													className={cn(
														`mx-auto min-h-[57px] border-2 border-gray-400 rounded-md bg-background px-4 py-2`,
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
