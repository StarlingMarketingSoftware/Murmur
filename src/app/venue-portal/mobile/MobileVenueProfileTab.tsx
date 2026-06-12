'use client';

import { useRef, useState, type ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';
import { PayRangeMoneyIcon } from '@/components/atoms/_svg/PayRangeMoneyIcon';
import { ProfileAreaMapBox } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import {
	BUSINESS_TYPE_OPTIONS,
	formatCapacityDisplay,
	formatOpenNightsSummary,
	formatPayRangeDisplay,
	formatVenueCoordinate,
	getOpenNightsCount,
	parseGenres,
	VenueBusinessTypePicker,
	VenueCapacityEditor,
	VenueDescriptionField,
	VenueGenrePicker,
	VenueHoursEditor,
	VenuePayRangeEditor,
	VenuePhotosPlaceholder,
	VenueSoundEditor,
	VenueWebsiteField,
} from '../VenuePortalClient';
import {
	formatVenueLocationFeature,
	parseVenueLocationParts,
	VENUE_LOCATION_GEOCODE_TYPES,
} from '../venueLocationFormat';
import { MobileScaleToFit } from './MobileScaleToFit';
import { useMobileVenueProfileForm } from './useMobileVenueProfileForm';

type MobileVenueProfileField =
	| 'location'
	| 'businessType'
	| 'hours'
	| 'capacity'
	| 'genres'
	| 'payRange'
	| 'sound'
	| 'description'
	| 'website';

// The desktop venue editors are laid out at a fixed ~386-387px design width; on
// mobile they get scaled down to the available column width.
const EDITOR_NATIVE_WIDTH_PX = 387;

const FIELD_VALUE_CLASS = 'font-inter text-[15px] font-medium text-black';

// Tappable display card for one profile field: green label chip on top, the current
// value (or a "+ Add" placeholder) below. Tapping toggles its editor open/closed.
function MobileProfileFieldCard({
	label,
	value,
	isOpen,
	onTap,
}: {
	label: string;
	value: ReactNode | null;
	isOpen: boolean;
	onTap: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onTap}
			aria-expanded={isOpen}
			className="flex min-h-[64px] w-full min-w-0 flex-col items-start gap-[7px] rounded-[9.496px] border-[2.374px] border-black bg-[#E6F7FE] p-[10px] text-left"
		>
			<span className="rounded-[4px] bg-[#D6FFED] px-[3px] text-[14px] font-black leading-[14px] text-[#34B965]">
				{label}
			</span>
			{value ?? (
				<span className="font-inter text-[15px] font-medium text-black/40">+ Add</span>
			)}
		</button>
	);
}

