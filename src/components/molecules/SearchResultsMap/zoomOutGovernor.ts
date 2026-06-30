// Soft zoom-out friction for aggressive scroll gestures. Never moves the camera.

export const WHEEL_ZOOM_DELTA = 4.000244140625;
const DOM_DELTA_LINE = 1;

export type WheelKind = 'wheel' | 'trackpad';

export interface ZoomOutGovernorConfig {
	enabled: boolean;
	baseWheelRate: number;
	baseTrackpadRate: number;
	minRateMultiplier: number;
	energyScale: number;
	energyDecayTauMs: number;
	gestureGapMs: number;
	deadzone: number;
	applyEpsilon: number;
}

export interface ZoomOutGovernorResult {
	changed: boolean;
	multiplier: number;
	wheelRate: number;
	trackpadRate: number;
}

export interface ZoomOutGovernor {
	onWheel: (
		deltaY: number,
		deltaMode: number,
		shiftKey: boolean,
		nowMs: number
	) => ZoomOutGovernorResult;
	reset: () => void;
	getMultiplier: () => number;
}

export const normalizeWheelValue = (
	deltaY: number,
	deltaMode: number,
	shiftKey: boolean
): number => {
	if (!Number.isFinite(deltaY)) return 0;
	let value = deltaMode === DOM_DELTA_LINE ? deltaY * 40 : deltaY;
	if (shiftKey && value) value = value / 4;
	return value;
};

export const classifyWheelKind = (value: number): WheelKind =>
	value !== 0 && value % WHEEL_ZOOM_DELTA === 0 ? 'wheel' : 'trackpad';

export const rateMultiplierForEnergy = (
	energy: number,
	minMul: number,
	energyScale: number
): number => {
	if (!(energyScale > 0)) return 1;
	const e = energy > 0 ? energy : 0;
	return minMul + (1 - minMul) * Math.exp(-e / energyScale);
};

export const createZoomOutGovernor = (
	config: ZoomOutGovernorConfig
): ZoomOutGovernor => {
	let energy = 0;
	let gestureMinMul = 1; // latches downward for the active gesture
	let lastAppliedMul = 1;
	let lastTimeMs = Number.NEGATIVE_INFINITY;

	const stable = (): ZoomOutGovernorResult => ({
		changed: false,
		multiplier: lastAppliedMul,
		wheelRate: config.baseWheelRate * lastAppliedMul,
		trackpadRate: config.baseTrackpadRate * lastAppliedMul,
	});

	const commit = (): ZoomOutGovernorResult => {
		const changed = Math.abs(gestureMinMul - lastAppliedMul) >= config.applyEpsilon;
		if (changed) lastAppliedMul = gestureMinMul;
		return {
			changed,
			multiplier: lastAppliedMul,
			wheelRate: config.baseWheelRate * lastAppliedMul,
			trackpadRate: config.baseTrackpadRate * lastAppliedMul,
		};
	};

	const reset = () => {
		energy = 0;
		gestureMinMul = 1;
		lastTimeMs = Number.NEGATIVE_INFINITY;
		lastAppliedMul = 1;
	};

	const onWheel = (
		deltaY: number,
		deltaMode: number,
		shiftKey: boolean,
		nowMs: number
	): ZoomOutGovernorResult => {
		if (!config.enabled) return stable();

		const value = normalizeWheelValue(deltaY, deltaMode, shiftKey);

		const dt = nowMs - lastTimeMs;
		lastTimeMs = nowMs;
		if (!Number.isFinite(dt) || dt < 0 || dt > config.gestureGapMs) {
			energy = 0;
			gestureMinMul = 1;
		} else if (dt > 0 && config.energyDecayTauMs > 0) {
			energy *= Math.exp(-dt / config.energyDecayTauMs);
		}

		if (Math.abs(value) <= config.deadzone) {
			return stable();
		}

		if (value < 0) {
			energy = 0;
			gestureMinMul = 1;
			return commit();
		}

		const kind = classifyWheelKind(value);
		const baseRate =
			kind === 'wheel' ? config.baseWheelRate : config.baseTrackpadRate;

		const desired = rateMultiplierForEnergy(
			energy,
			config.minRateMultiplier,
			config.energyScale
		);
		if (desired < gestureMinMul) gestureMinMul = desired;
		energy += Math.abs(value) * baseRate;

		return commit();
	};

	return { onWheel, reset, getMultiplier: () => lastAppliedMul };
};
