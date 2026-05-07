'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
	CSSProperties,
	KeyboardEvent,
	MutableRefObject,
	PointerEvent,
	ReactNode,
} from 'react';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import MapZoomSequenceIcon from '@/components/atoms/_svg/mapZoomSequence/MapZoomSequenceIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { RadioStationsIcon } from '@/components/atoms/_svg/RadioStationsIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import GrabIcon from '@/components/atoms/svg/GrabIcon';

type MapSelectGrabToolProps = {
	activeTool: 'select' | 'grab';
	onSelectClick: () => void;
	onGrabClick: () => void;
	categoryIcon?: ReactNode;
	categoryLabel?: string;
	categoryBackgroundColor?: string;
	showCategoryWhenSelectActive?: boolean;
	className?: string;
	style?: CSSProperties;
};

const TOOL_WIDTH_PX = 55;
const TOOL_COLLAPSED_HEIGHT_PX = 114;
const TOOL_EXPANDED_HEIGHT_PX = 165;
const BUTTON_SIZE_PX = 43;
const BUTTON_GAP_PX = 8;
const STARTER_BOX_WIDTH_PX = 55;
const STARTER_BOX_HEIGHT_PX = 144;
const STARTER_BOX_GAP_PX = 23;
const ZOOM_THUMB_SIZE_PX = 45;
const ZOOM_THUMB_RADIUS_PX = 9;
const ZOOM_THUMB_LEFT_PX = (STARTER_BOX_WIDTH_PX - ZOOM_THUMB_SIZE_PX) / 2;
const ZOOM_THUMB_TOP_POSITIONS_PX = [
	90,
	87,
	84,
	81,
	78,
	75,
	72,
	66,
	60,
	54,
	48,
	42,
	36,
	31,
	26,
	21,
	17,
	15,
	13,
	11,
	9,
] as const;
const STACK_BOX_SIZE_PX = 55;
const STACK_BOX_RADIUS_PX = 17;
const STACK_BOX_TILE_SIZE_PX = 44;
const STACK_BOX_TILE_RADIUS_PX = 10.658;
const STACK_BOX_FIRST_GAP_PX = 21;
const STACK_BOX_SECOND_GAP_PX = 12;
const TALL_STACK_BOX_WIDTH_PX = 56;
const TALL_STACK_BOX_HEIGHT_PX = 456;
const TALL_STACK_BOX_RADIUS_PX = 17;
const TALL_STACK_BOX_GAP_PX = 19;
const TALL_STACK_INNER_BOX_SIZE_PX = 44;
const TALL_STACK_INNER_BOX_RADIUS_PX = 17;
const TALL_STACK_INNER_BOX_LEFT_PX =
	(TALL_STACK_BOX_WIDTH_PX - TALL_STACK_INNER_BOX_SIZE_PX) / 2;
const TALL_STACK_INNER_BOX_BOTTOM_POSITIONS_PX = [
	6,
	78,
	144,
	210,
	276,
	342,
	408,
] as const;
const TALL_STACK_INNER_BOX_STYLES = [
	{ backgroundColor: '#EFEFEF' },
	{ backgroundColor: '#80AAFF' },
	{ backgroundColor: '#F0E0A15C' },
	{ backgroundColor: '#C5EDA05C' },
	{
		backgroundColor: 'rgba(165, 195, 255, 0.36)',
		opacity: 0.43,
		borderRadius: '10.941px',
	},
	{
		backgroundColor: 'rgba(155, 218, 255, 0.36)',
		opacity: 0.5,
		borderRadius: '10.941px',
	},
	{ backgroundColor: 'rgba(119, 221, 145, 0.77)' },
] as const satisfies readonly CSSProperties[];
const ZOOM_THUMB_MAX_INDEX = ZOOM_THUMB_TOP_POSITIONS_PX.length - 1;
const ZOOM_THUMB_BACKGROUND_COLORS = [
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#E0E0E0',
	'#D7D7D7',
	'#3F3F3F',
	'#3F3F3F',
	'#3F3F3F',
	'#3F3F3F',
] as const;
export type MapZoomControlIndexChangeMeta = {
	source: 'keyboard' | 'drag-release';
	levelValue: number;
};

