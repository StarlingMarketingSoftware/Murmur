'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PatchVenueData } from '@/app/api/venue/schema';
import type { AreaCoordinates } from '@/components/molecules/HybridPromptInput/ProfileSidePanelBox';
import { useGetVenue, useUpsertVenue } from '@/hooks/queryHooks/useVenue';
import {
	AUTOSAVE_DEBOUNCE_MS,
	buildVenuePayload,
	EMPTY_FORM_STATE,
	formatCapacity,
	formatPayRange,
	hydrateVenueHours,
	parseGenres,
	type VenueDayKey,
	type VenueFormState,
} from '../VenuePortalClient';

export type MobileVenueSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Mobile twin of the desktop VenuePortalForm data lifecycle (VenuePortalClient.tsx):
// hydrate the form ONCE when useGetVenue resolves, then debounced auto-save through
// buildVenuePayload with a serialized-baseline ref so hydration and no-op edits never
// hit the server. Keep this in sync with VenuePortalForm's hydration/auto-save flow.
export function useMobileVenueProfileForm() {
	const { data: venue, isLoading: isLoadingVenue } = useGetVenue();
	const [saveStatus, setSaveStatus] = useState<MobileVenueSaveStatus>('idle');
	const { mutateAsync: upsertVenue } = useUpsertVenue({
		suppressToasts: true,
		onSuccess: () => setSaveStatus('saved'),
	});
	const [form, setForm] = useState<VenueFormState>(EMPTY_FORM_STATE);
	const [hasHydrated, setHasHydrated] = useState(false);
	const [locationParts, setLocationParts] = useState<{ city: string; state: string }>({
		city: '',
		state: '',
	});
	const [locationCoordinates, setLocationCoordinates] = useState<AreaCoordinates | null>(
		null
	);
	// Serialized payload of the last save, so the debounced auto-save can skip writes
	// when nothing changed — including the freshly hydrated profile on load.
	const lastSavedPayloadRef = useRef<string | null>(null);

	// Hydrate once when the venue query first resolves (mirrors VenuePortalForm).
	useEffect(() => {
		if (hasHydrated || isLoadingVenue) return;
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
		setHasHydrated(true);
	}, [hasHydrated, isLoadingVenue, venue]);

	const saveVenue = useCallback(
		async (payload: PatchVenueData) => {
			// Pre-record so the debounced effect treats this payload as persisted and
			// won't fire a duplicate write while the request is in flight.
			lastSavedPayloadRef.current = JSON.stringify(payload);
			setSaveStatus('saving');
			try {
				await upsertVenue(payload);
			} catch {
				// Failed — drop the baseline so the next edit retries this change.
				lastSavedPayloadRef.current = null;
				setSaveStatus('error');
			}
		},
		[upsertVenue]
	);

	// null means there is nothing valid to persist yet (no name, or malformed
	// capacity/hours from buildVenuePayload), so the auto-save skips silently.
	const autoSavePayload = useMemo<PatchVenueData | null>(() => {
		if (form.venueName.trim().length === 0) return null;
		try {
			return buildVenuePayload(form, locationParts, locationCoordinates);
		} catch {
			return null;
		}
	}, [form, locationParts, locationCoordinates]);

	// Debounced auto-save — identical flow to VenuePortalForm's effect.
	useEffect(() => {
		if (!hasHydrated || !autoSavePayload) return;
		const serialized = JSON.stringify(autoSavePayload);
		if (serialized === lastSavedPayloadRef.current) return;

		const timer = window.setTimeout(() => {
			// Re-check at fire time: another save may have persisted this payload.
			if (serialized === lastSavedPayloadRef.current) return;
			void saveVenue(autoSavePayload);
		}, AUTOSAVE_DEBOUNCE_MS);
		return () => window.clearTimeout(timer);
	}, [autoSavePayload, hasHydrated, saveVenue]);

	// Flush a pending debounce on unmount (e.g. switching tabs right after an edit) —
	// same final unmount save as VenuePortalForm; the mutation outlives the hook.
	const flushAutoSaveRef = useRef<() => void>(() => undefined);
	flushAutoSaveRef.current = () => {
		if (!hasHydrated || !autoSavePayload) return;
		if (JSON.stringify(autoSavePayload) === lastSavedPayloadRef.current) return;
		void saveVenue(autoSavePayload);
	};
	useEffect(() => () => flushAutoSaveRef.current(), []);

	// All updaters are gated on hydration so edits made against the empty placeholder
	// form can't race the venue fetch and clobber the saved profile.
	const updateField = (field: Exclude<keyof VenueFormState, 'hours'>, value: string) => {
		if (!hasHydrated) return;
		setForm((current) => ({ ...current, [field]: value }));
	};
	const toggleHoursDay = (day: VenueDayKey) => {
		if (!hasHydrated) return;
		setForm((current) => ({
			...current,
			hours: {
				...current.hours,
				[day]: { ...current.hours[day], isOpen: !current.hours[day].isOpen },
			},
		}));
	};
	const updateHoursDay = (day: VenueDayKey, field: 'open' | 'close', value: string) => {
		if (!hasHydrated) return;
		setForm((current) => ({
			...current,
			hours: {
				...current.hours,
				[day]: { ...current.hours[day], [field]: value },
			},
		}));
	};
	const toggleGenre = (genre: string) => {
		if (!hasHydrated) return;
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
	const setLocation = (location: {
		address: string;
		city: string;
		state: string;
		coordinates: { lat: number; lng: number } | null;
	}) => {
		if (!hasHydrated) return;
		setForm((current) => ({ ...current, address: location.address }));
		setLocationParts({ city: location.city, state: location.state });
		// Like VenuePortalForm, coordinates are only ever set, never cleared.
		if (location.coordinates) {
			setLocationCoordinates(location.coordinates);
		}
	};

	return {
		form,
		venue,
		hasHydrated,
		saveStatus,
		updateField,
		toggleHoursDay,
		updateHoursDay,
		toggleGenre,
		setLocation,
		locationParts,
		locationCoordinates,
	};
}
