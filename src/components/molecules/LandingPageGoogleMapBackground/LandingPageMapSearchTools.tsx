'use client';

import { MapSelectGrabTool } from '@/components/molecules/MapSelectGrabTool/MapSelectGrabTool';

// Landing page-only map chrome that mirrors the dashboard map view.
type LandingPageMapSelectGrabToolProps = {
	activeMapTool: 'select' | 'grab';
	onSelectMapToolClick: () => void;
	onGrabMapToolClick: () => void;
};

export function LandingPageMapSelectGrabTool({
	activeMapTool,
	onSelectMapToolClick,
	onGrabMapToolClick,
}: LandingPageMapSelectGrabToolProps) {
	return (
		<MapSelectGrabTool
			activeTool={activeMapTool}
			onSelectClick={onSelectMapToolClick}
			onGrabClick={onGrabMapToolClick}
		/>
	);
}
