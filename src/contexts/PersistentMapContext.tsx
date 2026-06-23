'use client';

import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import type { SearchResultsMapProps } from '@/components/molecules/SearchResultsMap/SearchResultsMap';

/**
 * Which host route a persistent-map config belongs to. The singleton map is shared
 * across every map-bearing route, so a config must declare its owner: during a route
 * handoff the outgoing page's config can briefly still be the active one while the new
 * route is already painting. Tagging the owner lets the renderer ignore a config that
 * belongs to the page being left (e.g. a dashboard search config bleeding onto the
 * campaign page), which is what made the search marker/constellation overlay linger.
 */
export type PersistentMapOwnerRoute = 'dashboard' | 'venue' | 'campaign';

export interface PersistentDashboardMapConfig {
	ownerRoute: PersistentMapOwnerRoute;
	isMapView: boolean;
	mapViewClip: string;
	mapViewFrameTransition: string;
	mapViewFrameInsetPx: number;
	mapViewFrameRadiusPx: number;
	mapViewFrameBorderPx: number;
	mapProps: SearchResultsMapProps;
}

type PersistentMapSetter = (config: PersistentDashboardMapConfig | null) => void;

const PersistentMapValueContext = createContext<PersistentDashboardMapConfig | null>(null);
const PersistentMapSetterContext = createContext<PersistentMapSetter>(() => {});
// Separate from the config contexts: readiness flips once per map instance and must not
// disturb the config setter's lastConfigRef dedupe or re-render config consumers.
const PersistentMapReadyContext = createContext(false);
const PersistentMapReadySetterContext = createContext<(ready: boolean) => void>(() => {});
// Earlier "land painted" readiness stage (style in + world-land fill painted, before the
// full `load`); own context pair for the same re-render-isolation reason as above.
const PersistentMapFirstPaintContext = createContext(false);
const PersistentMapFirstPaintSetterContext = createContext<(painted: boolean) => void>(
	() => {}
);

export function PersistentMapProvider({ children }: { children: ReactNode }) {
	const [mapConfig, setMapConfig] = useState<PersistentDashboardMapConfig | null>(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const [isMapFirstPainted, setIsMapFirstPainted] = useState(false);
	const lastConfigRef = useRef<PersistentDashboardMapConfig | null>(null);

	const setPersistentMapConfig = useCallback<PersistentMapSetter>((config) => {
		if (lastConfigRef.current === config) return;
		lastConfigRef.current = config;
		setMapConfig(config);
	}, []);

	return (
		<PersistentMapSetterContext.Provider value={setPersistentMapConfig}>
			<PersistentMapReadySetterContext.Provider value={setIsMapReady}>
				<PersistentMapFirstPaintSetterContext.Provider value={setIsMapFirstPainted}>
					<PersistentMapValueContext.Provider value={mapConfig}>
						<PersistentMapReadyContext.Provider value={isMapReady}>
							<PersistentMapFirstPaintContext.Provider value={isMapFirstPainted}>
								{children}
							</PersistentMapFirstPaintContext.Provider>
						</PersistentMapReadyContext.Provider>
					</PersistentMapValueContext.Provider>
				</PersistentMapFirstPaintSetterContext.Provider>
			</PersistentMapReadySetterContext.Provider>
		</PersistentMapSetterContext.Provider>
	);
}

export function usePersistentMapValue() {
	return useContext(PersistentMapValueContext);
}

export function usePersistentMapSetter() {
	return useContext(PersistentMapSetterContext);
}

/** True once the persistent map's Mapbox `load` event has fired; false while loading or unmounted. */
export function usePersistentMapReady() {
	return useContext(PersistentMapReadyContext);
}

export function usePersistentMapReadySetter() {
	return useContext(PersistentMapReadySetterContext);
}

/** True once the globe silhouette (world-land fill) has painted — earlier than full readiness. */
export function usePersistentMapFirstPaint() {
	return useContext(PersistentMapFirstPaintContext);
}

export function usePersistentMapFirstPaintSetter() {
	return useContext(PersistentMapFirstPaintSetterContext);
}
