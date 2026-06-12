'use client';

import { FC, useCallback, useRef, useState } from 'react';
import {
	DashboardCalendarPanel,
	DASHBOARD_CALENDAR_OUTER_WIDTH_PX,
} from './DashboardCalendarPanel';

/**
 * Mobile dashboard "Calendar" tab: scales the fixed-width desktop calendar
 * panel down to the viewport width and stretches its visible window to fill
 * the available height (a uniformly scaled-down desktop calendar, per Figma).
 */
export const MobileDashboardCalendar: FC<{ persistEvents?: boolean }> = ({
	persistEvents = false,
}) => {
	const [area, setArea] = useState<{ width: number; height: number } | null>(null);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);

	const measureArea = useCallback((node: HTMLDivElement | null) => {
		resizeObserverRef.current?.disconnect();
		resizeObserverRef.current = null;
		if (!node) return;

		const update = () => {
			const width = node.clientWidth;
			const height = node.clientHeight;
			if (width > 0 && height > 0) {
				setArea((prev) =>
					prev?.width === width && prev?.height === height ? prev : { width, height }
				);
			}
		};
		update();
		const observer = new ResizeObserver(update);
		observer.observe(node);
		resizeObserverRef.current = observer;
	}, []);

	const today = new Date();
	const scale = area ? area.width / DASHBOARD_CALENDAR_OUTER_WIDTH_PX : null;
	// The panel adds 4px outer padding on each side; subtract it so the scaled
	// outer height matches the available area exactly.
	const innerHeightPx =
		area && scale ? Math.max(120, Math.round(area.height / scale) - 8) : null;

	return (
		<div ref={measureArea} className="h-full w-full" style={{ overflow: 'hidden' }}>
			{scale != null && innerHeightPx != null && (
				<div
					style={{
						transform: `scale(${scale})`,
						transformOrigin: 'top left',
						width: `${DASHBOARD_CALENDAR_OUTER_WIDTH_PX}px`,
					}}
				>
					<DashboardCalendarPanel
						innerHeightPx={innerHeightPx}
						// Anchor the month window to today (the panel's default anchor is
						// the static Jan 2026 design baseline). Omitting `day` keeps the
						// real-date "today" highlight.
						mockState={{ year: today.getFullYear(), monthIndex: today.getMonth() }}
						persistEvents={persistEvents}
					/>
				</div>
			)}
		</div>
	);
};

export default MobileDashboardCalendar;
