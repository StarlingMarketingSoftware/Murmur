'use client';
import Spinner from '@/components/ui/spinner';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [isAuthorized, setIsAuthorized] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const checkAdminStatus = async () => {
			try {
				const response = await fetch('/api/auth/check-admin');
				if (!response.ok) {
					// router.replace('/');
					return;
				}
				setIsAuthorized(true);
			} catch (error) {
				console.log('🚀 ~ checkAdminStatus ~ error:', error);
				// router.replace('/');
			} finally {
				setIsLoading(false);
			}
		};

		checkAdminStatus();
	}, [router]);

	if (isLoading) {
		return <Spinner />;
	}

	if (!isAuthorized) {
		return <div>Not authorized. </div>; // or a message indicating lack of access
	}

	return <>{children}</>;
}
