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

/*

The useDraggable hook isn't opinionated about how your app should be structured. It does however require you to be able to attach listeners and a ref to the DOM element that you would like to become draggable. You'll also need to provide a unique id attribute to all your draggable components. 

After a draggable item is picked up, the transform property will be populated with the translate coordinates you'll need to move the item on the screen.  

The transform object adheres to the following shape: {x: number, y: number, scaleX: number, scaleY: number}

*/
