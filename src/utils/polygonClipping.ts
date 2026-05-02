import polygonClipping, { type ClippingMultiPolygon } from 'polygon-clipping';

export const unionClippingMultiPolygons = (
	...geometries: ClippingMultiPolygon[]
): ClippingMultiPolygon | null => {
	if (!geometries.length) return null;
	try {
		return polygonClipping.union(...geometries);
	} catch {
		return null;
	}
};
