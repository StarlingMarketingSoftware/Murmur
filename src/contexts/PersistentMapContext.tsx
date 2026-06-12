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

export interface PersistentDashboardMapConfig {
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

export function PersistentMapProvider({ children }: { children: ReactNode }) {
	const [mapConfig, setMapConfig] = useState<PersistentDashboardMapConfig | null>(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const lastConfigRef = useRef<PersistentDashboardMapConfig | null>(null);

	const setPersistentMapConfig = useCallback<PersistentMapSetter>((config) => {
		if (lastConfigRef.current === config) return;
		lastConfigRef.current = config;
		setMapConfig(config);
	}, []);

	return (
		<PersistentMapSetterContext.Provider value={setPersistentMapConfig}>
			<PersistentMapReadySetterContext.Provider value={setIsMapReady}>
				<PersistentMapValueContext.Provider value={mapConfig}>
					<PersistentMapReadyContext.Provider value={isMapReady}>
						{children}
					</PersistentMapReadyContext.Provider>
				</PersistentMapValueContext.Provider>
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
