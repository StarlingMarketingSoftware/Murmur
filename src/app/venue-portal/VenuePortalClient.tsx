'use client';

import {
	type FormEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CoffeeShopsIcon } from '@/components/atoms/_svg/CoffeeShopsIcon';
import { FestivalsIcon } from '@/components/atoms/_svg/FestivalsIcon';
import { MusicVenuesIcon } from '@/components/atoms/_svg/MusicVenuesIcon';
import { OutlinedInitialAvatar } from '@/components/atoms/OutlinedInitialAvatar/OutlinedInitialAvatar';
import { ProfileAreaMarkerIcon } from '@/components/atoms/_svg/ProfileAreaMarkerIcon';
import { RestaurantsIcon } from '@/components/atoms/_svg/RestaurantsIcon';
import { WeddingPlannersIcon } from '@/components/atoms/_svg/WeddingPlannersIcon';
import { WineBeerSpiritsIcon } from '@/components/atoms/_svg/WineBeerSpiritsIcon';
import { PersistentDashboardMap } from '@/components/molecules/PersistentDashboardMap';
import {
	ProfileAreaMapBox,
	type AreaCoordinates,
	type ProfileAreaMapFeature,
} from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import { AccountType } from '@/constants/prismaEnums';
import { urls } from '@/constants/urls';
import {
	PersistentMapProvider,
	type PersistentDashboardMapConfig,
	usePersistentMapSetter,
} from '@/contexts/PersistentMapContext';
import { useGlobeNightLighting } from '@/hooks/useGlobeNightLighting';
import { useGlobeWeatherMood } from '@/hooks/useGlobeWeatherMood';
import { useGetUser } from '@/hooks/queryHooks/useUsers';
import { useGetVenue, useUpsertVenue } from '@/hooks/queryHooks/useVenue';
import { _fetch } from '@/utils';
import type { PatchVenueData } from '@/app/api/venue/schema';

type VenueFormState = {
	venueName: string;
	businessType: string;
	address: string;
	capacity: string;
	genres: string;
	payRange: string;
	sound: string;
	website: string;
	description: string;
};

const EMPTY_FORM_STATE: VenueFormState = {
	venueName: '',
	businessType: '',
	address: '',
	capacity: '',
	genres: '',
	payRange: '',
	sound: '',
	website: '',
	description: '',
};

const IDLE_MAP_CLIP = 'inset(0px round 0px)';
const IDLE_MAP_TRANSITION = '0ms ease';
const LEFT_GRID_PLACEHOLDER_CLASS =
	'grid w-[126px] grid-cols-[18px_minmax(0,1fr)] items-center gap-[4px] text-left leading-none';
const RIGHT_GRID_PLACEHOLDER_CLASS =
	'grid w-[112px] grid-cols-[18px_minmax(0,1fr)] items-center gap-[4px] text-left leading-none';
const GRID_PLACEHOLDER_LABEL_CLASS = 'min-w-0';
const VENUE_LOCATION_GEOCODE_TYPES =
	'address,street,neighborhood,place,locality,district,region,postcode';

const BUSINESS_TYPE_OPTIONS = [
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

const formatVenueLocationFeature = (feature: ProfileAreaMapFeature) => {
	const properties = feature.properties;
	const context = properties?.context;
	const street = properties?.full_address?.split(',')[0]?.trim() || properties?.name || '';
	const city =
		context?.place?.name || context?.locality?.name || context?.district?.name || '';
	const region =
		context?.region?.region_code ||
		context?.region?.short_code?.split('-').pop()?.toUpperCase() ||
		context?.region?.name ||
		'';
	const postcode = context?.postcode?.name || '';
	const cityRegion = [city, [region, postcode].filter(Boolean).join(' ')]
		.filter(Boolean)
		.join(', ');
	const streetDuplicatesCity =
		street.length > 0 && city.length > 0 && street.toLowerCase() === city.toLowerCase();
	const formattedAddress = [streetDuplicatesCity ? '' : street, cityRegion]
		.filter(Boolean)
		.join(', ');

	return (
		(cityRegion ? formattedAddress : '') ||
		properties?.full_address ||
		properties?.place_formatted ||
		properties?.name ||
		''
	);
};

const trimToNull = (value: string): string | null => {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

const formatCapacity = (capacityMin: number | null, capacityMax: number | null) => {
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

const parseGenres = (value: string) => {
	return value
		.split(',')
		.map((genre) => genre.trim())
		.filter(Boolean);
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
	const placeholderToneClassName = activeEntry || highlighted ? 'text-black' : 'text-[#9f9f9f]';
	const borderClassName = activeEntry ? 'border border-black' : 'border-[2px] border-black';

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
					aria-label={label}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onFocus={onFocus}
					className={`${controlClassName} resize-none py-4 leading-6`}
				/>
			) : (
				<input
					aria-label={label}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					onFocus={onFocus}
					inputMode={inputMode}
					autoComplete={autoComplete}
					readOnly={readOnly}
					className={`${controlClassName} leading-none`}
				/>
			)}
		</label>
	);
}

