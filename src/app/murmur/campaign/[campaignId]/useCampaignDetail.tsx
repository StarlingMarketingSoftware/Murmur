import { LocalStorageKeys, requestedPeopleScopes } from '@/constants/constants';
import { setCampaignState } from '@/lib/redux/features/murmur/murmurSlice';
import { Campaign } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';

export const useCampaignDetail = () => {
	const params = useParams();
	const campaignId = params.campaignId;
	const dispatch = useDispatch();
	const router = useRouter();
	const searchParams = useSearchParams();
	const tab = searchParams.get('tab') ?? 'murmur';
	const [isMounted, setIsMounted] = useState(false);
	const [isFirstLoad, setIsFirstLoad] = useState(true);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isMounted) return;
		const hash = window.location.hash.substring(1);
		const hashParams = new URLSearchParams(hash);

		const urlError = hashParams.get('error');
		const googleAuthState = hashParams.get('state');
		const urlGoogleAccessToken = hashParams.get('access_token');
		const urlExpiresIn = hashParams.get('expires_in'); // seconds
		const urlScope = hashParams.get('scope');

		// Check if urlError exists and has a value
		if (urlError !== null && urlError !== '') {
			toast.error(`Murmur was not granted Google permissions.`);
			return;
		}
		if (urlGoogleAccessToken && urlScope && urlExpiresIn) {
			const localAuthState = localStorage.getItem(LocalStorageKeys.GoogleAuthState);

			if (localAuthState !== googleAuthState) {
				toast.error('Google authentication failed - client state mismatch.');
				return;
			}

			const grantedScopes = urlScope.split(' ');
			const hasAllRequestedScopes = requestedPeopleScopes.every((scope) =>
				grantedScopes.includes(scope)
			);

			if (!hasAllRequestedScopes) {
				toast.error(
					'Missing a subset of Google permissions. Some features may be disabled.'
				);
				return;
			}

			localStorage.setItem(LocalStorageKeys.GoogleAccessToken, urlGoogleAccessToken);
			localStorage.setItem(LocalStorageKeys.GoogleScopes, JSON.stringify(grantedScopes));
			localStorage.setItem(
				LocalStorageKeys.GoogleExpiresAt,
				`${Date.now() + parseInt(urlExpiresIn) * 1000}`
			);

			toast.success('Google authentication successful!');
		}
	}, [isMounted]);

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('tab', value);
		router.push(`/murmur?${params.toString()}`);
	};

	const { data, isPending } = useQuery({
		queryKey: ['campaign', campaignId],
		queryFn: async (): Promise<Campaign> => {
			const response = await fetch(`/api/campaigns/${campaignId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			return response.json();
		},
	});

	// set global state here
	// useEffect(() => {
	// 	if (isPending || !isFirstLoad || !data) return;
	// 	console.log('🚀 ~ SETTING GLOBAL STATE', data);
	// 	setIsFirstLoad(false);
	// 	dispatch(setCampaignState(data));
	// }, [isPending, isFirstLoad, data, dispatch]);

	return {
		tab,
		handleTabChange,
		data,
		isPending,
	};
};
