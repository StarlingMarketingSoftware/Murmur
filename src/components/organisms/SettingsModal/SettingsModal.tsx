'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { CustomScrollbar } from '@/components/ui/custom-scrollbar';
import { useMe } from '@/hooks/useMe';
import { useGetIdentities } from '@/hooks/queryHooks/useIdentities';
import { useGetMedia } from '@/hooks/queryHooks/useMediaAssets';
import { useChangePlanPortal } from '@/hooks/queryHooks/useStripeCheckouts';
import { urls } from '@/constants/urls';
import { BASE_URL } from '@/constants/ui';

const FIELD_BOX_CLASS = 'rounded-[14px] border-[1.786px] border-white';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		// Transparent overlay (the mock shows no dimming) that swallows outside clicks
		// so they close the window instead of poking the map/search UI underneath.
		// The window hangs below the header's gear button rather than centering.
		<div
			className="fixed inset-0 z-[100000]"
			style={{ pointerEvents: 'auto' }}
			onClick={onClose}
		>
			<SettingsWindow />
		</div>,
		document.body
	);
}

// Data hooks live here so the queries only run once the window is actually opened.
function SettingsWindow() {
	const { user, subscriptionTier } = useMe();
	const { user: clerkUser } = useUser();
	const { data: identities } = useGetIdentities({});
	const { data: mediaAssets = [] } = useGetMedia('profile_media');
	const pathname = usePathname();
	const router = useRouter();
	const changePlanPortal = useChangePlanPortal();

	// "The" profile = most-recently-edited identity (same resolution the dashboard
	// uses when no campaign is active).
	const identity = useMemo(() => {
		const list = identities ?? [];
		if (list.length === 0) return null;
		return [...list].sort(
			(a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		)[0];
	}, [identities]);

	const profileName =
		identity?.name ||
		[user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
	const email = user?.email || clerkUser?.primaryEmailAddress?.emailAddress || '';

	const mediaLabels = mediaAssets
		.filter((asset) => asset.status === 'ready' && asset.url)
		.map((asset) =>
			asset.sourceType === 'youtube'
				? (asset.embedUrl ?? asset.url ?? '')
				: (asset.filename ?? asset.url ?? '')
		)
		.filter(Boolean);

	// Monthly allocation presented against a weekly allowance (monthly / 4),
	// clamped to 0–100. user.sendingCredits is the REMAINING balance this period.
	const usagePercent = useMemo(() => {
		const monthly = subscriptionTier?.sendingCredits ?? 0;
		if (monthly <= 0) return null;
		const used = monthly - (user?.sendingCredits ?? 0);
		const pct = (used / (monthly / 4)) * 100;
		return Math.round(Math.min(100, Math.max(0, pct)));
	}, [subscriptionTier?.sendingCredits, user?.sendingCredits]);

	const handleChangePlan = async () => {
		// Without a Stripe customer there is no portal — send them to pick a plan.
		if (!user?.stripeCustomerId) {
			router.push(urls.pricing.index);
			return;
		}
		try {
			const res = await changePlanPortal.mutateAsync({
				customerId: user.stripeCustomerId,
				returnUrl: `${BASE_URL}${pathname || urls.murmur.dashboard.index}`,
			});
			if (res.url) {
				window.location.href = res.url;
			}
		} catch {
			// The mutation hook already surfaces an error toast.
		}
	};

	return (
		<div
			onClick={(e) => e.stopPropagation()}
			className="absolute right-[72px] top-[64px] flex h-[789px] w-[607px] flex-col rounded-[14.15px] border-[1.786px] border-black bg-[#949494] font-inter"
		>
			<div className="flex h-[27px] shrink-0 items-center px-[16px]">
				<span className="text-[17px] font-semibold leading-none text-black">
					Settings
				</span>
			</div>
			<CustomScrollbar
				className="mx-auto h-[755px] w-[589px] rounded-[14.15px] border-[1.786px] border-white bg-[#424242]"
				contentClassName="rounded-[13px]"
				offsetRight={-15}
				thumbColor="#000000"
				thumbWidth={2}
				thumbHeightOverride={170}
				lockHorizontalScroll
			>
				<div className="flex flex-col px-[16px] py-[14px] text-white">
					<h2 className="text-[17px] font-semibold">Your Profile</h2>
					<div
						className={`${FIELD_BOX_CLASS} mt-[12px] flex flex-col gap-[15px] p-[15px] text-[15.5px] font-semibold leading-[1.45]`}
					>
						{profileName ? <p>{profileName}</p> : null}
						{identity?.genre ? <p>Genres : {identity.genre}</p> : null}
						{identity?.bandName ? <p>Performing Name: {identity.bandName}</p> : null}
						{identity?.area ? <p>Area: {identity.area}</p> : null}
						{identity?.bio ? <p>Bio: {identity.bio}</p> : null}
						{mediaLabels.length > 0 ? (
							<div>
								<p>Media:</p>
								{mediaLabels.map((label, index) => (
									<p key={`${index}-${label}`} className="break-all">
										{index + 1}:{label}
									</p>
								))}
							</div>
						) : null}
					</div>

					<h2 className="mt-[30px] text-[17px] font-semibold">Email</h2>
					<div
						className={`${FIELD_BOX_CLASS} mt-[12px] px-[15px] py-[13px] text-[15.5px] font-semibold`}
					>
						{email}
					</div>

					<h2 className="mt-[42px] text-[17px] font-semibold">Usage</h2>
					{usagePercent !== null ? (
						<>
							<p className="mt-[24px] text-[15.5px] font-semibold">weekly limit</p>
							<div className="relative mt-[12px] h-[38px] overflow-hidden rounded-full border-[1.786px] border-white bg-[#333333]">
								<div
									className="absolute inset-y-0 left-0 rounded-full bg-[#57BD5F]"
									style={{ width: `${usagePercent}%` }}
								/>
							</div>
							<p className="mt-[10px] text-[15.5px] font-semibold">{usagePercent}%</p>
						</>
					) : (
						<p className="mt-[24px] text-[15.5px] font-semibold opacity-80">
							No active plan
						</p>
					)}

					<button
						type="button"
						onClick={handleChangePlan}
						disabled={changePlanPortal.isPending}
						className="mt-[70px] w-fit cursor-pointer text-left text-[17px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
					>
						Change Plan
					</button>

					<span className="mb-[28px] mt-[38px] w-fit text-[17px] font-semibold">
						Unsubscribe
					</span>
				</div>
			</CustomScrollbar>
		</div>
	);
}