function VenuePlaceholderButton({
	label,
	className = '',
	placeholderContentClassName,
	placeholderLabelClassName,
	solid = false,
}: {
	label: string;
	className?: string;
	placeholderContentClassName?: string;
	placeholderLabelClassName?: string;
	solid?: boolean;
}) {
	const opacityClassName = solid ? 'opacity-100' : 'opacity-20';

	return (
		<button
			type="button"
			className={`flex items-center justify-center rounded-[8px] border-[2px] border-black bg-white text-[22px] font-medium text-[#9f9f9f] ${opacityClassName} ${className}`}
		>
			<VenuePlaceholderContent
				label={label}
				contentClassName={placeholderContentClassName}
				labelClassName={placeholderLabelClassName}
			/>
		</button>
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

function VenueBusinessTypePicker({
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
							onClick={() => onSelect(option.label)}
							className={`flex h-[16px] items-center rounded-[6px] border border-black bg-white px-[4px] text-left text-[12px] font-medium leading-none text-black ${
								isSelected ? 'shadow-[inset_0_0_0_1px_#000]' : ''
							}`}
						>
							<span className="flex w-[17px] shrink-0 items-center justify-center">
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
				className="absolute bottom-[5px] left-[56px] h-[27px] w-[275px] bg-transparent px-[3px] text-[13px] font-medium leading-none text-black outline-none placeholder:text-[#9f9f9f]"
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
			className="relative block h-[63px] w-[172px] overflow-hidden rounded-[8px] border-[2px] border-white bg-[#B3E3FF] text-left opacity-90"
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Business Type
			</span>
			<span className="absolute left-[28px] right-[8px] top-[32px] flex items-center gap-[6px]">
				{selectedOption && (
					<span className="flex w-[18px] shrink-0 items-center justify-center">
						{selectedOption.icon}
					</span>
				)}
				<span className="min-w-0 truncate text-[16px] font-medium leading-none text-black">
					{businessType}
				</span>
			</span>
		</button>
	);
}

function VenuePhotosPlaceholder() {
	return (
		<aside className="h-[469px] w-[126px] rounded-[8px] border border-black bg-[#F1FAFF] px-[12px] pb-[99px] opacity-20">
			<p className="text-[14px] leading-none text-[#8f8f8f]">Photos</p>
			<div className="mt-[14px] flex flex-col items-center gap-[13px]">
				<div className="h-[70px] w-[86px] rounded-[10px] bg-white/55" />
				<div className="h-[70px] w-[86px] rounded-[10px] bg-white/55" />
				<div className="h-[70px] w-[86px] rounded-[10px] bg-white/55" />
				<button
					type="button"
					aria-label="Add venue photo"
					className="mt-[2px] flex h-[75px] w-[86px] items-center justify-center rounded-[10px] bg-white/55 text-[34px] font-light leading-none text-[#777]"
				>
					+
				</button>
			</div>
		</aside>
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
			className="relative block h-[63px] w-[386px] overflow-hidden rounded-[8px] border-[2px] border-white bg-[#B3E3FF] text-left opacity-90"
		>
			<span className="absolute left-[8px] top-[7px] rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				Location
			</span>
			<span className="absolute left-[22px] right-[10px] top-[30px] flex items-center gap-[7px]">
				<ProfileAreaMarkerIcon
					aria-hidden="true"
					className="block h-[22px] w-[18px] shrink-0"
				/>
				<span className="min-w-0 truncate text-[15px] font-medium leading-[20px] text-black">
					{address}
				</span>
			</span>
		</button>
	);
}

function VenuePortalBackgroundMap() {
	const setPersistentMapConfig = usePersistentMapSetter();
	const {
		mood: globeWeatherMood,
		temperatureF: globeWeatherTemperatureF,
		regionCenter: globeWeatherRegionCenter,
	} = useGlobeWeatherMood();
	const globeNightLighting = useGlobeNightLighting();

	const mapConfig = useMemo<PersistentDashboardMapConfig>(
		() => ({
			isMapView: false,
			mapViewClip: IDLE_MAP_CLIP,
			mapViewFrameTransition: IDLE_MAP_TRANSITION,
			mapViewFrameInsetPx: 0,
			mapViewFrameRadiusPx: 0,
			mapViewFrameBorderPx: 0,
			mapProps: {
				weatherMood: globeWeatherMood,
				weatherRegionCenter: globeWeatherRegionCenter,
				weatherTemperatureF: globeWeatherTemperatureF,
				nightLighting: globeNightLighting,
				presentation: 'background',
				autoSpin: true,
				contacts: [],
				selectedContacts: [],
				searchQuery: '',
				searchWhat: null,
				searchEngaged: true,
				skipAutoFit: true,
			},
		}),
		[
			globeNightLighting,
			globeWeatherMood,
			globeWeatherRegionCenter,
			globeWeatherTemperatureF,
		]
	);

	useLayoutEffect(() => {
		setPersistentMapConfig(mapConfig);
		return () => setPersistentMapConfig(null);
	}, [mapConfig, setPersistentMapConfig]);

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

function VenuePortalForm() {
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
	const [locationCoordinates, setLocationCoordinates] =
		useState<AreaCoordinates | null>(null);
	const locationSlotRef = useRef<HTMLDivElement | null>(null);
	const completedAddress = form.address.trim();
	const completedBusinessType = form.businessType.trim();
	const portalCardHeightClassName = isBusinessTypePickerOpen ? 'h-[653px]' : 'h-[637px]';
	const portalPanelHeightClassName = isBusinessTypePickerOpen ? 'h-[586px]' : 'h-[570px]';

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
		if (hasHydratedForm || isLoadingVenue) return;
		if (venue) {
			setForm({
				venueName: venue.venueName,
				businessType: venue.businessType ?? '',
				address: venue.address ?? '',
				capacity: formatCapacity(venue.capacityMin, venue.capacityMax),
				genres: venue.genres.join(', '),
				payRange: venue.payRange ?? '',
				sound: venue.sound ?? '',
				website: venue.website ?? '',
				description: venue.description ?? '',
			});
			if (venue.latitude != null && venue.longitude != null) {
				setLocationCoordinates({ lat: venue.latitude, lng: venue.longitude });
			}
		}
		setHasHydratedForm(true);
	}, [hasHydratedForm, isLoadingVenue, venue]);

	const updateField = (field: keyof VenueFormState, value: string) => {
		setSaved(false);
		setFormError(null);
		setForm((current) => ({ ...current, [field]: value }));
	};
	const updateLocation = (value: string) => {
		updateField('address', value);
		setIsBusinessTypePickerOpen(false);
	};
	const selectBusinessType = (value: string) => {
		updateField('businessType', value);
		setIsBusinessTypePickerOpen(false);
	};
	const shouldHighlightLocation =
		isVenueNameFocused && form.venueName.trim().length > 0;
	const outlinedInitial =
		(clerkUser?.firstName?.trim()?.[0] ||
			clerkUser?.lastName?.trim()?.[0] ||
			clerkUser?.primaryEmailAddress?.emailAddress?.trim()?.[0] ||
			clerkUser?.username?.trim()?.[0] ||
			'')?.toUpperCase() ?? '';

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const venueName = form.venueName.trim();
		if (!venueName) {
			setSaved(false);
			setFormError('Venue name is required to create the venue profile.');
			return;
		}

		let capacityValues: ReturnType<typeof parseCapacity>;
		try {
			capacityValues = parseCapacity(form.capacity);
		} catch (error) {
			setSaved(false);
			setFormError(error instanceof Error ? error.message : 'Capacity is invalid.');
			return;
		}

		const payload: PatchVenueData = {
			venueName,
			businessType: trimToNull(form.businessType),
			address: trimToNull(form.address),
			latitude: locationCoordinates?.lat ?? null,
			longitude: locationCoordinates?.lng ?? null,
			capacityMin: capacityValues.capacityMin,
			capacityMax: capacityValues.capacityMax,
			genres: parseGenres(form.genres),
			payRange: trimToNull(form.payRange),
			sound: trimToNull(form.sound),
			website: trimToNull(form.website),
			description: trimToNull(form.description),
		};

		try {
			await upsertVenue(payload);
			setFormError(null);
			setSaved(true);
		} catch (error) {
			setSaved(false);
			setFormError(error instanceof Error ? error.message : 'Failed to save venue.');
		}
	};

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

			<form className="flex shrink-0 flex-col items-center" onSubmit={handleSubmit}>
				<section
					className={`flex ${portalCardHeightClassName} w-[583px] flex-col items-center rounded-[12px] bg-[rgba(255,255,255,0.65)]`}
				>
					<div className="mt-[13px] flex h-[28px] w-[570px] items-center rounded-[4px] border-[1.056px] border-[#111] bg-white px-[8px] text-[14px] font-semibold leading-none text-black">
						New Venue
					</div>

					<div
						className={`relative mt-[7px] ${portalPanelHeightClassName} w-[570px] overflow-hidden rounded-[8px] border border-black bg-[linear-gradient(180deg,#CBEEFD_0%,#FFF_100%)]`}
					>
						<div className="absolute left-[15px] top-[16px]">
							<label className="block h-[64px] w-[386px] overflow-hidden rounded-[8px] bg-white">
								<input
									aria-label="Venue name"
									value={form.venueName}
									onChange={(event) => updateField('venueName', event.target.value)}
									onFocus={() => {
										setIsBusinessTypePickerOpen(false);
										setIsVenueNameFocused(true);
									}}
									onBlur={() => setIsVenueNameFocused(false)}
									placeholder="Enter Venue Name"
									autoComplete="organization"
									className="h-[46px] w-full bg-white px-[10px] text-[28px] font-medium leading-none text-black outline-none placeholder:text-[#828282]"
								/>
								<div className="h-[18px] rounded-b-[8px] bg-[#F67C7E]" />
							</label>
						</div>

						<div className="absolute left-[15px] top-[87px] flex items-start gap-[9px]">
							<div className="w-[386px]">
								<div ref={locationSlotRef}>
									{isLocationPickerOpen ? (
										<ProfileAreaMapBox
											area={form.address}
											onAreaUpdate={updateLocation}
											initialCoordinates={locationCoordinates}
											onCoordinatesChange={setLocationCoordinates}
											className="mt-0 h-[174px] w-[386px] rounded-[8px] border-[2px] opacity-100"
											headerLabel="Enter Location"
											inputPlaceholder="Enter Location"
											initiallyEditing
											reverseGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
											forwardGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
											formatGeocodeFeature={formatVenueLocationFeature}
										/>
									) : completedAddress ? (
										<VenueCompletedLocationButton
											address={completedAddress}
											onClick={() => {
												setIsBusinessTypePickerOpen(false);
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
											solidWhenEmpty={isBusinessTypePickerOpen}
											readOnly
											onFocus={() => {
												setIsBusinessTypePickerOpen(false);
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
									className={`${isBusinessTypePickerOpen ? 'mt-[4px]' : 'mt-[5px]'} grid grid-cols-[172px_210px] gap-x-[4px] gap-y-[4px]`}
								>
									{!isBusinessTypePickerOpen && completedBusinessType ? (
										<VenueCompletedBusinessTypeButton
											businessType={completedBusinessType}
											onClick={() => {
												setIsLocationPickerOpen(false);
												setIsBusinessTypePickerOpen(true);
											}}
										/>
									) : (
										<VenueTextField
											label="Business Type"
											value={isBusinessTypePickerOpen ? '' : form.businessType}
											onChange={(value) => updateField('businessType', value)}
											onFocus={() => {
												setIsLocationPickerOpen(false);
												setIsBusinessTypePickerOpen(true);
											}}
											readOnly={isBusinessTypePickerOpen}
											activeEntry={isBusinessTypePickerOpen}
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
									<VenuePlaceholderButton
										label="Hours"
										placeholderContentClassName={RIGHT_GRID_PLACEHOLDER_CLASS}
										placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
										solid={isBusinessTypePickerOpen}
										className="h-[63px] w-[210px]"
									/>
									<VenueTextField
										label="Capacity"
										value={form.capacity}
										onChange={(value) => updateField('capacity', value)}
										onFocus={() => setIsBusinessTypePickerOpen(false)}
										inputMode="numeric"
										solidWhenEmpty={isBusinessTypePickerOpen}
										placeholderContentClassName={LEFT_GRID_PLACEHOLDER_CLASS}
										placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
										className="h-[63px] w-[172px]"
									/>
									<VenueTextField
										label="Genres"
										value={form.genres}
										onChange={(value) => updateField('genres', value)}
										onFocus={() => setIsBusinessTypePickerOpen(false)}
										solidWhenEmpty={isBusinessTypePickerOpen}
										placeholderContentClassName={RIGHT_GRID_PLACEHOLDER_CLASS}
										placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
										className="h-[63px] w-[210px]"
									/>
									<VenueTextField
										label="Pay Range"
										value={form.payRange}
										onChange={(value) => updateField('payRange', value)}
										onFocus={() => setIsBusinessTypePickerOpen(false)}
										solidWhenEmpty={isBusinessTypePickerOpen}
										placeholderContentClassName={LEFT_GRID_PLACEHOLDER_CLASS}
										placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
										className="h-[63px] w-[172px]"
									/>
									<VenueTextField
										label="Sound"
										value={form.sound}
										onChange={(value) => updateField('sound', value)}
										onFocus={() => setIsBusinessTypePickerOpen(false)}
										solidWhenEmpty={isBusinessTypePickerOpen}
										placeholderContentClassName={RIGHT_GRID_PLACEHOLDER_CLASS}
										placeholderLabelClassName={GRID_PLACEHOLDER_LABEL_CLASS}
										className="h-[63px] w-[210px]"
									/>
								</div>

								<VenueTextField
									label="Description"
									value={form.description}
									onChange={(value) => updateField('description', value)}
									onFocus={() => setIsBusinessTypePickerOpen(false)}
									solidWhenEmpty={isBusinessTypePickerOpen}
									multiline
									className="mt-[4px] h-[98px] w-[386px]"
								/>
								{!isLocationPickerOpen && !isBusinessTypePickerOpen && (
									<VenueTextField
										label="Website"
										value={form.website}
										onChange={(value) => updateField('website', value)}
										onFocus={() => setIsBusinessTypePickerOpen(false)}
										inputMode="url"
										autoComplete="url"
										className="mt-[4px] h-[98px] w-[386px]"
									/>
								)}
							</div>

							<VenuePhotosPlaceholder />
						</div>
					</div>
				</section>

				<button
					type="submit"
					disabled={isSaving || isLoadingVenue}
					className="mt-4 h-[36px] w-[170px] rounded-full border-[2px] border-black bg-[#9bd2f6] text-[18px] font-semibold leading-none text-black shadow-[0_2px_0_rgba(0,0,0,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
				>
					{isSaving ? 'Saving...' : 'Continue'}
				</button>

				<div className="mt-2 min-h-[20px] text-center text-[12px] font-medium">
					{isVenueError && (
						<p className="text-amber-900">
							Unable to load an existing venue profile. You can still try saving.
						</p>
					)}
					{formError && <p className="text-red-700">{formError}</p>}
					{saved && <p className="text-emerald-700">Venue profile saved.</p>}
				</div>
			</form>
		</div>
	);
}

function VenuePortalContent() {
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

	if (!isLoaded || isSignedIn === false) {
		return (
			<PortalStatusCard
				title="Opening venue portal"
				message="Redirecting you to sign in before loading the portal."
			/>
		);
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
		return (
			<PortalStatusCard
				title="Finalizing your venue account"
				message="We are creating your Murmur user record and checking that this signup came from the venue flow."
			/>
		);
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

	return <VenuePortalForm />;
}

export default function VenuePortalClient() {
	return (
		<PersistentMapProvider>
			<PersistentDashboardMap />
			<VenuePortalBackgroundMap />
			<VenuePortalContent />
		</PersistentMapProvider>
	);
}
