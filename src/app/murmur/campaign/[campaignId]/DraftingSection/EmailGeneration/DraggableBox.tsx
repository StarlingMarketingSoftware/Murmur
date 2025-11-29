'use client';

import { FC, ReactNode } from 'react';

interface DraggableBoxProps {
	/** Stable id for debugging or future persistence */
	id: string;
	children: ReactNode;
	/** Optional className for the outer wrapper */
	className?: string;
	/** Initial offset in pixels (relative to natural layout position) */
	defaultPosition?: { x: number; y: number };
	/** CSS selector for an internal drag handle (no-op now that dragging is disabled) */
	dragHandleSelector?: string;
	/** When the drag ends, report which other draggable box (if any) was under the pointer (no-op) */
	onDropOver?: (overId: string | null) => void;
	/** When false, dragging is disabled and transform is cleared (no-op) */
	enabled?: boolean;
	/** Bump this token to force the box to reset to its default position (no-op) */
	resetToken?: number | string;
}

/**
 * Non-draggable layout wrapper.
 * We keep the same API and data attribute so existing callers and overlay code continue to work,
 * but all dragging behavior has been removed.
 */
export const DraggableBox: FC<DraggableBoxProps> = ({ id, children, className }) => {
	return (
		<div data-draggable-box-id={id} className={className}>
			{children}
		</div>
	);
};

export default DraggableBox;
