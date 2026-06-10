'use client';

import {
	type ChangeEvent,
	type FormEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	type Ref,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import type { Event as VenueEvent } from '@prisma/client';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { BadgeCheck, X } from 'lucide-react';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { PayRangeMoneyIcon } from '@/components/atoms/_svg/PayRangeMoneyIcon';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { VenueSoundIcon } from '@/components/atoms/_svg/VenueSoundIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WebsiteIcon } from '@/components/atoms/_svg/WebsiteIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import DashboardCalendarPanel from '@/components/molecules/DashboardCalendarPanel/DashboardCalendarPanel';
import { PersistentDashboardMap } from '@/components/molecules/PersistentDashboardMap';
import {
	DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING,
	DASHBOARD_TO_INTERACTIVE_TRANSITION_MS,
} from '@/components/molecules/SearchResultsMap/constants';
import type { SearchResultsMapProps } from '@/components/molecules/SearchResultsMap/SearchResultsMap';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import {
	ProfileAreaMapBox,
	type AreaCoordinates,
	type ProfileAreaMapFeature,
} from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import { profileGenreOptionRows } from '@/components/molecules/HybridPromptInput/profileFieldIcons';
import { AccountType } from '@/constants/prismaEnums';
import { urls } from '@/constants/urls';
import {
	PersistentMapProvider,
	type PersistentDashboardMapConfig,
	usePersistentMapSetter,
} from '@/contexts/PersistentMapContext';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMediaUpload, type UploadState } from '@/hooks/useMediaUpload';
import { useGetUser } from '@/hooks/queryHooks/useUsers';
import { useGetMedia, useDeleteMedia } from '@/hooks/queryHooks/useMediaAssets';
import { useGetVenue, useUpsertVenue } from '@/hooks/queryHooks/useVenue';
import {
	useDeleteVenueEvent,
	useGetVenueEvents,
} from '@/hooks/queryHooks/useVenueEvents';
import {
	useGetConversations,
	type ConversationThreadFilter,
} from '@/hooks/queryHooks/useConversations';
import { useGetVenueApplications } from '@/hooks/queryHooks/useVenueApplications';
import { _fetch } from '@/utils';
import type { MediaAssetDto } from '@/app/api/media/route';
import type { PatchVenueData, WeeklyHours } from '@/app/api/venue/schema';
import {
	DASHBOARD_CALENDAR_NATIVE_WIDTH_PX,
	PROFILE_GENRE_OPTIONS,
	VENUE_MAP_ENTRY_ZOOM,
	VENUE_MAP_LEFT_CLUSTER_SCALE,
	VENUE_MAP_OVERLAY_SCALE,
	VENUE_TIME_OPTIONS,
} from './constants';
import { MobileVenuePortal } from './mobile/MobileVenuePortal';
import { VenueChatMapPanel } from './VenueChatMapPanel';
import { VenueCreateEventMapPanel } from './VenueCreateEventMapPanel';
import { VenueEventDetailView } from './VenueEventDetailView';
import { createVenueIconAnchorStore, VenueMapActionPills } from './VenueMapActionPills';
import { VenueMapToolTabBar } from './VenueMapToolTabBar';
import { VenueNotificationsMapPanel } from './VenueNotificationsMapPanel';
import {
	formatApplicantCount,
	formatVenueOpportunityDate,
	formatVenueOpportunityTimeRange,
	isVenueOpportunityLive,
} from './venueOpportunityFormat';
import {
	formatVenueLocationFeature,
	parseVenueLocationParts,
	VENUE_LOCATION_GEOCODE_TYPES,
} from './venueLocationFormat';

export type VenueDayKey = keyof WeeklyHours;
type VenueDayHoursForm = {
	isOpen: boolean;
	open: string;
	close: string;
};
export type VenueHoursFormState = Record<VenueDayKey, VenueDayHoursForm>;

const DEFAULT_VENUE_OPEN_TIME = '12:00';
const DEFAULT_VENUE_CLOSE_TIME = '23:00';

const VENUE_HOURS_DAYS: ReadonlyArray<{
	key: VenueDayKey;
	label: string;
	column: 'left' | 'right';
}> = [
	{ key: 'sun', label: 'Sun', column: 'left' },
	{ key: 'mon', label: 'Mon', column: 'left' },
	{ key: 'tue', label: 'Tues', column: 'left' },
	{ key: 'wed', label: 'Wed', column: 'left' },
	{ key: 'thu', label: 'Th', column: 'right' },
	{ key: 'fri', label: 'Fri', column: 'right' },
	{ key: 'sat', label: 'Sat', column: 'right' },
];

const createEmptyVenueHoursForm = (): VenueHoursFormState => {
	const hours = {} as VenueHoursFormState;
	for (const day of VENUE_HOURS_DAYS) {
		hours[day.key] = {
			isOpen: true,
			open: DEFAULT_VENUE_OPEN_TIME,
			close: DEFAULT_VENUE_CLOSE_TIME,
		};
	}
	return hours;
};

export type VenueFormState = {
	venueName: string;
	businessType: string;
	address: string;
	hours: VenueHoursFormState;
	capacity: string;
	genres: string;
	payRange: string;
	sound: string;
	website: string;
	description: string;
};

type VenueProfileFieldKey =
	| 'location'
	| 'businessType'
	| 'hours'
	| 'capacity'
	| 'genres'
	| 'payRange'
	| 'sound'
	| 'description'
	| 'website';

const VENUE_PROFILE_FIELD_ORDER: VenueProfileFieldKey[] = [
	'location',
	'businessType',
	'hours',
	'capacity',
	'genres',
	'payRange',
	'sound',
	'description',
	'website',
];

export const EMPTY_FORM_STATE: VenueFormState = {
	venueName: '',
	businessType: '',
	address: '',
	hours: createEmptyVenueHoursForm(),
	capacity: '',
	genres: '',
	payRange: '',
	sound: '',
	website: '',
	description: '',
};

// How long to wait after the last edit before auto-saving the venue profile.
export const AUTOSAVE_DEBOUNCE_MS = 800;

const IDLE_MAP_CLIP = 'inset(0px round 0px)';
const IDLE_MAP_TRANSITION = '0ms ease';
const LEFT_GRID_PLACEHOLDER_CLASS =
	'grid w-[126px] grid-cols-[18px_minmax(0,1fr)] items-center gap-[4px] text-left leading-none';
const RIGHT_GRID_PLACEHOLDER_CLASS =
	'grid w-[112px] grid-cols-[18px_minmax(0,1fr)] items-center gap-[4px] text-left leading-none';
const GRID_PLACEHOLDER_LABEL_CLASS = 'min-w-0';
const VENUE_COMPLETED_FIELD_BUTTON_CLASS =
	'relative block h-[63px] overflow-hidden rounded-[8px] border-[2px] border-white text-left opacity-90';
const VENUE_COMPLETED_ROW_TONE_CLASSES = {
	location: 'bg-[#BBE6FF]',
	basics: 'bg-[#C4E9FF]',
	details: 'bg-[#CDECFF]',
	production: 'bg-[#DAF2FF]',
	description: 'bg-[#E1F3FF]',
	website: 'bg-[#EAF7FF]',
} as const;
const VENUE_COMPLETED_FIELD_LABEL_CLASS =
	'absolute left-[11px] top-[7px] isolate text-[14px] font-black leading-[14px] text-[#34B965] before:absolute before:bottom-[1px] before:left-[-3px] before:right-[-3px] before:top-[1px] before:-z-10 before:rounded-[4px] before:bg-[#D6FFED] before:content-[""]';
const VENUE_COMPLETED_FIELD_CONTENT_CLASS =
	'absolute left-[18px] right-[8px] top-[31px] flex h-[22px] items-center gap-[6px]';
const VENUE_COMPLETED_FIELD_VALUE_CLASS =
	'min-w-0 truncate font-inter text-[14px] font-medium leading-[18px] text-black';
const VENUE_COMPLETED_GENRE_PILL_CLASS =
	'flex h-[20px] max-w-[91px] shrink-0 items-center justify-center gap-[2px] overflow-hidden rounded-[7px] border border-black px-[4px] font-inter text-[12px] font-medium leading-none text-black';
export const DEFAULT_CAPACITY_VALUE = 90;
const CAPACITY_SLIDER_MIN = 0;
const CAPACITY_SLIDER_MAX = 350;
const CAPACITY_SLIDER_STEP = 1;
export const DEFAULT_PAY_RANGE_MIN_VALUE = 150;
export const DEFAULT_PAY_RANGE_MAX_VALUE = 2000;
const PAY_RANGE_SLIDER_MIN = 0;
const PAY_RANGE_SLIDER_MAX = 4000;
const PAY_RANGE_SLIDER_STEP = 50;

export const BUSINESS_TYPE_OPTIONS = [
	{
		label: 'Music Venue',
		icon: <MusicVenuesIcon size={12} innerFill="#9BEAF7" />,
	},
	{
		label: 'Coffee Shop',
		icon: <CoffeeShopsIcon size={7} innerFill="#D6F1BD" />,
	},
	{
		label: 'Festival',
		icon: <FestivalsIcon size={12} innerFill="#C1D6FF" />,
	},
	{
		label: 'Wedding',
		icon: <WeddingPlannersIcon size={13} innerFill="#FFF2BC" />,
	},
	{
		label: 'Restaurant',
		icon: <RestaurantsIcon size={12} innerFill="#C3FBD1" />,
	},
	{
		label: 'Winery',
		icon: <WineBeerSpiritsIcon size={13} innerFill="#BFC4FF" />,
	},
] as const;
const VENUE_SOUND_OPTIONS = ['In House', 'No Speakers'] as const;

type VenuePortalClerkUser =
	| {
			firstName?: string | null;
			lastName?: string | null;
			fullName?: string | null;
			username?: string | null;
			primaryEmailAddress?: { emailAddress?: string | null } | null;
	  }
	| null
	| undefined;

const getVenuePortalDisplayName = (clerkUser: VenuePortalClerkUser): string => {
	const clerkFullName = clerkUser?.fullName?.trim();
	const clerkCombinedName = [clerkUser?.firstName?.trim(), clerkUser?.lastName?.trim()]
		.filter(Boolean)
		.join(' ');
	return (
		clerkFullName ||
		clerkCombinedName ||
		clerkUser?.username?.trim() ||
		clerkUser?.primaryEmailAddress?.emailAddress?.split('@')[0]?.trim() ||
		'Venue User'
	);
};

const getVenuePortalInitial = (clerkUser: VenuePortalClerkUser): string =>
	getVenuePortalDisplayName(clerkUser).trim()[0]?.toUpperCase() || 'V';

const trimToNull = (value: string): string | null => {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

export const hasSavedVenueRequiredFields = (
	venue: { venueName?: string | null; address?: string | null } | null | undefined
) => Boolean(venue?.venueName?.trim() && venue.address?.trim());

// Remember (per user, in localStorage) whether the last load had a completed venue
// profile so the next load can skip the "New Venue" creation skeleton and land
// straight on the map instead of flashing a placeholder before the data resolves.
const VENUE_PROFILE_HINT_KEY = 'venue-portal:profile-complete';

// Optimistic read: returns the last stored "complete" flag, used on mount before
// auth/user/venue have resolved. The view self-corrects from the real data afterward.
export const readVenueProfileComplete = (): boolean => {
	if (typeof window === 'undefined') return false;
	try {
		const raw = window.localStorage.getItem(VENUE_PROFILE_HINT_KEY);
		return raw ? Boolean(JSON.parse(raw)?.complete) : false;
	} catch {
		return false;
	}
};

export const writeVenueProfileComplete = (userId: string, complete: boolean): void => {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(
			VENUE_PROFILE_HINT_KEY,
			JSON.stringify({ userId, complete })
		);
	} catch {
		/* private mode / quota — degrade to the current skeleton-then-map behavior */
	}
};

// Pre-paint on the client, no-op on the server — lets the initial map-view entry land
// before the first paint without emitting the SSR "useLayoutEffect does nothing" warning.
const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const formatVenueCoordinate = (coordinate: number) => coordinate.toFixed(4);

export const hydrateVenueHours = (hours: WeeklyHours | null): VenueHoursFormState => {
	const hydratedHours = createEmptyVenueHoursForm();
	if (!hours) return hydratedHours;

	for (const day of VENUE_HOURS_DAYS) {
		const dayHours = hours[day.key];
		if (dayHours === undefined) continue;
		const firstRange = dayHours[0];
		hydratedHours[day.key] = {
			isOpen: dayHours.length > 0,
			open: firstRange?.open ?? DEFAULT_VENUE_OPEN_TIME,
			close: firstRange?.close ?? DEFAULT_VENUE_CLOSE_TIME,
		};
	}

	return hydratedHours;
};

const parseVenueHours = (hours: VenueHoursFormState): WeeklyHours | null => {
	const weeklyHours: WeeklyHours = {};
	let hasHours = false;

	for (const day of VENUE_HOURS_DAYS) {
		const dayHours = hours[day.key];
		if (!dayHours.isOpen) {
			weeklyHours[day.key] = [];
			hasHours = true;
			continue;
		}

		if (!dayHours.open || !dayHours.close) {
			throw new Error(`${day.label} hours need an opening and closing time.`);
		}

		weeklyHours[day.key] = [{ open: dayHours.open, close: dayHours.close }];
		hasHours = true;
	}

	return hasHours ? weeklyHours : null;
};

export const getOpenNightsCount = (hours: VenueHoursFormState) =>
	VENUE_HOURS_DAYS.reduce((total, day) => total + (hours[day.key].isOpen ? 1 : 0), 0);

export const formatOpenNightsSummary = (count: number) =>
	`${count} ${count === 1 ? 'night' : 'nights'}/week`;

export const formatCapacity = (capacityMin: number | null, capacityMax: number | null) => {
	if (capacityMin !== null && capacityMax !== null && capacityMin !== capacityMax) {
		return `${capacityMin}-${capacityMax}`;
	}
	if (capacityMax !== null) return String(capacityMax);
	if (capacityMin !== null) return String(capacityMin);
	return '';
};

const parseCapacity = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) {
		return { capacityMin: null, capacityMax: null };
	}

	const parts = trimmed
		.split('-')
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length === 0 || parts.length > 2) {
		throw new Error('Capacity should be a number or range, like 90 or 50-120.');
	}

	const parsed = parts.map((part) => Number(part));
	if (parsed.some((part) => !Number.isInteger(part) || part < 0)) {
		throw new Error('Capacity should be a whole number or range.');
	}

	const capacityMin = parsed[0];
	const capacityMax = parsed[1] ?? parsed[0];
	if (capacityMin > capacityMax) {
		throw new Error('Capacity minimum should be less than or equal to the maximum.');
	}

	return { capacityMin, capacityMax };
};

const formatCapacityPeople = (capacity: number) =>
	`${capacity} ${capacity === 1 ? 'person' : 'people'}`;

export const formatCapacityDisplay = (capacity: string) => {
	const trimmed = capacity.trim();
	if (!trimmed) return formatCapacityPeople(DEFAULT_CAPACITY_VALUE);

	try {
		const { capacityMin, capacityMax } = parseCapacity(trimmed);
		if (capacityMin !== null && capacityMax !== null && capacityMin !== capacityMax) {
			return `${capacityMin}-${capacityMax} people`;
		}

		const capacityValue = capacityMax ?? capacityMin;
		return capacityValue === null
			? formatCapacityPeople(DEFAULT_CAPACITY_VALUE)
			: formatCapacityPeople(capacityValue);
	} catch {
		return `${trimmed} people`;
	}
};

const getCapacitySliderValue = (capacity: string) => {
	try {
		const { capacityMin, capacityMax } = parseCapacity(capacity);
		return capacityMax ?? capacityMin ?? DEFAULT_CAPACITY_VALUE;
	} catch {
		return DEFAULT_CAPACITY_VALUE;
	}
};

const getCapacitySliderMax = (capacity: number) =>
	Math.max(CAPACITY_SLIDER_MAX, capacity);

const parsePayRange = (value: string) => {
	const parsed = (value.match(/\d[\d,]*/g) ?? [])
		.slice(0, 2)
		.map((part) => Number(part.replaceAll(',', '')))
		.filter((part) => Number.isInteger(part) && part >= 0);

	if (parsed.length === 0) {
		return { payMin: null, payMax: null };
	}

	const firstValue = parsed[0];
	const secondValue = parsed[1] ?? parsed[0];
	return {
		payMin: Math.min(firstValue, secondValue),
		payMax: Math.max(firstValue, secondValue),
	};
};

export const formatPayRange = (payMin: number | null, payMax: number | null) => {
	if (payMin !== null && payMax !== null && payMin !== payMax) {
		return `$${payMin}-${payMax}`;
	}
	if (payMax !== null) return `$${payMax}`;
	if (payMin !== null) return `$${payMin}`;
	return '';
};

