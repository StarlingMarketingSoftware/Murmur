'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailAutomationSteps from '../../_components/EmailAutomationSteps';
import Inbox from '../../_components/Inbox';
import { toast } from 'sonner';
import { LocalStorageKeys, requestedPeopleScopes } from '@/constants/constants';
import { useEffect, useState } from 'react';

const Murmur = () => {
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

	return (
		<div className="max-w-[900px] mx-auto">
			<Tabs
				defaultValue="murmur"
				value={tab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid grid-cols-2 mx-auto">
					<TabsTrigger value="murmur">Murmur</TabsTrigger>
					<TabsTrigger value="inbox">Inbox</TabsTrigger>
				</TabsList>
				<TabsContent value="murmur">
					<EmailAutomationSteps />
				</TabsContent>
				<TabsContent value="inbox">
					<Card>
						<Inbox />
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default Murmur;