export type MapZoomControlLiveHandle = {
	setLevelValue: (levelValue: number) => void;
};

export const MAP_SELECT_GRAB_TOOL_COLLAPSED_HEIGHT_PX = TOOL_COLLAPSED_HEIGHT_PX;
export const MAP_SELECT_GRAB_TOOL_EXPANDED_HEIGHT_PX = TOOL_EXPANDED_HEIGHT_PX;
export const MAP_SELECT_GRAB_STARTER_BOX_HEIGHT_PX = STARTER_BOX_HEIGHT_PX;
export const MAP_SELECT_GRAB_STARTER_BOX_GAP_PX = STARTER_BOX_GAP_PX;
export const MAP_SELECT_GRAB_ZOOM_LEVEL_COUNT = ZOOM_THUMB_TOP_POSITIONS_PX.length;
export const MAP_SELECT_GRAB_STACK_BOX_SIZE_PX = STACK_BOX_SIZE_PX;
export const MAP_SELECT_GRAB_STACK_BOX_FIRST_GAP_PX = STACK_BOX_FIRST_GAP_PX;
export const MAP_SELECT_GRAB_STACK_BOX_SECOND_GAP_PX = STACK_BOX_SECOND_GAP_PX;
export const MAP_SELECT_GRAB_TALL_STACK_BOX_HEIGHT_PX = TALL_STACK_BOX_HEIGHT_PX;
export const MAP_SELECT_GRAB_TALL_STACK_BOX_GAP_PX = TALL_STACK_BOX_GAP_PX;

const clampZoomLevelValue = (levelValue: number) => {
	if (!Number.isFinite(levelValue)) return 0;
	return Math.min(Math.max(levelValue, 0), ZOOM_THUMB_MAX_INDEX);
};

const smoothStep = (value: number) => {
	const t = Math.min(Math.max(value, 0), 1);
	return t * t * (3 - 2 * t);
};