export const formatPayRangeDisplay = (payRange: string) => {
	const trimmed = payRange.trim();
	if (!trimmed) {
		return formatPayRange(DEFAULT_PAY_RANGE_MIN_VALUE, DEFAULT_PAY_RANGE_MAX_VALUE);
	}

	const { payMin, payMax } = parsePayRange(trimmed);
	return formatPayRange(payMin, payMax) || trimmed;
};

const getPayRangeSliderValues = (payRange: string) => {
	const { payMin, payMax } = parsePayRange(payRange);
	return {
		payMin: payMin ?? DEFAULT_PAY_RANGE_MIN_VALUE,
		payMax: payMax ?? DEFAULT_PAY_RANGE_MAX_VALUE,
	};
};

const getPayRangeSliderMax = (payMax: number) => Math.max(PAY_RANGE_SLIDER_MAX, payMax);

const getPayRangeSliderPercent = (value: number, sliderMax: number) =>
	((value - PAY_RANGE_SLIDER_MIN) / (sliderMax - PAY_RANGE_SLIDER_MIN)) * 100;

export const parseGenres = (value: string) => {
	return value
		.split(',')
		.map((genre) => genre.trim())
		.filter(Boolean);
};

// Translate the local form/location state into the PATCH payload. Includes the
// location-derived coordinates + city/state alongside the typed fields. Throws (with a
// user-facing message) when capacity or hours are malformed, so callers can either
// surface the error (manual submit) or skip the write (auto-save).
export const buildVenuePayload = (
	form: VenueFormState,
	locationParts: { city: string; state: string },
	locationCoordinates: AreaCoordinates | null
): PatchVenueData => {
	const capacityValues = parseCapacity(form.capacity);
	const hours = parseVenueHours(form.hours);

	return {
		...parsePayRange(form.payRange),
		venueName: form.venueName.trim(),
		businessType: trimToNull(form.businessType),
		address: trimToNull(form.address),
		city: trimToNull(locationParts.city),
		state: trimToNull(locationParts.state),
		latitude: locationCoordinates?.lat ?? null,
		longitude: locationCoordinates?.lng ?? null,
		hours,
		capacityMin: capacityValues.capacityMin,
		capacityMax: capacityValues.capacityMax,
		genres: parseGenres(form.genres),
		payRange: trimToNull(form.payRange),
		sound: trimToNull(form.sound),
		website: trimToNull(form.website),
		description: trimToNull(form.description),
	};
};

type VenueTextFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	className?: string;
	placeholderContentClassName?: string;
	placeholderLabelClassName?: string;
	multiline?: boolean;
	highlighted?: boolean;
	activeEntry?: boolean;
	solidWhenEmpty?: boolean;
	placeholderShowsPlus?: boolean;
	inputMode?:
		| 'none'
		| 'text'
		| 'tel'
		| 'url'
		| 'email'
		| 'numeric'
		| 'decimal'
		| 'search';
	autoComplete?: string;
	readOnly?: boolean;
	onFocus?: () => void;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
	inputRef?: Ref<HTMLInputElement>;
	textareaRef?: Ref<HTMLTextAreaElement>;
};

