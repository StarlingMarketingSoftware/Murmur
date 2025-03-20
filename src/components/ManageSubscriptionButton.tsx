'use client';
import { FC } from 'react';

import { Button } from './ui/button';
import { useMe } from '@/hooks/useMe';
import { useRouter } from 'next/router';

const ManageSubscriptionButton: FC = () => {
	const { user } = useMe();

	const handlePortalAccess = async () => {
		try {
			const response = await fetch('/api/stripe/stripe-portal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ customerId: user?.stripeCustomerId }),
			});
			console.log('🚀 ~ handlePortalAccess ~ response:', response);

			const { url } = await response.json();

			window.location.href = url;
			console.log('🚀 ~ handlePortalAccess ~ url:', url);
		} catch (error) {
			console.error('Error accessing customer portal:', error);
		}
	};

	return <Button onClick={handlePortalAccess}>Manage Your Subscription</Button>;
};

export default ManageSubscriptionButton;