// Mobile Profile tab (Figma frame 1289): editable venue profile rendered as a
// scrollable stack of cards over the map frame. Data lifecycle (hydration +
// debounced auto-save) lives in useMobileVenueProfileForm.
export function MobileVenueProfileTab() {
	const {
		form,
		hasHydrated,
		saveStatus,
		updateField,
		toggleHoursDay,
		updateHoursDay,
		toggleGenre,
		setLocation,
		locationParts,
		locationCoordinates,
	} = useMobileVenueProfileForm();
	const [openField, setOpenField] = useState<MobileVenueProfileField | null>(null);
	// ProfileAreaMapBox reports the pin, the geocode feature, and the formatted
	// address through separate callbacks (coordinates → feature → address, in that
	// order). Stage the first two here and commit everything in onAreaUpdate.
	const pendingCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
	const pendingPartsRef = useRef<{ city: string; state: string } | null>(null);

	const toggleField = (field: MobileVenueProfileField) => {
		if (!hasHydrated) return;
		setOpenField((current) => (current === field ? null : field));
	};

	const handleLocationAreaUpdate = (value: string) => {
		const parts = pendingPartsRef.current ?? locationParts;
		setLocation({
			address: value,
			city: parts.city,
			state: parts.state,
			coordinates: pendingCoordsRef.current ?? locationCoordinates,
		});
	};

	const selectedGenres = parseGenres(form.genres);
	const businessTypeOption = BUSINESS_TYPE_OPTIONS.find(
		(option) => option.label === form.businessType
	);
	const saveStatusLabel =
		saveStatus === 'saving'
			? 'Saving…'
			: saveStatus === 'saved'
				? 'All changes saved'
				: saveStatus === 'error'
					? 'Couldn’t save — retrying on next edit'
					: '';

	const locationValue = form.address.trim() ? (
		<span className={`block w-full truncate ${FIELD_VALUE_CLASS}`}>{form.address}</span>
	) : null;
	const businessTypeValue = form.businessType.trim() ? (
		<span className="flex w-full min-w-0 items-center gap-[6px]">
			{businessTypeOption && (
				<span aria-hidden="true" className="flex shrink-0 items-center">
					{businessTypeOption.icon}
				</span>
			)}
			<span className={`min-w-0 truncate ${FIELD_VALUE_CLASS}`}>{form.businessType}</span>
		</span>
	) : null;
	// Hours always have a value (every day defaults to open), so the card shows the
	// nights-per-week summary rather than a "+ Add" placeholder.
	const hoursValue = (
		<span className={`block w-full truncate ${FIELD_VALUE_CLASS}`}>
			{formatOpenNightsSummary(getOpenNightsCount(form.hours))}
		</span>
	);
	const capacityValue = form.capacity.trim() ? (
		<span className={`block w-full truncate ${FIELD_VALUE_CLASS}`}>
			{formatCapacityDisplay(form.capacity)}
		</span>
	) : null;
	const genresValue =
		selectedGenres.length > 0 ? (
			<span className="flex w-full min-w-0 items-center gap-[4px]">
				{selectedGenres.slice(0, 2).map((genre) => (
					<span
						key={genre}
						className="flex h-[20px] min-w-0 shrink items-center overflow-hidden rounded-[7px] border border-black px-[5px] font-inter text-[12px] font-medium leading-none text-black"
					>
						<span className="truncate">{genre}</span>
					</span>
				))}
				{selectedGenres.length > 2 && (
					<span className="shrink-0 font-inter text-[12px] font-medium text-black">
						+{selectedGenres.length - 2}
					</span>
				)}
			</span>
		) : null;
	const payRangeValue = form.payRange.trim() ? (
		<span className="flex w-full min-w-0 items-center gap-[6px]">
			<PayRangeMoneyIcon className="h-[16px] w-[16px] shrink-0 translate-y-[0.75px]" />
			<span className={`min-w-0 truncate ${FIELD_VALUE_CLASS}`}>
				{formatPayRangeDisplay(form.payRange)}
			</span>
		</span>
	) : null;
	const soundValue = form.sound.trim() ? (
		<span className={`block w-full truncate ${FIELD_VALUE_CLASS}`}>{form.sound}</span>
	) : null;
	const descriptionValue = form.description.trim() ? (
		<span className={`line-clamp-2 w-full whitespace-pre-wrap ${FIELD_VALUE_CLASS}`}>
			{form.description}
		</span>
	) : null;
	const websiteValue = form.website.trim() ? (
		<span className={`block w-full truncate ${FIELD_VALUE_CLASS}`}>{form.website}</span>
	) : null;

	const renderFieldCard = (
		field: MobileVenueProfileField,
		label: string,
		value: ReactNode | null
	) => (
		<MobileProfileFieldCard
			label={label}
			value={value}
			isOpen={openField === field}
			onTap={() => toggleField(field)}
		/>
	);

	return (
		<div
			className="flex h-full w-full flex-col gap-[10px] overflow-y-auto"
			style={{
				overscrollBehavior: 'contain',
				WebkitOverflowScrolling: 'touch',
				padding: '10px 14px',
				paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
			}}
		>
			{/* Header card: venue name + verified badge, lat/lng, pink accent bar. */}
			<div className="w-full shrink-0 overflow-hidden rounded-[9.496px] border-[2.374px] border-black bg-white">
				<div className="p-[12px]">
					<div className="flex items-center gap-[8px]">
						<input
							aria-label="Venue name"
							value={form.venueName}
							onChange={(event) => updateField('venueName', event.target.value)}
							placeholder="Venue name"
							autoComplete="organization"
							className="min-w-0 flex-1 bg-transparent text-[26px] font-bold leading-none text-black outline-none placeholder:text-[#828282]"
						/>
						<BadgeCheck
							aria-hidden="true"
							className="h-[24px] w-[24px] shrink-0 text-white"
							fill="#63C766"
							strokeWidth={1.5}
						/>
					</div>
					{locationCoordinates && (
						<div className="mt-[4px] flex items-center justify-end gap-[14px] font-inter text-[13px] font-semibold text-black tabular-nums">
							<span>{formatVenueCoordinate(locationCoordinates.lat)}</span>
							<span>{formatVenueCoordinate(locationCoordinates.lng)}</span>
						</div>
					)}
				</div>
				<div className="h-[10px] w-full bg-[#F67C7E]" />
			</div>

			<div className="h-[16px] shrink-0 px-[4px] text-[11px] text-black/50">
				{saveStatusLabel}
			</div>

			{renderFieldCard('location', 'Location', locationValue)}
			{hasHydrated && openField === 'location' && (
				<ProfileAreaMapBox
					area={form.address}
					onAreaUpdate={handleLocationAreaUpdate}
					initialCoordinates={locationCoordinates}
					onCoordinatesChange={(coordinates) => {
						pendingCoordsRef.current = coordinates;
					}}
					onFeatureSelect={(feature) => {
						pendingPartsRef.current = parseVenueLocationParts(feature);
					}}
					className="mt-0 h-[180px] w-full rounded-[8px] border-[2px] opacity-100"
					headerLabel="Enter Location"
					inputPlaceholder="Enter Location"
					initiallyEditing
					reverseGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
					forwardGeocodeTypes={VENUE_LOCATION_GEOCODE_TYPES}
					formatGeocodeFeature={formatVenueLocationFeature}
				/>
			)}

			<div className="grid grid-cols-2 gap-[10px]">
				{renderFieldCard('businessType', 'Business Type', businessTypeValue)}
				{renderFieldCard('hours', 'Hours', hoursValue)}
			</div>
			{hasHydrated && openField === 'businessType' && (
				<MobileScaleToFit nativeWidth={EDITOR_NATIVE_WIDTH_PX}>
					<VenueBusinessTypePicker
						value={form.businessType}
						onChange={(value) => updateField('businessType', value)}
						onSelect={(value) => {
							updateField('businessType', value);
							setOpenField(null);
						}}
					/>
				</MobileScaleToFit>
			)}
			{hasHydrated && openField === 'hours' && (
				<MobileScaleToFit nativeWidth={EDITOR_NATIVE_WIDTH_PX}>
					<VenueHoursEditor
						hours={form.hours}
						onToggleDay={toggleHoursDay}
						onChangeDay={updateHoursDay}
					/>
				</MobileScaleToFit>
			)}

			<div className="grid grid-cols-2 gap-[10px]">
				{renderFieldCard('capacity', 'Capacity', capacityValue)}
				{renderFieldCard('genres', 'Genres', genresValue)}
			</div>
			{hasHydrated && openField === 'capacity' && (
				<MobileScaleToFit nativeWidth={EDITOR_NATIVE_WIDTH_PX}>
					<VenueCapacityEditor
						value={form.capacity}
						onChange={(value) => updateField('capacity', value)}
					/>
				</MobileScaleToFit>
			)}
			{hasHydrated && openField === 'genres' && (
				<MobileScaleToFit nativeWidth={EDITOR_NATIVE_WIDTH_PX}>
					<VenueGenrePicker selectedGenres={selectedGenres} onToggle={toggleGenre} />
				</MobileScaleToFit>
			)}

			<div className="grid grid-cols-2 gap-[10px]">
				{renderFieldCard('payRange', 'Pay Range', payRangeValue)}
				{renderFieldCard('sound', 'Sound', soundValue)}
			</div>
			{hasHydrated && openField === 'payRange' && (
				<MobileScaleToFit nativeWidth={EDITOR_NATIVE_WIDTH_PX}>
					<VenuePayRangeEditor
						value={form.payRange}
						onChange={(value) => updateField('payRange', value)}
					/>
				</MobileScaleToFit>
			)}
			{hasHydrated && openField === 'sound' && (
				<MobileScaleToFit nativeWidth={EDITOR_NATIVE_WIDTH_PX}>
					<VenueSoundEditor
						value={form.sound}
						onSelect={(value) => {
							updateField('sound', value);
							setOpenField(null);
						}}
					/>
				</MobileScaleToFit>
			)}

			{renderFieldCard('description', 'Description', descriptionValue)}
			{hasHydrated && openField === 'description' && (
				<VenueDescriptionField
					value={form.description}
					onChange={(value) => updateField('description', value)}
					onFocus={() => undefined}
					className="h-[120px] w-full"
				/>
			)}

			{renderFieldCard('website', 'Website', websiteValue)}
			{hasHydrated && openField === 'website' && (
				<VenueWebsiteField
					value={form.website}
					onChange={(value) => updateField('website', value)}
					onFocus={() => undefined}
					className="h-[64px] w-full"
				/>
			)}

			<div className="w-full shrink-0 rounded-[9.496px] border-[2.374px] border-black bg-white p-[10px]">
				<VenuePhotosPlaceholder layout="grid" alwaysShowDelete />
			</div>
		</div>
	);
}
