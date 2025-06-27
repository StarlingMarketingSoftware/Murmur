import React, { FC, ReactNode } from 'react';
import { UniqueIdentifier, useDroppable } from '@dnd-kit/core';

interface DroppableProps {
	children: ReactNode;
	id: UniqueIdentifier;
}
export const Droppable: FC<DroppableProps> = ({ children, id }) => {
	const { isOver, setNodeRef } = useDroppable({
		id,
	});
	const style = {
		color: isOver ? 'green' : undefined,
	};

	return (
		<div ref={setNodeRef} style={style}>
			{children}
		</div>
	);
};

/*The useDroppable hook isn't opinionated about how your app should be structured. At minimum though, it requires you pass a ref to the DOM element that you would like to become droppable. You'll also need to provide a unique id attribute to all your droppable components. 

When a draggable element is moved over your droppable element, the isOver property will become true.

*/
