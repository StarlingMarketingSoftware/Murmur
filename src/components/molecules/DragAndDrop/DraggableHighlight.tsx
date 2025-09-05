import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableHighlightProps {
	style: React.CSSProperties;
	isInitialRender: boolean;
}

export const DraggableHighlight = ({
	style,
	isInitialRender,
}: DraggableHighlightProps) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: 'mode-highlight',
	});

	const combinedStyle = {
		...style,
		transform: CSS.Translate.toString(transform),
		transition:
			isInitialRender || isDragging
				? 'none'
				: `left 0.3s ease-in-out, width 0.3s ease-in-out`,
	};

	return (
		<div
			ref={setNodeRef}
			style={combinedStyle}
			{...listeners}
			{...attributes}
			className={`absolute top-1/2 -translate-y-1/2 z-10 rounded-[8px] ${
				isDragging ? 'cursor-grabbing' : 'cursor-grab'
			}`}
		>
			<div
				style={{
					width: '80.38px',
					height: '19px',
					backgroundColor: '#DAE6FE',
					border: '1.3px solid #000000',
					borderRadius: '8px',
					transform: isDragging ? 'scale(1.05)' : 'scale(1)',
					transition: 'transform 0.2s ease-in-out',
				}}
			/>
		</div>
	);
};
