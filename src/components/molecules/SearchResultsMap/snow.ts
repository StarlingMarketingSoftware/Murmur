import {
	CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
	DASHBOARD_DECORATIVE_ZOOM,
	MAP_MIN_ZOOM,
	SNOW_HIDE_AT_OR_ABOVE_ZOOM,
	SNOW_LAYER_OPACITY,
	SNOWFLAKE_STAMPS_VERSION,
} from './constants';
import { clamp } from './math';

export const SNOWFLAKE_STAMPS_URL = (i: number) =>
	`/maps/snowflake_stamps/drop_${String(i).padStart(2, '0')}.png?v=${SNOWFLAKE_STAMPS_VERSION}`;

export const buildSnowOpacityExpr = (opacity: number) => {
	const o = clamp(opacity * SNOW_LAYER_OPACITY, 0, 1);
	return [
		'interpolate',
		['linear'],
		['zoom'],
		0,
		o,
		MAP_MIN_ZOOM,
		o,
		DASHBOARD_DECORATIVE_ZOOM,
		o * 0.98,
		CLOUDS_OVERLAY_FADE_OUT_START_ZOOM,
		o * 0.62,
		SNOW_HIDE_AT_OR_ABOVE_ZOOM,
		0,
		22,
		0,
	];
};
