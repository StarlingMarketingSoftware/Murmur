import { isSafariBrowser } from '@/utils/browserDetection';
// Canvas-source perf: any *playing* Mapbox canvas source forces the map to re-render
// (and re-upload every playing canvas) every frame — the map never idles. Keep canvas
// sources paused between content updates instead, and upload on-demand.
//
// Module-level: the UA never changes within a session (false during SSR; the map only
// runs client-side).
export const IS_SAFARI = isSafariBrowser();

export const CANVAS_PERF_MODE = true;
