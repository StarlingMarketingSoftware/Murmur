import type { ComponentType, SVGProps } from 'react';
import Frame00 from './frame00World';
import Frame01 from './frame01WorldLarge';
import Frame02 from './frame02WorldCircle24';
import Frame03 from './frame03WorldCircle28';
import Frame04 from './frame04WorldCircle33';
import Frame05 from './frame05WorldCircle37';
import Frame06 from './frame06Us';
import Frame07 from './frame07UsBridgeOne';
import Frame08 from './frame08UsBridgeTwo';
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

export const MAP_ZOOM_SEQUENCE_ICON_COMPONENTS = [
	Frame00,
	Frame01,
	Frame02,
	Frame03,
	Frame04,
	Frame05,
	Frame06,
	Frame07,
	Frame08,
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
