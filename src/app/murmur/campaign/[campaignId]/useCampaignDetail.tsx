import { LOCAL_STORAGE_KEYS, REQUESTED_PEOPLE_SCOPES } from '@/constants';
import { useGetCampaign } from '@/hooks/queryHooks/useCampaigns';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const useCampaignDetail = () => {
	const params = useParams();
	const campaignId = params.campaignId as string;
	const router = useRouter();
	const searchParams = useSearchParams();
	const tab = searchParams.get('tab') ?? 'murmur';
	const [isMounted, setIsMounted] = useState(false);

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
			const localAuthState = localStorage.getItem(LOCAL_STORAGE_KEYS.GoogleAuthState);

			if (localAuthState !== googleAuthState) {
				toast.error('Google authentication failed - client state mismatch.');
				return;
			}

			const grantedScopes = urlScope.split(' ');
			const hasAllRequestedScopes = REQUESTED_PEOPLE_SCOPES.every((scope) =>
				grantedScopes.includes(scope)
			);

			if (!hasAllRequestedScopes) {
				toast.error(
					'Missing a subset of Google permissions. Some features may be disabled.'
				);
				return;
			}

			localStorage.setItem(LOCAL_STORAGE_KEYS.GoogleAccessToken, urlGoogleAccessToken);
			localStorage.setItem(
				LOCAL_STORAGE_KEYS.GoogleScopes,
				JSON.stringify(grantedScopes)
			);
			localStorage.setItem(
				LOCAL_STORAGE_KEYS.GoogleExpiresAt,
				`${Date.now() + Number(urlExpiresIn) * 1000}`
			);

			toast.success('Google authentication successful!');
		}
	}, [isMounted]);

	const handleTabChange = (value: string) => {
		const params = new URLSearchParams(searchParams);
		params.set('tab', value);
		router.push(`/murmur?${params.toString()}`);
	};

	const { data, isPending } = useGetCampaign(campaignId);

	return {
		tab,
		handleTabChange,
		data,
		isPending,
	} as const;
};