function VenueTextField({
	label,
	value,
	onChange,
	className = '',
	placeholderContentClassName,
	placeholderLabelClassName,
	multiline = false,
	highlighted = false,
	activeEntry = false,
	solidWhenEmpty = false,
	placeholderShowsPlus = true,
	inputMode,
	autoComplete,
	readOnly = false,
	onFocus,
	onKeyDown,
	inputRef,
	textareaRef,
}: VenueTextFieldProps) {
	const controlClassName =
		'absolute inset-0 h-full w-full bg-transparent px-5 text-left text-[18px] font-medium text-black outline-none';
	const isEmpty = value.trim().length === 0;
	const fieldToneClassName = activeEntry
		? 'bg-[linear-gradient(180deg,#CBEEFD_0%,#FFF_100%)] opacity-100'
		: highlighted
			? 'bg-[#EDF9FF] opacity-100'
			: solidWhenEmpty && isEmpty
				? 'bg-white opacity-100'
				: 'bg-white opacity-20';
	const placeholderToneClassName =
		activeEntry || highlighted ? 'text-black' : 'text-[#9f9f9f]';
	const borderClassName = activeEntry
		? 'border border-black'
		: 'border-[2px] border-black';

	return (
		<label
			className={`relative block overflow-hidden rounded-[8px] ${borderClassName} ${fieldToneClassName} ${className}`}
		>
			{isEmpty && (
				<span
					className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[22px] font-medium ${placeholderToneClassName}`}
				>
					<VenuePlaceholderContent
						label={label}
						contentClassName={placeholderContentClassName}
						labelClassName={placeholderLabelClassName}
						showsPlus={placeholderShowsPlus}
					/>
				</span>
			)}
			{multiline ? (
				<textarea
					ref={textareaRef}
					aria-label={label}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onFocus={onFocus}
					className={`${controlClassName} resize-none py-4 leading-6`}
				/>
			) : (
				<input
					ref={inputRef}
					aria-label={label}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onFocus={onFocus}
					onKeyDown={onKeyDown}
					inputMode={inputMode}
					autoComplete={autoComplete}
					readOnly={readOnly}
					className={`${controlClassName} leading-none`}
				/>
			)}
		</label>
	);
}

function VenuePlaceholderContent({
	label,
	contentClassName,
	labelClassName,
	showsPlus = true,
}: {
	label: string;
	contentClassName?: string;
	labelClassName?: string;
	showsPlus?: boolean;
}) {
	if (!contentClassName) {
		return showsPlus ? <>+ {label}</> : <>{label}</>;
	}

	return (
		<span className={contentClassName}>
			{showsPlus && <span aria-hidden="true">+</span>}
			<span className={labelClassName}>{label}</span>
		</span>
	);
}

export function VenueBusinessTypePicker({
	value,
	onChange,
	onSelect,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	onSelect: (value: string) => void;
	className?: string;
}) {
	const selectedStandardOption = BUSINESS_TYPE_OPTIONS.some(
		(option) => option.label === value
	);

	return (
		<div
			className={`relative h-[122px] w-[387px] rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Business Type
			</span>

			<div className="absolute left-[56px] top-[30px] grid w-[275px] grid-cols-2 gap-x-[14px] gap-y-[5px]">
				{BUSINESS_TYPE_OPTIONS.map((option) => {
					const isSelected = option.label === value;

					return (
						<button
							key={option.label}
							type="button"
							aria-pressed={isSelected}
							onClick={() => onSelect(option.label)}
							className={`flex h-[18px] items-center rounded-[6px] border border-black px-[4px] text-left text-[11px] font-medium leading-[13px] text-black ${
								isSelected ? 'bg-[#D6FFED]' : 'bg-white'
							}`}
						>
							<span className="flex w-[16px] shrink-0 scale-[0.9] items-center justify-center">
								{option.icon}
							</span>
							<span className="min-w-0 truncate">{option.label}</span>
						</button>
					);
				})}
			</div>

			<input
				aria-label="Custom business type"
				value={selectedStandardOption ? '' : value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Enter Business Type"
				className="absolute bottom-[1px] left-[56px] h-[27px] w-[275px] bg-transparent px-[3px] text-[11px] font-medium leading-none text-black outline-none placeholder:text-[#9f9f9f]"
			/>
		</div>
	);
}

function VenueCompletedBusinessTypeButton({
	businessType,
	onClick,
}: {
	businessType: string;
	onClick: () => void;
}) {
	const selectedOption = BUSINESS_TYPE_OPTIONS.find(
		(option) => option.label === businessType
	);

	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.basics} w-[172px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Business Type</span>
			<span className={VENUE_COMPLETED_FIELD_CONTENT_CLASS}>
				{selectedOption && (
					<span className="flex w-[18px] shrink-0 items-center justify-center">
						{selectedOption.icon}
					</span>
				)}
				<span className={VENUE_COMPLETED_FIELD_VALUE_CLASS}>{businessType}</span>
			</span>
		</button>
	);
}

function VenueCompletedHoursButton({
	summary,
	onClick,
}: {
	summary: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.basics} w-[210px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Hours</span>
			<span className={`${VENUE_COMPLETED_FIELD_CONTENT_CLASS} justify-start`}>
				<span className={VENUE_COMPLETED_FIELD_VALUE_CLASS}>{summary}</span>
			</span>
		</button>
	);
}

function CapacityPersonIcon({ className = '' }: { className?: string }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 8 20" fill="none" className={className}>
			<path
				d="M3.82865 0C4.67695 0 5.36761 0.7979 5.36761 1.77793C5.36761 2.75796 4.67695 3.55586 3.82865 3.55586C2.98034 3.55586 2.28968 2.75796 2.28968 1.77793C2.28968 0.7979 2.98034 0 3.82865 0ZM5.76549 4.01552H1.92183C0.855815 4.01552 0 5.00422 0 6.23576V11.665C0 12.0899 0.292779 12.4455 0.675644 12.4455C1.05851 12.4455 1.35129 12.1073 1.35129 11.665V6.67808C1.35129 6.55666 1.44137 6.45259 1.54647 6.45259C1.65157 6.45259 1.74166 6.55666 1.74166 6.67808V18.4255C1.74166 19.0933 2.16957 19.6397 2.70257 19.6397C3.23558 19.6397 3.66349 19.0933 3.66349 18.4255V12.4629C3.66349 12.3414 3.75358 12.2374 3.85868 12.2374C3.96378 12.2374 4.05386 12.3414 4.05386 12.4629V18.4255C4.05386 19.0933 4.48177 19.6397 5.01478 19.6397C5.54778 19.6397 5.97569 19.0933 5.97569 18.4255V6.67808C5.97569 6.55666 6.06578 6.45259 6.17088 6.45259C6.27598 6.45259 6.36606 6.55666 6.36606 6.67808V11.6736C6.36606 12.0986 6.65884 12.4542 7.04171 12.4542C7.42457 12.4542 7.71735 12.1159 7.71735 11.6736V6.23576C7.68732 5.00422 6.80899 4.01552 5.76549 4.01552Z"
				fill="currentColor"
			/>
		</svg>
	);
}

function VenueDescriptionIcon({ className = '' }: { className?: string }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
			<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
			<circle cx="12" cy="8.6" r="3" stroke="currentColor" strokeWidth="2" />
			<path
				d="M5.8 19.1C7.05 16.55 9.25 15 12 15C14.75 15 16.95 16.55 18.2 19.1"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function VenueDescriptionField({
	value,
	onChange,
	onFocus,
	onKeyDown,
	textareaRef,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	onFocus: () => void;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
	textareaRef?: Ref<HTMLTextAreaElement>;
	className?: string;
}) {
	return (
		<label
			className={`relative block overflow-hidden rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Description</span>
			<VenueDescriptionIcon className="absolute left-[18px] top-[32px] h-[14px] w-[14px] text-black" />
			<textarea
				ref={textareaRef}
				aria-label="Description"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				placeholder="Enter description"
				className="absolute bottom-[9px] left-[38px] right-[12px] top-[30px] resize-none bg-transparent font-inter text-[13px] font-medium leading-[18px] text-black outline-none placeholder:text-[#828282]"
			/>
		</label>
	);
}

function VenueCompletedDescriptionButton({
	description,
	onClick,
	className = '',
}: {
	description: string;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative block h-[98px] w-[386px] overflow-hidden rounded-[8px] border-[2px] border-white ${VENUE_COMPLETED_ROW_TONE_CLASSES.description} text-left opacity-90 ${className}`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Description</span>
			<VenueDescriptionIcon className="absolute left-[18px] top-[32px] h-[14px] w-[14px] text-black" />
			<span className="absolute bottom-[9px] left-[38px] right-[12px] top-[30px] overflow-hidden whitespace-pre-wrap font-inter text-[13px] font-medium leading-[18px] text-black">
				{description}
			</span>
		</button>
	);
}

export function VenueWebsiteField({
	value,
	onChange,
	onFocus,
	onKeyDown,
	inputRef,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	onFocus: () => void;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
	inputRef?: Ref<HTMLInputElement>;
	className?: string;
}) {
	return (
		<label
			className={`relative block overflow-hidden rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Website</span>
			<WebsiteIcon className="absolute left-[18px] top-[32px] h-[14px] w-[14px]" />
			<input
				ref={inputRef}
				aria-label="Website"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onFocus={onFocus}
				onKeyDown={onKeyDown}
				placeholder="Enter website"
				inputMode="url"
				autoComplete="url"
				className="absolute left-[38px] right-[12px] top-[30px] h-[18px] bg-transparent font-inter text-[13px] font-medium leading-[18px] text-black outline-none placeholder:text-[#828282]"
			/>
		</label>
	);
}

function VenueCompletedWebsiteButton({
	website,
	onClick,
	className = '',
}: {
	website: string;
	onClick: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative block h-[98px] w-[386px] overflow-hidden rounded-[8px] border-[2px] border-white ${VENUE_COMPLETED_ROW_TONE_CLASSES.website} text-left opacity-90 ${className}`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Website</span>
			<WebsiteIcon className="absolute left-[18px] top-[32px] h-[14px] w-[14px]" />
			<span className="absolute left-[38px] right-[12px] top-[30px] truncate font-inter text-[13px] font-medium leading-[18px] text-black">
				{website}
			</span>
		</button>
	);
}

function VenueCompletedCapacityButton({
	capacity,
	onClick,
}: {
	capacity: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.details} w-[172px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Capacity</span>
			<span className={VENUE_COMPLETED_FIELD_CONTENT_CLASS}>
				<CapacityPersonIcon className="h-[18px] w-[7px] shrink-0 text-black" />
				<span className={VENUE_COMPLETED_FIELD_VALUE_CLASS}>
					{formatCapacityDisplay(capacity)}
				</span>
			</span>
		</button>
	);
}

function VenueCompletedPayRangeButton({
	payRange,
	onClick,
}: {
	payRange: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.production} w-[172px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Pay Range</span>
			<span className={VENUE_COMPLETED_FIELD_CONTENT_CLASS}>
				<PayRangeMoneyIcon className="h-[16px] w-[16px] shrink-0 translate-y-[0.75px]" />
				<span className={VENUE_COMPLETED_FIELD_VALUE_CLASS}>
					{formatPayRangeDisplay(payRange)}
				</span>
			</span>
		</button>
	);
}

function VenueActiveSoundButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-[63px] w-[210px] items-center justify-center rounded-[8px] border-[2px] border-black bg-[#E6F7FE] text-[24px] font-medium leading-none text-black"
		>
			Sound
		</button>
	);
}

function VenueCompletedSoundButton({
	sound,
	onClick,
}: {
	sound: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.production} w-[210px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Sound</span>
			<span className={`${VENUE_COMPLETED_FIELD_CONTENT_CLASS} justify-start`}>
				<VenueSoundIcon className="h-[17px] w-[17px] shrink-0 text-[#0F0F0F]" />
				<span className={VENUE_COMPLETED_FIELD_VALUE_CLASS}>{sound}</span>
			</span>
		</button>
	);
}

function VenueActiveGenreButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-[63px] w-[210px] items-center justify-center rounded-[8px] border-[2px] border-black bg-[#E6F7FE] text-[24px] font-medium leading-none text-black"
		>
			Genres
		</button>
	);
}

function VenueCompletedGenreButton({
	genres,
	onClick,
}: {
	genres: string[];
	onClick: () => void;
}) {
	const visibleGenres = genres.slice(0, 2);
	const remainingGenreCount = genres.length - visibleGenres.length;

	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.details} w-[210px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Genres</span>
			<span className="absolute left-[12px] right-[8px] top-[31px] flex h-[22px] items-center gap-[5px] overflow-hidden">
				{visibleGenres.map((genre) => {
					const selectedOption = PROFILE_GENRE_OPTIONS.find(
						(option) => option.label === genre
					);
					const SelectedIcon = selectedOption?.Icon;

					return (
						<span key={genre} className={VENUE_COMPLETED_GENRE_PILL_CLASS}>
							{SelectedIcon && (
								<SelectedIcon aria-hidden="true" className="h-[13px] w-auto shrink-0" />
							)}
							<span className="min-w-0 truncate">{genre}</span>
						</span>
					);
				})}
				{remainingGenreCount > 0 && (
					<span className={VENUE_COMPLETED_GENRE_PILL_CLASS}>+{remainingGenreCount}</span>
				)}
			</span>
		</button>
	);
}

export function VenueGenrePicker({
	selectedGenres,
	onToggle,
	className = '',
}: {
	selectedGenres: string[];
	onToggle: (genre: string) => void;
	className?: string;
}) {
	const selectedGenreSet = new Set(selectedGenres.map((genre) => genre.toLowerCase()));

	return (
		<div
			className={`relative h-[139px] w-[386px] rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Genres
			</span>
			<div className="absolute left-[34px] right-[34px] top-[32px] flex flex-col gap-[9px]">
				{profileGenreOptionRows.map((row) => (
					<div
						key={row.map((genre) => genre.label).join('-')}
						className="flex justify-between"
					>
						{row.map((genre) => {
							const Icon = genre.Icon;
							const isSelected = selectedGenreSet.has(genre.label.toLowerCase());

							return (
								<button
									type="button"
									key={genre.label}
									onClick={() => onToggle(genre.label)}
									aria-pressed={isSelected}
									className={`flex h-[21.374px] appearance-none items-center justify-center gap-[3px] rounded-[7.491px] border-0 px-[4px] font-inter text-[14px] font-medium leading-[21.374px] text-black transition-colors ${
										isSelected ? 'bg-[#D6FFED]' : 'bg-white hover:bg-[#D6FFED]'
									}`}
									style={{ width: `${genre.width}px` }}
								>
									{Icon && <Icon aria-hidden="true" className="shrink-0" />}
									<span>{genre.label}</span>
								</button>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}

export function VenueSoundEditor({
	value,
	onSelect,
	className = '',
}: {
	value: string;
	onSelect: (value: string) => void;
	className?: string;
}) {
	return (
		<div
			className={`relative h-[71px] w-[387px] rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Sound
			</span>
			<div className="absolute left-1/2 top-[27px] flex -translate-x-1/2 gap-[12px]">
				{VENUE_SOUND_OPTIONS.map((option) => {
					const isSelected = value.trim().toLowerCase() === option.toLowerCase();

					return (
						<button
							key={option}
							type="button"
							onClick={() => onSelect(option)}
							aria-pressed={isSelected}
							className={`flex h-[22px] w-[143px] items-center justify-center rounded-[7px] border border-black text-[16px] font-medium leading-none text-black transition-colors ${
								isSelected ? 'bg-[#D6FFED]' : 'bg-white hover:bg-[#D6FFED]'
							}`}
						>
							{option}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function VenueCapacityEditor({
	value,
	onChange,
	inputRef,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	inputRef?: Ref<HTMLInputElement>;
	className?: string;
}) {
	const sliderValue = getCapacitySliderValue(value);
	const sliderMax = getCapacitySliderMax(sliderValue);
	const fillPercent =
		sliderMax === CAPACITY_SLIDER_MIN
			? 0
			: ((sliderValue - CAPACITY_SLIDER_MIN) / (sliderMax - CAPACITY_SLIDER_MIN)) * 100;

	return (
		<div
			className={`relative h-[139px] w-[386px] rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Capacity
			</span>
			<div className="absolute left-[18px] top-[35px] flex items-center gap-[8px]">
				<CapacityPersonIcon className="h-[27px] w-[11px] shrink-0 text-black" />
				<span className="font-inter text-[16px] font-medium leading-none text-black">
					{formatCapacityDisplay(value)}
				</span>
			</div>
			<input
				ref={inputRef}
				type="range"
				aria-label="Capacity"
				min={CAPACITY_SLIDER_MIN}
				max={sliderMax}
				step={CAPACITY_SLIDER_STEP}
				value={sliderValue}
				onChange={(event) => onChange(event.target.value)}
				style={{
					background: `linear-gradient(to right, #000 0%, #000 ${fillPercent}%, #D9D9D9 ${fillPercent}%, #D9D9D9 100%)`,
				}}
				className="absolute left-1/2 top-[84px] h-[9px] w-[320px] -translate-x-1/2 cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-progress]:h-[9px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-black [&::-moz-range-thumb]:h-[9px] [&::-moz-range-thumb]:w-[9px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-black [&::-moz-range-track]:h-[9px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-[9px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-[9px] [&::-webkit-slider-thumb]:w-[9px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black"
			/>
		</div>
	);
}

export function VenuePayRangeEditor({
	value,
	onChange,
	minInputRef,
	className = '',
}: {
	value: string;
	onChange: (value: string) => void;
	minInputRef?: Ref<HTMLInputElement>;
	className?: string;
}) {
	const sliderTrackRef = useRef<HTMLDivElement | null>(null);
	const activePayRangeHandleRef = useRef<'min' | 'max' | null>(null);
	const { payMin, payMax } = getPayRangeSliderValues(value);
	const sliderMax = getPayRangeSliderMax(payMax);
	const minValue = Math.min(Math.max(payMin, PAY_RANGE_SLIDER_MIN), sliderMax);
	const maxValue = Math.min(Math.max(payMax, minValue), sliderMax);
	const minPercent = getPayRangeSliderPercent(minValue, sliderMax);
	const maxPercent = getPayRangeSliderPercent(maxValue, sliderMax);
	const isSingleValue = minValue === maxValue;
	const sliderInputClassName =
		'pointer-events-none absolute inset-0 h-[22px] w-full appearance-none bg-transparent outline-none [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-track]:h-[22px] [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-[22px] [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent';

	const updatePayRange = (nextMin: number, nextMax: number) => {
		onChange(formatPayRange(Math.min(nextMin, nextMax), Math.max(nextMin, nextMax)));
	};
	const getPointerPayValue = (clientX: number) => {
		const track = sliderTrackRef.current;
		if (!track) return minValue;

		const rect = track.getBoundingClientRect();
		const rawPercent = (clientX - rect.left) / rect.width;
		const clampedPercent = Math.min(1, Math.max(0, rawPercent));
		const rawValue =
			PAY_RANGE_SLIDER_MIN + clampedPercent * (sliderMax - PAY_RANGE_SLIDER_MIN);

		return Math.round(rawValue / PAY_RANGE_SLIDER_STEP) * PAY_RANGE_SLIDER_STEP;
	};
	const getClosestPayRangeHandle = (nextValue: number) => {
		if (isSingleValue) return nextValue < minValue ? 'min' : 'max';
		return Math.abs(nextValue - minValue) <= Math.abs(nextValue - maxValue)
			? 'min'
			: 'max';
	};
	const updatePayRangeFromPointer = (clientX: number) => {
		const nextValue = getPointerPayValue(clientX);
		let activeHandle = activePayRangeHandleRef.current;

		if (isSingleValue && nextValue !== minValue) {
			activeHandle = nextValue < minValue ? 'min' : 'max';
			activePayRangeHandleRef.current = activeHandle;
		}
		if (!activeHandle) {
			activeHandle = getClosestPayRangeHandle(nextValue);
			activePayRangeHandleRef.current = activeHandle;
		}

		if (activeHandle === 'min') {
			updatePayRange(Math.min(nextValue, maxValue), maxValue);
			return;
		}

		updatePayRange(minValue, Math.max(nextValue, minValue));
	};
	const handleSliderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		activePayRangeHandleRef.current = getClosestPayRangeHandle(
			getPointerPayValue(event.clientX)
		);
		event.currentTarget.setPointerCapture(event.pointerId);
		updatePayRangeFromPointer(event.clientX);
	};
	const handleSliderPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!activePayRangeHandleRef.current) return;
		updatePayRangeFromPointer(event.clientX);
	};
	const handleSliderPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
		activePayRangeHandleRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div
			className={`relative h-[139px] w-[386px] rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Pay Range
			</span>
			<div className="absolute left-[18px] top-[37px] flex items-center gap-[7px]">
				<PayRangeMoneyIcon className="h-[20px] w-[20px] shrink-0 translate-y-[0.5px]" />
				<span className="font-inter text-[18px] font-medium leading-none text-black">
					{formatPayRange(minValue, maxValue)}
				</span>
			</div>

			<div
				ref={sliderTrackRef}
				onPointerDown={handleSliderPointerDown}
				onPointerMove={handleSliderPointerMove}
				onPointerUp={handleSliderPointerEnd}
				onPointerCancel={handleSliderPointerEnd}
				className="absolute left-1/2 top-[84px] h-[22px] w-[320px] -translate-x-1/2 cursor-grab touch-none active:cursor-grabbing"
			>
				<div className="absolute left-0 top-1/2 h-[9px] w-full -translate-y-1/2 rounded-full bg-[#D9D9D9]" />
				{isSingleValue ? (
					<div
						className="absolute top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F0E387]"
						style={{ left: `${minPercent}%` }}
					/>
				) : (
					<div
						className="absolute top-1/2 h-[9px] -translate-y-1/2 rounded-full bg-[#F0E387]"
						style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
					/>
				)}
				<input
					ref={minInputRef}
					type="range"
					aria-label="Minimum pay"
					min={PAY_RANGE_SLIDER_MIN}
					max={sliderMax}
					step={PAY_RANGE_SLIDER_STEP}
					value={minValue}
					onChange={(event) =>
						updatePayRange(Math.min(Number(event.target.value), maxValue), maxValue)
					}
					className={`${sliderInputClassName} ${
						minValue > sliderMax - PAY_RANGE_SLIDER_STEP ? 'z-30' : 'z-20'
					}`}
				/>
				<input
					type="range"
					aria-label="Maximum pay"
					min={PAY_RANGE_SLIDER_MIN}
					max={sliderMax}
					step={PAY_RANGE_SLIDER_STEP}
					value={maxValue}
					onChange={(event) =>
						updatePayRange(minValue, Math.max(Number(event.target.value), minValue))
					}
					className={`${sliderInputClassName} z-20`}
				/>
			</div>
		</div>
	);
}

function VenueTimePicker({
	label,
	value,
	disabled,
	onChange,
}: {
	label: string;
	value: string;
	disabled: boolean;
	onChange: (value: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const pickerRef = useRef<HTMLDivElement | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const selectedOption =
		VENUE_TIME_OPTIONS.find((option) => option.value === value) ?? VENUE_TIME_OPTIONS[0];

	useEffect(() => {
		if (!isOpen) return;

		const selectedIndex = VENUE_TIME_OPTIONS.findIndex(
			(option) => option.value === value
		);
		const scrollContainer = menuRef.current?.querySelector<HTMLElement>(
			'.venue-time-picker-scroll'
		);
		if (scrollContainer && selectedIndex >= 0) {
			scrollContainer.scrollTop = Math.max(0, selectedIndex * 22 - 42);
		}

		const handlePointerDown = (event: PointerEvent) => {
			const picker = pickerRef.current;
			if (picker && !picker.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setIsOpen(false);
		};

		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('keydown', handleKeyDown);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, value]);

	return (
		<div ref={pickerRef} className="relative w-[60px]">
			<button
				type="button"
				onClick={() => setIsOpen((current) => !current)}
				disabled={disabled}
				aria-label={label}
				aria-expanded={isOpen}
				className="flex h-[19px] w-[60px] items-center justify-center rounded-[5px] bg-white/55 text-[9.5px] font-semibold leading-none text-black outline-none transition-colors hover:bg-white/75 focus:bg-white/85 disabled:cursor-default"
			>
				{selectedOption.label}
			</button>

			{isOpen && !disabled && (
				<div
					ref={menuRef}
					className="absolute left-1/2 top-[22px] z-30 h-[112px] w-[86px] -translate-x-1/2 rounded-[7px] border border-black/60 bg-[#F3FCFF] p-[3px]"
				>
					<CustomScrollbar
						className="h-full w-full"
						contentClassName="venue-time-picker-scroll"
						thumbColor="#000000"
						thumbWidth={2}
						offsetRight={-7}
					>
						{VENUE_TIME_OPTIONS.map((option) => {
							const isSelected = option.value === value;

							return (
								<button
									key={option.value}
									type="button"
									onClick={() => {
										onChange(option.value);
										setIsOpen(false);
									}}
									className={`mb-[2px] flex h-[20px] w-full items-center justify-center rounded-[5px] text-[10px] font-semibold leading-none last:mb-0 ${
										isSelected
											? 'bg-[#9ED7FF] text-black'
											: 'text-black hover:bg-white/80'
									}`}
								>
									{option.label}
								</button>
							);
						})}
					</CustomScrollbar>
				</div>
			)}
		</div>
	);
}

export function VenueHoursEditor({
	hours,
	onToggleDay,
	onChangeDay,
	className = '',
}: {
	hours: VenueHoursFormState;
	onToggleDay: (day: VenueDayKey) => void;
	onChangeDay: (day: VenueDayKey, field: 'open' | 'close', value: string) => void;
	className?: string;
}) {
	const renderDay = (day: (typeof VENUE_HOURS_DAYS)[number]) => {
		const dayHours = hours[day.key];

		return (
			<div
				key={day.key}
				className="grid h-[20px] grid-cols-[42px_128px] items-center justify-between"
			>
				<button
					type="button"
					onClick={() => onToggleDay(day.key)}
					aria-pressed={!dayHours.isOpen}
					aria-label={`${day.label} ${dayHours.isOpen ? 'open' : 'closed'}`}
					className={`text-left font-inter text-[15.077px] font-medium not-italic leading-[17.252px] transition-colors ${
						dayHours.isOpen ? 'text-[#000]' : 'text-black/30'
					}`}
				>
					{day.label}
				</button>
				<div
					className={`flex min-w-0 items-center justify-end gap-[2px] transition-opacity ${
						dayHours.isOpen ? 'opacity-100' : 'opacity-0'
					}`}
				>
					<VenueTimePicker
						label={`${day.label} open time`}
						value={dayHours.open}
						disabled={!dayHours.isOpen}
						onChange={(value) => onChangeDay(day.key, 'open', value)}
					/>
					<span className="text-[11px] font-semibold leading-none text-black/60">-</span>
					<VenueTimePicker
						label={`${day.label} close time`}
						value={dayHours.close}
						disabled={!dayHours.isOpen}
						onChange={(value) => onChangeDay(day.key, 'close', value)}
					/>
				</div>
			</div>
		);
	};

	return (
		<div
			className={`relative h-[139px] w-[386px] rounded-[8px] border-[2px] border-black bg-[#E6F7FE] ${className}`}
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Hours
			</span>
			<div className="absolute left-[18px] right-[12px] top-[29px] grid grid-cols-[170px_170px] gap-x-[16px]">
				<div className="flex flex-col gap-[2px]">
					{VENUE_HOURS_DAYS.filter((day) => day.column === 'left').map(renderDay)}
				</div>
				<div className="flex flex-col gap-[2px]">
					{VENUE_HOURS_DAYS.filter((day) => day.column === 'right').map(renderDay)}
				</div>
			</div>
		</div>
	);
}

// Venue photos reuse the generic R2 media pipeline under a dedicated context. Since a
// Venue is 1:1 with its user, keying on `userId` already scopes photos to this venue.
const VENUE_PHOTO_LIMIT = 5;
// Five fixed slots; the white backing fades down the column (matches the Figma mock).
const VENUE_PHOTO_SLOT_OPACITIES = [0.6, 0.5, 0.4, 0.3, 0.2];

type VenuePhotoSlot =
	| { kind: 'photo'; asset: MediaAssetDto }
	| { kind: 'upload'; upload: UploadState }
	| { kind: 'add' }
	| { kind: 'empty' };

export function VenuePhotosPlaceholder({
	layout = 'sidebar',
	// Touch surfaces have no hover, so the mobile profile tab opts into an
	// always-visible delete button on each photo.
	alwaysShowDelete = false,
}: {
	layout?: 'sidebar' | 'grid';
	alwaysShowDelete?: boolean;
}) {
	const isGrid = layout === 'grid';
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { data: photos = [] } = useGetMedia('venue_photos');
	const { upload, activeUploads } = useMediaUpload('venue_photos');
	const deletePhoto = useDeleteMedia();

	// Ready photos fill from the top, then any in-flight uploads, then a single add
	// slot (until the limit), then faint placeholders pad out the fixed slot count.
	// In grid mode the first ready photo is rendered as the panel's hero instead,
	// but it still counts toward the upload limit.
	const readyPhotos = photos.filter((photo) => photo.status === 'ready');
	const slots: VenuePhotoSlot[] = [
		...(isGrid ? readyPhotos.slice(1) : readyPhotos).map((asset) => ({
			kind: 'photo' as const,
			asset,
		})),
		...activeUploads.map((uploadState) => ({
			kind: 'upload' as const,
			upload: uploadState,
		})),
	];
	if (readyPhotos.length + activeUploads.length < VENUE_PHOTO_LIMIT) {
		slots.push({ kind: 'add' });
	}
	const slotCount = isGrid ? 6 : VENUE_PHOTO_LIMIT;
	while (slots.length < slotCount) {
		slots.push({ kind: 'empty' });
	}

	const handleSelectFile = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		// Reset so picking the same file again still fires onChange.
		event.target.value = '';
		if (file) void upload(file);
	};

	return (
		<aside
			className={
				isGrid
					? 'w-full rounded-[8px] border border-black/20 bg-[#F1FAFF] px-[10px] pb-[10px] pt-[8px]'
					: 'h-[469px] w-[126px] rounded-[8px] border border-black/20 bg-[#F1FAFF] px-[10px] pt-[8px]'
			}
		>
			{isGrid ? (
				<span className="rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
					Photos
				</span>
			) : (
				<p className="text-[14px] leading-none text-[#8f8f8f]">Photos</p>
			)}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={handleSelectFile}
			/>
			<div
				className={
					isGrid
						? 'mt-[6px] flex flex-wrap justify-between gap-y-[13px]'
						: 'mt-[6px] flex flex-col items-center gap-[13px]'
				}
			>
				{slots.map((slot, index) => {
					const opacity = VENUE_PHOTO_SLOT_OPACITIES[index] ?? 0.2;

					if (slot.kind === 'photo') {
						return (
							<div
								key={`photo-${slot.asset.id}`}
								className="group relative h-[74px] w-[103px] overflow-hidden rounded-[10.451px] bg-white"
							>
								{slot.asset.url && (
									// eslint-disable-next-line @next/next/no-img-element -- short-lived presigned R2 URL
									<img
										src={slot.asset.url}
										alt=""
										className="h-full w-full object-cover"
									/>
								)}
								<button
									type="button"
									onClick={() => deletePhoto.mutate(slot.asset.id)}
									aria-label={`Remove ${slot.asset.filename}`}
									className={`absolute right-[4px] top-[4px] h-[18px] w-[18px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 ${
										alwaysShowDelete ? 'flex' : 'hidden group-hover:flex'
									}`}
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						);
					}

					if (slot.kind === 'upload') {
						return (
							<div
								key={`upload-${index}`}
								className="flex h-[74px] w-[103px] items-center justify-center rounded-[10.451px] bg-white"
							>
								<span className="text-[12px] font-medium text-[#777]">
									{Math.round(slot.upload.progress)}%
								</span>
							</div>
						);
					}

					if (slot.kind === 'add') {
						return (
							<button
								key="add"
								type="button"
								onClick={() => fileInputRef.current?.click()}
								aria-label="Add venue photo"
								className="relative flex h-[74px] w-[103px] items-center justify-center rounded-[10.451px] text-[34px] font-light leading-none text-[#777]"
							>
								<span
									aria-hidden="true"
									className="absolute inset-0 rounded-[10.451px] bg-white"
									style={{ opacity }}
								/>
								<span className="relative">+</span>
							</button>
						);
					}

					return (
						<div
							key={`empty-${index}`}
							className="h-[74px] w-[103px] rounded-[10.451px] bg-white"
							style={{ opacity }}
						/>
					);
				})}
			</div>
		</aside>
	);
}

// Full-width hero for the map view's Profile panel: the first ready venue photo
// (the same one the grid skips — both read the position-ordered media list).
// Renders nothing when the venue has no photos, so the panel content starts at
// the top of the box.
function VenueProfileHeroPhoto() {
	const { data: photos = [] } = useGetMedia('venue_photos');
	const deletePhoto = useDeleteMedia();

	const hero = photos.filter((photo) => photo.status === 'ready')[0];
	if (!hero) return null;

	return (
		<div className="group relative h-[217px] min-h-0 w-full shrink overflow-hidden rounded-[8px] border border-black bg-white">
			{hero.url && (
				// eslint-disable-next-line @next/next/no-img-element -- short-lived presigned R2 URL
				<img src={hero.url} alt="" className="h-full w-full object-cover" />
			)}
			<button
				type="button"
				onClick={() => deletePhoto.mutate(hero.id)}
				aria-label={`Remove ${hero.filename}`}
				className="absolute right-[4px] top-[4px] hidden h-[18px] w-[18px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 group-hover:flex"
			>
				<X className="h-3 w-3" />
			</button>
		</div>
	);
}

function VenueCompletedLocationButton({
	address,
	onClick,
}: {
	address: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`${VENUE_COMPLETED_FIELD_BUTTON_CLASS} ${VENUE_COMPLETED_ROW_TONE_CLASSES.location} w-[386px]`}
		>
			<span className={VENUE_COMPLETED_FIELD_LABEL_CLASS}>Location</span>
			<span className={VENUE_COMPLETED_FIELD_CONTENT_CLASS}>
				<ProfileAreaMarkerIcon
					aria-hidden="true"
					className="block h-[20px] w-[16px] shrink-0"
				/>
				<span className={VENUE_COMPLETED_FIELD_VALUE_CLASS}>{address}</span>
			</span>
		</button>
	);
}

type VenuePortalView = 'edit' | 'map';

// Single writer for the persistent map config on the venue portal. In the edit view
// it drives the decorative spinning globe behind the form; once the user hits Continue
// (view → 'map') it reveals the full interactive map, mirroring the dashboard's
// background → interactive transition.
function VenuePortalPersistentMap({
	view,
	onOwnedVenueAnchorChange,
}: {
	view: VenuePortalView;
	onOwnedVenueAnchorChange: SearchResultsMapProps['onOwnedVenueAnchorChange'];
}) {
	const setPersistentMapConfig = usePersistentMapSetter();
	const { data: venue } = useGetVenue({ enabled: view === 'map' });
	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
		regionCenter: globeWeatherRegionCenter,
	} = useGlobeWeatherMood();
	const globeNightLighting = useGlobeNightLighting();

	const mapConfig = useMemo<PersistentDashboardMapConfig>(() => {
		const sharedMapProps = {
			weatherMood: globeWeatherMood,
			weatherRegionCenter: globeWeatherRegionCenter,
			weatherTemperatureF: globeWeatherTemperatureF,
			nightLighting: globeNightLighting,
			contacts: [],
			selectedContacts: [],
			searchQuery: '',
			searchWhat: null,
			skipAutoFit: true,
			// Present in both view branches so the map's final null notification on
			// teardown is never dropped mid-transition.
			onOwnedVenueAnchorChange,
		};
		const ownedVenueLocation =
			venue?.latitude != null && venue.longitude != null
				? {
						lat: venue.latitude,
						lng: venue.longitude,
						name: venue.venueName,
					}
				: null;

		if (view === 'map') {
			return {
				isMapView: true,
				mapViewClip: IDLE_MAP_CLIP,
				mapViewFrameTransition: `${DASHBOARD_TO_INTERACTIVE_TRANSITION_MS}ms ${DASHBOARD_TO_INTERACTIVE_TRANSITION_CSS_EASING}`,
				mapViewFrameInsetPx: 0,
				mapViewFrameRadiusPx: 0,
				mapViewFrameBorderPx: 0,
				mapProps: {
					...sharedMapProps,
					presentation: 'interactive',
					autoSpin: false,
					searchEngaged: false,
					ownedVenueLocation,
					// Land the map-view reveal centered on the venue's home icon instead of
					// wherever the decorative globe happened to be spinning.
					interactiveEntryCamera: ownedVenueLocation
						? {
								center: { lat: ownedVenueLocation.lat, lng: ownedVenueLocation.lng },
								zoom: VENUE_MAP_ENTRY_ZOOM,
							}
						: null,
				},
			};
		}

		return {
			isMapView: false,
			mapViewClip: IDLE_MAP_CLIP,
			mapViewFrameTransition: IDLE_MAP_TRANSITION,
			mapViewFrameInsetPx: 0,
			mapViewFrameRadiusPx: 0,
			mapViewFrameBorderPx: 0,
			mapProps: {
				...sharedMapProps,
				presentation: 'background',
				autoSpin: true,
				searchEngaged: true,
			},
		};
	}, [
		view,
		venue?.latitude,
		venue?.longitude,
		venue?.venueName,
		globeNightLighting,
		globeWeatherMood,
		globeWeatherRegionCenter,
		globeWeatherTemperatureF,
		onOwnedVenueAnchorChange,
	]);

	// Push config on every change (like the dashboard) so the view toggle animates
	// smoothly; clearing on each change would briefly null the config and force the
	// map to unmount/remount.
	useLayoutEffect(() => {
		setPersistentMapConfig(mapConfig);
	}, [mapConfig, setPersistentMapConfig]);

	// Clear only when leaving the portal so other routes don't inherit venue config.
	useLayoutEffect(() => () => setPersistentMapConfig(null), [setPersistentMapConfig]);

	return null;
}

function PortalStatusCard({
	title,
	message,
	actionHref,
	actionLabel,
}: {
	title: string;
	message: string;
	actionHref?: string;
	actionLabel?: string;
}) {
	return (
		<div className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-4 py-10">
			<section className="w-full max-w-[440px] rounded-[22px] border border-black/15 bg-white/88 p-7 text-center shadow-[0_22px_70px_rgba(4,19,48,0.25)] backdrop-blur-xl">
				<h1 className="text-[26px] font-semibold tracking-[-0.03em] text-slate-950">
					{title}
				</h1>
				<p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
				{actionHref && actionLabel && (
					<a
						href={actionHref}
						className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-85"
					>
						{actionLabel}
					</a>
				)}
			</section>
		</div>
	);
}

// Mirrors the real venue card's chrome exactly (same outer wrapper, compact zoom,
// pill + section dimensions, "New Venue" header, gradient panel, faint photo slots,
// and the save-button/error spacers below). Because the shell is byte-for-byte the
// same as VenuePortalForm's, the box lands in the identical spot when the form mounts
// — only the field area, pill, avatar, and save button pulse as loading placeholders.
function VenuePortalSkeleton() {
	const fieldBarClass = 'h-[63px] rounded-[8px] bg-white/40';

	return (
		<div className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-auto px-4 py-10 sm:px-6">
			<div className="absolute right-4 top-3 z-20 pt-3 pr-4">
				<div className="h-7 w-7 animate-pulse rounded-full bg-black/10" />
			</div>

			<div className="venue-portal-compact flex shrink-0 flex-col items-center">
				<div className="mb-[23px] flex h-[41px] w-[210px] animate-pulse items-center gap-[14px] self-start rounded-[17px] bg-[rgba(254,254,254,0.74)] py-[5px] pl-[7px] pr-[18px]">
					<div className="h-[30px] w-[30px] shrink-0 rounded-full bg-black/10" />
					<div className="h-[16px] w-[120px] rounded-full bg-black/10" />
				</div>

				<section className="flex h-[637px] w-[583px] flex-col items-center rounded-[12px] bg-[rgba(255,255,255,0.65)]">
					<div className="mt-[13px] flex h-[28px] w-[570px] items-center rounded-[4px] border-[1.056px] border-[#111] bg-white px-[8px] text-[14px] font-semibold leading-none text-black">
						New Venue
					</div>

					<div className="relative mt-[7px] h-[570px] w-[570px] overflow-hidden rounded-[8px] border border-black bg-[linear-gradient(180deg,#CBEEFD_0%,#FFF_100%)]">
						<div className="absolute left-[15px] top-[16px] h-[64px] w-[386px] animate-pulse rounded-[8px] bg-white" />

						<div className="absolute left-[15px] top-[87px] flex items-start gap-[9px]">
							<div className="flex w-[386px] animate-pulse flex-col gap-[4px]">
								<div className={`${fieldBarClass} w-[386px]`} />
								<div className="grid grid-cols-[172px_210px] gap-x-[4px]">
									<div className={fieldBarClass} />
									<div className={fieldBarClass} />
								</div>
								<div className="grid grid-cols-[172px_210px] gap-x-[4px]">
									<div className={fieldBarClass} />
									<div className={fieldBarClass} />
								</div>
								<div className="grid grid-cols-[172px_210px] gap-x-[4px]">
									<div className={fieldBarClass} />
									<div className={fieldBarClass} />
								</div>
								<div className="h-[98px] w-[386px] rounded-[8px] bg-white/40" />
								<div className="h-[98px] w-[386px] rounded-[8px] bg-white/40" />
							</div>

							<aside className="h-[469px] w-[126px] rounded-[8px] border border-black/20 bg-[#F1FAFF] px-[10px] pt-[8px]">
								<p className="text-[14px] leading-none text-[#8f8f8f]">Photos</p>
								<div className="mt-[6px] flex flex-col items-center gap-[13px]">
									{VENUE_PHOTO_SLOT_OPACITIES.map((opacity, index) => (
										<div
											key={index}
											className="h-[74px] w-[103px] rounded-[10.451px] bg-white"
											style={{ opacity }}
										/>
									))}
								</div>
							</aside>
						</div>
					</div>
				</section>

				<div className="mt-4 h-[32px] w-[166px] animate-pulse rounded-[17px] border border-black/40 bg-[#9ED7FF]/60" />
				<div className="mt-2 min-h-[20px]" />
			</div>
		</div>
	);
}

function VenuePortalForm({
	onEnterMapView,
	variant = 'page',
}: {
	onEnterMapView?: () => void;
	variant?: 'page' | 'panel';
}) {
	const { user: clerkUser } = useUser();
	const { data: venue, isLoading: isLoadingVenue, isError: isVenueError } = useGetVenue();
	const { mutateAsync: upsertVenue, isPending: isSaving } = useUpsertVenue({
		suppressToasts: true,
	});
	const [form, setForm] = useState<VenueFormState>(EMPTY_FORM_STATE);
	const [hasHydratedForm, setHasHydratedForm] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [isVenueNameFocused, setIsVenueNameFocused] = useState(false);
	const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
	const [isBusinessTypePickerOpen, setIsBusinessTypePickerOpen] = useState(false);
	const [isHoursEditorOpen, setIsHoursEditorOpen] = useState(false);
	const [isCapacityEditorOpen, setIsCapacityEditorOpen] = useState(false);
	const [isGenrePickerOpen, setIsGenrePickerOpen] = useState(false);
	const [isPayRangeEditorOpen, setIsPayRangeEditorOpen] = useState(false);
	const [isSoundEditorOpen, setIsSoundEditorOpen] = useState(false);
	const [activeTextField, setActiveTextField] = useState<
		'description' | 'website' | null
	>(null);
	const [hasCompletedHours, setHasCompletedHours] = useState(false);
	const [locationCoordinates, setLocationCoordinates] = useState<AreaCoordinates | null>(
		null
	);
	const [locationParts, setLocationParts] = useState<{ city: string; state: string }>({
		city: '',
		state: '',
	});
	const locationSlotRef = useRef<HTMLDivElement | null>(null);
	const profileFieldsRef = useRef<HTMLDivElement | null>(null);
	const capacityInputRef = useRef<HTMLInputElement | null>(null);
	const payRangeMinInputRef = useRef<HTMLInputElement | null>(null);
	const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
	const websiteInputRef = useRef<HTMLInputElement | null>(null);
	// Serialized payload of the last save, so the debounced auto-save can skip writes
	// when nothing changed — including the freshly hydrated profile on load.
	const lastSavedPayloadRef = useRef<string | null>(null);
	const completedAddress = form.address.trim();
	const completedBusinessType = form.businessType.trim();
	const completedHoursSummary = formatOpenNightsSummary(getOpenNightsCount(form.hours));
	const completedCapacity = form.capacity.trim();
	const completedPayRange = form.payRange.trim();
	const completedSound = form.sound.trim();
	const completedDescription = form.description.trim();
	const completedWebsite = form.website.trim();
	const locationCoordinateLabels = locationCoordinates
		? {
				latitude: formatVenueCoordinate(locationCoordinates.lat),
				longitude: formatVenueCoordinate(locationCoordinates.lng),
			}
		: null;
	const isDescriptionEditorOpen = activeTextField === 'description';
	const isWebsiteEditorOpen = activeTextField === 'website';
	const selectedGenres = parseGenres(form.genres);
	const isInlineEditorOpen =
		isBusinessTypePickerOpen ||
		isHoursEditorOpen ||
		isCapacityEditorOpen ||
		isGenrePickerOpen ||
		isPayRangeEditorOpen ||
		isSoundEditorOpen;

	// Close the picker only on an outside click — dropping a pin or searching
	// should keep it open so the marker stays visible and adjustable.
	useEffect(() => {
		if (!isLocationPickerOpen) return;
		const handlePointerDown = (event: PointerEvent) => {
			const slot = locationSlotRef.current;
			if (slot && !slot.contains(event.target as Node)) {
				setIsLocationPickerOpen(false);
			}
		};
		document.addEventListener('pointerdown', handlePointerDown);
		return () => document.removeEventListener('pointerdown', handlePointerDown);
	}, [isLocationPickerOpen]);

	useEffect(() => {
		if (!isInlineEditorOpen && activeTextField === null) return;
		const handleClick = (event: MouseEvent) => {
			const profileFields = profileFieldsRef.current;
			const clickStartedInsideProfileFields = profileFields
				? event.composedPath().includes(profileFields)
				: false;
			if (
				profileFields &&
				!profileFields.contains(event.target as Node) &&
				!clickStartedInsideProfileFields
			) {
				setActiveTextField(null);
				setIsBusinessTypePickerOpen(false);
				setIsHoursEditorOpen(false);
				setIsCapacityEditorOpen(false);
				setIsGenrePickerOpen(false);
				setIsPayRangeEditorOpen(false);
				setIsSoundEditorOpen(false);
			}
		};

		document.addEventListener('click', handleClick);
		return () => document.removeEventListener('click', handleClick);
	}, [activeTextField, isInlineEditorOpen]);

	useEffect(() => {
		if (hasHydratedForm || isLoadingVenue) return;
		if (venue) {
			const hydratedForm: VenueFormState = {
				venueName: venue.venueName,
				businessType: venue.businessType ?? '',
				address: venue.address ?? '',
				hours: hydrateVenueHours(venue.hours),
				capacity: formatCapacity(venue.capacityMin, venue.capacityMax),
				genres: venue.genres.join(', '),
				payRange: venue.payRange ?? formatPayRange(venue.payMin, venue.payMax),
				sound: venue.sound ?? '',
				website: venue.website ?? '',
				description: venue.description ?? '',
			};
			const hydratedLocationParts = {
				city: venue.city ?? '',
				state: venue.state ?? '',
			};
			const hydratedCoordinates =
				venue.latitude != null && venue.longitude != null
					? { lat: venue.latitude, lng: venue.longitude }
					: null;

			setForm(hydratedForm);
			setLocationParts(hydratedLocationParts);
			setHasCompletedHours(venue.hours !== null);
			if (hydratedCoordinates) {
				setLocationCoordinates(hydratedCoordinates);
			}

			// Treat the just-loaded profile as the saved baseline so auto-save only
			// persists edits made after load, not the data we just read back.
			try {
				lastSavedPayloadRef.current = JSON.stringify(
					buildVenuePayload(hydratedForm, hydratedLocationParts, hydratedCoordinates)
				);
			} catch {
				lastSavedPayloadRef.current = null;
			}
		}
		setHasHydratedForm(true);
	}, [hasHydratedForm, isLoadingVenue, venue]);

	const saveVenue = useCallback(
		async (payload: PatchVenueData) => {
			// Pre-record so the debounced effect treats this payload as persisted and
			// won't fire a duplicate write while the request is in flight.
			lastSavedPayloadRef.current = JSON.stringify(payload);
			try {
				await upsertVenue(payload);
				setFormError(null);
				setSaved(true);
			} catch (error) {
				// Failed — drop the baseline so the next edit retries this change.
				lastSavedPayloadRef.current = null;
				setSaved(false);
				setFormError(error instanceof Error ? error.message : 'Failed to save venue.');
				throw error;
			}
		},
		[upsertVenue]
	);

	// A venue name is the minimum the server needs to create the row. null means there
	// is nothing valid to persist yet (no name, or malformed capacity/hours), so skip.
	const autoSavePayload = useMemo<PatchVenueData | null>(() => {
		if (form.venueName.trim().length === 0) return null;
		try {
			return buildVenuePayload(form, locationParts, locationCoordinates);
		} catch {
			return null;
		}
	}, [form, locationParts, locationCoordinates]);

	// Debounced auto-save: persist edits shortly after the user stops changing the form
	// so the profile saves continuously instead of only when Continue is pressed.
	useEffect(() => {
		if (!hasHydratedForm || !autoSavePayload) return;
		const serialized = JSON.stringify(autoSavePayload);
		if (serialized === lastSavedPayloadRef.current) return;

		const timer = window.setTimeout(() => {
			// Re-check at fire time: a manual Continue (or another save) may have already
			// persisted this exact payload while the timer was pending.
			if (serialized === lastSavedPayloadRef.current) return;
			void saveVenue(autoSavePayload).catch(() => undefined);
		}, AUTOSAVE_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [autoSavePayload, hasHydratedForm, saveVenue]);

	// The map-panel variant has no Continue button to flush a pending debounce, so a
	// final unmount save keeps edits made just before the panel closes. (The mutation
	// outlives the component, so the write still lands and invalidates the cache.)
	const flushAutoSaveRef = useRef<() => void>(() => undefined);
	flushAutoSaveRef.current = () => {
		if (!hasHydratedForm || !autoSavePayload) return;
		if (JSON.stringify(autoSavePayload) === lastSavedPayloadRef.current) return;
		void saveVenue(autoSavePayload).catch(() => undefined);
	};
	useEffect(() => () => flushAutoSaveRef.current(), []);

	const updateField = (field: Exclude<keyof VenueFormState, 'hours'>, value: string) => {
		setSaved(false);
		setFormError(null);
		setForm((current) => ({ ...current, [field]: value }));
	};
	const updateHoursDay = (day: VenueDayKey, field: 'open' | 'close', value: string) => {
		setSaved(false);
		setFormError(null);
		setHasCompletedHours(true);
		setForm((current) => ({
			...current,
			hours: {
				...current.hours,
				[day]: { ...current.hours[day], [field]: value },
			},
		}));
	};
	const toggleHoursDay = (day: VenueDayKey) => {
		setSaved(false);
		setFormError(null);
		setHasCompletedHours(true);
		setForm((current) => ({
			...current,
			hours: {
				...current.hours,
				[day]: { ...current.hours[day], isOpen: !current.hours[day].isOpen },
			},
		}));
	};
	const closeProfileEditors = () => {
		setIsLocationPickerOpen(false);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsCapacityEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(false);
		setActiveTextField(null);
	};
	const handleLocationFeatureSelect = (feature: ProfileAreaMapFeature) => {
		setSaved(false);
		setLocationParts(parseVenueLocationParts(feature));
	};
	const updateLocation = (value: string) => {
		updateField('address', value);
		setActiveTextField(null);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsCapacityEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(false);
	};
	const selectBusinessType = (value: string) => {
		updateField('businessType', value);
		setActiveTextField(null);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsCapacityEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(false);
	};
	const openHoursEditor = () => {
		setActiveTextField(null);
		setIsLocationPickerOpen(false);
		setIsBusinessTypePickerOpen(false);
		setIsCapacityEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(false);
		setIsHoursEditorOpen(true);
	};
	const openCapacityEditor = () => {
		setActiveTextField(null);
		setIsLocationPickerOpen(false);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(false);
		setIsCapacityEditorOpen(true);
		if (!form.capacity.trim()) {
			setSaved(false);
			setFormError(null);
			setForm((current) =>
				current.capacity.trim()
					? current
					: { ...current, capacity: String(DEFAULT_CAPACITY_VALUE) }
			);
		}
		requestAnimationFrame(() => capacityInputRef.current?.focus());
	};
	const openGenrePicker = () => {
		setActiveTextField(null);
		setIsLocationPickerOpen(false);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsCapacityEditorOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(false);
		setIsGenrePickerOpen(true);
	};
	const openPayRangeEditor = () => {
		setActiveTextField(null);
		setIsLocationPickerOpen(false);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsCapacityEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsSoundEditorOpen(false);
		setIsPayRangeEditorOpen(true);
		const { payMin, payMax } = parsePayRange(form.payRange);
		const nextPayRange =
			formatPayRange(payMin, payMax) ||
			formatPayRange(DEFAULT_PAY_RANGE_MIN_VALUE, DEFAULT_PAY_RANGE_MAX_VALUE);
		if (form.payRange !== nextPayRange) {
			setSaved(false);
			setFormError(null);
			setForm((current) => ({ ...current, payRange: nextPayRange }));
		}
		requestAnimationFrame(() => payRangeMinInputRef.current?.focus());
	};
	const openSoundEditor = () => {
		setActiveTextField(null);
		setIsLocationPickerOpen(false);
		setIsBusinessTypePickerOpen(false);
		setIsHoursEditorOpen(false);
		setIsCapacityEditorOpen(false);
		setIsGenrePickerOpen(false);
		setIsPayRangeEditorOpen(false);
		setIsSoundEditorOpen(true);
	};
	const openDescriptionEditor = () => {
		closeProfileEditors();
		setActiveTextField('description');
		requestAnimationFrame(() => descriptionInputRef.current?.focus());
	};
	const openWebsiteEditor = () => {
		closeProfileEditors();
		setActiveTextField('website');
		requestAnimationFrame(() => websiteInputRef.current?.focus());
	};
	const getActiveProfileField = (): VenueProfileFieldKey | null => {
		if (isLocationPickerOpen) return 'location';
		if (isBusinessTypePickerOpen) return 'businessType';
		if (isHoursEditorOpen) return 'hours';
		if (isCapacityEditorOpen) return 'capacity';
		if (isGenrePickerOpen) return 'genres';
		if (isPayRangeEditorOpen) return 'payRange';
		if (isSoundEditorOpen) return 'sound';
		if (isDescriptionEditorOpen) return 'description';
		if (isWebsiteEditorOpen) return 'website';
		return null;
	};
	const isProfileFieldComplete = (field: VenueProfileFieldKey) => {
		switch (field) {
			case 'location':
				return completedAddress.length > 0;
			case 'businessType':
				return completedBusinessType.length > 0;
			case 'hours':
				return hasCompletedHours;
			case 'capacity':
				return completedCapacity.length > 0;
			case 'genres':
				return selectedGenres.length > 0;
			case 'payRange':
				return completedPayRange.length > 0;
			case 'sound':
				return completedSound.length > 0;
			case 'description':
				return form.description.trim().length > 0;
			case 'website':
				return form.website.trim().length > 0;
		}

		return false;
	};
	const openProfileField = (field: VenueProfileFieldKey) => {
		switch (field) {
			case 'location':
				closeProfileEditors();
				setIsLocationPickerOpen(true);
				return;
			case 'businessType':
				closeProfileEditors();
				setIsBusinessTypePickerOpen(true);
				return;
			case 'hours':
				openHoursEditor();
				return;
			case 'capacity':
				openCapacityEditor();
				return;
			case 'genres':
				openGenrePicker();
				return;
			case 'payRange':
				openPayRangeEditor();
				return;
			case 'sound':
				openSoundEditor();
				return;
			case 'description':
				closeProfileEditors();
				setActiveTextField('description');
				requestAnimationFrame(() => descriptionInputRef.current?.focus());
				return;
			case 'website':
				openWebsiteEditor();
				return;
		}
	};
	const advanceFromProfileField = (field: VenueProfileFieldKey | null) => {
		if (!field) return;

		if (field === 'hours') {
			setSaved(false);
			setFormError(null);
			setHasCompletedHours(true);
		}

		const currentIndex = VENUE_PROFILE_FIELD_ORDER.indexOf(field);
		const nextField = VENUE_PROFILE_FIELD_ORDER.slice(currentIndex + 1).find(
			(profileField) => !isProfileFieldComplete(profileField)
		);

		if (!nextField) {
			closeProfileEditors();
			return;
		}

		openProfileField(nextField);
	};
	const handleDescriptionKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
		event.preventDefault();
		advanceFromProfileField('description');
	};
	const handleWebsiteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
		event.preventDefault();
		advanceFromProfileField('website');
	};

	useEffect(() => {
		const activeField = getActiveProfileField();
		if (!activeField) return;

		const handleDocumentKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Enter' || event.isComposing || event.defaultPrevented) return;

			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			if (target instanceof HTMLTextAreaElement) return;
			if (
				activeField === 'location' &&
				target instanceof HTMLInputElement &&
				target.closest('[data-venue-location-picker="true"]')
			) {
				return;
			}
			if (target instanceof HTMLButtonElement) {
				if (target.type === 'submit') return;
				window.setTimeout(() => advanceFromProfileField(activeField), 0);
				return;
			}

			event.preventDefault();
			advanceFromProfileField(activeField);
		};

		document.addEventListener('keydown', handleDocumentKeyDown);
		return () => document.removeEventListener('keydown', handleDocumentKeyDown);
	});
	const toggleGenre = (genre: string) => {
		setSaved(false);
		setFormError(null);
		setForm((current) => {
			const currentGenres = parseGenres(current.genres);
			const normalizedGenre = genre.toLowerCase();
			const hasGenre = currentGenres.some(
				(currentGenre) => currentGenre.toLowerCase() === normalizedGenre
			);
			const nextGenres = hasGenre
				? currentGenres.filter(
						(currentGenre) => currentGenre.toLowerCase() !== normalizedGenre
					)
				: [...currentGenres, genre];

			return { ...current, genres: nextGenres.join(', ') };
		});
	};
	const shouldHighlightLocation = isVenueNameFocused && form.venueName.trim().length > 0;
	const outlinedInitial =
		(
			clerkUser?.firstName?.trim()?.[0] ||
			clerkUser?.lastName?.trim()?.[0] ||
			clerkUser?.primaryEmailAddress?.emailAddress?.trim()?.[0] ||
			clerkUser?.username?.trim()?.[0] ||
			''
		)?.toUpperCase() ?? '';
	const venuePortalUserName = getVenuePortalDisplayName(clerkUser);
	const venuePortalInitial = getVenuePortalInitial(clerkUser);
	// Venue name and location are the only required fields; everything else is optional.
	const hasRequiredFields =
		form.venueName.trim().length > 0 && completedAddress.length > 0;
	const canContinue = hasRequiredFields && !isSaving && !isLoadingVenue;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!form.venueName.trim()) {
			setSaved(false);
			setFormError('Venue name is required to create the venue profile.');
			return;
		}

		// Auto-save has usually persisted the profile already, but the user can hit
		// Continue inside the debounce window — flush a final save before advancing.
		let payload: PatchVenueData;
		try {
			payload = buildVenuePayload(form, locationParts, locationCoordinates);
		} catch (error) {
			setSaved(false);
			setFormError(error instanceof Error ? error.message : 'Could not save venue.');
			return;
		}

		try {
			await saveVenue(payload);
			onEnterMapView?.();
		} catch {
			// saveVenue already surfaced the failure via the inline status message.
		}
	};

	// Shared between the page card and the panel layout, which size it differently.
	const renderVenueNameInput = (className: string) => (
		<input
			aria-label="Venue name"
			value={form.venueName}
			onChange={(event) => updateField('venueName', event.target.value)}
			onFocus={() => {
				setActiveTextField(null);
				setIsBusinessTypePickerOpen(false);
				setIsHoursEditorOpen(false);
				setIsCapacityEditorOpen(false);
				setIsGenrePickerOpen(false);
				setIsPayRangeEditorOpen(false);
				setIsSoundEditorOpen(false);
				setIsVenueNameFocused(true);
			}}
			onBlur={() => setIsVenueNameFocused(false)}
			placeholder="Enter Venue Name"
			autoComplete="organization"
			className={className}
		/>
	);

	// The fields column is shared verbatim between the standalone edit page and the
	// map view's Profile panel (variant="panel") — each renders it exactly once.
	const profileFieldsColumn = (
		<div ref={profileFieldsRef} className="w-[386px]">
			<div ref={locationSlotRef} data-venue-location-picker="true">
				{isLocationPickerOpen ? (
					<ProfileAreaMapBox
						area={form.address}
						onAreaUpdate={updateLocation}
						onAreaCommit={() => advanceFromProfileField('location')}
						initialCoordinates={locationCoordinates}
						onCoordinatesChange={setLocationCoordinates}
						className="mt-0 h-[174px] w-[386px] rounded-[8px] border-[2px] opacity-100"
						headerLabel="Enter Location"
						inputPlaceholder="Enter Location"
						initiallyEditing
						reverseGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
						forwardGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
						formatGeocodeFeature={formatVenueLocationFeature}
						onFeatureSelect={handleLocationFeatureSelect}
					/>
				) : completedAddress ? (
					<VenueCompletedLocationButton
						address={completedAddress}
						onClick={() => {
							setActiveTextField(null);
							setIsBusinessTypePickerOpen(false);
							setIsHoursEditorOpen(false);
							setIsCapacityEditorOpen(false);
							setIsGenrePickerOpen(false);
							setIsPayRangeEditorOpen(false);
							setIsSoundEditorOpen(false);
							setIsLocationPickerOpen(true);
						}}
					/>
				) : (
					<VenueTextField
						label="Location"
						value={form.address}
						onChange={(value) => updateField('address', value)}
						autoComplete="street-address"
						highlighted={shouldHighlightLocation}
						solidWhenEmpty={isInlineEditorOpen}
						readOnly
						onFocus={() => {
							setActiveTextField(null);
							setIsBusinessTypePickerOpen(false);
							setIsHoursEditorOpen(false);
							setIsCapacityEditorOpen(false);
							setIsGenrePickerOpen(false);
							setIsPayRangeEditorOpen(false);
							setIsSoundEditorOpen(false);
							setIsLocationPickerOpen(true);
						}}
						className="h-[63px] w-[386px] cursor-pointer"
					/>
				)}
			</div>

			{isBusinessTypePickerOpen && (
				<VenueBusinessTypePicker
					value={form.businessType}
					onChange={(value) => updateField('businessType', value)}
					onSelect={selectBusinessType}
					className="mt-[5px]"
				/>
			)}

			<div
				className={`${isBusinessTypePickerOpen ? 'mt-[4px]' : 'mt-[5px]'} grid grid-cols-[172px_210px] gap-x-[4px]`}
			>
				{!isBusinessTypePickerOpen && completedBusinessType ? (
					<VenueCompletedBusinessTypeButton
						businessType={completedBusinessType}
						onClick={() => {
							setActiveTextField(null);
							setIsLocationPickerOpen(false);
							setIsHoursEditorOpen(false);
							setIsCapacityEditorOpen(false);
							setIsGenrePickerOpen(false);
							setIsPayRangeEditorOpen(false);
							setIsSoundEditorOpen(false);
							setIsBusinessTypePickerOpen(true);
						}}
					/>
				) : (
					<VenueTextField
						label="Business Type"
						value={isBusinessTypePickerOpen ? '' : form.businessType}
						onChange={(value) => updateField('businessType', value)}
						onFocus={() => {
							setActiveTextField(null);
							setIsLocationPickerOpen(false);
							setIsHoursEditorOpen(false);
							setIsCapacityEditorOpen(false);
							setIsGenrePickerOpen(false);
							setIsPayRangeEditorOpen(false);
							setIsSoundEditorOpen(false);
							setIsBusinessTypePickerOpen(true);
						}}
						readOnly={isBusinessTypePickerOpen}
						activeEntry={isBusinessTypePickerOpen}
						solidWhenEmpty={isInlineEditorOpen}
						placeholderShowsPlus={!isBusinessTypePickerOpen}
						placeholderContentClassName={
							isBusinessTypePickerOpen
								? 'text-left leading-none'
								: LEFT_GRID_PLACEHOLDER_CLASS
						}
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className={`h-[63px] w-[172px] ${
							isBusinessTypePickerOpen ? 'cursor-pointer' : ''
						}`}
					/>
				)}
				{hasCompletedHours && !isHoursEditorOpen ? (
					<VenueCompletedHoursButton
						summary={completedHoursSummary}
						onClick={openHoursEditor}
					/>
				) : (
					<VenueTextField
						label="Hours"
						value=""
						onChange={() => undefined}
						onFocus={openHoursEditor}
						readOnly
						activeEntry={isHoursEditorOpen}
						solidWhenEmpty={isInlineEditorOpen}
						placeholderShowsPlus={!isHoursEditorOpen}
						placeholderContentClassName={
							isHoursEditorOpen ? 'text-left leading-none' : RIGHT_GRID_PLACEHOLDER_CLASS
						}
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[210px] cursor-pointer"
					/>
				)}
			</div>

			{isHoursEditorOpen && (
				<VenueHoursEditor
					hours={form.hours}
					onToggleDay={toggleHoursDay}
					onChangeDay={updateHoursDay}
					className="mt-[4px]"
				/>
			)}

			{isCapacityEditorOpen && (
				<VenueCapacityEditor
					value={form.capacity}
					onChange={(value) => updateField('capacity', value)}
					inputRef={capacityInputRef}
					className="mt-[4px]"
				/>
			)}

			<div className="mt-[4px] grid grid-cols-[172px_210px] gap-x-[4px]">
				{isCapacityEditorOpen ? (
					<VenueTextField
						label="Capacity"
						value=""
						onChange={() => undefined}
						onFocus={openCapacityEditor}
						readOnly
						activeEntry
						placeholderShowsPlus={false}
						placeholderContentClassName="text-left leading-none"
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[172px] cursor-pointer"
					/>
				) : completedCapacity ? (
					<VenueCompletedCapacityButton
						capacity={completedCapacity}
						onClick={openCapacityEditor}
					/>
				) : (
					<VenueTextField
						label="Capacity"
						value=""
						onChange={() => undefined}
						onFocus={openCapacityEditor}
						readOnly
						solidWhenEmpty={isInlineEditorOpen}
						placeholderContentClassName={LEFT_GRID_PLACEHOLDER_CLASS}
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[172px] cursor-pointer"
					/>
				)}
				{isGenrePickerOpen ? (
					<VenueActiveGenreButton onClick={openGenrePicker} />
				) : selectedGenres.length > 0 ? (
					<VenueCompletedGenreButton genres={selectedGenres} onClick={openGenrePicker} />
				) : (
					<VenueTextField
						label="Genres"
						value=""
						onChange={() => undefined}
						onFocus={openGenrePicker}
						readOnly
						solidWhenEmpty={isInlineEditorOpen}
						placeholderContentClassName={RIGHT_GRID_PLACEHOLDER_CLASS}
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[210px] cursor-pointer"
					/>
				)}
			</div>

			{isGenrePickerOpen && (
				<VenueGenrePicker
					selectedGenres={selectedGenres}
					onToggle={toggleGenre}
					className="mt-[4px]"
				/>
			)}

			<div className="mt-[4px] grid grid-cols-[172px_210px] gap-x-[4px]">
				{isPayRangeEditorOpen ? (
					<VenueTextField
						label="Pay Range"
						value=""
						onChange={() => undefined}
						onFocus={openPayRangeEditor}
						readOnly
						activeEntry
						placeholderShowsPlus={false}
						placeholderContentClassName="text-left leading-none"
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[172px] cursor-pointer"
					/>
				) : completedPayRange ? (
					<VenueCompletedPayRangeButton
						payRange={completedPayRange}
						onClick={openPayRangeEditor}
					/>
				) : (
					<VenueTextField
						label="Pay Range"
						value=""
						onChange={() => undefined}
						onFocus={openPayRangeEditor}
						readOnly
						solidWhenEmpty={isInlineEditorOpen}
						placeholderContentClassName={LEFT_GRID_PLACEHOLDER_CLASS}
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[172px] cursor-pointer"
					/>
				)}
				{isSoundEditorOpen ? (
					<VenueActiveSoundButton onClick={openSoundEditor} />
				) : completedSound ? (
					<VenueCompletedSoundButton sound={completedSound} onClick={openSoundEditor} />
				) : (
					<VenueTextField
						label="Sound"
						value=""
						onChange={() => undefined}
						onFocus={openSoundEditor}
						readOnly
						solidWhenEmpty={isInlineEditorOpen}
						placeholderContentClassName={RIGHT_GRID_PLACEHOLDER_CLASS}
						placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
						className="h-[63px] w-[210px] cursor-pointer"
					/>
				)}
			</div>

			{isPayRangeEditorOpen && (
				<VenuePayRangeEditor
					value={form.payRange}
					onChange={(value) => updateField('payRange', value)}
					minInputRef={payRangeMinInputRef}
					className="mt-[4px]"
				/>
			)}

			{isSoundEditorOpen && (
				<VenueSoundEditor
					value={form.sound}
					onSelect={(value) => updateField('sound', value)}
					className="mt-[4px]"
				/>
			)}

			{!isPayRangeEditorOpen && completedDescription && !isDescriptionEditorOpen ? (
				<VenueCompletedDescriptionButton
					description={completedDescription}
					onClick={openDescriptionEditor}
					className="mt-[4px]"
				/>
			) : !isPayRangeEditorOpen && isDescriptionEditorOpen ? (
				<VenueDescriptionField
					value={form.description}
					onChange={(value) => updateField('description', value)}
					onFocus={() => {
						setActiveTextField('description');
						setIsBusinessTypePickerOpen(false);
						setIsHoursEditorOpen(false);
						setIsCapacityEditorOpen(false);
						setIsGenrePickerOpen(false);
						setIsPayRangeEditorOpen(false);
						setIsSoundEditorOpen(false);
					}}
					onKeyDown={handleDescriptionKeyDown}
					textareaRef={descriptionInputRef}
					className="mt-[4px] h-[98px] w-[386px]"
				/>
			) : !isPayRangeEditorOpen ? (
				<VenueTextField
					label="Description"
					value=""
					onChange={() => undefined}
					onFocus={openDescriptionEditor}
					readOnly
					solidWhenEmpty={isInlineEditorOpen}
					className="mt-[4px] h-[98px] w-[386px] cursor-pointer"
				/>
			) : null}
			{!isLocationPickerOpen &&
				!isInlineEditorOpen &&
				(completedWebsite && !isWebsiteEditorOpen ? (
					<VenueCompletedWebsiteButton
						website={completedWebsite}
						onClick={openWebsiteEditor}
						className="mt-[4px]"
					/>
				) : isWebsiteEditorOpen ? (
					<VenueWebsiteField
						value={form.website}
						onChange={(value) => updateField('website', value)}
						onFocus={() => {
							setActiveTextField('website');
							setIsBusinessTypePickerOpen(false);
							setIsHoursEditorOpen(false);
							setIsCapacityEditorOpen(false);
							setIsGenrePickerOpen(false);
							setIsPayRangeEditorOpen(false);
							setIsSoundEditorOpen(false);
						}}
						onKeyDown={handleWebsiteKeyDown}
						inputRef={websiteInputRef}
						className="mt-[4px] h-[98px] w-[386px]"
					/>
				) : (
					<VenueTextField
						label="Website"
						value=""
						onChange={() => undefined}
						onFocus={openWebsiteEditor}
						readOnly
						className="mt-[4px] h-[98px] w-[386px] cursor-pointer"
					/>
				))}
		</div>
	);

	// Standalone edit page card, including the creation-flow "New Venue" header.
	const profileCard = (
		<section className="flex h-[637px] w-[583px] flex-col items-center rounded-[12px] bg-[rgba(255,255,255,0.65)]">
			<div className="mt-[13px] flex h-[28px] w-[570px] items-center rounded-[4px] border-[1.056px] border-[#111] bg-white px-[8px] text-[14px] font-semibold leading-none text-black">
				New Venue
			</div>

			<div className="relative mt-[7px] h-[570px] w-[570px] overflow-hidden rounded-[8px] border border-black bg-[linear-gradient(180deg,#CBEEFD_0%,#FFF_100%)]">
				<div className="absolute left-[15px] top-[16px]">
					<label className="block h-[64px] w-[386px] overflow-hidden rounded-[8px] bg-white">
						{renderVenueNameInput(
							'h-[46px] w-full bg-white px-[10px] text-[26px] font-medium leading-none text-black outline-none placeholder:text-[#828282]'
						)}
						<div className="flex h-[18px] items-center justify-end gap-[14px] rounded-b-[8px] bg-[#F67C7E] pr-[14px] font-inter text-[12.062px] font-semibold leading-[25.629px] text-black tabular-nums">
							{locationCoordinateLabels && (
								<>
									<span>{locationCoordinateLabels.latitude}</span>
									<span>{locationCoordinateLabels.longitude}</span>
								</>
							)}
						</div>
					</label>
				</div>

				<div className="absolute left-[15px] top-[87px] flex items-start gap-[9px]">
					{profileFieldsColumn}

					<VenuePhotosPlaceholder />
				</div>
			</div>
		</section>
	);

	if (variant === 'panel') {
		// Native-width layout for the map view's Profile panel: hero photo on top
		// (hidden when there are no photos), name card + fields on the left, photos
		// grid + bio on the right. No "New Venue" header here.
		return (
			<div className="flex h-full w-full flex-col gap-[8px] p-[8px]">
				<VenueProfileHeroPhoto />
				<div className="flex flex-1 items-stretch gap-[9px]">
					<div className="w-[386px] shrink-0">
						<div className="overflow-hidden rounded-[8px] bg-white">
							<div className="flex h-[46px] items-center pr-[10px]">
								{renderVenueNameInput(
									'h-full min-w-0 flex-1 bg-white px-[10px] text-[26px] font-medium leading-none text-black outline-none placeholder:text-[#828282]'
								)}
								<BadgeCheck
									aria-hidden="true"
									className="h-[24px] w-[24px] shrink-0 text-white"
									fill="#63C766"
									strokeWidth={1.5}
								/>
							</div>
							<div className="flex h-[18px] items-center justify-end gap-[14px] bg-white pr-[14px] font-inter text-[12.062px] font-semibold text-black tabular-nums">
								{locationCoordinateLabels && (
									<>
										<span>{locationCoordinateLabels.latitude}</span>
										<span>{locationCoordinateLabels.longitude}</span>
									</>
								)}
							</div>
							<div className="h-[14px] rounded-b-[8px] bg-[#F67C7E]" />
						</div>
						<div className="mt-[7px]">{profileFieldsColumn}</div>
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-[9px]">
						<VenuePhotosPlaceholder layout="grid" />
						<div className="flex-1 rounded-[8px] border border-black/20 bg-[#F1FAFF] px-[10px] pt-[8px]">
							<span className="rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
								Bio
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-auto px-4 py-10 sm:px-6">
			<div className="absolute right-4 top-3 z-20 pt-3 pr-4">
				<div className="group relative w-7 h-7 cursor-pointer">
					<OutlinedInitialAvatar
						initial={outlinedInitial}
						className="pointer-events-none absolute inset-0 w-7 h-7 group-hover:border-black group-hover:text-black group-focus-within:border-black group-focus-within:text-black group-active:border-black group-active:text-black"
					/>
					<div className="absolute inset-0 opacity-0">
						<UserButton
							appearance={{
								elements: {
									avatarBox: 'w-7 h-7',
									userButtonTrigger: 'w-7 h-7 p-0',
								},
							}}
						/>
					</div>
				</div>
			</div>

			<form
				className="venue-portal-compact flex shrink-0 flex-col items-center"
				onSubmit={handleSubmit}
			>
				<div className="mb-[23px] flex h-[41px] w-fit min-w-[170px] max-w-[calc(100vw-32px)] self-start items-center gap-[14px] rounded-[17px] bg-[rgba(254,254,254,0.74)] py-[5px] pl-[7px] pr-[18px]">
					<div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#63C766] text-[22px] font-bold leading-none text-white ring-[1.5px] ring-white">
						{venuePortalInitial}
					</div>
					<div className="min-w-0 truncate text-center font-inter text-[21.411px] font-bold leading-[28.548px] text-black">
						{venuePortalUserName}
					</div>
				</div>
				{profileCard}

				<button
					type="submit"
					disabled={!canContinue}
					className="relative mt-4 flex h-[32px] w-[166px] items-center justify-center rounded-[17px] border border-black bg-[#9ED7FF] font-inter text-[17.542px] font-bold not-italic leading-[normal] text-[#111] disabled:cursor-not-allowed disabled:opacity-60"
				>
					<span className="flex h-full items-center">Continue</span>
					<svg
						aria-hidden="true"
						className="absolute right-[27px] top-1/2 h-[13px] w-[8px] -translate-y-1/2"
						viewBox="0 0 8 13"
						fill="none"
					>
						<path d="M1 1L7 6.5L1 12" stroke="#111" strokeWidth="1.5" />
					</svg>
				</button>

				<div className="mt-2 min-h-[20px] text-center text-[12px] font-medium">
					{isVenueError && (
						<p className="text-amber-900">
							Unable to load an existing venue profile. You can still try saving.
						</p>
					)}
					{formError ? (
						<p className="text-red-700">{formError}</p>
					) : isSaving ? (
						<p className="text-slate-500">Saving…</p>
					) : saved ? (
						<p className="text-emerald-700">All changes saved</p>
					) : null}
				</div>
			</form>
		</div>
	);
}

function VenuePortalContent({
	view,
	onEnterMapView,
	onExitToEdit,
}: {
	view: VenuePortalView;
	onEnterMapView: () => void;
	onExitToEdit: () => void;
}) {
	const router = useRouter();
	const { isLoaded, isSignedIn, userId } = useAuth();
	const [venuePromotionState, setVenuePromotionState] = useState<
		'idle' | 'pending' | 'failed'
	>('idle');
	const {
		data: user,
		isPending: isPendingUser,
		isLoading: isLoadingUser,
		isError: isUserError,
		error: userError,
		refetch: refetchUser,
	} = useGetUser(userId);
	const shouldFetchSavedVenue = Boolean(
		isLoaded && isSignedIn && user?.accountType === AccountType.venue
	);
	const {
		data: savedVenue,
		isPending: isPendingSavedVenue,
		isLoading: isLoadingSavedVenue,
		isError: isSavedVenueError,
	} = useGetVenue({ enabled: shouldFetchSavedVenue });
	const hasResolvedInitialVenueViewRef = useRef(false);
	const hasResolvedOptimisticMapEntryRef = useRef(false);

	useEffect(() => {
		if (!isLoaded || isSignedIn) return;
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('redirectAfterSignIn', urls.venuePortal.index);
		}
		router.replace(urls.signIn.index);
	}, [isLoaded, isSignedIn, router]);

	useEffect(() => {
		if (!isLoaded || !isSignedIn || isPendingUser || isLoadingUser || !user) return;
		if (user.accountType === AccountType.venue) return;
		if (venuePromotionState !== 'idle') return;

		let cancelled = false;
		setVenuePromotionState('pending');

		void (async () => {
			try {
				const response = await _fetch(urls.api.venue.account.index, 'POST');
				if (!response.ok) {
					if (!cancelled) {
						setVenuePromotionState('failed');
					}
					return;
				}

				await refetchUser();
			} catch {
				if (!cancelled) {
					setVenuePromotionState('failed');
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		isLoaded,
		isLoadingUser,
		isPendingUser,
		isSignedIn,
		refetchUser,
		router,
		user,
		venuePromotionState,
	]);

	useEffect(() => {
		if (
			!shouldFetchSavedVenue ||
			hasResolvedInitialVenueViewRef.current ||
			isPendingSavedVenue ||
			isLoadingSavedVenue ||
			isSavedVenueError
		) {
			return;
		}

		hasResolvedInitialVenueViewRef.current = true;
		if (hasSavedVenueRequiredFields(savedVenue)) {
			onEnterMapView();
		}
	}, [
		isLoadingSavedVenue,
		isPendingSavedVenue,
		isSavedVenueError,
		onEnterMapView,
		savedVenue,
		shouldFetchSavedVenue,
	]);

	// Keep the localStorage hint current so the next load can skip the "New Venue"
	// skeleton. Re-runs on every venue resolution (the form auto-saves and invalidates
	// the ['venue'] query), so the hint tracks the profile as required fields fill in.
	useEffect(() => {
		if (
			!shouldFetchSavedVenue ||
			isPendingSavedVenue ||
			isLoadingSavedVenue ||
			isSavedVenueError ||
			!userId
		) {
			return;
		}
		writeVenueProfileComplete(userId, hasSavedVenueRequiredFields(savedVenue));
	}, [
		shouldFetchSavedVenue,
		isPendingSavedVenue,
		isLoadingSavedVenue,
		isSavedVenueError,
		savedVenue,
		userId,
	]);

	// The wrapper optimistically enters map view from the stored hint before any data
	// loads. This makes a single keep-or-exit decision once the real data resolves:
	// return to edit if this isn't a venue account with a completed profile (stale hint,
	// account switch, or profile gone incomplete). It is one-time on purpose — after the
	// initial entry is resolved it never fires again, so it can't yank a user out of the
	// map mid-edit if they later clear a required field from the Profile panel.
	useEffect(() => {
		if (hasResolvedOptimisticMapEntryRef.current) return;
		if (view !== 'map' || !isLoaded) return;
		if (isSignedIn === false) return; // the redirect effect handles signed-out
		if (isPendingUser || isLoadingUser || !user) return; // wait for the account
		if (user.accountType !== AccountType.venue) {
			hasResolvedOptimisticMapEntryRef.current = true;
			onExitToEdit();
			return;
		}
		if (isPendingSavedVenue || isLoadingSavedVenue) return; // wait for the venue
		hasResolvedOptimisticMapEntryRef.current = true;
		if (!hasSavedVenueRequiredFields(savedVenue)) {
			onExitToEdit();
		}
	}, [
		view,
		isLoaded,
		isSignedIn,
		isPendingUser,
		isLoadingUser,
		user,
		isPendingSavedVenue,
		isLoadingSavedVenue,
		savedVenue,
		onExitToEdit,
	]);

	// In map view the page form would sit invisibly under the interactive map; skip it
	// so it never mounts alongside the Profile panel's instance of the same form.
	if (view === 'map') {
		return null;
	}

	if (!isLoaded || isSignedIn === false) {
		return <VenuePortalSkeleton />;
	}

	if (isUserError) {
		return (
			<div className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-4 py-10">
				<section className="w-full max-w-[460px] rounded-[22px] border border-red-200 bg-white/90 p-7 text-center shadow-[0_22px_70px_rgba(4,19,48,0.25)] backdrop-blur-xl">
					<h1 className="text-[26px] font-semibold tracking-[-0.03em] text-slate-950">
						Could not finalize your account
					</h1>
					<p className="mt-3 text-sm leading-6 text-slate-600">
						{userError instanceof Error
							? userError.message
							: 'The user record could not be loaded.'}
					</p>
					<button
						type="button"
						onClick={() => void refetchUser()}
						className="mt-5 h-10 rounded-lg bg-black px-5 text-sm font-medium text-white transition-opacity hover:opacity-85"
					>
						Try again
					</button>
				</section>
			</div>
		);
	}

	if (isPendingUser || isLoadingUser || !user) {
		return <VenuePortalSkeleton />;
	}

	if (user.accountType !== AccountType.venue) {
		return (
			<PortalStatusCard
				title={
					venuePromotionState === 'failed'
						? 'Confirm venue signup'
						: 'Registering this as a venue account'
				}
				message={
					venuePromotionState === 'failed'
						? 'This account is currently standard. Continue through the venue signup entrypoint once and we will convert it before opening the portal.'
						: 'This signup came from the venue page. We are updating the account before opening the portal.'
				}
				actionHref={venuePromotionState === 'failed' ? urls.venueSignUp.index : undefined}
				actionLabel={venuePromotionState === 'failed' ? 'Continue as venue' : undefined}
			/>
		);
	}

	if (
		isPendingSavedVenue ||
		isLoadingSavedVenue ||
		(!hasResolvedInitialVenueViewRef.current && hasSavedVenueRequiredFields(savedVenue))
	) {
		return null;
	}

	return <VenuePortalForm onEnterMapView={onEnterMapView} />;
}

// Floating profile summary shown over the interactive map. Clicking it returns to the
// editing view. Positioned (absolute) within the map-view wrapper that scales the
// card + calendar cluster down and layers it above the revealed map.
function VenueProfileMapCard({ onEdit }: { onEdit: () => void }) {
	const { user: clerkUser } = useUser();
	const { data: venue } = useGetVenue();

	const name = getVenuePortalDisplayName(clerkUser);
	const initial = getVenuePortalInitial(clerkUser);
	const venueName = venue?.venueName?.trim() || 'Your Venue';
	const businessType = venue?.businessType?.trim() ?? '';
	const businessTypeIcon = BUSINESS_TYPE_OPTIONS.find(
		(option) => option.label.toLowerCase() === businessType.toLowerCase()
	)?.icon;
	const city = venue?.city?.trim() ?? '';
	const state = venue?.state?.trim() ?? '';
	const hasLocation = Boolean(city || state);

	return (
		<button
			type="button"
			onClick={onEdit}
			aria-label="Edit venue profile"
			className="absolute left-0 top-0 h-[83px] w-[656px] overflow-hidden rounded-[10px] border-[0.918px] border-[#BABABA] bg-white text-left"
		>
			<div className="absolute left-0 right-0 top-0 flex h-[42px] items-center gap-[14px] px-[16px]">
				<span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#63C766] text-center font-inter text-[21.411px] font-bold not-italic leading-[28.548px] text-white ring-[1.5px] ring-white">
					{initial}
				</span>
				<span className="min-w-0 truncate text-center font-inter text-[21.411px] font-bold leading-[28.548px] text-[#000] not-italic">
					{name}
				</span>
			</div>
			<div className="absolute bottom-[14px] left-0 right-0 flex h-[27px] items-center bg-[#AEE9F2] px-[16px]">
				<span className="min-w-0 flex-1 truncate font-inter text-[16px] font-bold leading-none text-black">
					{venueName}
				</span>
				{businessType && (
					<span className="flex h-full shrink-0 items-center gap-[8px] bg-[#BBE6FF] px-[14px] font-inter text-[14px] font-medium leading-none text-black">
						{businessTypeIcon}
						{businessType}
					</span>
				)}
				{hasLocation && (
					<span className="flex h-full shrink-0 items-center gap-[8px] bg-[#FBD6D7] px-[14px] font-inter text-[14px] font-medium leading-none text-black">
						<span className="flex items-center gap-[4px] rounded-[6px] bg-[#F7B6B8] px-[6px] py-[3px] font-semibold">
							<ProfileAreaMarkerIcon width={10} height={12} />
							{state || city}
						</span>
						{state && city ? city : null}
					</span>
				)}
			</div>
		</button>
	);
}

// Floating calendar 15px below the profile card. Reuses the dashboard calendar; opens on
// the current month with today highlighted. The dashboard calendar's native outer width is
// ~669.794px (7 × 94.542px cells + 8px padding); scale it down so it lines up flush with
// the 656px-wide card above. Positioned (absolute) 98px below the cluster top — 15px under
// the 83px card — within the map-view wrapper's cluster scale.
const VENUE_CALENDAR_SCALE = 656 / DASHBOARD_CALENDAR_NATIVE_WIDTH_PX;

function VenueCalendarMapPanel() {
	const now = new Date();
	return (
		<div
			className="absolute left-0 top-[98px] origin-top-left"
			style={{ transform: `scale(${VENUE_CALENDAR_SCALE})` }}
		>
			<DashboardCalendarPanel
				mockState={{ year: now.getFullYear(), monthIndex: now.getMonth() }}
			/>
		</div>
	);
}

// Placeholder box 15px below the calendar — future home of the venue's opportunities
// list, with an "add" (+) pill across the top. Matches the calendar's 656px rendered
// width (and the 656px profile card) so all three line up flush. The calendar is
// pinned at top-[98px] and its native 381px outer height (OUTER_HEIGHT_PX in
// DashboardCalendarPanel) renders at 381 × VENUE_CALENDAR_SCALE.
const VENUE_OPPORTUNITIES_TOP_PX = Math.round(98 + 381 * VENUE_CALENDAR_SCALE + 15);

// Hover-revealed soft-delete affordance for an event row: an X that swaps to a
// "Delete?" confirm pill on click. The confirm state only holds while the cursor
// stays on the pill (onMouseLeave resets it), so stray clicks can't delete.
function VenueOpportunityDeleteButton({
	eventId,
	onDeleted,
}: {
	eventId: number;
	onDeleted?: () => void;
}) {
	const [confirming, setConfirming] = useState(false);
	const deleteEvent = useDeleteVenueEvent({ onSuccess: onDeleted });
	return confirming ? (
		<button
			type="button"
			onClick={() => deleteEvent.mutate(eventId)}
			onMouseLeave={() => setConfirming(false)}
			disabled={deleteEvent.isPending}
			aria-label="Confirm delete event"
			className="flex h-[24px] shrink-0 items-center justify-center rounded-full bg-[#FF4D5E] px-[10px] font-inter text-[12px] font-medium leading-none text-white transition hover:bg-[#E5394A] disabled:opacity-60"
		>
			Delete?
		</button>
	) : (
		<button
			type="button"
			onClick={() => setConfirming(true)}
			aria-label="Delete event"
			className="flex shrink-0 items-center justify-center text-black transition hover:opacity-60"
		>
			<X className="h-[22px] w-[22px]" strokeWidth={2.5} />
		</button>
	);
}

// Single event entry row, shared between the inline Events box (642px rows) and
// the Events tool panel (748px rows) so the two lists stay visually identical.
// Pill metrics (104/164/53 × 22, 6.866px radius, 0.858px stroke) come from Figma.
function VenueOpportunityRow({
	opportunity,
	applicantCount,
	onOpen,
	widthPx,
}: {
	opportunity: VenueEvent;
	applicantCount: number;
	onOpen: (eventId: number) => void;
	widthPx: number;
}) {
	return (
		<button
			type="button"
			onClick={() => onOpen(opportunity.id)}
			aria-label={`View ${opportunity.name}`}
			className="flex h-[40px] shrink-0 items-center rounded-[12px] border-[2px] border-black bg-[#F7FFF0] px-[20px] font-inter text-black"
			style={{ width: `${widthPx}px` }}
		>
			<span className="min-w-0 flex-1 truncate text-left text-[16px] font-medium leading-none">
				{opportunity.name}
			</span>
			<span className="ml-[16px] flex h-[22px] w-[104px] shrink-0 items-center justify-center rounded-[6.866px] border-[0.858px] border-black bg-[#F4EEC6] text-[12px] font-medium leading-none">
				{formatApplicantCount(applicantCount)}
			</span>
			<span className="ml-[48px] flex h-[22px] w-[164px] shrink-0 items-center justify-between rounded-[6.866px] border-[0.858px] border-black bg-[#FF9797] px-[10px] text-[12px] font-medium leading-none">
				<span className="min-w-0 truncate">
					{formatVenueOpportunityDate(opportunity.whenLabel, opportunity.startsAt)}
				</span>
				<span className="shrink-0 whitespace-nowrap">
					{formatVenueOpportunityTimeRange(opportunity.startTime, opportunity.endTime)}
				</span>
			</span>
			{isVenueOpportunityLive(opportunity) && (
				<span className="ml-[48px] flex h-[22px] w-[53px] shrink-0 items-center justify-center gap-[4px] rounded-[6.866px] border-[0.858px] border-black bg-[#C5EDA0] text-[12px] font-medium leading-none">
					<span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-[#34A853]" />
					Live
				</span>
			)}
		</button>
	);
}

function VenueOpportunitiesMapPanel({
	opportunities,
	applicantCountByEventId,
	onAddOpportunity,
	onOpenOpportunity,
}: {
	opportunities: VenueEvent[];
	applicantCountByEventId: Map<number, number>;
	onAddOpportunity: () => void;
	onOpenOpportunity: (eventId: number) => void;
}) {
	// The hover-delete X sits just outside the box's right border, so it can't live
	// inside the clipping overflow-y-auto list. The hovered row's measured offsetTop
	// (same coordinate space as the root's absolute children) + the list's scrollTop
	// position one X on the unclipped panel root instead. The hover state persists
	// while the cursor travels from row to X; the root's mouse-leave clears it.
	const [hovered, setHovered] = useState<{ id: number; top: number } | null>(null);
	const [listScrollTop, setListScrollTop] = useState(0);
	const hoveredOpportunity = hovered
		? (opportunities.find((opportunity) => opportunity.id === hovered.id) ?? null)
		: null;
	// Hide the X once the hovered row scrolls out of the box (rows start ~25px in;
	// content ends at 413px in root-padding coordinates).
	const deleteRowTop = hovered ? hovered.top - listScrollTop : 0;
	return (
		// Faint white fill + 40% black border via channel alpha (not element opacity)
		// so the solid-bordered rows inside aren't dimmed along with the box.
		<div
			className="absolute left-0 flex h-[424px] w-[656px] flex-col rounded-[12px] border-[2px] border-black/40 bg-white/40 px-[5px] py-[7px]"
			style={{ top: `${VENUE_OPPORTUNITIES_TOP_PX}px` }}
			onMouseLeave={() => setHovered(null)}
		>
			<div className="mb-[6px] px-[4px] font-inter text-[12px] font-medium leading-none text-black">
				Events
			</div>
			<div
				className="flex min-h-0 flex-1 flex-col gap-[9px] overflow-y-auto"
				onScroll={(event) => setListScrollTop(event.currentTarget.scrollTop)}
			>
				{opportunities.map((opportunity) => (
					<div
						key={opportunity.id}
						className="shrink-0"
						onMouseEnter={(event) =>
							setHovered({ id: opportunity.id, top: event.currentTarget.offsetTop })
						}
					>
						<VenueOpportunityRow
							opportunity={opportunity}
							applicantCount={applicantCountByEventId.get(opportunity.id) ?? 0}
							onOpen={onOpenOpportunity}
							widthPx={642}
						/>
					</div>
				))}
				{/* Opens the create-event panel (same panel as the toolbar's Add tool). */}
				<button
					type="button"
					aria-label="Add opportunity"
					onClick={onAddOpportunity}
					className="flex h-[40px] w-[642px] shrink-0 cursor-pointer items-center justify-center rounded-[12px] border-[2px] border-black bg-[rgba(247,255,240,0.46)]"
				>
					<span className="text-[20px] font-medium leading-none text-black">+</span>
				</button>
			</div>
			{hoveredOpportunity && deleteRowTop >= 24 && deleteRowTop <= 373 && (
				<div
					className="absolute left-[659px] z-10 flex h-[40px] items-center"
					style={{ top: `${deleteRowTop}px` }}
				>
					<VenueOpportunityDeleteButton
						eventId={hoveredOpportunity.id}
						onDeleted={() => setHovered(null)}
					/>
				</div>
			)}
		</div>
	);
}

// Floating events panel for the toolbar's Events tab. Same chrome and footprint
// as the chat panel; the body reuses the inline Events box's entry rows (widened
// to 748px) on a light-green band, with a full-width divider after the last
// entry and the add pill below it on the gradient. Clicking a row switches the
// inner box to the event's detail view (applicant list); the selection lives in
// the parent so the inline Events box can open this panel straight onto a
// detail view, and resets when the tool is re-selected from the pills/tab bar.
function VenueEventsMapPanel({
	opportunities,
	applicantCountByEventId,
	selectedEventId,
	onSelectEvent,
	onAddOpportunity,
	onEditOpportunity,
}: {
	opportunities: VenueEvent[];
	applicantCountByEventId: Map<number, number>;
	selectedEventId: number | null;
	onSelectEvent: (eventId: number) => void;
	onAddOpportunity: () => void;
	onEditOpportunity: (eventId: number) => void;
}) {
	// The inner list box is overflow-hidden, so the hover-delete X can't sit next to
	// a row there. Instead the hovered row's measured offsetTop (relative to the
	// inset-0 scroller, shifted by the inner box's 20px top + 2px border into the
	// root's coordinate space) + the list's scrollTop position an X rendered on the
	// unclipped panel root, just right of the inner box. The hover state persists
	// while the cursor travels from row to X; the panel root's mouse-leave clears it.
	const [hovered, setHovered] = useState<{ id: number; top: number } | null>(null);
	const [listScrollTop, setListScrollTop] = useState(0);
	// Derived so a deleted event falls back to the list instead of a dead detail view.
	const selectedEvent =
		opportunities.find((opportunity) => opportunity.id === selectedEventId) ?? null;
	const hoveredOpportunity = hovered
		? (opportunities.find((opportunity) => opportunity.id === hovered.id) ?? null)
		: null;
	// Hide the X once the hovered row scrolls out of the inner box (22..815 content).
	const deleteRowTop = hovered ? hovered.top - listScrollTop : 0;
	return (
		<div
			data-venue-tool-ui="true"
			className="fixed left-[500px] top-[122px] z-[99] h-[829px] w-[781px] origin-top-left rounded-[12px] border-[2px] border-black/40 bg-white/40"
			style={{ transform: `scale(${VENUE_MAP_OVERLAY_SCALE})` }}
			onMouseLeave={() => setHovered(null)}
		>
			<div className="absolute left-[12px] top-[4px] font-inter text-[12.358px] font-medium leading-[16.477px] text-black">
				Events
			</div>
			{/* left-[6px] centers the 765px box in the outer's 777px content area
			    (781 minus the 2px borders). */}
			<div className="absolute left-[6px] top-[20px] h-[797px] w-[765px] overflow-hidden rounded-[12px] border-[2px] border-black">
				{selectedEvent ? (
					<VenueEventDetailView
						events={opportunities}
						selectedEventId={selectedEvent.id}
						applicantCountByEventId={applicantCountByEventId}
						onSelectEvent={onSelectEvent}
						onAddEvent={onAddOpportunity}
						onEditEvent={onEditOpportunity}
					/>
				) : (
					<>
						{/* Gradient carries the Figma layer's 0.9 opacity on its own background
						    layer (not the box) so the rows above stay fully solid. */}
						<div className="absolute inset-0 bg-[linear-gradient(180deg,#C1F7BB_0%,#60AE92_100%)] opacity-90" />
						<div
							className="absolute inset-0 flex flex-col overflow-y-auto"
							onScroll={(event) => setListScrollTop(event.currentTarget.scrollTop)}
						>
							<div className="flex shrink-0 flex-col items-center gap-[9px] bg-[#BAE3B6] py-[10px]">
								{opportunities.map((opportunity) => (
									<div
										key={opportunity.id}
										onMouseEnter={(event) =>
											setHovered({
												id: opportunity.id,
												top: 22 + event.currentTarget.offsetTop,
											})
										}
									>
										<VenueOpportunityRow
											opportunity={opportunity}
											applicantCount={applicantCountByEventId.get(opportunity.id) ?? 0}
											onOpen={onSelectEvent}
											widthPx={748}
										/>
									</div>
								))}
							</div>
							<div className="h-[2px] shrink-0 bg-black" />
							{/* Opens the create-event panel (same panel as the toolbar's Add tool). */}
							<button
								type="button"
								aria-label="Add opportunity"
								onClick={onAddOpportunity}
								className="mt-[10px] flex h-[40px] w-[748px] shrink-0 cursor-pointer items-center justify-center gap-[8px] self-center rounded-[12px] border-[2px] border-black bg-[rgba(247,255,240,0.46)]"
							>
								<span className="text-[20px] font-medium leading-none text-black">+</span>
								<span className="text-[16px] font-medium leading-none text-black">
									add
								</span>
							</button>
						</div>
					</>
				)}
			</div>
			{!selectedEvent &&
				hoveredOpportunity &&
				deleteRowTop >= 22 &&
				deleteRowTop <= 775 && (
					<div
						className="absolute left-[775px] z-10 flex h-[40px] items-center"
						style={{ top: `${deleteRowTop}px` }}
					>
						<VenueOpportunityDeleteButton
							eventId={hoveredOpportunity.id}
							onDeleted={() => setHovered(null)}
						/>
					</div>
				)}
		</div>
	);
}

// Floating profile panel for the toolbar's Profile tab. Same footprint as the
// chat panel (829×781 outer, 797×765 inner) so the boxes read as siblings; the
// body renders the form's panel variant at its native 765px width.
function VenueProfileMapPanel() {
	return (
		<div
			data-venue-tool-ui="true"
			className="fixed left-[500px] top-[122px] z-[99] h-[829px] w-[781px] origin-top-left rounded-[8px] border border-black bg-[linear-gradient(180deg,#ABF_0%,#EAF5FD_27.95%)]"
			style={{ transform: `scale(${VENUE_MAP_OVERLAY_SCALE})` }}
		>
			<div className="absolute left-[12px] top-[4px] font-inter text-[12.358px] font-medium leading-[16.477px] text-black">
				Profile
			</div>
			<div className="absolute left-[7px] top-[20px] h-[797px] w-[765px] overflow-hidden rounded-[8px] border border-black bg-[#CDE8FD]">
				<VenuePortalForm variant="panel" />
			</div>
		</div>
	);
}

// Dismissal geometry for the map tool panels. Movement at/over the drag
// threshold on either axis marks the gesture as a pan, not a click — the same
// 6px convention as SearchResultsMap's empty-map-click suppression. The buffer
// inflates every tool element's visual rect so near-miss clicks (including the
// ~8px seam between the tab bar and the panel below it) don't dismiss.
const VENUE_TOOL_DISMISS_DRAG_PX = 6;
const VENUE_TOOL_DISMISS_BUFFER_PX = 12;

// True when the pointer event lands inside the tool cluster: within a tagged
// element's DOM subtree, or within the buffered visual bounds of any visible
// tagged element (getBoundingClientRect already reflects the overlay scales).
function isWithinVenueToolUi(event: PointerEvent): boolean {
	const target = event.target;
	if (target instanceof Element && target.closest('[data-venue-tool-ui="true"]')) {
		return true;
	}
	for (const element of document.querySelectorAll('[data-venue-tool-ui="true"]')) {
		const rect = element.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) continue;
		if (
			event.clientX >= rect.left - VENUE_TOOL_DISMISS_BUFFER_PX &&
			event.clientX <= rect.right + VENUE_TOOL_DISMISS_BUFFER_PX &&
			event.clientY >= rect.top - VENUE_TOOL_DISMISS_BUFFER_PX &&
			event.clientY <= rect.bottom + VENUE_TOOL_DISMISS_BUFFER_PX
		) {
			return true;
		}
	}
	return false;
}

// Referentially-stable no-op for the mobile branch's VenuePortalContent props
// (they're effect dependencies inside it).
const NOOP = () => {};

export default function VenuePortalClient() {
	// null while detection resolves — desktop overlays and the mobile frame both
	// wait for a definite answer; only the persistent map renders that frame.
	const isMobile = useIsMobile();
	const [view, setView] = useState<VenuePortalView>('edit');
	// Returning venues with a completed profile (per the localStorage hint) land straight
	// on the map instead of flashing the "New Venue" creation skeleton. Runs pre-paint so
	// the first visible frame is already the map; VenuePortalContent self-corrects back to
	// edit if the resolved data shows this isn't a completed venue profile after all.
	useIsomorphicLayoutEffect(() => {
		if (readVenueProfileComplete()) {
			setView('map');
		}
	}, []);
	const [selectedVenueTool, setSelectedVenueTool] = useState<
		'add' | 'profile' | 'mail' | 'events' | null
	>(null);
	const [editingVenueEventId, setEditingVenueEventId] = useState<number | null>(null);
	// Detail-view selection for the Events tool panel, lifted here so the inline
	// Events box can open the panel directly onto an event's detail view.
	const [eventsToolSelectedEventId, setEventsToolSelectedEventId] = useState<
		number | null
	>(null);
	const isMailToolSelected = selectedVenueTool === 'mail';
	const { data: venueEvents } = useGetVenueEvents({
		enabled: view === 'map' || isMobile === true,
	});
	const opportunities = venueEvents ?? [];
	const editingVenueEvent =
		opportunities.find((opportunity) => opportunity.id === editingVenueEventId) ?? null;
	const openCreateOpportunity = () => {
		setEditingVenueEventId(null);
		setSelectedVenueTool('add');
	};
	const openEditOpportunity = (eventId: number) => {
		setEditingVenueEventId(eventId);
		setSelectedVenueTool('add');
	};
	const openOpportunityDetail = (eventId: number) => {
		setEventsToolSelectedEventId(eventId);
		setSelectedVenueTool('events');
	};
	// Deep link from the notifications panel into the chat panel. The nonce keys
	// VenueChatMapPanel so each card click remounts it onto the target thread even
	// when the chat tool is already open.
	const [chatDeepLink, setChatDeepLink] = useState<{
		nonce: number;
		conversationId: number;
		thread: ConversationThreadFilter;
	} | null>(null);
	const openChatThread = (conversationId: number, thread: ConversationThreadFilter) => {
		// Set directly: selectVenueTool early-returns when 'mail' is already active,
		// and its mail branch would clear the link we just set.
		setChatDeepLink({ nonce: Date.now(), conversationId, thread });
		setSelectedVenueTool('mail');
	};
	// Select-only on purpose: re-clicking (or double-clicking) the active tab must
	// not close the open panel or reset its state.
	const selectVenueTool = (tool: 'add' | 'profile' | 'mail' | 'events') => {
		if (selectedVenueTool === tool) return;
		if (tool === 'add') {
			setEditingVenueEventId(null);
		}
		// Opening Events from the pills/tab bar always starts at the list view.
		if (tool === 'events') {
			setEventsToolSelectedEventId(null);
		}
		// Opening Chat from the pills/tab bar always starts at the inbox list.
		if (tool === 'mail') {
			setChatDeepLink(null);
		}
		setSelectedVenueTool(tool);
	};

	// Clicking off the tool UI (onto the map around it) closes the open tool and
	// brings the pill stack back. Dismissal is a full click gesture, not a raw
	// pointerdown: the pointer must go down AND come up outside the tool cluster
	// without dragging in between — so panning the map never closes the panel,
	// and near-miss clicks beside the panels are forgiven (isWithinVenueToolUi).
	useEffect(() => {
		if (view !== 'map' || selectedVenueTool === null) return;
		let down: { pointerId: number; x: number; y: number } | null = null;
		const handlePointerDown = (event: PointerEvent) => {
			down = null;
			if (!event.isPrimary) return;
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			if (isWithinVenueToolUi(event)) return;
			down = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
		};
		const handlePointerUp = (event: PointerEvent) => {
			const start = down;
			down = null;
			if (!start || event.pointerId !== start.pointerId) return;
			if (
				Math.abs(event.clientX - start.x) >= VENUE_TOOL_DISMISS_DRAG_PX ||
				Math.abs(event.clientY - start.y) >= VENUE_TOOL_DISMISS_DRAG_PX
			) {
				return;
			}
			if (isWithinVenueToolUi(event)) return;
			setSelectedVenueTool(null);
		};
		const handlePointerCancel = () => {
			down = null;
		};
		document.addEventListener('pointerdown', handlePointerDown);
		document.addEventListener('pointerup', handlePointerUp);
		document.addEventListener('pointercancel', handlePointerCancel);
		return () => {
			document.removeEventListener('pointerdown', handlePointerDown);
			document.removeEventListener('pointerup', handlePointerUp);
			document.removeEventListener('pointercancel', handlePointerCancel);
		};
	}, [view, selectedVenueTool]);

	// The map reports the home icon's projected position at 60fps during pans; route
	// it through a mutable store so the pill stack can follow without re-rendering
	// the whole portal tree per frame.
	const [anchorStore] = useState(createVenueIconAnchorStore);
	const handleOwnedVenueAnchorChange = useCallback<
		NonNullable<SearchResultsMapProps['onOwnedVenueAnchorChange']>
	>((anchor) => anchorStore.set(anchor), [anchorStore]);

	// Unread badge on the mail tool icon: general-thread (Inbound) unread from the
	// conversations list plus per-application-thread (Replies) unread — the two
	// counts partition the messages, so the sum never double-counts.
	const { data: venueConversations } = useGetConversations({ enabled: true });
	const { data: venueApplications } = useGetVenueApplications({ enabled: true });
	const venueUnread =
		(venueConversations ?? []).reduce(
			(sum, conversation) => sum + conversation.unreadCount,
			0
		) +
		(venueApplications ?? []).reduce(
			(sum, application) => sum + (application.conversation?.unreadCount ?? 0),
			0
		);
	// Per-event applicant counts for the Events panel, derived from the inbox rows
	// already polled above (submitted-only, 30s cadence) — no extra API surface.
	const applicantCountByEventId = useMemo(() => {
		const counts = new Map<number, number>();
		for (const application of venueApplications ?? []) {
			counts.set(application.eventId, (counts.get(application.eventId) ?? 0) + 1);
		}
		return counts;
	}, [venueApplications]);
	return (
		<PersistentMapProvider>
			{/* The map mounts outside the isMobile branch so it's already up during the
			    null detection frame and never remounts when the branch resolves. */}
			<PersistentDashboardMap />
			<VenuePortalPersistentMap
				view={isMobile ? 'map' : view}
				onOwnedVenueAnchorChange={handleOwnedVenueAnchorChange}
			/>
			{/* Mobile: VenuePortalContent renders null at view="map" but still runs its
			    effects — signed-out redirect, standard→venue promotion, profile-complete
			    hint — so the mobile frame gets the gating for free. Incomplete profiles
			    land on the Profile tab (MobileVenuePortal) instead of the edit page. */}
			{isMobile === true && (
				<>
					<VenuePortalContent view="map" onEnterMapView={NOOP} onExitToEdit={NOOP} />
					<MobileVenuePortal
						opportunities={opportunities}
						applicantCountByEventId={applicantCountByEventId}
						unreadCount={venueUnread}
					/>
				</>
			)}
			{isMobile === false && (
				<VenuePortalContent
					view={view}
					onEnterMapView={() => setView('map')}
					onExitToEdit={() => setView('edit')}
				/>
			)}
			{/* Keep the profile-card + calendar cluster compact and slightly lower on the map. */}
			{isMobile === false && view === 'map' && (
				<div
					data-venue-tool-ui="true"
					className="fixed left-[24px] top-[56px] z-[100] origin-top-left"
					style={{
						transform: `scale(${VENUE_MAP_LEFT_CLUSTER_SCALE})`,
					}}
				>
					<VenueProfileMapCard
						onEdit={() => {
							// Close any open tool so returning to the map doesn't reopen the
							// Profile panel over the form the user just left.
							setSelectedVenueTool(null);
							setView('edit');
						}}
					/>
					<VenueCalendarMapPanel />
					<VenueOpportunitiesMapPanel
						opportunities={opportunities}
						applicantCountByEventId={applicantCountByEventId}
						onAddOpportunity={openCreateOpportunity}
						onOpenOpportunity={openOpportunityDetail}
					/>
				</div>
			)}
			{isMobile === false && view === 'map' && (
				<VenueNotificationsMapPanel
					conversations={venueConversations}
					applications={venueApplications}
					totalUnread={venueUnread}
					opportunities={opportunities}
					applicantCountByEventId={applicantCountByEventId}
					onOpenThread={openChatThread}
					onOpenEvent={openOpportunityDetail}
				/>
			)}
			{isMobile === false && view === 'map' && selectedVenueTool === 'add' && (
				<VenueCreateEventMapPanel event={editingVenueEvent} />
			)}
			{isMobile === false && view === 'map' && isMailToolSelected && (
				<VenueChatMapPanel
					key={chatDeepLink?.nonce ?? 'list'}
					initialThread={chatDeepLink}
				/>
			)}
			{isMobile === false && view === 'map' && selectedVenueTool === 'events' && (
				<VenueEventsMapPanel
					opportunities={opportunities}
					applicantCountByEventId={applicantCountByEventId}
					selectedEventId={eventsToolSelectedEventId}
					onSelectEvent={setEventsToolSelectedEventId}
					onAddOpportunity={openCreateOpportunity}
					onEditOpportunity={openEditOpportunity}
				/>
			)}
			{isMobile === false && view === 'map' && selectedVenueTool === 'profile' && (
				<VenueProfileMapPanel />
			)}
			{/* The pill stack and the tool tab bar swap: pills while nothing is open,
			    the horizontal bar (above the open panel) while a tool is selected. */}
			{isMobile === false && view === 'map' && selectedVenueTool !== null && (
				<VenueMapToolTabBar
					selectedTool={selectedVenueTool}
					onToolSelect={selectVenueTool}
					unreadCount={venueUnread}
				/>
			)}
			{isMobile === false && view === 'map' && selectedVenueTool === null && (
				<VenueMapActionPills
					anchorStore={anchorStore}
					selectedTool={selectedVenueTool}
					onToolSelect={selectVenueTool}
					unreadCount={venueUnread}
					clusterScale={VENUE_MAP_LEFT_CLUSTER_SCALE}
				/>
			)}
		</PersistentMapProvider>
	);
}
