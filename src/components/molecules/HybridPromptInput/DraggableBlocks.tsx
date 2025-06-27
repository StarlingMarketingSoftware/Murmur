import React, { useState } from 'react';
import {
	DndContext,
	closestCenter,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
	useDroppable,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	horizontalListSortingStrategy,
	verticalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const BLOCKS = [
	{ label: 'Introduction', value: 'introduction' },
	{ label: 'Research Contact', value: 'research' },
	{ label: 'Call to Action', value: 'action' },
	{ label: 'Custom Text', value: 'text' },
];

function SortableBlock({ id, label }: { id: string; label: string }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.08)' : undefined,
	};
	return (
		<div
			ref={setNodeRef}
			className={
				'cursor-grab px-5 py-3 rounded-lg bg-gray-100 border border-gray-300 mr-3 font-medium min-w-[120px] text-center select-none' +
				(isDragging ? ' pointer-events-none' : '')
			}
			style={style}
			{...attributes}
			{...listeners}
		>
			{label}
		</div>
	);
}

const CONTAINER_ID = 'container-dropzone';

export const DraggableBlocks = () => {
	// Available blocks (not yet dropped)
	const [available, setAvailable] = useState(BLOCKS.map((b) => b.value));
	// Dropped blocks (in the container)
	const [container, setContainer] = useState<string[]>([]);

	const sensors = useSensors(useSensor(PointerSensor));
	const { setNodeRef: setDroppableRef } = useDroppable({
		id: CONTAINER_ID,
	});

	// Helper to get label from value
	const getLabel = (value: string) =>
		BLOCKS.find((b) => b.value === value)?.label || value;

	const handleDragEnd = (event: DragEndEvent) => {
		console.log('handleDragEnd', event);
		const { active, over } = event;
		if (!over) return;

		// Drag from available to container
		if (available.includes(active.id as string) && over.id === CONTAINER_ID) {
			setAvailable((prev) => prev.filter((id) => id !== active.id));
			setContainer((prev) => [...prev, active.id as string]);
			return;
		}
		// Reorder inside container
		if (container.includes(active.id as string)) {
			if (container.includes(over.id as string)) {
				const oldIndex = container.indexOf(active.id as string);
				const newIndex = container.indexOf(over.id as string);
				setContainer((prev) => arrayMove(prev, oldIndex, newIndex));
				return;
			} else if (over.id === CONTAINER_ID) {
				// Dropped on container background, move to end
				const oldIndex = container.indexOf(active.id as string);
				setContainer((prev) => arrayMove(prev, oldIndex, prev.length - 1));
				return;
			}
		}
	};

	return (
		<div>
			{/* Draggable blocks row */}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext items={available} strategy={horizontalListSortingStrategy}>
					<div className="flex gap-0 mb-6">
						{available.map((id) => (
							<SortableBlock key={id} id={id} label={getLabel(id)} />
						))}
					</div>
				</SortableContext>
				{/* Drop container */}
				<SortableContext items={container} strategy={verticalListSortingStrategy}>
					<div
						ref={setDroppableRef}
						id={CONTAINER_ID}
						className="min-h-[320px] border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50 flex flex-col gap-3 items-start"
					>
						{container.length === 0 && (
							<div className="text-gray-400 italic">
								Drag blocks here to build your prompt…
							</div>
						)}
						{container.map((id) => (
							<SortableBlock key={id} id={id} label={getLabel(id)} />
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
};
