import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { useState } from 'react';
import { Draggable } from '../DragAndDrop/Draggable';
import { Droppable } from '../DragAndDrop/Droppable';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { HelpTooltip } from '@/components/atoms/HelpTooltip/HelpTooltip';
import { DraftingFormValues } from '@/app/murmur/campaign/[campaignId]/emailAutomation/draft/useDraftingSection';
import { HybridBlock } from '@prisma/client';

const BLOCKS = [
	{
		label: 'Introduction',
		value: HybridBlock.introduction,
		help: 'Optional. Write a brief prompt for the AI about how to introduce you. This will include the greeting line and the first paragraph of the email.',
		placeholder: 'Prompt the AI about how to introduce you...',
	},
	{
		label: 'Research Contact',
		value: HybridBlock.research,
		help: 'Optional. Write a brief prompt for the AI about how to write about the recipient.',
		placeholder: 'Prompt the AI about how to write about the recipient...',
	},
	{
		label: 'Call to Action',
		value: HybridBlock.action,
		help: 'Optional. Write a brief prompt for the AI about how you want the recipient to respond (email, phone call, etc.)',
		placeholder: 'Prompt the AI about how you want the recipient to respond...',
	},
	{
		label: 'Custom Text',
		value: HybridBlock.text,
		help: 'This is a custom text block. Here you should write exact text that you want included in your email.',
		placeholder: 'Write the exact text you want included in your email...',
	},
];

const ORDERED_BLOCKS = [
	HybridBlock.introduction,
	HybridBlock.research,
	HybridBlock.action,
] as const;

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

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`w-full relative border-1 border-gray-300 rounded-md bg-gray-100 p-4 ${
				isDragging ? 'opacity-50' : ''
			}`}
		>
			<div className="group absolute right-3 top-3">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={(e) => {
						e.stopPropagation();
						onRemove(id);
					}}
				>
					<Trash2 className="h-4 w-4 group-hover:text-red-500" />
				</Button>
			</div>
			<div {...attributes} {...listeners} className="cursor-grab mb-2 flex gap-2">
				<Typography variant="h4">{block.label}</Typography>
				<HelpTooltip content={block.help} />
			</div>
			<Input
				placeholder={block.placeholder}
				onClick={(e) => e.stopPropagation()}
				{...form.register(`hybridBlockPrompts.${fieldIndex}.value`)}
			/>
		</div>
	);
};

