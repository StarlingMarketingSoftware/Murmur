'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Centered two-box overlay opened from either Apply button (the posted-event card in the
// search-results panel and the map event popup). Rendered via a portal to <body> so it sits
// above the map's pointer-events:none layer; the page's <html> zoom scales it automatically.
// Closes on backdrop click and Escape. Inner content is intentionally empty for now.
export function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		<div
			className="fixed inset-0 z-[100001] flex items-center justify-center"
			style={{ pointerEvents: 'auto' }}
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					position: 'relative',
					width: '698px',
					height: '750px',
					background: '#E06E6E',
					border: '3px solid #070707',
					borderRadius: '14px',
					boxSizing: 'border-box',
					// Nudge up so the box clears the bottom advanced-search bar.
					transform: 'translateY(-20px)',
				}}
			>
				<div
					style={{
						position: 'absolute',
						bottom: '7px',
						left: 0,
						right: 0,
						marginLeft: 'auto',
						marginRight: 'auto',
						width: '687px',
						height: '723px',
						borderRadius: '12px',
						border: '2px solid #000',
						background: '#FFF',
						boxSizing: 'border-box',
					}}
				/>
			</div>
		</div>,
		document.body
	);
}