const parseHexColor = (hexColor: string): [number, number, number] => {
	const normalized = hexColor.replace('#', '');
	const value = Number.parseInt(normalized, 16);
	if (Number.isNaN(value)) return [224, 224, 224];
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const getInterpolatedHexColor = (from: string, to: string, progress: number) => {
	const [fromR, fromG, fromB] = parseHexColor(from);
	const [toR, toG, toB] = parseHexColor(to);
	const t = smoothStep(progress);
	const r = Math.round(fromR + (toR - fromR) * t);
	const g = Math.round(fromG + (toG - fromG) * t);
	const b = Math.round(fromB + (toB - fromB) * t);
	return `rgb(${r}, ${g}, ${b})`;
};

const getZoomThumbBackgroundColor = (levelValue: number) => {
	const safeValue = clampZoomLevelValue(levelValue);
	const lowerIndex = Math.floor(safeValue);
	const upperIndex = Math.min(lowerIndex + 1, ZOOM_THUMB_MAX_INDEX);
	const progress = safeValue - lowerIndex;
	const lowerColor =
		ZOOM_THUMB_BACKGROUND_COLORS[lowerIndex] ?? ZOOM_THUMB_BACKGROUND_COLORS[0];
	const upperColor = ZOOM_THUMB_BACKGROUND_COLORS[upperIndex] ?? lowerColor;
	return getInterpolatedHexColor(lowerColor, upperColor, progress);
};

const getThumbTopForLevelValue = (levelValue: number) => {
	const safeValue = clampZoomLevelValue(levelValue);
	const lowerIndex = Math.floor(safeValue);
	const upperIndex = Math.min(lowerIndex + 1, ZOOM_THUMB_MAX_INDEX);
	const progress = safeValue - lowerIndex;
	const lowerTop = ZOOM_THUMB_TOP_POSITIONS_PX[lowerIndex] ?? ZOOM_THUMB_TOP_POSITIONS_PX[0];
	const upperTop = ZOOM_THUMB_TOP_POSITIONS_PX[upperIndex] ?? lowerTop;
	return lowerTop + (upperTop - lowerTop) * progress;
};

const getLevelValueForThumbTop = (thumbTop: number) => {
	const bottomTop = ZOOM_THUMB_TOP_POSITIONS_PX[0] ?? 0;
	const topTop = ZOOM_THUMB_TOP_POSITIONS_PX[ZOOM_THUMB_MAX_INDEX] ?? bottomTop;
	if (thumbTop >= bottomTop) return 0;
	if (thumbTop <= topTop) return ZOOM_THUMB_MAX_INDEX;

	for (let index = 0; index < ZOOM_THUMB_MAX_INDEX; index += 1) {
		const lowerTop = ZOOM_THUMB_TOP_POSITIONS_PX[index] ?? bottomTop;
		const upperTop = ZOOM_THUMB_TOP_POSITIONS_PX[index + 1] ?? topTop;
		if (thumbTop <= lowerTop && thumbTop >= upperTop) {
			const span = lowerTop - upperTop;
			const progress = span === 0 ? 0 : (lowerTop - thumbTop) / span;
			return index + progress;
		}
	}

	return ZOOM_THUMB_MAX_INDEX;
};

const getTallStackInnerBoxContent = (index: number): ReactNode => {
	switch (index) {
		case 0:
			return <RadioStationsIcon size={32} innerFill="#EFEFEF" />;
		case 1:
			return <FestivalsIcon size={28} />;
		case 2:
			return <WeddingPlannersIcon size={32} innerFill="#F0E0A1" />;
		case 3:
			return <CoffeeShopsIcon size={20} innerFill="#C5EDA0" />;
		case 4:
			return <WineBeerSpiritsIcon size={32} innerFill="#A5C3FF" />;
		case 5:
			return <MusicVenuesIcon size={32} innerFill="#9BDAFF" />;
		case 6:
			return <RestaurantsIcon size={33} innerFill="#81D697" />;
		default:
			return null;
	}
};

export function MapSelectGrabStarterBox({
	className,
	style,
	zoomLevelIndex = 0,
	zoomLevelValue,
	onZoomLevelIndexChange,
	onZoomLevelValueChange,
	onZoomLevelInteractionChange,
	zoomLevelLiveControlRef,
	zoomLevelIcons,
}: {
	className?: string;
	style?: CSSProperties;
	zoomLevelIndex?: number;
	zoomLevelValue?: number;
	onZoomLevelIndexChange?: (levelIndex: number, meta: MapZoomControlIndexChangeMeta) => void;
	onZoomLevelValueChange?: (levelValue: number) => void;
	onZoomLevelInteractionChange?: (isDragging: boolean) => void;
	zoomLevelLiveControlRef?: MutableRefObject<MapZoomControlLiveHandle | null>;
	zoomLevelIcons?: ReactNode[];
}) {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const thumbRef = useRef<HTMLButtonElement | null>(null);
	const iconRefs = useRef<Array<HTMLSpanElement | null>>([]);
	const isDraggingRef = useRef(false);
	const [isDragging, setIsDragging] = useState(false);
	const safeZoomLevelIndex = Math.min(
		Math.max(Math.round(zoomLevelIndex), 0),
		ZOOM_THUMB_MAX_INDEX
	);
	const safeZoomLevelValue = clampZoomLevelValue(zoomLevelValue ?? safeZoomLevelIndex);
	const [liveZoomLevelValue, setLiveZoomLevelValue] = useState(safeZoomLevelValue);
	const isInteractive =
		typeof onZoomLevelIndexChange === 'function' ||
		typeof onZoomLevelValueChange === 'function';
	const zoomIcons = useMemo(
		() =>
			zoomLevelIcons?.some(Boolean)
				? ZOOM_THUMB_TOP_POSITIONS_PX.map((_, index) => zoomLevelIcons[index] ?? null)
				: [],
		[zoomLevelIcons]
	);
	const hasCustomZoomIcons = zoomIcons.length > 0;
	const safeLiveZoomLevelValue = clampZoomLevelValue(liveZoomLevelValue);
	const thumbTopPx = getThumbTopForLevelValue(safeLiveZoomLevelValue);
	const activeIconIndex = Math.min(
		Math.max(Math.round(safeLiveZoomLevelValue), 0),
		ZOOM_THUMB_MAX_INDEX
	);
	const thumbBackgroundColor = getZoomThumbBackgroundColor(safeLiveZoomLevelValue);
	const zoomControlCursor = isDragging
		? 'grabbing'
		: isInteractive
			? 'grab'
			: 'default';
	const zoomControlCursorClassName = isInteractive
		? isDragging
			? '!cursor-grabbing [&_*]:!cursor-grabbing'
			: '!cursor-grab [&_*]:!cursor-grab'
		: '';
	const starterBoxClassName = [className, zoomControlCursorClassName]
		.filter(Boolean)
		.join(' ');

	const applyLevelValueToDom = useCallback((levelValue: number) => {
		const safeValue = clampZoomLevelValue(levelValue);
		setLiveZoomLevelValue((current) =>
			Math.abs(current - safeValue) < 0.005 ? current : safeValue
		);
		const thumb = thumbRef.current;
		if (!thumb) return;

		thumb.style.transform = `translate3d(0, ${getThumbTopForLevelValue(safeValue)}px, 0)`;
		thumb.style.backgroundColor = getZoomThumbBackgroundColor(safeValue);
		thumb.setAttribute('aria-valuenow', String(Number(safeValue.toFixed(2))));
		thumb.setAttribute(
			'aria-valuetext',
			`Zoom level ${Number(safeValue.toFixed(1))} of ${ZOOM_THUMB_MAX_INDEX}`
		);

		const nextActiveIconIndex = Math.min(
			Math.max(Math.round(safeValue), 0),
			ZOOM_THUMB_MAX_INDEX
		);
		iconRefs.current.forEach((icon, index) => {
			if (!icon) return;
			icon.style.opacity = index === nextActiveIconIndex ? '1' : '0';
		});
	}, []);

	useEffect(() => {
		if (isDraggingRef.current) return;
		applyLevelValueToDom(safeZoomLevelValue);
	}, [applyLevelValueToDom, safeZoomLevelValue]);

	useEffect(() => {
		if (!zoomLevelLiveControlRef) return;
		const handle: MapZoomControlLiveHandle = {
			setLevelValue: applyLevelValueToDom,
		};
		zoomLevelLiveControlRef.current = handle;
		return () => {
			if (zoomLevelLiveControlRef.current === handle) {
				zoomLevelLiveControlRef.current = null;
			}
		};
	}, [applyLevelValueToDom, zoomLevelLiveControlRef]);

	const getLevelValueForClientY = useCallback((clientY: number) => {
		const rect = trackRef.current?.getBoundingClientRect();
		if (!rect) return safeZoomLevelValue;
		const localScaleY = rect.height > 0 ? STARTER_BOX_HEIGHT_PX / rect.height : 1;
		const localY = (clientY - rect.top) * localScaleY;
		const thumbTop = localY - ZOOM_THUMB_SIZE_PX / 2;
		return getLevelValueForThumbTop(thumbTop);
	}, [safeZoomLevelValue]);

	const updateLevelFromClientY = useCallback(
		(clientY: number) => {
			if (!onZoomLevelValueChange) return;
			const nextValue = getLevelValueForClientY(clientY);
			applyLevelValueToDom(nextValue);
			onZoomLevelValueChange(nextValue);
		},
		[applyLevelValueToDom, getLevelValueForClientY, onZoomLevelValueChange]
	);

	const handlePointerDown = useCallback(
		(e: PointerEvent<HTMLDivElement>) => {
			if (!isInteractive) return;
			e.preventDefault();
			e.stopPropagation();
			isDraggingRef.current = true;
			setIsDragging(true);
			onZoomLevelInteractionChange?.(true);
			e.currentTarget.setPointerCapture(e.pointerId);
			updateLevelFromClientY(e.clientY);
		},
		[isInteractive, onZoomLevelInteractionChange, updateLevelFromClientY]
	);

	const handlePointerMove = useCallback(
		(e: PointerEvent<HTMLDivElement>) => {
			if (!isDraggingRef.current) return;
			e.preventDefault();
			e.stopPropagation();
			updateLevelFromClientY(e.clientY);
		},
		[updateLevelFromClientY]
	);

	const stopDragging = useCallback(
		(e: PointerEvent<HTMLDivElement>) => {
			if (!isDraggingRef.current) return;
			e.preventDefault();
			e.stopPropagation();
			const finalValue = getLevelValueForClientY(e.clientY);
			const settledIndex = Math.min(
				Math.max(Math.round(finalValue), 0),
				ZOOM_THUMB_MAX_INDEX
			);
			isDraggingRef.current = false;
			setIsDragging(false);
			onZoomLevelInteractionChange?.(false);
			applyLevelValueToDom(finalValue);
			onZoomLevelIndexChange?.(settledIndex, {
				source: 'drag-release',
				levelValue: finalValue,
			});
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
		},
		[
			applyLevelValueToDom,
			getLevelValueForClientY,
			onZoomLevelIndexChange,
			onZoomLevelInteractionChange,
		]
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLButtonElement>) => {
			if (!onZoomLevelIndexChange) return;
			let nextIndex = safeZoomLevelIndex;
			if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
				nextIndex = Math.min(safeZoomLevelIndex + 1, ZOOM_THUMB_MAX_INDEX);
			} else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
				nextIndex = Math.max(safeZoomLevelIndex - 1, 0);
			} else if (e.key === 'Home') {
				nextIndex = 0;
			} else if (e.key === 'End') {
				nextIndex = ZOOM_THUMB_MAX_INDEX;
			} else {
				return;
			}
			e.preventDefault();
			onZoomLevelIndexChange(nextIndex, {
				source: 'keyboard',
				levelValue: nextIndex,
			});
		},
		[onZoomLevelIndexChange, safeZoomLevelIndex]
	);

	const thumbStyle = useMemo<CSSProperties>(
		() => ({
			position: 'absolute',
			left: `${ZOOM_THUMB_LEFT_PX}px`,
			top: 0,
			width: `${ZOOM_THUMB_SIZE_PX}px`,
			height: `${ZOOM_THUMB_SIZE_PX}px`,
			borderRadius: `${ZOOM_THUMB_RADIUS_PX}px`,
			backgroundColor: thumbBackgroundColor,
			border: 0,
			padding: 0,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			cursor: zoomControlCursor,
			overflow: 'hidden',
			touchAction: 'none',
			outline: 'none',
			transformOrigin: 'center',
			transform: `translate3d(0, ${thumbTopPx}px, 0)`,
			willChange: 'transform, background-color',
			transition: 'none',
		}),
		[thumbBackgroundColor, thumbTopPx, zoomControlCursor]
	);

	return (
		<div
			ref={trackRef}
			aria-hidden={isInteractive ? undefined : true}
			className={starterBoxClassName || undefined}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={stopDragging}
			onPointerCancel={stopDragging}
			style={{
				position: 'relative',
				width: `${STARTER_BOX_WIDTH_PX}px`,
				height: `${STARTER_BOX_HEIGHT_PX}px`,
				borderRadius: '24px',
				backgroundColor: '#FFFFFF',
				touchAction: 'none',
				...style,
				cursor: zoomControlCursor,
			}}
		>
			<button
				ref={thumbRef}
				type="button"
				aria-label="Map zoom level"
				className={zoomControlCursorClassName || undefined}
				aria-valuemin={0}
				aria-valuemax={ZOOM_THUMB_MAX_INDEX}
				aria-valuenow={Number(safeLiveZoomLevelValue.toFixed(2))}
				aria-valuetext={`Zoom level ${Number(safeLiveZoomLevelValue.toFixed(1))} of ${ZOOM_THUMB_MAX_INDEX}`}
				role="slider"
				tabIndex={isInteractive ? 0 : -1}
				onKeyDown={handleKeyDown}
				style={thumbStyle}
			>
				<div
					aria-hidden="true"
					style={{
						position: 'relative',
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: zoomControlCursor,
					}}
				>
					{hasCustomZoomIcons ? (
						zoomIcons.map((icon, index) => {
							return (
								<span
									key={index}
									ref={(element) => {
										iconRefs.current[index] = element;
									}}
									style={{
										position: 'absolute',
										inset: 0,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										opacity: index === activeIconIndex ? 1 : 0,
										pointerEvents: 'none',
										transition: 'none',
										cursor: zoomControlCursor,
									}}
								>
									<span
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											width: '100%',
											height: '100%',
											cursor: zoomControlCursor,
										}}
									>
										{icon}
									</span>
								</span>
							);
						})
					) : (
						<MapZoomSequenceIcon
							levelValue={safeLiveZoomLevelValue}
							aria-hidden="true"
							focusable="false"
							style={{
								display: 'block',
								cursor: zoomControlCursor,
							}}
						/>
					)}
				</div>
			</button>
		</div>
	);
}

