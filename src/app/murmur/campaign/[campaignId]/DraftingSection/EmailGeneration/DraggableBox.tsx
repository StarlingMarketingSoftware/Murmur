'use client';

import { FC, ReactNode } from 'react';

interface DraggableBoxProps {
	id: string;
	children: ReactNode;
	className?: string;
	defaultPosition?: { x: number; y: number };
	dragHandleSelector?: string;
	onDropOver?: (overId: string | null) => void;
	enabled?: boolean;
	resetToken?: number | string;
}

export const DraggableBox: FC<DraggableBoxProps> = ({ id, children, className }) => {
	return (
		<div data-draggable-box-id={id} className={className}>
			{children}
		</div>
	);
};

export default DraggableBox;
