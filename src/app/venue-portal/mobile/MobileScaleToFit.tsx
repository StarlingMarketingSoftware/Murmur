'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';

// Renders a fixed-design-width child (the desktop venue editors are laid out at
// ~386-387px) scaled down to fit a narrower mobile container, reserving the scaled
// height so following content flows correctly. Measurement pattern borrowed from the
// dashboard's posted-event card scaler (murmur/dashboard/page.tsx).
export function MobileScaleToFit({
	nativeWidth,
	children,
	className = '',
}: {
	nativeWidth: number;
	children: ReactNode;
	className?: string;
}) {
	const [scale, setScale] = useState(1);
	const [nativeHeight, setNativeHeight] = useState(0);
	const containerObserverRef = useRef<ResizeObserver | null>(null);
	const contentObserverRef = useRef<ResizeObserver | null>(null);

	const measureContainer = useCallback(
		(node: HTMLDivElement | null) => {
			containerObserverRef.current?.disconnect();
			containerObserverRef.current = null;
			if (!node) return;
			const update = () => {
				const width = node.clientWidth;
				if (width > 0) setScale(Math.min(1, width / nativeWidth));
			};
			update();
			const observer = new ResizeObserver(update);
			observer.observe(node);
			containerObserverRef.current = observer;
		},
		[nativeWidth]
	);

	const measureContent = useCallback((node: HTMLDivElement | null) => {
		contentObserverRef.current?.disconnect();
		contentObserverRef.current = null;
		if (!node) return;
		const update = () => setNativeHeight(node.offsetHeight);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(node);
		contentObserverRef.current = observer;
	}, []);

	return (
		<div
			ref={measureContainer}
			className={className}
			style={{ height: nativeHeight > 0 ? nativeHeight * scale : undefined }}
		>
			<div
				ref={measureContent}
				style={{
					width: nativeWidth,
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
			>
				{children}
			</div>
		</div>
	);
}
