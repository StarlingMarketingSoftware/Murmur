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
