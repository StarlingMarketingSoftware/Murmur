'use client';

import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
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
	// Static landing-page values (match the demo search bar defaults).
	const TrayWhatIcon = MusicVenuesIcon;
	const trayWhatIconSize: number | undefined = undefined;
	const trayWhat = { backgroundColor: '#71C9FD' };
	const effectiveWhatKeyForTray = 'Music Venues';

	return (
		<MapSelectGrabTool
			activeTool={activeMapTool}
			onSelectClick={onSelectMapToolClick}
			onGrabClick={onGrabMapToolClick}
			categoryIcon={<TrayWhatIcon size={trayWhatIconSize} />}
			categoryLabel={`Active category: ${effectiveWhatKeyForTray}`}
			categoryBackgroundColor={trayWhat.backgroundColor}
			showCategoryWhenSelectActive
		/>
	);
}
