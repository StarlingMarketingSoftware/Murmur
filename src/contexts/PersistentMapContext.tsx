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

export function PersistentMapProvider({ children }: { children: ReactNode }) {
	const [mapConfig, setMapConfig] = useState<PersistentDashboardMapConfig | null>(null);
	const lastConfigRef = useRef<PersistentDashboardMapConfig | null>(null);

	const setPersistentMapConfig = useCallback<PersistentMapSetter>((config) => {
		if (lastConfigRef.current === config) return;
		lastConfigRef.current = config;
		setMapConfig(config);
	}, []);

	return (
		<PersistentMapSetterContext.Provider value={setPersistentMapConfig}>
			<PersistentMapValueContext.Provider value={mapConfig}>
				{children}
			</PersistentMapValueContext.Provider>
		</PersistentMapSetterContext.Provider>
	);
}

export function usePersistentMapValue() {
	return useContext(PersistentMapValueContext);
}

export function usePersistentMapSetter() {
	return useContext(PersistentMapSetterContext);
}
