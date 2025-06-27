import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useFormContext } from 'react-hook-form';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { Draggable } from '../DragAndDrop/Draggable';
import { Droppable } from '../DragAndDrop/Droppable';
import { Badge } from '@/components/ui/badge';
import { Typography } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';

type AiBlockValues = 'introduction' | 'research' | 'action' | 'text';

type Block = {
	label: string;
	value: AiBlockValues;
};

const BLOCKS: Block[] = [
	{ label: 'Introduction', value: 'introduction' },
	{ label: 'Research Contact', value: 'research' },
	{ label: 'Call to Action', value: 'action' },
	{ label: 'Custom Text', value: 'text' },
];

const AiBlock = ({ block }: { block: Block }) => {
	return (
		<div className="w-full mx-2 my-2">
			<Typography variant="h4">{block.label}</Typography>
			<Input placeholder="Write a brief prompt for this block." />
		</div>
	);
};

export const HybridPromptInput = () => {
	const [draggableContents, setDraggableContents] = useState<string[]>(
		BLOCKS.map((block) => block.value)
	);
	const [droppableContents, setDroppableContents] = useState<string[]>([]);
	const [textBlockCount, setTextBlockCount] = useState(0);
	const form = useFormContext();

	function handleDragEnd(event: DragEndEvent) {
		const { over, active } = event;

		let activeId: string = active.id as AiBlockValues;

		if (over?.id === 'droppable') {
			if (active.id === 'text') {
				activeId = `text-${textBlockCount}`;
				setTextBlockCount(textBlockCount + 1);
			} else {
				setDraggableContents((prev) => prev.filter((id) => id !== active.id));
			}
			setDroppableContents((prev) => [...prev, activeId]);
		}
	}

	const getBlock = (value: string): Block => {
		const block = BLOCKS.find((b) => b.value === value);
		return block || { label: value, value: value as AiBlockValues };
	};

	return (
		<div>
			<DndContext onDragEnd={handleDragEnd}>
				<div className="flex gap-2">
					{draggableContents.map((draggableContent) => (
						<Draggable key={draggableContent} id={draggableContent}>
							<Badge size="large" variant="outline">
								{getBlock(draggableContent).label}
							</Badge>
						</Draggable>
					))}
				</div>

				<Droppable id="droppable">
					<div className="min-h-[320px] mt-3 border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 flex flex-col gap-3 items-start transition">
						{droppableContents.length === 0 && (
							<Typography font="secondary" className="text-lg text-gray-400 italic">
								Drag blocks here to build your prompt…
							</Typography>
						)}
						{droppableContents.map((droppableContent: string) =>
							getBlock(droppableContent).value === 'text' ? (
								<Badge
									key={droppableContent}
									id={droppableContent}
									variant="outline"
									size="large"
								>
									{getBlock(droppableContent).label}
								</Badge>
							) : (
								<AiBlock key={droppableContent} block={getBlock(droppableContent)} />
							)
						)}
					</div>
				</Droppable>
			</DndContext>
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
		</div>
	);
};
