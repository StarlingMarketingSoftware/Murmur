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
	const { attributes, listeners, setNodeRef, transform } = useDraggable({
		id: 'mode-highlight',
	});

	const combinedStyle = {
		...style,
		transform: CSS.Translate.toString(transform),
		transition: isInitialRender
			? 'none'
			: `transform 0s, left 0.3s ease-in-out, width 0.3s ease-in-out`,
	};

	if (transform) {
		combinedStyle.transition = 'none';
	}

	return (
		<div
			ref={setNodeRef}
			style={combinedStyle}
			{...listeners}
			{...attributes}
			className="absolute top-1/2 -translate-y-1/2 z-10 rounded-[8px] cursor-grab"
		>
			<div
				style={{
					width: '80.38px',
					height: '19px',
					backgroundColor: '#DAE6FE',
					border: '1.3px solid #000000',
					borderRadius: '8px',
				}}
			/>
		</div>
	);
};
