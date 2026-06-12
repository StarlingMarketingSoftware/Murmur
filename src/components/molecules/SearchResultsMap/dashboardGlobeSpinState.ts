import { DASHBOARD_DECORATIVE_CENTER } from './constants';

// Module-level shared state for the dashboard's decorative background globe.
//
// Why this exists: the `Search for new contacts` strategy card hosts its own
// small Mapbox instance, but the user expects it to mirror the *same* camera
// as the main dashboard globe. We can't share one WebGL canvas between two
// DOM nodes, so instead `SearchResultsMap` publishes its current spin target
// here and the inset map subscribes to follow along.

type Subscriber = (lng: number) => void;

const subscribers = new Set<Subscriber>();
let currentLng = DASHBOARD_DECORATIVE_CENTER[0];

export const setDashboardGlobeSpinLng = (lng: number) => {
	currentLng = lng;
	for (const fn of subscribers) fn(lng);
};

export const getDashboardGlobeSpinLng = () => currentLng;

export const subscribeDashboardGlobeSpin = (fn: Subscriber) => {
	subscribers.add(fn);
	return () => {
		subscribers.delete(fn);
	};
};

// Step duration must match `animationDurationMs` in SearchResultsMap's
// background spin loop so subscribers can ease in lock-step.
export const DASHBOARD_GLOBE_SPIN_STEP_MS = 1000;
