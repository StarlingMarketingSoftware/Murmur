import { clamp } from './math';

// Module-level shared state for the unsubscribe flow's "globe on fire" effect.
//
// Why this exists: the unsubscribe flow renders over the bare dashboard globe,
// but its step state is private to `UnsubscribeFlow` and the Mapbox instance is
// private to `SearchResultsMap` (same topology as `dashboardGlobeSpinState`).
// The flow publishes a burn target here (0 = normal globe, 1 = apocalypse) and
// the map subscribes, tweening its visual burn factor toward the target.

type Subscriber = (target: number) => void;

const subscribers = new Set<Subscriber>();
let currentTarget = 0;

export const setUnsubscribeBurnTarget = (target: number) => {
	currentTarget = clamp(target, 0, 1);
	for (const fn of subscribers) fn(currentTarget);
};

export const getUnsubscribeBurnTarget = () => currentTarget;

export const subscribeUnsubscribeBurn = (fn: Subscriber) => {
	subscribers.add(fn);
	return () => {
		subscribers.delete(fn);
	};
};
