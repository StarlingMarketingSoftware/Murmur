import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface DraggableHighlightProps {
	style: React.CSSProperties;
	isInitialRender: boolean;
	mode?: 'full' | 'hybrid' | 'manual';
	disabled?: boolean;
	onSelectMode?: (mode: 'full' | 'hybrid' | 'manual') => void;
}

export const DraggableHighlight = ({
	style,
	isInitialRender,
	mode = 'full',
	disabled = false,
	onSelectMode,
}: DraggableHighlightProps) => {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: 'mode-highlight',
		disabled,
	});

	const combinedStyle = {
		...style,
		transform: CSS.Translate.toString(transform),
		transition:
			isInitialRender || isDragging
				? 'none'
				: `left 0.3s ease-in-out, width 0.3s ease-in-out`,
	};

	// Set background color based on mode
	const getBackgroundColor = () => {
		switch (mode) {
			case 'hybrid':
				return 'rgba(74, 74, 217, 0.31)'; // #4A4AD9 at 31% opacity
			case 'manual':
				return 'rgba(109, 171, 104, 0.47)'; // #6DAB68 at 47% opacity
			case 'full':
			default:
				return '#DAE6FE'; // Keep existing color for Full Auto
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={combinedStyle}
			{...(!disabled ? listeners : {})}
			{...(!disabled ? attributes : {})}
			onClick={(e) => {
				e.stopPropagation();
				onSelectMode?.(mode);
			}}
			className={`absolute top-1/2 -translate-y-1/2 z-10 rounded-[8px] ${
				disabled ? 'cursor-pointer' : isDragging ? 'cursor-grabbing' : 'cursor-pointer'
			}`}
		>
			<div
				style={{
					width: '80.38px',
					height: '19px',
					backgroundColor: getBackgroundColor(),
					border: '1.3px solid #000000',
					borderRadius: '8px',
					transform: isDragging ? 'scale(1.05)' : 'scale(1)',
					transition: 'transform 0.2s ease-in-out',
				}}
			/>
		</div>
	);
};
