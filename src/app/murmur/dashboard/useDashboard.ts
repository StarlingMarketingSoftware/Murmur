'use client';
import { useAuth, useClerk, useSignIn } from '@clerk/nextjs';
import { useEffect } from 'react';

export const useDashboard = () => {
	// const { isLoaded, isSignedIn } = useAuth();
	// const clerk = useClerk();
	// useEffect(() => {
	// 	if (isLoaded && !isSignedIn) {
	// 		clerk.openSignIn({});
	// 	}
	// }, [isLoaded, isSignedIn, clerk]);
	// return {
	// 	isLoaded,
	// 	isSignedIn,
	// };
};
