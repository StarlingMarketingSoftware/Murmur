'use client';

import { type FormEvent, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { PersistentDashboardMap } from '@/components/molecules/PersistentDashboardMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
	website: string;
	description: string;
};

const EMPTY_FORM_STATE: VenueFormState = {
	venueName: '',
	businessType: '',
	address: '',
	website: '',
	description: '',
};

const IDLE_MAP_CLIP = 'inset(0px round 0px)';
const IDLE_MAP_TRANSITION = '0ms ease';

const trimToNull = (value: string): string | null => {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};

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
	const { data: venue, isLoading: isLoadingVenue, isError: isVenueError } = useGetVenue();
	const { mutateAsync: upsertVenue, isPending: isSaving } = useUpsertVenue({
		suppressToasts: true,
	});
	const [form, setForm] = useState<VenueFormState>(EMPTY_FORM_STATE);
	const [hasHydratedForm, setHasHydratedForm] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (hasHydratedForm || isLoadingVenue) return;
		if (venue) {
			setForm({
				venueName: venue.venueName,
				businessType: venue.businessType ?? '',
				address: venue.address ?? '',
				website: venue.website ?? '',
				description: venue.description ?? '',
			});
		}
		setHasHydratedForm(true);
	}, [hasHydratedForm, isLoadingVenue, venue]);

	const updateField = (field: keyof VenueFormState, value: string) => {
		setSaved(false);
		setFormError(null);
		setForm((current) => ({ ...current, [field]: value }));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const venueName = form.venueName.trim();
		if (!venueName) {
			setSaved(false);
			setFormError('Venue name is required to create the venue profile.');
			return;
		}

		const payload: PatchVenueData = {
			venueName,
			businessType: trimToNull(form.businessType),
			address: trimToNull(form.address),
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
		<div className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center px-4 py-8 sm:px-6">
			<section className="w-full max-w-[560px] rounded-[28px] border border-black/20 bg-white/90 p-5 shadow-[0_30px_90px_rgba(4,19,48,0.30)] backdrop-blur-xl sm:p-7">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
							Venue Portal
						</p>
						<h1 className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.04em] text-slate-950 sm:text-[38px]">
							Set up your venue
						</h1>
					</div>
					<UserButton
						appearance={{
							elements: {
								avatarBox: 'w-8 h-8 ring-1 ring-black/10',
							},
						}}
					/>
				</div>

				<p className="mt-4 text-sm leading-6 text-slate-600">
					This is the temporary intake form for the venue portal. Submit it to verify
					the account routing and Prisma venue creation path.
				</p>

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="venue-name">Venue name</Label>
						<Input
							id="venue-name"
							value={form.venueName}
							onChange={(event) => updateField('venueName', event.target.value)}
							placeholder="The Echo Room"
							autoComplete="organization"
							className="bg-white/85"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="business-type">Business type</Label>
							<Input
								id="business-type"
								value={form.businessType}
								onChange={(event) => updateField('businessType', event.target.value)}
								placeholder="Music venue"
								className="bg-white/85"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="website">Website</Label>
							<Input
								id="website"
								value={form.website}
								onChange={(event) => updateField('website', event.target.value)}
								placeholder="https://example.com"
								autoComplete="url"
								className="bg-white/85"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="address">Address</Label>
						<Input
							id="address"
							value={form.address}
							onChange={(event) => updateField('address', event.target.value)}
							placeholder="123 Main St, Los Angeles, CA"
							autoComplete="street-address"
							className="bg-white/85"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Placeholder notes</Label>
						<Textarea
							id="description"
							value={form.description}
							onChange={(event) => updateField('description', event.target.value)}
							placeholder="Anything we should know before replacing this with the full intake form."
							className="min-h-[96px] bg-white/85"
						/>
					</div>

					{isVenueError && (
						<p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
							Unable to load an existing venue profile. You can still try saving this form.
						</p>
					)}
					{formError && (
						<p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
							{formError}
						</p>
					)}
					{saved && (
						<p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
							Venue profile saved. Routing and persistence are connected.
						</p>
					)}

					<Button
						type="submit"
						className="h-12 w-full rounded-xl bg-black text-white hover:bg-black/85"
						isLoading={isSaving}
						disabled={isSaving || isLoadingVenue}
					>
						Save venue placeholder
					</Button>
				</form>
			</section>
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
				actionHref={
					venuePromotionState === 'failed' ? urls.venueSignUp.index : undefined
				}
				actionLabel={
					venuePromotionState === 'failed' ? 'Continue as venue' : undefined
				}
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