export function MapSelectGrabStackBox({
	className,
	style,
	children,
}: {
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
}) {
	return (
		<div
			aria-hidden="true"
			className={className}
			style={{
				width: `${STACK_BOX_SIZE_PX}px`,
				height: `${STACK_BOX_SIZE_PX}px`,
				borderRadius: `${STACK_BOX_RADIUS_PX}px`,
				backgroundColor: '#FFFFFF',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				...style,
			}}
		>
			{children}
		</div>
	);
}

export function MapSelectGrabStackTile({
	backgroundColor,
	children,
}: {
	backgroundColor: string;
	children?: ReactNode;
}) {
	return (
		<div
			style={{
				width: `${STACK_BOX_TILE_SIZE_PX}px`,
				height: `${STACK_BOX_TILE_SIZE_PX}px`,
				borderRadius: `${STACK_BOX_TILE_RADIUS_PX}px`,
				backgroundColor,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				overflow: 'hidden',
				lineHeight: 0,
			}}
		>
			{children ? (
				<span
					style={{
						width: '100%',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						lineHeight: 0,
					}}
				>
					{children}
				</span>
			) : null}
		</div>
	);
}

export function MapSelectGrabTallStackBox({
	className,
	style,
}: {
	className?: string;
	style?: CSSProperties;
}) {
	return (
		<div
			aria-hidden="true"
			className={className}
			style={{
				width: `${TALL_STACK_BOX_WIDTH_PX}px`,
				height: `${TALL_STACK_BOX_HEIGHT_PX}px`,
				borderRadius: `${TALL_STACK_BOX_RADIUS_PX}px`,
				backgroundColor: '#FFFFFF',
				overflow: 'hidden',
				...style,
			}}
		>
			<div style={{ position: 'relative', width: '100%', height: '100%' }}>
				{TALL_STACK_INNER_BOX_BOTTOM_POSITIONS_PX.map((bottomPx, index) => {
					const tileBackgroundStyle: CSSProperties =
						TALL_STACK_INNER_BOX_STYLES[index] ?? {};
					const tileBorderRadius =
						tileBackgroundStyle.borderRadius ?? `${TALL_STACK_INNER_BOX_RADIUS_PX}px`;
					const content = getTallStackInnerBoxContent(index);

					return (
						<div
							key={index}
							style={{
								position: 'absolute',
								left: `${TALL_STACK_INNER_BOX_LEFT_PX}px`,
								bottom: `${bottomPx}px`,
								width: `${TALL_STACK_INNER_BOX_SIZE_PX}px`,
								height: `${TALL_STACK_INNER_BOX_SIZE_PX}px`,
								borderRadius: tileBorderRadius,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								overflow: 'hidden',
								lineHeight: 0,
							}}
						>
							<span
								style={{
									position: 'absolute',
									inset: 0,
									borderRadius: 'inherit',
									...tileBackgroundStyle,
								}}
							/>
							{content ? (
								<span
									style={{
										position: 'relative',
										zIndex: 1,
										width: '100%',
										height: '100%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										lineHeight: 0,
									}}
								>
									{content}
								</span>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function MapSelectGrabTool({
	activeTool,
	onSelectClick,
	onGrabClick,
	categoryIcon,
	categoryLabel = 'Active category',
	categoryBackgroundColor = '#71C9FD',
	showCategoryWhenSelectActive = false,
	className,
	style,
}: MapSelectGrabToolProps) {
	const isSelectActive = activeTool === 'select';
	const isGrabActive = activeTool === 'grab';
	const shouldShowCategory =
		showCategoryWhenSelectActive && isSelectActive && Boolean(categoryIcon);

	return (
		<div
			className={className}
			style={{
				width: `${TOOL_WIDTH_PX}px`,
				height: `${shouldShowCategory ? TOOL_EXPANDED_HEIGHT_PX : TOOL_COLLAPSED_HEIGHT_PX}px`,
				borderRadius: '18px',
				backgroundColor: '#FFFFFF',
				border: '2px solid #000000',
				opacity: 0.9,
				boxSizing: 'border-box',
				paddingTop: '10px',
				paddingBottom: '10px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: `${BUTTON_GAP_PX}px`,
				overflow: 'hidden',
				transition: 'height 160ms ease',
				...style,
			}}
		>
			<button
				type="button"
				onClick={onSelectClick}
				aria-label="Select tool"
				aria-pressed={isSelectActive}
				className="flex items-center justify-center font-inter text-[16px] font-semibold leading-none text-black"
				style={{
					width: `${BUTTON_SIZE_PX}px`,
					height: `${BUTTON_SIZE_PX}px`,
					borderRadius: '9px',
					backgroundColor: isSelectActive ? '#999999' : 'rgba(153, 153, 153, 0.3)',
					cursor: 'pointer',
					padding: 0,
					border: 'none',
					flexShrink: 0,
				}}
			>
				<div
					aria-hidden="true"
					style={{
						width: '24px',
						height: '24px',
						backgroundColor: isSelectActive ? '#999999' : 'transparent',
						border: '2px solid #000000',
						boxSizing: 'border-box',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{isSelectActive && (
						<span
							className="font-inter"
							style={{
								fontSize: '8px',
								fontWeight: 500,
								color: '#000000',
								lineHeight: 1,
							}}
						>
							All
						</span>
					)}
				</div>
			</button>

			<button
				type="button"
				onClick={onGrabClick}
				aria-label="Grab tool"
				aria-pressed={isGrabActive}
				className="flex items-center justify-center"
				style={{
					width: `${BUTTON_SIZE_PX}px`,
					height: `${BUTTON_SIZE_PX}px`,
					borderRadius: '9px',
					backgroundColor: isGrabActive ? '#4CDE71' : '#999999',
					cursor: 'pointer',
					padding: 0,
					border: 'none',
					flexShrink: 0,
				}}
			>
				<GrabIcon innerFill="#FFFFFF" />
			</button>

			{shouldShowCategory && (
				<div
					aria-label={categoryLabel}
					className="flex items-center justify-center"
					style={{
						width: `${BUTTON_SIZE_PX}px`,
						height: `${BUTTON_SIZE_PX}px`,
						borderRadius: '9px',
						backgroundColor: categoryBackgroundColor,
						flexShrink: 0,
					}}
				>
					{categoryIcon}
				</div>
			)}
		</div>
	);
}
