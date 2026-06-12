import type { ComponentType, SVGProps } from 'react';
import Frame09 from './frame09UsFocus';
import Frame10 from './frame10UsFocusBridgeOne';
import Frame11 from './frame11UsFocusBridgeTwo';
import Frame12 from './frame12UsDeepZoom';
import Frame13 from './frame13FocusOnly';
import Frame14 from './frame14Zoom5';
import Frame15 from './frame15Zoom6';
import Frame16 from './frame16MapZoom4';
import Frame17 from './frame17Zoom7';
import Frame18 from './frame18StreetStickmanFade35';
import Frame19 from './frame19StreetStickmanFade70';
import Frame20 from './frame20MapZoomFinal';

// Frames 00..08 used to live here as discrete React components, then were swapped
// frame-by-frame at integer levels. They are now produced as a single continuous
// morph by EarlyZoomStage in MapZoomSequenceIcon.tsx, so only frames 09..20 remain
// as standalone components. This list is kept for any tooling that still wants the
// per-frame catalog; nothing in the runtime uses it today.
export const MAP_ZOOM_SEQUENCE_ICON_COMPONENTS = [
	Frame09,
	Frame10,
	Frame11,
	Frame12,
	Frame13,
	Frame14,
	Frame15,
	Frame16,
	Frame17,
	Frame18,
	Frame19,
	Frame20,
] as const satisfies readonly ComponentType<SVGProps<SVGSVGElement>>[];
