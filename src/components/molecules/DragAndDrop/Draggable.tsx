import React, { FC, ReactNode } from 'react';
import { UniqueIdentifier, useDraggable } from '@dnd-kit/core';

interface DraggableProps {
	children: ReactNode;
	id: UniqueIdentifier;
}

interface DraggableChildProps {
	isDragging?: boolean;
}

export const Draggable: FC<DraggableProps> = ({ children, id }) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id,
	});
	const style = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
		  }
		: undefined;

	// Clone the child element and pass isDragging as a prop
	const childWithDraggingState = React.isValidElement(children)
		? React.cloneElement(children, { isDragging } as DraggableChildProps)
		: children;

	return (
		<div
			className={`cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
		>
			{childWithDraggingState}
		</div>
	);
};