export const HybridPromptInput = () => {
	const form = useFormContext<DraftingFormValues>();
	const [textBlockCount, setTextBlockCount] = useState(0);

	const { fields, append, remove, move } = useFieldArray({
		control: form.control,
		name: 'hybridBlockPrompts',
	});

	const findCorrectPosition = (newBlock: string, contents: { type: HybridBlock }[]) => {
		// If it's a custom text block, the position doesn't matter
		if (newBlock === HybridBlock.text) return contents.length;

		const orderedBlockIndex = ORDERED_BLOCKS.indexOf(
			newBlock as (typeof ORDERED_BLOCKS)[number]
		);

		// Find the first block that should come after our new block
		for (let i = 0; i < contents.length; i++) {
			const currentBlock = contents[i].type;
			const currentBlockIndex = ORDERED_BLOCKS.indexOf(
				currentBlock as (typeof ORDERED_BLOCKS)[number]
			);

			// Skip custom text blocks
			if (currentBlock === HybridBlock.text) continue;

			// If we find a block that should come after our new block, insert before it
			if (currentBlockIndex > orderedBlockIndex) {
				return i;
			}
		}

		// If we didn't find a position, add to the end
		return contents.length;
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { over, active } = event;
		if (!over) return;

		const isDroppableTarget =
			over.id === 'droppable' || fields.some((field) => field.id === over.id);
		const isDraggableSource = form
			.getValues('hybridAvailableBlocks')
			.includes(active.id as HybridBlock);

		if (isDroppableTarget && isDraggableSource) {
			let activeId: string = active.id as string;
			const blockType = active.id as HybridBlock;

			if (blockType === HybridBlock.text) {
				activeId = `text-${textBlockCount}`;
				setTextBlockCount(textBlockCount + 1);
			}

			if (blockType === HybridBlock.text || activeId.startsWith('text-')) {
				if (over.id === 'droppable') {
					append({ id: activeId, type: blockType, value: '' });
				} else {
					const overIndex = fields.findIndex((field) => field.id === over.id);
					const newFields = [...fields];
					newFields.splice(overIndex, 0, { id: activeId, type: blockType, value: '' });
					form.setValue('hybridBlockPrompts', newFields);
				}
			} else {
				const correctPosition = findCorrectPosition(blockType, fields);
				const attemptedPosition =
					over.id === 'droppable'
						? fields.length
						: fields.findIndex((field) => field.id === over.id);

				if (attemptedPosition !== correctPosition) {
					toast.error(
						'Blocks must be in order: Introduction → Research Contact → Call to Action. Custom Text blocks can be placed anywhere.'
					);
				}

				const newFields = [...fields];
				newFields.splice(correctPosition, 0, {
					id: activeId,
					type: blockType,
					value: '',
				});
				form.setValue('hybridBlockPrompts', newFields);
			}

			// Only remove non-text blocks from available blocks
			if (blockType !== HybridBlock.text) {
				const currentAvailableBlocks = form.getValues('hybridAvailableBlocks');
				const newAvailableBlocks = currentAvailableBlocks.filter(
					(block) => block !== blockType
				);
				form.setValue('hybridAvailableBlocks', newAvailableBlocks);
			}
			return;
		}

		if (
			fields.some((field) => field.id === active.id) &&
			fields.some((field) => field.id === over.id)
		) {
			const oldIndex = fields.findIndex((field) => field.id === active.id);
			const newIndex = fields.findIndex((field) => field.id === over.id);

			if (
				fields[oldIndex].type === HybridBlock.text ||
				fields[newIndex].type === HybridBlock.text
			) {
				move(oldIndex, newIndex);
				return;
			}

			const tempFields = fields.filter((_, index) => index !== oldIndex);
			const correctPosition = findCorrectPosition(fields[oldIndex].type, tempFields);

			if (newIndex !== correctPosition) {
				toast.error(
					'Blocks must be in order: Introduction → Research Contact → Call to Action. Custom Text blocks can be placed anywhere.'
				);
			}

			move(oldIndex, correctPosition);
		}
	};

	const handleRemoveBlock = (id: string) => {
		const blockIndex = fields.findIndex((field) => field.id === id);
		if (blockIndex === -1) return;

		const blockType = fields[blockIndex].type;
		// Only add non-text blocks back to available blocks
		if (blockType !== HybridBlock.text) {
			const currentAvailableBlocks = form.getValues('hybridAvailableBlocks');
			const newAvailableBlocks = [...currentAvailableBlocks, blockType];
			form.setValue('hybridAvailableBlocks', newAvailableBlocks);
		}
		remove(blockIndex);
	};

	const getBlock = (value: HybridBlock): (typeof BLOCKS)[number] => {
		const block = BLOCKS.find((b) => b.value === value);
		if (!block) throw new Error(`Invalid block type: ${value}`);
		return block;
	};

	return (
		<div>
			<FormField
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
			/>
			<FormLabel>Email Template</FormLabel>
			<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
				<div className="flex gap-2">
					{form.getValues('hybridAvailableBlocks').map((draggableContent) => (
						<Draggable key={draggableContent} id={draggableContent}>
							<Badge size="large" variant="outline">
								{getBlock(draggableContent).label}
							</Badge>
						</Draggable>
					))}
				</div>

				<Droppable id="droppable">
					<div className="min-h-[500px] mt-3 border-2 border-dashed border-gray-300 rounded-xl p-3 bg-gray-50 flex flex-col gap-3 items-start transition w-full mb-4">
						{fields.length === 0 && (
							<Typography font="secondary" className="text-lg text-gray-400 italic">
								Drag blocks here to build your prompt…
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
		</div>
	);
};
