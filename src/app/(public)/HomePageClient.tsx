'use client';

import Link from 'next/link';
import { urls } from '@/constants/urls';

export default function HomePageClient() {
	return (
		<main
			className="flex min-h-screen items-center justify-center p-4"
			style={{ background: 'linear-gradient(180deg, #FFF 0%, #FFF 50%, #D5F1FF 100%)' }}
		>
			<div className="relative h-[505px] w-[596px] max-w-full overflow-hidden rounded-[11.54px] bg-[#F5F5F7]">
				<Link
					href={urls.freeTrial.index}
					className="absolute inset-x-0 bottom-0 flex h-[52px] items-center justify-center bg-[#408249] text-lg font-medium text-white transition-opacity hover:opacity-95"
				>
					Start Free Trial
				</Link>
			</div>
		</main>
	);
}
