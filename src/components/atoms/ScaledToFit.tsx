'use client';

import React, { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils';

export type ScaledToFitProps = PropsWithChildren<{
	/**
	 * The "designed" width of the content inside (px).
	 * This is used to compute a scale factor to fit the parent container.
	 */
	baseWidth: number;
	/**
	 * Optional: use a different width for the "fit" calculation (px).
	 * Useful when the content's *visual* width is larger than `baseWidth` due to transforms
	 * (e.g. translated marketing SVGs), but you still want centering based on `baseWidth`.
	 */
	fitWidth?: number;
	/**
	 * The "designed" height of the content inside (px).
	 * The wrapper will reserve `baseHeight * scale` so the scaled content doesn't overflow.
	 */
	baseHeight: number;
	className?: string;
}>;

/**
 * Scales fixed-size demo content down to fit the available width (no horizontal scrollbars).
 * Useful for marketing/landing page embeds that use pixel-perfect demo components.
 */
export function ScaledToFit({ baseWidth, fitWidth, baseHeight, className, children }: ScaledToFitProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = useState<number | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const update = () => {
			const nextWidth = el.getBoundingClientRect().width;
			setContainerWidth(nextWidth);
		};

		update();

		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const scale = useMemo(() => {
		const widthForScale = fitWidth ?? baseWidth;
		if (!containerWidth || widthForScale <= 0) return 1;
		return Math.min(1, containerWidth / widthForScale);
	}, [baseWidth, fitWidth, containerWidth]);

	const scaledHeight = useMemo(() => Math.ceil(baseHeight * scale), [baseHeight, scale]);

	return (
		<div
			ref={containerRef}
			className={cn('relative w-full overflow-hidden', className)}
			style={{ height: `${scaledHeight}px` }}
		>
			<div
				style={{
					position: 'absolute',
					left: '50%',
					top: 0,
					width: `${baseWidth}px`,
					height: `${baseHeight}px`,
					transform: `translateX(-50%) scale(${scale})`,
					transformOrigin: 'top center',
				}}
			>
				{children}
			</div>
		</div>
	);
}

