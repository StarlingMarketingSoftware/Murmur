'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { urls } from '@/constants/urls';

export const BackButton = () => {
	const router = useRouter();
	return (
		<button
			type="button"
			aria-label="Go back"
			onClick={() => {
				if (window.history.length > 1) {
					router.back();
				} else {
					router.push(urls.home.index);
				}
			}}
			className="fixed top-5 left-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm transition-colors hover:bg-gray-100"
		>
			<ChevronLeft className="h-[22px] w-[22px] text-black" />
		</button>
	);
};
