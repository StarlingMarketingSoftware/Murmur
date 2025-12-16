declare module 'polygon-clipping' {
	export type ClippingCoord = [number, number];
	export type ClippingRing = ClippingCoord[];
	export type ClippingPolygon = ClippingRing[];
	export type ClippingMultiPolygon = ClippingPolygon[];

	export interface PolygonClipping {
		union: (...geometries: ClippingMultiPolygon[]) => ClippingMultiPolygon;
		intersection: (...geometries: ClippingMultiPolygon[]) => ClippingMultiPolygon;
		xor: (...geometries: ClippingMultiPolygon[]) => ClippingMultiPolygon;
		difference: (subject: ClippingMultiPolygon, ...clippings: ClippingMultiPolygon[]) => ClippingMultiPolygon;
	}

	const polygonClipping: PolygonClipping;
	export default polygonClipping;
}
