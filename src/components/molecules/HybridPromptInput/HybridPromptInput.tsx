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
	DropdownMenuLabel,
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
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';
import { HybridBlock, DraftingTone } from '@prisma/client';
import { BLOCKS, useHybridPromptInput } from './useHybridPromptInput';
import { cn } from '@/utils';
import React, { useState, useEffect } from 'react';

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

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				'w-full relative border-2 border-gray-300 rounded-md bg-background',
				isTextBlock ? 'border-primary' : 'border-secondary',
				isDragging ? 'opacity-50 z-50 transform-gpu' : ''
			)}
		>
			<div
				{...attributes}
				{...listeners}
				className="absolute top-0 left-0 right-0 h-12 cursor-move z-[5]"
			/>
			<div className="flex items-center p-4">
				<div className="flex-grow">
					{isDragging && (
						<div className="absolute inset-0 rounded-md bg-background z-10 pointer-events-none" />
					)}
					<div className="absolute right-3 top-3 z-30">
						{!isTextBlock && !isFullAutomatedBlock && (
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
							onClick={(e) => {
								e.stopPropagation();
								onRemove(id);
							}}
						>
							<X className="h-[13px] w-[13px] text-destructive-dark" />
						</Button>
					</div>
					<div className="mb-2 flex gap-2 min-h-7 items-center relative z-20">
						{!isTextBlock ? (
							<>
								<Typography variant="h4" className="font-inter">
									{block.label}
								</Typography>
								{isFullAutomatedBlock && (
									<div className="flex gap-1">
										{[
											{ value: DraftingTone.normal, label: 'Normal' },
											{ value: DraftingTone.explanatory, label: 'Explain' },
											{ value: DraftingTone.formal, label: 'Formal' },
											{ value: DraftingTone.concise, label: 'Concise' },
											{ value: DraftingTone.casual, label: 'Casual' },
										].map((tone) => (
											<button
												key={tone.value}
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													form.setValue('draftingTone', tone.value);
												}}
												className={cn(
													'w-[53px] h-[15px] rounded-[8px] text-[10px] font-medium transition-all flex items-center justify-center font-secondary',
													form.watch('draftingTone') === tone.value
														? 'bg-black text-white shadow-sm'
														: 'bg-gray-200 text-gray-600 hover:bg-gray-300'
												)}
												style={{
													WebkitAppearance: 'none',
													WebkitTapHighlightColor: 'transparent',
												}}
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
							const fieldProps = form.register(`hybridBlockPrompts.${fieldIndex}.value`);
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
						<>
							{isEdit &&
								(() => {
									const fieldProps = form.register(
										`hybridBlockPrompts.${fieldIndex}.value`
									);
									return (
										<Input
											placeholder={block.placeholder}
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
				</div>
			</div>
		</div>
	);
};

interface HybridPromptInputProps {
	trackFocusedField?: (
		fieldName: string,
		element: HTMLTextAreaElement | HTMLInputElement | null
	) => void;
	testMessage?: string | null;
}

export const HybridPromptInput = ({
	trackFocusedField,
	testMessage,
}: HybridPromptInputProps) => {
	const {
		form,
		fields,
		watchedAvailableBlocks,
		handleDragEnd,
		handleRemoveBlock,
		getBlock,
		handleAddBlock,
	} = useHybridPromptInput();

	const [showTestPreview, setShowTestPreview] = useState(false);

	// Show test preview when testMessage changes
	useEffect(() => {
		if (testMessage) {
			setShowTestPreview(true);
		}
	}, [testMessage]);

	return (
		<div>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<Droppable id="droppable">
					<div className="w-[892px] min-h-[530px] border-[3px] border-black rounded-md bg-gray-50 transition mb-4 flex flex-col relative">
						{/* Test Preview Overlay */}
						{showTestPreview && testMessage && (
							<div className="absolute inset-0 bg-background z-50 rounded-md overflow-hidden border-2 border-gray-300">
								<div className="relative h-full flex flex-col">
									{/* Header with X Button */}
									<div className="flex justify-between items-center p-4 border-b border-gray-200">
										<h3 className="text-lg font-semibold text-gray-800 font-secondary">
											Test Email Preview
										</h3>
										<button
											type="button"
											onClick={() => setShowTestPreview(false)}
											className="p-1 hover:bg-gray-100 rounded transition-colors"
											style={{ WebkitAppearance: 'none' }}
										>
											<X className="h-5 w-5 text-destructive-dark" />
										</button>
									</div>

									{/* Test Email Content */}
									<div className="flex-1 p-6 overflow-y-auto bg-gray-50">
										<div
											dangerouslySetInnerHTML={{ __html: testMessage }}
											className="max-w-none"
											style={{
												fontFamily: form.watch('font') || 'Arial',
												lineHeight: '1.6',
												fontSize: '14px',
											}}
										/>
									</div>
								</div>
							</div>
						)}

						{/* Content area */}
						<div className="flex-1 p-3 flex flex-col gap-3 items-start">
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
									<DropdownMenuContent className="w-56" align="center">
										<DropdownMenuLabel>Add Block</DropdownMenuLabel>
										<DropdownMenuGroup>
											<DropdownMenuItem
												onClick={() =>
													handleAddBlock(
														BLOCKS.find((b) => b.value === HybridBlock.full_automated)!
													)
												}
												key={HybridBlock.full_automated}
											>
												Full Automated
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													handleAddBlock(
														BLOCKS.find((b) => b.value === HybridBlock.introduction)!
													)
												}
												key={HybridBlock.introduction}
												disabled={
													!watchedAvailableBlocks.includes(HybridBlock.introduction)
												}
											>
												Introduction{' '}
												{!watchedAvailableBlocks.includes(HybridBlock.introduction) &&
													'(Used)'}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													handleAddBlock(
														BLOCKS.find((b) => b.value === HybridBlock.research)!
													)
												}
												key={HybridBlock.research}
												disabled={!watchedAvailableBlocks.includes(HybridBlock.research)}
											>
												Research Contact{' '}
												{!watchedAvailableBlocks.includes(HybridBlock.research) &&
													'(Used)'}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() =>
													handleAddBlock(
														BLOCKS.find((b) => b.value === HybridBlock.action)!
													)
												}
												key={HybridBlock.action}
												disabled={!watchedAvailableBlocks.includes(HybridBlock.action)}
											>
												Call to Action{' '}
												{!watchedAvailableBlocks.includes(HybridBlock.action) && '(Used)'}
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleAddBlock(getBlock(HybridBlock.text))}
												key={HybridBlock.text}
											>
												Text
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/*  Signature Block */}
						<div className="px-3 pb-[10px]">
							<FormField
								control={form.control}
								name="signature"
								render={({ field }) => (
									<FormItem>
										<div className="w-[868px] mx-auto min-h-[57px] border-2 border-gray-400 rounded-md bg-background px-4 py-2">
											<FormLabel className="text-base font-semibold font-secondary">
												Signature
											</FormLabel>
											<FormControl>
												<Textarea
													placeholder="Enter your signature..."
													className="border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-[25px] mt-1 p-0 resize-none overflow-hidden"
													style={{
														height: 'auto',
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
				</Droppable>
			</DndContext>
		</div>
	);
};
