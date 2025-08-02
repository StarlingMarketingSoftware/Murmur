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
import { EditIcon, PlusIcon, Trash2 } from 'lucide-react';
import { HelpTooltip } from '@/components/atoms/HelpTooltip/HelpTooltip';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';
import { HybridBlock } from '@prisma/client';
import { BLOCKS, useHybridPromptInput } from './useHybridPromptInput';
import { twMerge } from 'tailwind-merge';
import { useState } from 'react';

interface SortableAIBlockProps {
	block: (typeof BLOCKS)[number];
	id: string;
	fieldIndex: number;
	onRemove: (id: string) => void;
}

const SortableAIBlock = ({ block, id, fieldIndex, onRemove }: SortableAIBlockProps) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	const form = useFormContext<DraftingFormValues>();
	const [isEdit, setIsEdit] = useState(false);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const isTextBlock = block.value === HybridBlock.text;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={twMerge(
				'w-full relative border-2 border-gray-300 rounded-md bg-gray-100 p-4',
				isTextBlock ? 'border-primary' : 'border-secondary',
				isDragging ? 'opacity-50 z-10' : ''
			)}
		>
			{isDragging && <div className="absolute inset-0 rounded-md bg-gray-100 z-10" />}
			<div className="absolute right-3 top-3">
				<Button
					type="button"
					variant="action-link"
					onClick={(e) => {
						e.stopPropagation();
						setIsEdit(!isEdit);
					}}
				>
					{isEdit ? 'Cancel' : 'Edit'}
				</Button>
				<Button
					type="button"
					variant="ghost"
					className="group"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(id);
					}}
				>
					<Trash2 className="h-4 w-4 group-hover:text-red-500" />
				</Button>
			</div>
			<div {...attributes} {...listeners} className="cursor-grab mb-2 flex gap-2 min-h-7">
				{!isTextBlock && (
					<>
						<Typography variant="h4">{block.label}</Typography>
						<HelpTooltip content={block.help} />
					</>
				)}
			</div>
			{isTextBlock ? (
				<Textarea
					placeholder={block.placeholder}
					onClick={(e) => e.stopPropagation()}
					{...form.register(`hybridBlockPrompts.${fieldIndex}.value`)}
				/>
			) : (
				<>
					{isEdit && (
						<Input
							placeholder={block.placeholder}
							onClick={(e) => e.stopPropagation()}
							{...form.register(`hybridBlockPrompts.${fieldIndex}.value`)}
						/>
					)}
				</>
			)}
		</div>
	);
};

export const HybridPromptInput = () => {
	const {
		fields,
		watchedAvailableBlocks,
		handleDragEnd,
		handleRemoveBlock,
		getBlock,
		handleAddBlock,
	} = useHybridPromptInput();

	return (
		<div>
			{/* <FormField
				control={form.control}
				name="hybridPrompt"
				render={({ field }) => (
					<FormItem>
						<FormLabel>{'AI Prompt'}</FormLabel>
						<FormControl>
							<Textarea className="h-[150px]" placeholder={'Hybrid '} {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/> */}
			<FormLabel>Email Template</FormLabel>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				{/* <div className="flex gap-2">
					{form.getValues('hybridAvailableBlocks').map((draggableContent) => (
						<Draggable key={draggableContent} id={draggableContent}>
							<Badge size="large" variant="outline">
								{getBlock(draggableContent).label}
							</Badge>
						</Draggable>
					))}
				</div> */}

				<Droppable id="droppable">
					<div className="min-h-[500px] mt-3 border-2 border-foreground rounded-xl p-3 bg-gray-50 flex flex-col gap-3 items-start transition w-full mb-4">
						{fields.length === 0 && (
							<Typography font="secondary" className=" text-gray-400 italic">
								Add blocks here to build your prompt...
							</Typography>
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
								/>
							))}
						</SortableContext>
					</div>
				</Droppable>
			</DndContext>

			<div className="flex gap-2 mb-3">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="w-1/2" type="button" variant="secondary-light">
							<PlusIcon />
							AI Block
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56" align="start">
						<DropdownMenuLabel>
							{watchedAvailableBlocks.length <= 1
								? 'All AI blocks have been used'
								: 'Select a Block'}
						</DropdownMenuLabel>
						<DropdownMenuGroup>
							{watchedAvailableBlocks.map((block: HybridBlock) => {
								if (block === HybridBlock.text) return null;
								return (
									<DropdownMenuItem
										onClick={() => handleAddBlock(getBlock(block))}
										key={block}
									>
										{getBlock(block).label}
									</DropdownMenuItem>
								);
							})}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<Button
					onClick={() => handleAddBlock(getBlock(HybridBlock.text))}
					className="w-1/2"
					type="button"
					variant="primary-light"
				>
					<PlusIcon />
					Text block
				</Button>
			</div>
		</div>
	);
};
